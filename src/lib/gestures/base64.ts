/**
 * Décodage base64 → octets, sans dépendance (la capture d'écran de G2 arrive
 * en base64 ; Sentry attend des octets pour une pièce jointe image).
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP: Record<string, number> = {};
for (let i = 0; i < ALPHABET.length; i++) LOOKUP[ALPHABET[i]] = i;

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean[i]] ?? 0;
    const b = LOOKUP[clean[i + 1]] ?? 0;
    const c = LOOKUP[clean[i + 2]];
    const d = LOOKUP[clean[i + 3]];
    out[o++] = (a << 2) | (b >> 4);
    if (c !== undefined) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d !== undefined) out[o++] = ((c! & 3) << 6) | d;
  }
  return out.subarray(0, o);
}
