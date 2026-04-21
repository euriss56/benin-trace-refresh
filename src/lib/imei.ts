/**
 * Validation IMEI standard via algorithme de Luhn.
 * Un IMEI valide a exactement 15 chiffres et passe le checksum Luhn.
 */
export function isValidImei(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Extrait le TAC (Type Allocation Code) — les 8 premiers chiffres de l'IMEI.
 * Identifie le modèle et le constructeur du téléphone.
 */
export function extractTac(imei: string): string {
  return imei.slice(0, 8);
}

export interface DeviceInfo {
  brand: string;
  model: string;
  origin: string;
}

/**
 * Base TAC simplifiée — quelques marques courantes au Bénin.
 * Dans une implémentation production, utiliser une vraie base TAC (ex: gsma.com).
 */
const TAC_DB: Record<string, DeviceInfo> = {
  "35328111": { brand: "Apple", model: "iPhone 13", origin: "États-Unis" },
  "35328110": { brand: "Apple", model: "iPhone 12", origin: "États-Unis" },
  "35896081": { brand: "Samsung", model: "Galaxy S21", origin: "Corée du Sud" },
  "35896082": { brand: "Samsung", model: "Galaxy A52", origin: "Corée du Sud" },
  "86412405": { brand: "Tecno", model: "Camon 19", origin: "Chine" },
  "86412406": { brand: "Tecno", model: "Spark 10", origin: "Chine" },
  "86423501": { brand: "Infinix", model: "Hot 12", origin: "Chine" },
  "86512301": { brand: "Itel", model: "A56", origin: "Chine" },
  "35283910": { brand: "Xiaomi", model: "Redmi Note 11", origin: "Chine" },
};

export function lookupTac(imei: string): DeviceInfo | null {
  const tac = extractTac(imei);
  return TAC_DB[tac] ?? null;
}
