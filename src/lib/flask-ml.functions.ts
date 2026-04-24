import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Score ML via API Flask externe.
 * Contrat (configuré via secrets FLASK_ML_API_URL + FLASK_ML_API_KEY) :
 *   POST {URL}/predict
 *   Authorization: Bearer {KEY}
 *   Body: { imei: "..." }
 *   Réponse: { status, color, ensemble_score, luhn_valid, message }
 */
export const flaskPredictFn = createServerFn({ method: "POST" })
  .inputValidator((input: { imei: string }) =>
    z
      .object({
        imei: z
          .string()
          .regex(/^\d{15}$/, "IMEI doit contenir exactement 15 chiffres"),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const apiUrl = process.env.FLASK_ML_API_URL;
    const apiKey = process.env.FLASK_ML_API_KEY;

    if (!apiUrl) {
      return {
        available: false as const,
        error: "FLASK_ML_API_URL not configured",
      };
    }
    if (!apiKey) {
      return {
        available: false as const,
        error: "FLASK_ML_API_KEY not configured",
      };
    }

    const url = `${apiUrl.replace(/\/$/, "")}/predict`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ imei: data.imei }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`Flask ML API ${res.status}: ${text.slice(0, 200)}`);
        return {
          available: false as const,
          error: `Flask API error (${res.status})`,
        };
      }

      const json = (await res.json()) as {
        status?: string;
        color?: string;
        ensemble_score?: number;
        luhn_valid?: boolean;
        message?: string;
      };

      const score =
        typeof json.ensemble_score === "number"
          ? Math.max(0, Math.min(1, json.ensemble_score))
          : 0;
      const status = (json.status ?? "LEGITIME").toUpperCase();
      const classification: "legitimate" | "suspect" | "stolen" =
        status === "CLONE_DETECTE" || status === "VOLE" || status === "STOLEN"
          ? "stolen"
          : status === "SUSPECT"
            ? "suspect"
            : "legitimate";

      return {
        available: true as const,
        risk_score: score,
        classification,
        status,
        color: json.color ?? null,
        luhn_valid: json.luhn_valid ?? null,
        message: json.message ?? null,
      };
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : "unknown";
      console.error("Flask ML fetch failed:", msg);
      return {
        available: false as const,
        error: `Flask API unreachable: ${msg}`,
      };
    }
  });
