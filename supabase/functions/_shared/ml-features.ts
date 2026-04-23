// Shared ML feature module for Supabase Edge Functions (Deno).
// Mirror of src/lib/ml-features.ts (kept in sync manually).

export const FEATURE_NAMES = [
  "is_valid_luhn",
  "tac_match",
  "check_count_norm",
  "distinct_users_norm",
  "theft_reported",
  "age_days_norm",
  "recent_freq",
  "zone_diversity_norm",
] as const;

export type FeatureVector = number[];
export type Label = 0 | 1 | 2;
export const LABEL_NAMES: Record<Label, "legitimate" | "suspect" | "stolen"> = {
  0: "legitimate",
  1: "suspect",
  2: "stolen",
};

export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number, mean: number, std: number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function generateLegitimate(rng: () => number): FeatureVector {
  return [
    1,
    rng() < 0.92 ? 1 : 0,
    clip(gauss(rng, 3, 2) / 50, 0, 1),
    clip(gauss(rng, 1.5, 1) / 20, 0, 1),
    0,
    clip(gauss(rng, 90, 60) / 365, 0, 1),
    clip(gauss(rng, 1, 1) / 30, 0, 1),
    clip(gauss(rng, 1.2, 0.8) / 10, 0, 1),
  ];
}

function generateSuspect(rng: () => number): FeatureVector {
  const pattern = Math.floor(rng() * 4);
  const luhn = pattern === 0 ? 0 : 1;
  const tac = pattern === 1 ? 0 : rng() < 0.5 ? 0 : 1;
  const freq = pattern === 2 ? clip(gauss(rng, 18, 6) / 30, 0, 1) : clip(gauss(rng, 5, 3) / 30, 0, 1);
  const zones = pattern === 3 ? clip(gauss(rng, 6, 2) / 10, 0, 1) : clip(gauss(rng, 2, 1) / 10, 0, 1);
  return [
    luhn,
    tac,
    clip(gauss(rng, 12, 6) / 50, 0, 1),
    clip(gauss(rng, 5, 2) / 20, 0, 1),
    0,
    clip(gauss(rng, 30, 30) / 365, 0, 1),
    freq,
    zones,
  ];
}

function generateStolen(rng: () => number): FeatureVector {
  return [
    rng() < 0.95 ? 1 : 0,
    rng() < 0.85 ? 1 : 0,
    clip(gauss(rng, 25, 10) / 50, 0, 1),
    clip(gauss(rng, 12, 4) / 20, 0, 1),
    1,
    clip(gauss(rng, 15, 12) / 365, 0, 1),
    clip(gauss(rng, 22, 6) / 30, 0, 1),
    clip(gauss(rng, 7, 2) / 10, 0, 1),
  ];
}

export function generateDataset(n: number, seed = 42): { X: FeatureVector[]; y: Label[] } {
  const rng = seededRng(seed);
  const X: FeatureVector[] = new Array(n);
  const y: Label[] = new Array(n);
  const nLegit = Math.floor(n * 0.7);
  const nSusp = Math.floor(n * 0.2);
  for (let i = 0; i < n; i++) {
    let label: Label;
    if (i < nLegit) label = 0;
    else if (i < nLegit + nSusp) label = 1;
    else label = 2;
    X[i] = label === 0 ? generateLegitimate(rng) : label === 1 ? generateSuspect(rng) : generateStolen(rng);
    y[i] = label;
  }
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [X[i], X[j]] = [X[j], X[i]];
    [y[i], y[j]] = [y[j], y[i]];
  }
  return { X, y };
}

export interface CheckRow {
  user_id: string | null;
  checked_at: string;
}

export interface ExtractInput {
  isValidLuhn: boolean;
  tacKnown: boolean;
  checks: CheckRow[];
  stolenReported: boolean;
  cityCount?: number;
}

export function extractFeaturesFromDb(input: ExtractInput): FeatureVector {
  const checks = input.checks ?? [];
  const checkCount = checks.length;
  const distinctUsers = new Set(checks.map((c) => c.user_id).filter(Boolean)).size;

  let ageDays = 0;
  let recentFreq = 0;
  if (checks.length > 0) {
    const dates = checks
      .map((c) => new Date(c.checked_at).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);
    if (dates.length > 0) {
      ageDays = (Date.now() - dates[0]) / (1000 * 60 * 60 * 24);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      recentFreq = dates.filter((t) => t >= dayAgo).length;
    }
  }

  return [
    input.isValidLuhn ? 1 : 0,
    input.tacKnown ? 1 : 0,
    clip(checkCount / 50, 0, 1),
    clip(distinctUsers / 20, 0, 1),
    input.stolenReported ? 1 : 0,
    clip(ageDays / 365, 0, 1),
    clip(recentFreq / 30, 0, 1),
    clip((input.cityCount ?? 1) / 10, 0, 1),
  ];
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
