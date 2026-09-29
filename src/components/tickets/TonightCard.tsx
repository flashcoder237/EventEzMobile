/**
 * S2 — Carte « Ce soir » en tête de Découvrir : le billet du jour, teinté aux
 * couleurs de l'événement, avec l'heure et « Y aller » (le billet, QR à un
 * tap). Aucun mouvement au repos ; elle apparaît par un simple fondu.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { tintFor } from '../../lib/utils/themeTint';
import { appDateLocale } from '../../lib/utils/dateFormatters';
import type { TonightTicket } from '../../hooks/useTonightTicket';

export default function TonightCard({ ticket, onGo }: { ticket: TonightTicket; onGo: () => void }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const accent = tintFor(ticket.event?.theme_tint, isDark);
  const d = new Date(ticket.event?.start_date);
  let time = '';
  try {
    time = d.toLocaleTimeString(appDateLocale(), { hour: '2-digit', minute: '2-digit' });
  } catch {
    time = '';
  }
  const eyebrow =
    ticket.phase === 'EN_COURS'
      ? t('ticketClock.onNow', { defaultValue: 'En ce moment' })
      : ticket.phase === 'PORTES'
      ? t('ticketClock.doors', { defaultValue: 'Les portes sont ouvertes' })
      : t('ticketClock.tonightShort', { time, defaultValue: 'Ce soir · {{time}}' });

  return (
    <Animated.View entering={FadeIn.duration(Durations.enter)} style={styles.wrap}>
      <Pressable
        onPress={onGo}
        accessibilityRole="button"
        accessibilityLabel={`${eyebrow}. ${ticket.event?.title || ''}`}
        style={[styles.card, { backgroundColor: accent }]}
      >
        <View style={styles.texts}>
          <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={1}>{ticket.event?.title}</Text>
        </View>
        <View style={styles.go}>
          <Text style={[styles.goText, { color: accent }]}>
            {t('ticketClock.goThere', { defaultValue: 'Y aller' })}
          </Text>
          <Ionicons name="qr-code" size={14} color={accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  texts: { flex: 1, minWidth: 0 },
  eyebrow: { color: 'rgba(255,255,255,0.88)', fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontFamily: FontFamily.displayBold, fontSize: 17, marginTop: 2 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  goText: { fontFamily: FontFamily.bold, fontSize: 13 },
});
