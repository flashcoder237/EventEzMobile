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
 * Découpe une suite de chiffres en groupes de 3 séparés par un espace.
 * Générique : fonctionne pour 9 chiffres (CM/SN/KE/GH…) comme 10 (CI/…) ou +.
 * Avant, un regex figé à 9 chiffres renvoyait le numéro brut au-delà.
 */
function groupDigits(digits: string): string {
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/**
 * Formate un numero de telephone pour l'affichage (XXX XXX XXX[ XX])
 * Fonctionne avec des numeros bruts ou deja partiellement formates, quel que
 * soit le nombre de chiffres du pays.
 * @param phone - Le numero de telephone (ex: '670123456', '0700112233')
 * @returns Le numero formate en groupes de 3
 */
export function formatPhoneForDisplay(phone: string): string {
  return groupDigits(cleanPhoneNumber(phone));
}

/**
 * Formate un texte saisi en temps reel pour un champ de telephone.
 * Nettoie les caracteres non numeriques puis groupe par 3 (toute longueur).
 * @param text - Le texte saisi par l'utilisateur
 * @returns Le numero formate pour l'affichage
 */
export function formatPhoneInput(text: string): string {
  return groupDigits(cleanPhoneNumber(text));
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
