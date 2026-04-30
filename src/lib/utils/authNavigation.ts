/**
 * Helper pour la navigation post-authentification.
 *
 * Comportement attendu :
 * - Apres connexion reussie (compte verifie), retourner a l'ecran d'origine
 *   non-auth si possible, sinon a l'accueil (Main).
 * - JAMAIS rediriger vers Login / Register / VerifyEmail / ForgotPassword /
 *   ResetPassword / Onboarding apres un succes (ce serait absurde).
 * - Si compte non verifie : rediriger vers VerifyEmail avec une option
 *   "Verifier plus tard" qui mene a Main.
 */

import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList, User } from '../../types';

const AUTH_SCREEN_NAMES = new Set<keyof RootStackParamList>([
  'Login',
  'Register',
  'RegisterOrganizer',
  'VerifyEmail',
  'ForgotPassword',
  'ResetPassword',
  'Onboarding' as any,
]);

export function isAuthScreen(name: string | undefined | null): boolean {
  if (!name) return false;
  return AUTH_SCREEN_NAMES.has(name as keyof RootStackParamList);
}

/**
 * Considere un compte verifie ssi email_verified OU is_verified est vrai.
 * On accepte aussi phone_verified comme valant verification (login par OTP).
 */
export function isAccountVerified(user: User | null | undefined): boolean {
  if (!user) return false;
  return Boolean(
    (user as any).email_verified ||
    (user as any).is_verified ||
    (user as any).phone_verified
  );
}

/**
 * Apres login/register reussi, dispatch la bonne destination.
 *
 * @param navigation - L'objet navigation de l'ecran auth en cours
 * @param user - L'utilisateur fraichement connecte
 * @param returnScreen - Ecran d'origine optionnel (passe en route param)
 * @param returnParams - Params associes a returnScreen
 */
export function dispatchAfterAuth(
  navigation: NavigationProp<any>,
  user: User | null | undefined,
  returnScreen?: string | null,
  returnParams?: any,
) {
  // 1) Compte non verifie ET non guest : forcer la verification (mais avec option skip)
  const isGuest = Boolean((user as any)?.is_guest);
  if (user && !isGuest && !isAccountVerified(user)) {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' as never },
        {
          name: 'VerifyEmail' as never,
          params: {
            email: (user as any)?.email,
            skippable: true,
            returnScreen,
            returnParams,
          } as never,
        },
      ],
    });
    return;
  }

  // 2) Si returnScreen fourni ET non-auth : on pop tous les ecrans auth puis on
  // navigue vers returnScreen
  if (returnScreen && !isAuthScreen(returnScreen)) {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Main' as never },
        { name: returnScreen as never, params: returnParams as never },
      ],
    });
    return;
  }

  // 3) Sinon : reset au root Main (l'ecran tab actif est preserve par MainTabNavigator)
  navigation.reset({
    index: 0,
    routes: [{ name: 'Main' as never }],
  });
}
