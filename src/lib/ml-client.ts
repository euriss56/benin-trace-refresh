// Client wrapper around the ML Supabase Edge Functions.
// Replaces the previous TanStack server functions so the frontend
// can be deployed on Vercel as a SPA.
import { supabase } from "@/integrations/supabase/client";

export interface PredictRiskInput {
  isValidLuhn: boolean;
  tacKnown: boolean;
  stolenReported: boolean;
  checks: { user_id: string | null; checked_at: string }[];
  cityCount?: number;
}

export type PredictRiskResult =
  | {
      available: false;
      features: number[];
      feature_names: readonly string[];
    }
  | {
      available: true;
      risk_score: number;
      classification: "legitimate" | "suspect" | "stolen";
      probabilities: { legitimate: number; suspect: number; stolen: number };
      anomaly: { score: number; threshold: number; is_anomaly: boolean };
      reasons: string[];
      features: number[];
      feature_names: readonly string[];
      model_meta: { trained_at: string; accuracy: number; samples: number };
    };

export interface TrainResult {
  success: true;
  accuracy: number;
  f1_macro: number;
  samples: number;
  duration_seconds: number;
  trees: number;
}

export type ModelStatus =
  | { exists: false }
  | {
      exists: true;
      trained_at: string;
      accuracy: number;
      f1_macro: number;
      samples: number;
    };

async function invoke<T>(name: string, body?: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });
  if (error) throw new Error(error.message ?? `Edge function ${name} failed`);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export const predictRisk = (input: PredictRiskInput) =>
  invoke<PredictRiskResult>("ml-predict", input);

export const trainModel = (input?: { samples?: number; trees?: number }) =>
  invoke<TrainResult>("ml-train", input ?? {});

export const getModelStatus = () => invoke<ModelStatus>("ml-status");
