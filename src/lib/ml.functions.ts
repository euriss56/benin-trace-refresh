import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { RandomForestClassifier } from "ml-random-forest";
import { IsolationForest } from "ml-isolation-forest";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  generateDataset,
  extractFeaturesFromDb,
  FEATURE_NAMES,
  LABEL_NAMES,
  type FeatureVector,
  type Label,
} from "@/lib/ml-features";

const BUCKET = "ml-models";
const MODEL_KEY = "imei-risk/current.json";

// ============================================================================
//  Cache mémoire du modèle (par worker instance)
// ============================================================================
interface LoadedModel {
  rf: RandomForestClassifier;
  iso: IsolationForest;
  meta: {
    trained_at: string;
    samples: number;
    accuracy: number;
    f1_macro: number;
    feature_names: readonly string[];
    iso_threshold: number;
  };
}

let _cached: LoadedModel | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function loadModelFromStorage(): Promise<LoadedModel | null> {
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(MODEL_KEY);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = JSON.parse(text);
    const rf = RandomForestClassifier.load(parsed.rf);
    // ml-isolation-forest n'a pas de load natif → on reconstruit depuis JSON
    const iso = new IsolationForest(parsed.iso.options ?? {});
    // hack : restaurer l'état interne sérialisé
    Object.assign(iso, parsed.iso.state ?? {});
    return { rf, iso, meta: parsed.meta };
  } catch {
    return null;
  }
}

async function getCachedModel(): Promise<LoadedModel | null> {
  const now = Date.now();
  if (_cached && now - _cachedAt < CACHE_TTL_MS) return _cached;
  const m = await loadModelFromStorage();
  if (m) {
    _cached = m;
    _cachedAt = now;
  }
  return m;
}

// ============================================================================
//  trainModel — server function
// ============================================================================
export const trainModelFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { samples?: number; trees?: number }) =>
      z
        .object({
          samples: z.number().int().min(1000).max(500_000).optional(),
          trees: z.number().int().min(20).max(300).optional(),
        })
        .parse(input)
  )
  .handler(async ({ data }) => {
    const startedAt = Date.now();
    const samples = data.samples ?? 100_000;
    const nTrees = data.trees ?? 60;

    // 1. Générer le dataset (70/20/10)
    const { X, y } = generateDataset(samples, 1337);

    // 2. Split train/test 80/20
    const splitIdx = Math.floor(X.length * 0.8);
    const Xtr = X.slice(0, splitIdx);
    const ytr = y.slice(0, splitIdx);
    const Xte = X.slice(splitIdx);
    const yte = y.slice(splitIdx);

    // 3. Random Forest classifier (multi-classe)
    const rf = new RandomForestClassifier({
      seed: 42,
      maxFeatures: 0.8,
      replacement: true,
      nEstimators: nTrees,
      treeOptions: { maxDepth: 12 },
    });
    rf.train(Xtr, ytr);

    // 4. Évaluation : accuracy + F1 macro
    const yPred = rf.predict(Xte) as number[];
    let correct = 0;
    const cm: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < yte.length; i++) {
      if (yPred[i] === yte[i]) correct++;
      cm[yte[i]][yPred[i] as 0 | 1 | 2]++;
    }
    const accuracy = correct / yte.length;
    // F1 par classe
    const f1s: number[] = [];
    for (let c = 0; c < 3; c++) {
      const tp = cm[c][c];
      const fp = cm[0][c] + cm[1][c] + cm[2][c] - tp;
      const fn = cm[c][0] + cm[c][1] + cm[c][2] - tp;
      const precision = tp / (tp + fp || 1);
      const recall = tp / (tp + fn || 1);
      const f1 = (2 * precision * recall) / (precision + recall || 1);
      f1s.push(f1);
    }
    const f1_macro = f1s.reduce((a, b) => a + b, 0) / 3;

    // 5. Isolation Forest sur les samples LÉGITIMES uniquement (anomalies = écart à la norme)
    const Xlegit = Xtr.filter((_, i) => ytr[i] === 0);
    const iso = new IsolationForest({
      nEstimators: 50,
      maxSamples: Math.min(256, Xlegit.length),
      seed: 42,
    });
    iso.fit(Xlegit);
    // Calculer un seuil = 95e percentile des scores sur le set légitime
    const isoScoresLegit = iso.predict(Xlegit) as number[];
    const sorted = [...isoScoresLegit].sort((a, b) => a - b);
    const iso_threshold = sorted[Math.floor(sorted.length * 0.95)] ?? 0.6;

    // 6. Sérialiser et upload
    const payload = {
      rf: rf.toJSON(),
      iso: {
        options: { nEstimators: 50, maxSamples: Math.min(256, Xlegit.length), seed: 42 },
        // Persister les arbres internes
        state: JSON.parse(JSON.stringify(iso)),
      },
      meta: {
        trained_at: new Date().toISOString(),
        samples,
        accuracy,
        f1_macro,
        feature_names: FEATURE_NAMES,
        iso_threshold,
      },
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(MODEL_KEY, blob, { upsert: true, contentType: "application/json" });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    // Invalider le cache local
    _cached = null;

    const duration_seconds = (Date.now() - startedAt) / 1000;

    // 7. Log dans ml_training_logs
    await supabaseAdmin.from("ml_training_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // sera ré-écrit via auth ci-dessous si dispo
      model_name: "imei-risk-rf-iso",
      accuracy,
      loss: 1 - f1_macro,
      epochs: nTrees,
      training_samples: samples,
      duration_seconds,
      status: "completed",
    });

    return {
      success: true,
      accuracy,
      f1_macro,
      samples,
      duration_seconds,
      trees: nTrees,
    };
  });

