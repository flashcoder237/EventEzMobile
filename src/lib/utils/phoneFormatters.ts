/**
 * Utilitaires de formatage de numeros de telephone
 * Centralise la logique de formatage pour eviter la duplication
 */

/**
 * Nettoie un numero de telephone en supprimant tous les caracteres non numeriques
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Supprime le prefixe pays d'un numero de telephone
 * @param phone - Le numero a nettoyer (peut contenir des espaces/tirets)
 * @param countryPrefix - Le prefixe pays sans le '+' (ex: '237')
 */
export function stripCountryPrefix(phone: string, countryPrefix: string = '237'): string {
  const cleaned = phone.replace(/[\s\-\.\(\)\+]/g, '');
  return cleaned.startsWith(countryPrefix) ? cleaned.slice(countryPrefix.length) : cleaned;
}

/**
 * Formate un numero de telephone pour l'affichage (XXX XXX XXX)
 * Fonctionne avec des numeros bruts ou deja partiellement formates
 * @param phone - Le numero de telephone (ex: '670123456', '670 123 456', '237670123456')
 * @returns Le numero formate (ex: '670 123 456')
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join(' ');
  }
  return phone;
}

/**
 * Formate un texte saisi en temps reel pour un champ de telephone
 * Nettoie les caracteres non numeriques puis formate en groupes
 * @param text - Le texte saisi par l'utilisateur
 * @returns Le numero formate pour l'affichage
 */
export function formatPhoneInput(text: string): string {
  const cleaned = cleanPhoneNumber(text);
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join(' ');
  }
  return text;
}

/**
 * Prepare un numero de telephone utilisateur pour l'affichage initial
 * Supprime le prefixe pays et formate en groupes
 * @param userPhone - Le numero de telephone brut de l'utilisateur
 * @param countryPrefix - Le prefixe pays sans le '+' (ex: '237')
 * @returns Le numero formate sans prefixe pays
 */
export function preparePhoneForInput(userPhone: string, countryPrefix: string = '237'): string {
  const withoutPrefix = stripCountryPrefix(userPhone, countryPrefix);
  return formatPhoneForDisplay(withoutPrefix);
}
