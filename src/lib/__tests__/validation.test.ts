/**
 * Tests de lib/validation.ts — validateurs de formulaire (fonctions pures).
 *
 * Couverture maximale : pour chaque validateur, le cas valide + tous les cas
 * d'échec + les bornes (min/max, requis/optionnel). Puis validateForm,
 * hasErrors et les schémas login/register/profile.
 */
import { validators, validateForm, hasErrors, validationSchemas } from '../validation';

describe('required', () => {
  it('rejette vide / espaces / null / undefined', () => {
    expect(validators.required('')).toMatch(/requis/);
    expect(validators.required('   ')).toMatch(/requis/);
    expect(validators.required(null)).toMatch(/requis/);
    expect(validators.required(undefined)).toMatch(/requis/);
  });
  it('accepte une valeur non vide', () => {
    expect(validators.required('x')).toBeNull();
  });
  it('utilise le nom de champ fourni', () => {
    expect(validators.required('', 'Le prénom')).toBe('Le prénom est requis');
  });
});

describe('email', () => {
  it('rejette vide', () => { expect(validators.email('')).toMatch(/requis/); });
  it.each(['abc', 'a@b', 'a@b.', '@b.com', 'a b@c.com', 'a@b c.com'])(
    'rejette le format invalide "%s"', (v) => { expect(validators.email(v)).toMatch(/invalide/); },
  );
  it.each(['a@b.com', 'john.doe@example.co', 'x+tag@sub.domain.io'])(
    'accepte "%s"', (v) => { expect(validators.email(v)).toBeNull(); },
  );
  it('trim avant validation', () => { expect(validators.email('  a@b.com  ')).toBeNull(); });
});

describe('password', () => {
  it('rejette vide', () => { expect(validators.password('')).toMatch(/requis/); });
  it('rejette trop court (défaut 6)', () => { expect(validators.password('12345')).toMatch(/6 caracteres/); });
  it('accepte >= minLength', () => { expect(validators.password('123456')).toBeNull(); });
  it('respecte un minLength custom', () => {
    expect(validators.password('1234567', 8)).toMatch(/8 caracteres/);
    expect(validators.password('12345678', 8)).toBeNull();
  });
});

describe('confirmPassword', () => {
  it('rejette vide', () => { expect(validators.confirmPassword('', 'x')).toMatch(/requise/); });
  it('rejette non correspondant', () => { expect(validators.confirmPassword('a', 'b')).toMatch(/ne correspondent pas/); });
  it('accepte correspondant', () => { expect(validators.confirmPassword('same', 'same')).toBeNull(); });
});

describe('username', () => {
  it('rejette vide', () => { expect(validators.username('')).toMatch(/requis/); });
  it('rejette trop court', () => { expect(validators.username('ab')).toMatch(/3 caracteres/); });
  it.each(['john doe', 'a-b-c', 'ééé', 'a@b.c'])(
    'rejette caractères interdits "%s" (>= 3 car.)', (v) => { expect(validators.username(v)).toMatch(/underscore/); },
  );
  it.each(['abc', 'john_doe', 'User123'])(
    'accepte "%s"', (v) => { expect(validators.username(v)).toBeNull(); },
  );
});

describe('phone', () => {
  it('optionnel : vide → null', () => { expect(validators.phone('')).toBeNull(); });
  it('requis : vide → erreur', () => { expect(validators.phone('', true)).toMatch(/requis/); });
  it('rejette trop court (<8)', () => { expect(validators.phone('1234567')).toMatch(/invalide/); });
  it('rejette trop long (>15)', () => { expect(validators.phone('1234567890123456')).toMatch(/invalide/); });
  it('accepte format international + espaces/tirets nettoyés', () => {
    expect(validators.phone('+237 6 99-88-77-66')).toBeNull();
    expect(validators.phone('677123456')).toBeNull();
  });
  it('rejette les lettres', () => { expect(validators.phone('abcdefgh')).toMatch(/invalide/); });
});

describe('url', () => {
  it('optionnel : vide → null', () => { expect(validators.url('')).toBeNull(); });
  it('requis : vide → erreur', () => { expect(validators.url('', true)).toMatch(/requise/); });
  it('accepte http(s) et domaine nu', () => {
    expect(validators.url('https://example.com')).toBeNull();
    expect(validators.url('example.com/path')).toBeNull();
  });
  it('rejette une url manifestement invalide', () => {
    expect(validators.url('not a url !!')).toMatch(/invalide/);
  });
});

