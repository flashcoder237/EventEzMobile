/**
 * Chargement OTA des traductions d'interface.
 *
 * fr/en sont bundlés dans l'app (fallback offline, cf. i18n/index.ts). TOUTE
 * autre langue est téléchargée à la demande depuis un hébergement distant
 * (CDN/endpoint), puis mise en cache disque. Permet de supporter n'importe
 * quelle langue sans alourdir le binaire ni rebuild — il suffit de publier un
 * nouveau `{lang}.json`.
 *
 * URL de base configurable via EXPO_PUBLIC_TRANSLATIONS_URL (ex:
 * "https://cdn.eventez.online/i18n"). Si non définie, le chargement distant est
 * désactivé (seules fr/en fonctionnent → fallback en pour le reste).
 *
 * Format attendu de {lang}.json : le même objet plat de clés que
 * src/i18n/locales/en.json.
 */
import * as FileSystem from 'expo-file-system/legacy';

const REMOTE_BASE = (process.env.EXPO_PUBLIC_TRANSLATIONS_URL || '').replace(/\/+$/, '');
const CACHE_DIR = `${FileSystem.documentDirectory}i18n/`;

async function ensureCacheDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch {
    /* best-effort */
  }
}

async function readCache(lang: string): Promise<Record<string, any> | null> {
  try {
    const path = `${CACHE_DIR}${lang}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(lang: string, json: Record<string, any>): Promise<void> {
  try {
    await ensureCacheDir();
    await FileSystem.writeAsStringAsync(`${CACHE_DIR}${lang}.json`, JSON.stringify(json));
  } catch {
    /* best-effort — un échec d'écriture ne doit pas casser le changement de langue */
  }
}

/**
 * Récupère les traductions d'une langue : cache disque d'abord, puis
 * téléchargement distant. Retourne null si indisponible (→ l'appelant garde le
 * fallback en). Best-effort, ne throw jamais.
 */
export async function getRemoteTranslation(lang: string): Promise<Record<string, any> | null> {
  // 1. Cache disque (instantané, marche offline)
  const cached = await readCache(lang);
  if (cached) {
    // Rafraîchissement en arrière-plan (stale-while-revalidate), non bloquant.
    void refreshInBackground(lang);
    return cached;
  }
  // 2. Téléchargement distant
  return downloadAndCache(lang);
}

async function downloadAndCache(lang: string): Promise<Record<string, any> | null> {
  if (!REMOTE_BASE) return null;
  try {
    // Cache-busting : le manifeste porte une version (timestamp) par langue.
    // On l'ajoute en query pour forcer un re-fetch quand la trad est republiée
    // (sinon le CDN/GitHub Pages peut servir une version périmée). Best-effort.
    const manifest = await getTranslationManifest();
    const version = manifest[lang];
    const url = version
      ? `${REMOTE_BASE}/${lang}.json?v=${version}`
      : `${REMOTE_BASE}/${lang}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && typeof json === 'object') {
      await writeCache(lang, json);
      return json;
    }
  } catch {
    /* réseau KO → fallback en */
  }
  return null;
}

async function refreshInBackground(lang: string): Promise<void> {
  // Re-télécharge silencieusement pour mettre à jour le cache si la version
  // distante a changé. On ne ré-applique pas à chaud (sera pris au prochain
  // changement de langue / relaunch) pour éviter un flicker.
  await downloadAndCache(lang);
}

export function remoteTranslationsEnabled(): boolean {
  return !!REMOTE_BASE;
}

/**
 * Manifeste des langues publiées : `{ [code]: version }` (version = timestamp,
 * sert au cache-busting). Publié à `${REMOTE_BASE}/manifest.json`. Mis en cache
 * mémoire pour la session (best-effort, ne throw jamais).
 */
let _manifestCache: Record<string, number> | null = null;

export async function getTranslationManifest(): Promise<Record<string, number>> {
  if (_manifestCache) return _manifestCache;
  if (!REMOTE_BASE) return {};
  try {
    const res = await fetch(`${REMOTE_BASE}/manifest.json`);
    if (!res.ok) return {};
    const json = await res.json();
    if (json && typeof json === 'object') {
      _manifestCache = json as Record<string, number>;
      return _manifestCache;
    }
  } catch {
    /* réseau KO → manifeste vide, seules fr/en resteront proposées */
  }
  return {};
}

/**
 * Codes des langues d'interface RÉELLEMENT disponibles : fr + en (toujours
 * bundlées) + celles publiées sur le CDN. À utiliser pour peupler le sélecteur
 * de langue, afin de ne jamais proposer une langue qui retomberait en anglais.
 */
export async function getAvailableLanguageCodes(): Promise<string[]> {
  const manifest = await getTranslationManifest();
  const codes = new Set<string>(['fr', 'en', ...Object.keys(manifest)]);
  return Array.from(codes);
}
