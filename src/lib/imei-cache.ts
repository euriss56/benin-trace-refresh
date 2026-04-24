/**
 * Cache IndexedDB local — 50 derniers IMEI vérifiés.
 * Utilisé en mode hors-ligne pour afficher le dernier résultat connu.
 * Conforme à la loi béninoise n° 2017-20 : aucune coordonnée GPS stockée.
 */
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "traceimei-cache";
const STORE = "imei-checks";
const DB_VERSION = 1;
const MAX_ENTRIES = 50;

export interface CachedCheck {
  imei: string;
  status: "safe" | "suspect" | "stolen";
  score: number;
  source: "flask" | "ml" | "fallback";
  reasons: string[];
  device: { brand: string; model: string; origin: string } | null;
  cachedAt: number;
}

let _dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") return null;
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "imei" });
          store.createIndex("cachedAt", "cachedAt");
        }
      },
    });
  }
  return _dbPromise;
}

export async function cacheImeiCheck(entry: CachedCheck): Promise<void> {
  const dbPromise = getDb();
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    await db.put(STORE, entry);
    // Trim au-delà de MAX_ENTRIES (FIFO sur cachedAt)
    const all = await db.getAllFromIndex(STORE, "cachedAt");
    if (all.length > MAX_ENTRIES) {
      const toDelete = all.slice(0, all.length - MAX_ENTRIES);
      const tx = db.transaction(STORE, "readwrite");
      for (const item of toDelete) await tx.store.delete(item.imei);
      await tx.done;
    }
  } catch (err) {
    console.warn("IndexedDB cache write failed:", err);
  }
}

export async function getCachedImeiCheck(
  imei: string
): Promise<CachedCheck | null> {
  const dbPromise = getDb();
  if (!dbPromise) return null;
  try {
    const db = await dbPromise;
    const entry = (await db.get(STORE, imei)) as CachedCheck | undefined;
    return entry ?? null;
  } catch {
    return null;
  }
}

export async function getRecentCachedChecks(
  limit = 50
): Promise<CachedCheck[]> {
  const dbPromise = getDb();
  if (!dbPromise) return [];
  try {
    const db = await dbPromise;
    const all = (await db.getAllFromIndex(STORE, "cachedAt")) as CachedCheck[];
    return all.reverse().slice(0, limit);
  } catch {
    return [];
  }
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
