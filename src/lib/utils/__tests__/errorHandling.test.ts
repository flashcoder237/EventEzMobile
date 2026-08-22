import {
  extractErrorMessage,
  extractFieldErrors,
  isAuthError,
  isNetworkError,
  isValidationError,
} from '../errorHandling';

describe('extractErrorMessage', () => {
  it('returns data.detail when present', () => {
    const err = { response: { data: { detail: 'Identifiants invalides' } } };
    expect(extractErrorMessage(err)).toBe('Identifiants invalides');
  });

  it('returns first field error (email)', () => {
    const err = {
      response: { data: { email: ['Email invalide'] } },
    };
    expect(extractErrorMessage(err)).toBe('Email invalide');
  });

  it('returns string field value directly (not array)', () => {
    const err = {
      response: { data: { password: 'Mot de passe trop court' } },
    };
    expect(extractErrorMessage(err)).toBe('Mot de passe trop court');
  });

  it('returns non_field_errors first entry', () => {
    const err = {
      response: { data: { non_field_errors: ['Compte desactive'] } },
    };
    expect(extractErrorMessage(err)).toBe('Compte desactive');
  });

  it('maps HTTP 401 to session expired', () => {
    const err = { response: { status: 401, data: {} } };
    expect(extractErrorMessage(err)).toContain('Session expiree');
  });

  it('maps HTTP 429 to rate limit message', () => {
    const err = { response: { status: 429, data: {} } };
    expect(extractErrorMessage(err)).toContain('Trop de requetes');
  });

  it('maps HTTP 500 to server error', () => {
    const err = { response: { status: 500, data: {} } };
    expect(extractErrorMessage(err)).toContain('Erreur serveur');
  });

  it('handles network errors', () => {
    const err = { message: 'Network Error' };
    expect(extractErrorMessage(err)).toMatch(/serveur|connexion/i);
  });

  it('handles timeout', () => {
    const err = { code: 'ECONNABORTED' };
    expect(extractErrorMessage(err)).toContain('trop de temps');
  });

  it("n'expose PAS le error.message brut a l'utilisateur", () => {
    // Un `error.message` brut est technique et souvent en anglais (« Something
    // went wrong », « Request failed with status code 500 »). On renvoie un
    // message generique en francais plutot que de le faire remonter tel quel.
    const err = { message: 'Something went wrong' };
    const out = extractErrorMessage(err);
    expect(out).not.toBe('Something went wrong');
    expect(out).toEqual(expect.any(String));
    expect(out.length).toBeGreaterThan(0);
  });

  it('returns generic message for empty error', () => {
    expect(extractErrorMessage({})).toMatch(/erreur/i);
  });
});

describe('extractFieldErrors', () => {
  it('returns field -> first message map', () => {
    const err = {
      response: {
        data: {
          email: ['Email invalide'],
          password: ['Trop court', 'Doit contenir un chiffre'],
        },
      },
    };
    expect(extractFieldErrors(err)).toEqual({
      email: 'Email invalide',
      password: 'Trop court',
    });
  });

  it('excludes detail and non_field_errors', () => {
    const err = {
      response: {
        data: {
          email: 'bad',
          detail: 'global',
          non_field_errors: ['x'],
        },
      },
    };
    expect(extractFieldErrors(err)).toEqual({ email: 'bad' });
  });

  it('returns empty object if no response', () => {
    expect(extractFieldErrors({})).toEqual({});
  });
});

describe('isAuthError', () => {
  it('returns true for status 401', () => {
    expect(isAuthError({ response: { status: 401 } })).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isAuthError({ response: { status: 403 } })).toBe(false);
    expect(isAuthError({})).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('returns true for Network Error message', () => {
    expect(isNetworkError({ message: 'Network Error' })).toBe(true);
  });

  it('returns true for ECONNABORTED', () => {
    expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true);
  });

  it('returns true when there is no response', () => {
    expect(isNetworkError({})).toBe(true);
  });

  it('returns false when response exists', () => {
    expect(isNetworkError({ response: { status: 500 } })).toBe(false);
  });
});

describe('isValidationError', () => {
  it('returns true for status 400', () => {
    expect(isValidationError({ response: { status: 400 } })).toBe(true);
  });

  it('returns false otherwise', () => {
    expect(isValidationError({ response: { status: 500 } })).toBe(false);
  });
});
