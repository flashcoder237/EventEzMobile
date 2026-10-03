/**
 * En-tête de marque commun aux PDF générés sur le téléphone (billet, billet
 * hors ligne, récapitulatif d'inscription).
 *
 * Retour testeur 2026-10-03 : le billet PDF était « très nu » (aucun logo,
 * juste « EventEz » en gris dans le pied). expo-print ne charge pas les assets
 * locaux par chemin : le logotype est embarqué en data URI (base64), lu une
 * fois puis mis en cache. Si la lecture échoue, on retombe sur le nom en texte.
 */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

let cachedLogo: string | null | undefined;

export async function getBrandLogoDataUri(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const asset = Asset.fromModule(require('../../../assets/logo.png'));
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) throw new Error('logo uri');
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    cachedLogo = b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

/** CSS des blocs ci-dessous (à insérer dans le <style> du document). */
export const BRAND_PDF_CSS = `
  .ez-brand { display:flex; align-items:center; justify-content:space-between;
    padding-bottom:14px; margin-bottom:22px; border-bottom:2px solid #4F46E5; }
  .ez-brand img { height:30px; width:auto; display:block; }
  .ez-brand .ez-name { font-size:22px; font-weight:800; color:#4F46E5; letter-spacing:-0.5px; }
  .ez-brand .ez-site { color:#6B7280; font-size:10px; text-align:right; line-height:1.4; }
  .ez-foot { margin-top:32px; padding-top:12px; border-top:1px solid #E5E7EB;
    color:#9CA3AF; font-size:10px; text-align:center; line-height:1.5; }
`;

/** Bandeau : logotype à gauche (ratio respecté), site + mention à droite. */
export function brandHeaderHtml(logoDataUri: string | null, rightLine?: string): string {
  const mark = logoDataUri
    ? `<img src="${logoDataUri}" alt="EventEz" />`
    : '<span class="ez-name">EventEz</span>';
  return `<div class="ez-brand">${mark}<div class="ez-site">eventez.online${
    rightLine ? `<br/>${rightLine}` : ''
  }</div></div>`;
}

export function brandFooterHtml(line: string): string {
  return `<div class="ez-foot">${line}<br/>EventEz · eventez.online</div>`;
}
