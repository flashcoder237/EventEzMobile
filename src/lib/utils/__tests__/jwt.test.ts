/**
 * Tests de jwt.ts — décodage défensif du payload JWT (sans vérif signature).
 * Couvre decodeJWT (formats valides/invalides, base64url), getJWTUserId
 * (user_id SimpleJWT vs sub OIDC) et isJWTExpired (exp absent, marge de skew).
 */
import { decodeJWT, getJWTUserId, isJWTExpired } from '../jwt';

// Construit un JWT non signé à partir d'un payload (header.payload.sig).
function makeJWT(payload: Record<string, unknown>): string {
  const b64url = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

describe('decodeJWT', () => {
  it('décode un payload valide', () => {
    const t = makeJWT({ user_id: 42, exp: 1893456000 });
    expect(decodeJWT(t)).toMatchObject({ user_id: 42, exp: 1893456000 });
  });
  it.each([null, undefined, '', 'not.a', 'a.b.c.d', 123 as any])(
    'retourne null pour une entrée invalide (%s)', (t) => { expect(decodeJWT(t)).toBeNull(); },
  );
  it('retourne null si le payload n\'est pas du JSON', () => {
    expect(decodeJWT('aaa.bbb.ccc')).toBeNull();
  });
});

describe('getJWTUserId', () => {
  it('extrait user_id (convention SimpleJWT)', () => {
    expect(getJWTUserId(makeJWT({ user_id: 7 }))).toBe('7');
  });
  it('retombe sur sub (convention OIDC)', () => {
    expect(getJWTUserId(makeJWT({ sub: 'abc-123' }))).toBe('abc-123');
  });
  it('priorité à user_id sur sub', () => {
    expect(getJWTUserId(makeJWT({ user_id: 1, sub: 2 }))).toBe('1');
  });
  it('null si aucun identifiant', () => {
    expect(getJWTUserId(makeJWT({ foo: 'bar' }))).toBeNull();
  });
  it('null pour un token invalide', () => {
    expect(getJWTUserId('garbage')).toBeNull();
  });
});

describe('isJWTExpired', () => {
  const NOW = Math.floor(Date.now() / 1000);
  it('true si exp absent', () => {
    expect(isJWTExpired(makeJWT({ user_id: 1 }))).toBe(true);
  });
  it('true si déjà expiré', () => {
    expect(isJWTExpired(makeJWT({ exp: NOW - 60 }))).toBe(true);
  });
  it('false si encore valide', () => {
    expect(isJWTExpired(makeJWT({ exp: NOW + 3600 }))).toBe(false);
  });
  it('skew : considère expirant bientôt comme expiré', () => {
    // exp dans 30s, mais on demande 60s de marge → traité comme expiré.
    expect(isJWTExpired(makeJWT({ exp: NOW + 30 }), 60)).toBe(true);
    expect(isJWTExpired(makeJWT({ exp: NOW + 120 }), 60)).toBe(false);
  });
  it('true pour un token invalide', () => {
    expect(isJWTExpired('nope')).toBe(true);
  });
});