// ============================================================================
//  predictRisk — server function publique (pas d'auth requise)
// ============================================================================
export const predictRiskFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      isValidLuhn: boolean;
      tacKnown: boolean;
      stolenReported: boolean;
      checks: { user_id: string | null; checked_at: string }[];
      cityCount?: number;
    }) =>
      z
        .object({
          isValidLuhn: z.boolean(),
          tacKnown: z.boolean(),
          stolenReported: z.boolean(),
          checks: z
            .array(
              z.object({
                user_id: z.string().uuid().nullable(),
                checked_at: z.string(),
              })
            )
            .max(500),
          cityCount: z.number().int().min(0).max(100).optional(),
        })
        .parse(input)
    )
    .handler(async ({ data }) => {
      const features = extractFeaturesFromDb(data);
      const model = await getCachedModel();

      if (!model) {
        return {
          available: false as const,
          features,
          feature_names: FEATURE_NAMES,
        };
      }

      // Random Forest : probabilité par classe
      // ml-random-forest predict() renvoie la classe ; pour les probas on utilise
      // les votes des arbres (predictionValues si dispo, sinon agrégation manuelle)
      let probs: [number, number, number] = [0, 0, 0];
      try {
        // L'API ml-random-forest expose .predictionValues sur les estimateurs
        const votes = [0, 0, 0];
        const trees = (model.rf as unknown as { estimators: { predict: (x: FeatureVector[]) => number[] }[] }).estimators;
        for (const tree of trees) {
          const v = tree.predict([features])[0] as 0 | 1 | 2;
          votes[v]++;
        }
        const total = votes[0] + votes[1] + votes[2] || 1;
        probs = [votes[0] / total, votes[1] / total, votes[2] / total];
      } catch {
        const single = model.rf.predict([features])[0] as Label;
        probs[single] = 1;
      }

      const predicted = probs.indexOf(Math.max(...probs)) as Label;

      // Anomalie via Isolation Forest
      let anomalyScore = 0;
      try {
        anomalyScore = (model.iso.predict([features]) as number[])[0] ?? 0;
      } catch {
        anomalyScore = 0;
      }
      const isAnomaly = anomalyScore > model.meta.iso_threshold;

      // Score de risque [0..1] = combinaison
      // - prob "volé" * 1.0
      // - prob "suspect" * 0.5
      // - bonus anomalie * 0.15 (clip)
      let risk = probs[2] * 1.0 + probs[1] * 0.5;
      if (isAnomaly) risk = Math.min(1, risk + 0.15);
      risk = Math.max(0, Math.min(1, risk));

      // Génération d'explication
      const reasons: string[] = [];
      if (data.stolenReported) reasons.push("Cet IMEI a été signalé volé dans notre base.");
      if (!data.isValidLuhn) reasons.push("Le numéro IMEI ne respecte pas l'algorithme Luhn (format invalide).");
      if (!data.tacKnown) reasons.push("Le code TAC (modèle de l'appareil) est inconnu de notre base de référence.");
      if (features[2] > 0.4) reasons.push(`Cet IMEI a déjà été vérifié de nombreuses fois (${data.checks.length} vérifications).`);
      if (features[3] > 0.4) reasons.push("De nombreux utilisateurs différents l'ont vérifié récemment.");
      if (features[6] > 0.5) reasons.push("Fréquence de vérification anormalement élevée sur les dernières 24 heures.");
      if (features[7] > 0.5) reasons.push("Détecté dans plusieurs zones géographiques distinctes.");
      if (isAnomaly && reasons.length === 0)
        reasons.push("Le profil d'utilisation de cet IMEI s'écarte des comportements habituels.");
      if (reasons.length === 0) {
        if (predicted === 0) reasons.push("Aucun signal suspect détecté ; comportement cohérent avec un téléphone légitime.");
      }

      return {
        available: true as const,
        risk_score: risk,
        classification: LABEL_NAMES[predicted],
        probabilities: {
          legitimate: probs[0],
          suspect: probs[1],
          stolen: probs[2],
        },
        anomaly: { score: anomalyScore, threshold: model.meta.iso_threshold, is_anomaly: isAnomaly },
        reasons,
        features,
        feature_names: FEATURE_NAMES,
        model_meta: {
          trained_at: model.meta.trained_at,
          accuracy: model.meta.accuracy,
          samples: model.meta.samples,
        },
      };
    });

// ============================================================================
//  hasModel — check léger pour l'UI admin
// ============================================================================
export const hasModelFn = createServerFn({ method: "GET" }).handler(async () => {
  const m = await getCachedModel();
  if (!m) return { exists: false as const };
  return {
    exists: true as const,
    trained_at: m.meta.trained_at,
    accuracy: m.meta.accuracy,
    f1_macro: m.meta.f1_macro,
    samples: m.meta.samples,
  };
});
