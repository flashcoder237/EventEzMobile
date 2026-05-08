/**
 * Helpers pour afficher le nom d'une catégorie dans la langue active.
 *
 * Stratégie en cascade :
 *  1. `category.name` — déjà localisé par le backend selon Accept-Language
 *     (envoyé par notre Axios instance). C'est le cas nominal.
 *  2. Si pour une raison (cache stale, SSR, ancienne API) `name` est vide,
 *     on tente `t('categories.<slug>')` — clés bundlées dans i18n/locales/.
 *  3. Sinon, fallback final = empty string.
 */

import i18n from '../../i18n';
import type { Category } from '../../types';

export function getCategoryLabel(category: Pick<Category, 'name' | 'slug'> | null | undefined): string {
  if (!category) return '';
  if (category.name && category.name.trim()) return category.name;
  if (category.slug) {
    const key = `categories.${category.slug}`;
    const translated = i18n.t(key);
    // i18next renvoie la clé brute si elle n'existe pas — on l'évite.
    if (translated && translated !== key) return translated;
  }
  return '';
}