describe('minLength / maxLength', () => {
  it('minLength : sous la limite → erreur, au-dessus → null', () => {
    expect(validators.minLength('ab', 3)).toMatch(/au moins 3/);
    expect(validators.minLength('abc', 3)).toBeNull();
  });
  it('minLength ignore une valeur vide (pas de garde requis ici)', () => {
    expect(validators.minLength('', 3)).toBeNull();
  });
  it('maxLength : au-dessus → erreur, en dessous → null', () => {
    expect(validators.maxLength('abcd', 3)).toMatch(/depasser 3/);
    expect(validators.maxLength('abc', 3)).toBeNull();
  });
});

describe('number', () => {
  it('optionnel : vide → null ; requis : vide → erreur', () => {
    expect(validators.number('')).toBeNull();
    expect(validators.number('', { required: true })).toMatch(/requis/);
  });
  it('rejette non numérique', () => { expect(validators.number('abc')).toMatch(/nombre valide/); });
  it('respecte min et max', () => {
    expect(validators.number('4', { min: 5 })).toMatch(/minimale est 5/);
    expect(validators.number('11', { max: 10 })).toMatch(/maximale est 10/);
    expect(validators.number('7', { min: 5, max: 10 })).toBeNull();
  });
  it('accepte les décimaux', () => { expect(validators.number('3.14')).toBeNull(); });
});

describe('date', () => {
  it('optionnel : vide → null ; requis : vide → erreur', () => {
    expect(validators.date('')).toBeNull();
    expect(validators.date('', { required: true })).toMatch(/requise/);
  });
  it('rejette une date invalide', () => { expect(validators.date('pas-une-date')).toMatch(/invalide/); });
  it('respecte minDate / maxDate', () => {
    const min = new Date('2026-01-01');
    const max = new Date('2026-12-31');
    expect(validators.date('2025-06-01', { minDate: min })).toMatch(/apres/);
    expect(validators.date('2027-01-01', { maxDate: max })).toMatch(/avant/);
    expect(validators.date('2026-06-01', { minDate: min, maxDate: max })).toBeNull();
  });
});

describe('validateForm + hasErrors', () => {
  it('collecte les erreurs par champ', () => {
    const errors = validateForm(
      { email: 'bad', name: '' },
      { email: validators.email, name: (v) => validators.required(v, 'Le nom') },
    );
    expect(errors.email).toBeDefined();
    expect(errors.name).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });
  it('form valide → aucune erreur', () => {
    const errors = validateForm(
      { email: 'a@b.com' },
      { email: validators.email },
    );
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });
  it('un champ sans validateur est ignoré', () => {
    const errors = validateForm({ email: 'bad', other: 'x' } as any, { email: validators.email });
    expect(Object.keys(errors)).toEqual(['email']);
  });
});

describe('schémas prédéfinis', () => {
  it('login : email + password requis', () => {
    expect(hasErrors(validationSchemas.login({ email: 'bad', password: '123' }))).toBe(true);
    expect(hasErrors(validationSchemas.login({ email: 'a@b.com', password: '123456' }))).toBe(false);
  });
  it('register : password >= 8 + confirmation + noms', () => {
    const ok = validationSchemas.register({
      email: 'a@b.com', username: 'john_doe', password: '12345678',
      confirmPassword: '12345678', first_name: 'John', last_name: 'Doe',
    });
    expect(hasErrors(ok)).toBe(false);

    const bad = validationSchemas.register({
      email: 'a@b.com', username: 'jd', password: '123',
      confirmPassword: 'xxx', first_name: '', last_name: '',
    });
    expect(bad.username).toBeDefined();
    expect(bad.password).toBeDefined();
    expect(bad.confirmPassword).toBeDefined();
    expect(bad.first_name).toBeDefined();
    expect(bad.last_name).toBeDefined();
  });
  it('profile : noms requis, téléphone optionnel', () => {
    expect(hasErrors(validationSchemas.profile({ first_name: 'A', last_name: 'B' }))).toBe(false);
    expect(hasErrors(validationSchemas.profile({ first_name: '', last_name: 'B' }))).toBe(true);
    // téléphone invalide bloque
    expect(hasErrors(validationSchemas.profile({ first_name: 'A', last_name: 'B', phone: 'xx' }))).toBe(true);
  });
});
