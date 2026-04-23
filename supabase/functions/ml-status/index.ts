// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS } from "../_shared/ml-features.ts";

const BUCKET = "ml-models";
const MODEL_KEY = "imei-risk/current.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(MODEL_KEY);
    if (error || !data) return json({ exists: false });

    const text = await data.text();
    const parsed = JSON.parse(text);
    return json({
      exists: true,
      trained_at: parsed.meta.trained_at,
      accuracy: parsed.meta.accuracy,
      f1_macro: parsed.meta.f1_macro,
      samples: parsed.meta.samples,
    });
  } catch (err) {
    console.error("ml-status error:", err);
    return json({ exists: false });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
