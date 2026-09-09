import { withJwt } from '../visioUrl';

describe('withJwt', () => {
  it('ajoute jwt en query sur une URL simple', () => {
    expect(withJwt('https://h/room', 'TOK')).toBe('https://h/room?jwt=TOK');
  });

  it('utilise & si une query existe déjà', () => {
    expect(withJwt('https://h/room?foo=bar', 'TOK')).toBe('https://h/room?foo=bar&jwt=TOK');
  });

  it('insère jwt AVANT le fragment #config (bug critique)', () => {
    expect(withJwt('https://h/room#config.x=1', 'TOK')).toBe('https://h/room?jwt=TOK#config.x=1');
  });

  it('gère query ET fragment', () => {
    expect(withJwt('https://h/room?a=1#config.x=1', 'TOK')).toBe('https://h/room?a=1&jwt=TOK#config.x=1');
  });

  it('ne double pas le jwt s’il est déjà présent', () => {
    expect(withJwt('https://h/room?jwt=OLD#c', 'NEW')).toBe('https://h/room?jwt=OLD#c');
  });

  it('no-op si url ou token manquant', () => {
    expect(withJwt('', 'TOK')).toBe('');
    expect(withJwt('https://h/room', undefined)).toBe('https://h/room');
  });
});

// ─── Interface Jitsi ────────────────────────────────────────────────────────
// La visio s'ouvrait avec DEUX barres de titre superposees : celle de l'app
// et celle de Jitsi, qui affiche le nom BRUT de la salle
// (`eventez-95a9e578-f7b0-418f-…`). Elles se chevauchaient avec la vignette
// camera et le bandeau d'enregistrement — haut de l'ecran illisible.

import { withJitsiUi } from '../visioUrl';

describe('withJitsiUi', () => {
  it('masque l en-tete Jitsi et l ecran de pre-accueil', () => {
    const out = withJitsiUi('https://meet.example.com/eventez-abc');
    expect(out).toContain('#');
    expect(out).toContain('config.prejoinPageEnabled=false');
    expect(out).toContain('config.hideConferenceSubject=true');
    expect(out).toContain('config.hideConferenceTimer=true');
  });

  it('ne casse PAS le JWT — il reste dans la query, jamais dans le fragment', () => {
    // Le piege : un JWT deplace dans le fragment n'est pas lu par Jitsi,
    // l'acces est alors refuse.
    const withToken = withJwt('https://8x8.vc/app/room', 'tok.en.value');
    const out = withJitsiUi(withToken);

    const [query, fragment] = out.split('#');
    expect(query).toContain('jwt=tok.en.value');
    expect(fragment).not.toContain('jwt=');
  });

  it('ordre inverse : appliquer le JWT APRES l interface marche aussi', () => {
    const out = withJwt(withJitsiUi('https://8x8.vc/app/room'), 'tok.en.value');
    const [query, fragment] = out.split('#');
    expect(query).toContain('jwt=tok.en.value');
    expect(fragment).toContain('config.prejoinPageEnabled=false');
  });

  it('preserve une query existante', () => {
    const out = withJitsiUi('https://meet.example.com/room?foo=bar');
    expect(out.split('#')[0]).toBe('https://meet.example.com/room?foo=bar');
  });

  it('n ecrase pas un reglage deja pose par l appelant', () => {
    const out = withJitsiUi('https://meet.example.com/room#config.prejoinPageEnabled=true');
    expect(out).toContain('config.prejoinPageEnabled=true');
    expect(out).not.toContain('config.prejoinPageEnabled=false');
  });

  it('est idempotent : deux appels ne dupliquent rien', () => {
    const once = withJitsiUi('https://meet.example.com/room');
    const twice = withJitsiUi(once);
    expect(twice).toBe(once);
  });

  it('tolere une URL vide', () => {
    expect(withJitsiUi('')).toBe('');
  });
});
