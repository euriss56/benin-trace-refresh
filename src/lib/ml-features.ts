/**
 * Module d'extraction et génération de features ML pour vérification IMEI.
 *
 * Features (8 dimensions numériques) :
 *  0. is_valid_luhn         — 0 ou 1
 *  1. tac_match             — 0 ou 1 (TAC connu dans la base)
 *  2. check_count_norm      — nb de vérifications historiques (clip 0-50, normalisé /50)
 *  3. distinct_users_norm   — nb d'utilisateurs distincts ayant vérifié (clip 0-20, /20)
 *  4. theft_reported        — 0 ou 1 (présent dans stolen_phones)
 *  5. age_days_norm         — ancienneté de la 1ère vérif en jours (clip 0-365, /365)
 *  6. recent_freq           — vérifs sur 24h (clip 0-30, /30) → fréquence anormale
 *  7. zone_diversity_norm   — nb de villes distinctes vues (clip 0-10, /10)
 *
 * Ces features sont utilisées à la fois pour entraîner le modèle (données simulées)
 * et pour prédire en production (extraites depuis la DB).
 */

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

/** Labels : 0 = légitime, 1 = suspect, 2 = volé */
export type Label = 0 | 1 | 2;
export const LABEL_NAMES: Record<Label, "legitimate" | "suspect" | "stolen"> = {
  0: "legitimate",
  1: "suspect",
  2: "stolen",
};

// ============================================================================
//  Algorithme Luhn (réutilisé pour génération)
// ============================================================================
function luhnCheck(digits: number[]): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function makeLuhnValidImei(rng: () => number): string {
  const digits: number[] = [];
  for (let i = 0; i < 14; i++) digits.push(Math.floor(rng() * 10));
  // Trouver le check digit pour Luhn
  for (let c = 0; c < 10; c++) {
    if (luhnCheck([...digits, c])) {
      digits.push(c);
      return digits.join("");
    }
  }
  digits.push(0);
  return digits.join("");
}

function makeInvalidImei(rng: () => number): string {
  const digits: number[] = [];
  for (let i = 0; i < 15; i++) digits.push(Math.floor(rng() * 10));
  // S'assurer que ce n'est PAS valide
  if (luhnCheck(digits)) {
    digits[14] = (digits[14] + 1) % 10;
  }
  return digits.join("");
}

// ============================================================================
//  Générateur RNG seedable (Mulberry32)
// ============================================================================
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
  // Box-Muller
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clip(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ============================================================================
//  Génération d'un sample synthétique selon un label cible
// ============================================================================
function generateLegitimate(rng: () => number): FeatureVector {
  return [
    1, // luhn valide
    rng() < 0.92 ? 1 : 0, // TAC connu (92%)
    clip(gauss(rng, 3, 2) / 50, 0, 1), // peu de vérifs (~3)
    clip(gauss(rng, 1.5, 1) / 20, 0, 1), // 1-2 users distincts
    0, // pas signalé volé
    clip(gauss(rng, 90, 60) / 365, 0, 1), // ancienneté répartie
    clip(gauss(rng, 1, 1) / 30, 0, 1), // fréquence basse
    clip(gauss(rng, 1.2, 0.8) / 10, 0, 1), // peu de zones
  ];
}

function generateSuspect(rng: () => number): FeatureVector {
  // Patterns suspects : Luhn invalide OU TAC inconnu OU fréquence anormale OU zones multiples
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
  // Téléphone volé : signalé, vérifs fréquentes par utilisateurs différents, zones multiples
  return [
    rng() < 0.95 ? 1 : 0, // Luhn généralement valide
    rng() < 0.85 ? 1 : 0, // TAC connu en majorité
    clip(gauss(rng, 25, 10) / 50, 0, 1), // beaucoup de vérifs
    clip(gauss(rng, 12, 4) / 20, 0, 1), // beaucoup d'users
    1, // signalé volé
    clip(gauss(rng, 15, 12) / 365, 0, 1), // récent
    clip(gauss(rng, 22, 6) / 30, 0, 1), // fréquence haute
    clip(gauss(rng, 7, 2) / 10, 0, 1), // zones multiples
  ];
}

/**
 * Génère un dataset synthétique de N samples avec distribution 70/20/10.
 */
export function generateDataset(
  n: number,
  seed = 42
): { X: FeatureVector[]; y: Label[] } {
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
  // Shuffle Fisher-Yates
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [X[i], X[j]] = [X[j], X[i]];
    [y[i], y[j]] = [y[j], y[i]];
  }
  return { X, y };
}

/** Génère aussi quelques IMEI synthétiques (utile pour tests/démo). */
export function generateSyntheticImeis(n: number, seed = 7): string[] {
  const rng = seededRng(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(rng() < 0.85 ? makeLuhnValidImei(rng) : makeInvalidImei(rng));
  }
  return out;
}

// ============================================================================
//  Extraction de features depuis la DB (production)
// ============================================================================
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
