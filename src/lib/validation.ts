/**
 * Fonctions de validation pour les formulaires
 * Utilisees de maniere coherente dans toute l'application
 */

// Types
export type ValidationResult = string | null;
export type FormErrors<T extends string> = Partial<Record<T, string>>;

/**
 * Fonction de traduction i18n (signature de i18next `t`). Optionnelle sur
 * chaque validateur : si fournie, les messages sont traduits via le namespace
 * `validation.*` (clés déjà présentes en FR/EN). Si absente, on retombe sur
 * le message français littéral (rétro-compat + tests).
 *
 * ⚠️ Sans `t`, les messages restent en français quelle que soit la langue de
 * l'app → mélange FR/EN à l'écran. Toujours passer `t` dans les écrans.
 */
export type TFunc = (key: string, options?: Record<string, unknown>) => string;

/** Traduit `key` si `t` est fourni, sinon renvoie le fallback FR. */
const msg = (t: TFunc | undefined, key: string, fallback: string, params?: Record<string, unknown>): string =>
  t ? t(key, params) : fallback;

// Expressions regulieres
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const PHONE_REGEX = /^(\+)?[0-9]{8,15}$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

/**
 * Validateurs individuels
 */
export const validators = {
  /**
   * Valide un champ requis
   */
  required: (value: string | undefined | null, fieldName: string = 'Ce champ', t?: TFunc): ValidationResult => {
    if (!value || !value.trim()) {
      // Le namespace validation.* n'a pas de clé "champ nommé" générique → on
      // garde l'interpolation FR par défaut, mais si `t` est fourni et que le
      // champ n'est pas nommé explicitement, on utilise fieldRequired.
      return msg(t, 'validation.fieldRequired', `${fieldName} est requis`);
    }
    return null;
  },

  /**
   * Valide un email
   */
  email: (value: string, t?: TFunc): ValidationResult => {
    if (!value || !value.trim()) {
      return msg(t, 'validation.emailRequired', 'L\'email est requis');
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      return msg(t, 'validation.emailInvalid', 'Format d\'email invalide');
    }
    return null;
  },

  /**
   * Valide un mot de passe
   */
  password: (value: string, minLength: number = 6, t?: TFunc): ValidationResult => {
    if (!value) {
      return msg(t, 'validation.passwordRequired', 'Le mot de passe est requis');
    }
    if (value.length < minLength) {
      return msg(
        t, 'validation.passwordTooShort',
        `Le mot de passe doit contenir au moins ${minLength} caracteres`,
        { min: minLength },
      );
    }
    return null;
  },

  /**
   * Valide la confirmation de mot de passe
   */
  confirmPassword: (value: string, password: string, t?: TFunc): ValidationResult => {
    if (!value) {
      return msg(t, 'validation.confirmPasswordRequired', 'La confirmation du mot de passe est requise');
    }
    if (value !== password) {
      return msg(t, 'validation.passwordsDontMatch', 'Les mots de passe ne correspondent pas');
    }
    return null;
  },

  /**
   * Valide un nom d'utilisateur
   */
  username: (value: string, minLength: number = 3, t?: TFunc): ValidationResult => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return msg(t, 'validation.usernameRequired', 'Le nom d\'utilisateur est requis');
    }
    if (trimmed.length < minLength) {
      return msg(
        t, 'validation.usernameTooShort',
        `Le nom d\'utilisateur doit contenir au moins ${minLength} caracteres`,
        { min: minLength },
      );
    }
    if (!USERNAME_REGEX.test(trimmed)) {
      return msg(t, 'validation.usernameInvalid', 'Lettres, chiffres et underscore (_) uniquement');
    }
    return null;
  },

  /**
   * Valide un numero de telephone
   */
  phone: (value: string, required: boolean = false, t?: TFunc): ValidationResult => {
    if (!value || !value.trim()) {
      return required ? msg(t, 'validation.phoneRequired', 'Le numero de telephone est requis') : null;
    }
    const cleanedValue = value.replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(cleanedValue)) {
      return msg(t, 'validation.phoneInvalid', 'Format de telephone invalide');
    }
    return null;
  },

  /**
   * Valide une URL
   */
  url: (value: string, required: boolean = false): ValidationResult => {
    if (!value || !value.trim()) {
      return required ? 'L\'URL est requise' : null;
    }
    if (!URL_REGEX.test(value)) {
      return 'Format d\'URL invalide';
    }
    return null;
  },

  /**
   * Valide une longueur minimale
   */
  minLength: (value: string, min: number, fieldName: string = 'Ce champ'): ValidationResult => {
    if (value && value.length < min) {
      return `${fieldName} doit contenir au moins ${min} caracteres`;
    }
    return null;
  },

  /**
   * Valide une longueur maximale
   */
  maxLength: (value: string, max: number, fieldName: string = 'Ce champ'): ValidationResult => {
    if (value && value.length > max) {
      return `${fieldName} ne doit pas depasser ${max} caracteres`;
    }
    return null;
  },

  /**
   * Valide un nombre
   */
  number: (value: string, options?: { min?: number; max?: number; required?: boolean }): ValidationResult => {
    const { min, max, required = false } = options || {};

    if (!value || !value.trim()) {
      return required ? 'Ce champ est requis' : null;
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return 'Veuillez entrer un nombre valide';
    }

    if (min !== undefined && num < min) {
      return `La valeur minimale est ${min}`;
    }

    if (max !== undefined && num > max) {
      return `La valeur maximale est ${max}`;
    }

    return null;
  },

  /**
   * Valide une date
   */
  date: (value: string, options?: { minDate?: Date; maxDate?: Date; required?: boolean }): ValidationResult => {
    const { minDate, maxDate, required = false } = options || {};

    if (!value) {
      return required ? 'La date est requise' : null;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Format de date invalide';
    }

    if (minDate && date < minDate) {
      return `La date doit etre apres le ${minDate.toLocaleDateString('fr-FR')}`;
    }

    if (maxDate && date > maxDate) {
      return `La date doit etre avant le ${maxDate.toLocaleDateString('fr-FR')}`;
    }

    return null;
  },
};

/**
 * Valide un formulaire complet
 * @param data - Les donnees du formulaire
 * @param rules - Les regles de validation par champ
 * @returns Un objet avec les erreurs par champ
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, (value: any) => ValidationResult>>
): FormErrors<string> {
  const errors: FormErrors<string> = {};

  Object.entries(rules).forEach(([field, validator]) => {
    if (validator) {
      const error = validator(data[field]);
      if (error) {
        errors[field] = error;
      }
    }
  });

  return errors;
}

/**
 * Verifie si un objet d'erreurs contient des erreurs
 */
export function hasErrors(errors: FormErrors<string>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Schemas de validation pre-definis pour les formulaires courants
 */
export const validationSchemas = {
  login: (data: { email: string; password: string }) => validateForm(data, {
    email: validators.email,
    password: (v) => validators.password(v, 6),
  }),

  register: (data: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    first_name: string;
    last_name: string;
  }) => validateForm(data, {
    email: validators.email,
    username: (v) => validators.username(v, 3),
    password: (v) => validators.password(v, 8),
    confirmPassword: (v) => validators.confirmPassword(v, data.password),
    first_name: (v) => validators.required(v, 'Le prenom'),
    last_name: (v) => validators.required(v, 'Le nom'),
  }),

  profile: (data: { first_name: string; last_name: string; phone?: string }) => validateForm(data, {
    first_name: (v) => validators.required(v, 'Le prenom'),
    last_name: (v) => validators.required(v, 'Le nom'),
    phone: (v) => validators.phone(v, false),
  }),
};
