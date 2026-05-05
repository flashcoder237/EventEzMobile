/**
 * ForceUpdateGate — bloque l'app si la version installée est trop vieille.
 *
 * Lit `client_versions.mobile.min_supported` du StatusContext (qui poll
 * /api/status/ toutes les 60s + sur retour foreground). Si la version
 * courante (Constants.expoConfig.version) est strictement inférieure, on
 * remplace le rendu par un modal plein écran non-dismissible avec un bouton
 * qui ouvre le Play Store / App Store.
 *
 * Pourquoi un gate plutôt qu'un modal dismissible :
 * - On l'utilise pour les breaking changes API : si on l'affichait juste en
 *   bandeau, l'utilisateur passerait outre et taperait des écrans qui crash.
 * - Permet aussi un "kill switch" pour une version compromise (faille sécu).
 *
 * Si min_supported est vide → aucun gate (état par défaut au boot).
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStatus } from '../../contexts/StatusContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isVersionBelow } from '../../lib/utils/semver';
import { BorderRadius, FontFamily, Shadows, Spacing } from '../../constants/theme';

const APP_VERSION = Constants.expoConfig?.version || '';

const DEFAULT_MESSAGE =
  'Pour continuer à utiliser EventEz, mettez à jour vers la dernière version disponible.';

export default function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const { snapshot } = useStatus();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const mobile = snapshot?.client_versions?.mobile;
  const minSupported = mobile?.min_supported || '';

  const needsUpdate =
    !!APP_VERSION && !!minSupported && isVersionBelow(APP_VERSION, minSupported);

  const storeUrl =
    Platform.OS === 'ios' ? mobile?.ios_store_url || '' : mobile?.android_store_url || '';

  const openStore = useCallback(async () => {
    if (!storeUrl) return;
    try {
      await Linking.openURL(storeUrl);
    } catch (error) {
      if (__DEV__) console.warn('[ForceUpdateGate] openStore failed:', error);
    }
  }, [storeUrl]);

  if (!needsUpdate) {
    return <>{children}</>;
  }

  const message = (mobile?.force_update_message || '').trim() || DEFAULT_MESSAGE;
  const cardBg = isDark ? colors.gray100 : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.iconBubble}>
          <Ionicons name="cloud-download" size={48} color="#FFFFFF" />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Mise à jour requise
        </Text>

        <Text style={[styles.versionLine, { color: colors.gray500 }]}>
          Version installée : {APP_VERSION || '—'} · Requise : {minSupported}
        </Text>

        <Text style={[styles.message, { color: colors.gray700 }]}>{message}</Text>

        {storeUrl ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.85}>
            <Ionicons
              name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
              size={18}
              color="#FFFFFF"
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={styles.primaryBtnText}>
              {Platform.OS === 'ios' ? 'Ouvrir App Store' : 'Ouvrir Play Store'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.fallbackHint, { color: colors.gray500 }]}>
            Veuillez mettre à jour l'application depuis votre store habituel.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    ...Shadows.dramatic,
  },
  iconBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  versionLine: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: '#7c3aed',
    minWidth: 220,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  fallbackHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
