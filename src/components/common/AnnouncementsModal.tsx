/**
 * AnnouncementsModal — affiche la prochaine annonce active dans un modal
 * éditorial au boot de l'app (et à chaque retour foreground si une nouvelle
 * annonce est arrivée entretemps).
 *
 * Le modal lui-même observe `next` du AnnouncementsContext. Il n'y a aucune
 * logique de fetch/dédoublonnage ici — uniquement le rendu et l'action de
 * dismiss.
 *
 * - Dismissible → bouton "Fermer" (et tap sur le backdrop)
 * - Non-dismissible → pas de bouton fermer, pas de tap-out (CGU forcée par ex.)
 * - CTA optionnel → bouton primary qui ouvre l'URL en in-app browser ; les
 *   schémas internes (eventez://, /events/...) ne sont pas gérés ici — pour
 *   ça il faudrait extraire un router de deep links, hors scope de cette PR.
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAnnouncements } from '../../contexts/AnnouncementsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, FontFamily, Shadows, Spacing } from '../../constants/theme';
import type { AnnouncementSeverity } from '../../types';

const SEVERITY_ACCENT: Record<AnnouncementSeverity, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  critical: '#EF4444',
};

const SEVERITY_ICON: Record<AnnouncementSeverity, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  warning: 'warning',
  critical: 'alert-circle',
};

export default function AnnouncementsModal() {
  const { next, dismiss } = useAnnouncements();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleClose = useCallback(() => {
    if (!next) return;
    if (!next.is_dismissible) return;
    void dismiss(next.id);
  }, [next, dismiss]);

  const handleCta = useCallback(async () => {
    if (!next || !next.cta_url) return;
    try {
      // Pour les URLs http(s) : in-app browser (cohérent avec PaymentScreen)
      if (/^https?:\/\//i.test(next.cta_url)) {
        await WebBrowser.openBrowserAsync(next.cta_url, {
          dismissButtonStyle: 'close',
          toolbarColor: colors.primary,
          controlsColor: '#FFFFFF',
        });
      } else {
        // Schemes (mailto:, tel:, eventez://...) → délégué à l'OS
        await Linking.openURL(next.cta_url);
      }
    } catch (error) {
      if (__DEV__) console.warn('[AnnouncementsModal] cta open failed:', error);
    }
    // Marque comme consommée même si non-dismissible — le CTA a été cliqué,
    // l'utilisateur a vu le message. Sinon une annonce non-dismissible avec
    // CTA boucle indéfiniment.
    void dismiss(next.id);
  }, [next, dismiss, colors.primary]);

  if (!next) return null;

  const accent = SEVERITY_ACCENT[next.severity] ?? SEVERITY_ACCENT.info;
  const icon = SEVERITY_ICON[next.severity] ?? SEVERITY_ICON.info;
  const cardBg = isDark ? colors.gray100 : '#FFFFFF';

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: cardBg,
                  marginTop: insets.top + Spacing['2xl'],
                  marginBottom: insets.bottom + Spacing['2xl'],
                  borderColor: accent,
                },
              ]}
            >
              <View style={[styles.iconBubble, { backgroundColor: accent + '22' }]}>
                <Ionicons name={icon} size={36} color={accent} />
              </View>

              <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
                {next.title}
              </Text>

              <Text style={[styles.message, { color: colors.gray700 }]}>
                {next.message}
              </Text>

              <View style={styles.buttonRow}>
                {next.cta_label && next.cta_url ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: accent }]}
                    onPress={handleCta}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText} numberOfLines={1}>
                      {next.cta_label}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {next.is_dismissible ? (
                  <TouchableOpacity
                    style={[styles.ghostBtn, { borderColor: colors.gray300 }]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ghostBtnText, { color: colors.text }]}>
                      {t('componentsCommon.announcementClose')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.dramatic,
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    width: '100%',
    gap: Spacing.sm,
  },
  primaryBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
});
