// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RandomForestClassifier } from "https://esm.sh/ml-random-forest@2.1.0";
import { IsolationForest } from "https://esm.sh/ml-isolation-forest@0.1.0";
import {
  extractFeaturesFromDb,
  FEATURE_NAMES,
  LABEL_NAMES,
  CORS_HEADERS,
  type Label,
} from "../_shared/ml-features.ts";

const BUCKET = "ml-models";
const MODEL_KEY = "imei-risk/current.json";

interface ModelMeta {
  trained_at: string;
  samples: number;
  accuracy: number;
  f1_macro: number;
  feature_names: readonly string[];
  iso_threshold: number;
  iso_n_estimators: number;
}

let _cached: { rf: any; iso: any; meta: ModelMeta } | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function loadModel(supabaseAdmin: any) {
  const now = Date.now();
  if (_cached && now - _cachedAt < CACHE_TTL_MS) return _cached;
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(MODEL_KEY);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = JSON.parse(text);
    const rf = RandomForestClassifier.load(parsed.rf);
    const iso = new IsolationForest({ nEstimators: parsed.meta.iso_n_estimators });
    iso.train(parsed.iso_seed_data);
    _cached = { rf, iso, meta: parsed.meta };
    _cachedAt = now;
    return _cached;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const data = await req.json();
    const features = extractFeaturesFromDb(data);
    const model = await loadModel(supabaseAdmin);

    if (!model) {
      return json({
        available: false,
        features,
        feature_names: FEATURE_NAMES,
      });
    }

    let probs: [number, number, number] = [0, 0, 0];
    try {
      probs = [
        model.rf.predictProbability([features], 0)[0] ?? 0,
        model.rf.predictProbability([features], 1)[0] ?? 0,
        model.rf.predictProbability([features], 2)[0] ?? 0,
      ];
      const sum = probs[0] + probs[1] + probs[2];
      if (sum > 0) probs = [probs[0]/sum, probs[1]/sum, probs[2]/sum];
    } catch {
      const single = model.rf.predict([features])[0] as Label;
      probs[single] = 1;
    }

    const predicted = probs.indexOf(Math.max(...probs)) as Label;

    let anomalyScore = 0;
    try { anomalyScore = model.iso.predict([features])[0] ?? 0; } catch { /* */ }
    const isAnomaly = anomalyScore > model.meta.iso_threshold;

    let risk = probs[2] * 1.0 + probs[1] * 0.5;
    if (isAnomaly) risk = Math.min(1, risk + 0.15);
    risk = Math.max(0, Math.min(1, risk));

    const reasons: string[] = [];
    if (data.stolenReported) reasons.push("Cet IMEI a été signalé volé dans notre base.");
    if (!data.isValidLuhn) reasons.push("Le numéro IMEI ne respecte pas l'algorithme Luhn (format invalide).");
    if (!data.tacKnown) reasons.push("Le code TAC (modèle de l'appareil) est inconnu de notre base de référence.");
    if (features[2] > 0.4) reasons.push(`Cet IMEI a déjà été vérifié de nombreuses fois (${(data.checks ?? []).length} vérifications).`);
    if (features[3] > 0.4) reasons.push("De nombreux utilisateurs différents l'ont vérifié récemment.");
    if (features[6] > 0.5) reasons.push("Fréquence de vérification anormalement élevée sur les dernières 24 heures.");
    if (features[7] > 0.5) reasons.push("Détecté dans plusieurs zones géographiques distinctes.");
    if (isAnomaly && reasons.length === 0)
      reasons.push("Le profil d'utilisation de cet IMEI s'écarte des comportements habituels.");
    if (reasons.length === 0 && predicted === 0)
      reasons.push("Aucun signal suspect détecté ; comportement cohérent avec un téléphone légitime.");

    return json({
      available: true,
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
    });
  } catch (err) {
    console.error("ml-predict error:", err);
    return json({ error: err instanceof Error ? err.message : "Prediction failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
