// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RandomForestClassifier } from "https://esm.sh/ml-random-forest@2.1.0";
import { IsolationForest } from "https://esm.sh/ml-isolation-forest@0.0.4";
import {
  generateDataset,
  FEATURE_NAMES,
  CORS_HEADERS,
} from "../_shared/ml-features.ts";

const BUCKET = "ml-models";
const MODEL_KEY = "imei-risk/current.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return json({ error: "Invalid token" }, 401);

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin role required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const samples = Math.min(Math.max(Number(body?.samples) || 100_000, 1000), 500_000);
    const nTrees = Math.min(Math.max(Number(body?.trees) || 60, 20), 300);

    const startedAt = Date.now();

    const { X, y } = generateDataset(samples, 1337);

    const splitIdx = Math.floor(X.length * 0.8);
    const Xtr = X.slice(0, splitIdx);
    const ytr = y.slice(0, splitIdx);
    const Xte = X.slice(splitIdx);
    const yte = y.slice(splitIdx);

    const rf = new RandomForestClassifier({
      seed: 42,
      maxFeatures: 0.8,
      replacement: true,
      nEstimators: nTrees,
      treeOptions: { maxDepth: 12 },
    });
    rf.train(Xtr, ytr);

    const yPred = rf.predict(Xte) as number[];
    let correct = 0;
    const cm: number[][] = [[0,0,0],[0,0,0],[0,0,0]];
    for (let i = 0; i < yte.length; i++) {
      if (yPred[i] === yte[i]) correct++;
      cm[yte[i]][yPred[i] as 0|1|2]++;
    }
    const accuracy = correct / yte.length;
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

    const Xlegit = Xtr.filter((_: any, i: number) => ytr[i] === 0).slice(0, 1000);
    const isoNTrees = 50;
    const iso = new IsolationForest({ nEstimators: isoNTrees });
    iso.train(Xlegit);
    const isoScores = iso.predict(Xlegit);
    const sorted = [...isoScores].sort((a: number, b: number) => a - b);
    const iso_threshold = sorted[Math.floor(sorted.length * 0.95)] ?? 0.6;

    const payload = {
      rf: rf.toJSON(),
      iso_seed_data: Xlegit,
      meta: {
        trained_at: new Date().toISOString(),
        samples,
        accuracy,
        f1_macro,
        feature_names: FEATURE_NAMES,
        iso_threshold,
        iso_n_estimators: isoNTrees,
      },
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(MODEL_KEY, blob, { upsert: true, contentType: "application/json" });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    const duration_seconds = (Date.now() - startedAt) / 1000;

    await supabaseAdmin.from("ml_training_logs").insert({
      user_id: user.id,
      model_name: "imei-risk-rf-iso",
      accuracy,
      loss: 1 - f1_macro,
      epochs: nTrees,
      training_samples: samples,
      duration_seconds,
      status: "completed",
    });

    return json({
      success: true,
      accuracy,
      f1_macro,
      samples,
      duration_seconds,
      trees: nTrees,
    });
  } catch (err) {
    console.error("ml-train error:", err);
    return json({ error: err instanceof Error ? err.message : "Training failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
