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
