/**
 * S3 — Mode « sur place ».
 *
 * Une fois le billet scanné au portique (et tant que l'événement dure), le
 * billet cède la vedette à un hub : la session en cours et la suivante, le
 * Q&A en direct, le plan (le lieu, via la fiche), le networking. Aucune
 * animation au repos ; le hub apparaît par un fondu.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { sessionsAPI } from '../../api';
import { FontFamily, Spacing } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { tintAlpha, tintFor } from '../../lib/utils/themeTint';
import { appDateLocale } from '../../lib/utils/dateFormatters';
import { LiveDot } from '../ui/motion';
import ShakeExchange from '../gestures/ShakeExchange';

interface SessionLite {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  room?: string | null;
  location?: string | null;
}

/** Vrai quand la personne a été scannée à l'entrée (billet ou inscription). */
export function isRegistrationCheckedIn(reg: any): boolean {
  if (!reg) return false;
  if (reg.status === 'checked_in' || reg.checked_in_at || reg.is_checked_in) return true;
  return Array.isArray(reg.tickets) && reg.tickets.some((tk: any) => tk?.is_checked_in);
}

function sStart(s: SessionLite) {
  return new Date((s.start_time || s.start_date) as string).getTime();
}
function sEnd(s: SessionLite) {
  return new Date((s.end_time || s.end_date || s.start_time || s.start_date) as string).getTime();
}

export function splitSessions(sessions: SessionLite[], now: number) {
  const valid = sessions.filter((s) => Number.isFinite(sStart(s)));
  const current = valid.find((s) => sStart(s) <= now && now < sEnd(s)) || null;
  const next = valid
    .filter((s) => sStart(s) > now)
    .sort((a, b) => sStart(a) - sStart(b))[0] || null;
  return { current, next };
}

export default function OnSiteHub({ event, registrationId }: { event: any; registrationId: string }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const accent = tintFor(event?.theme_tint, isDark);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!event?.id) return;
    let alive = true;
    sessionsAPI
      .getSessions({ event: event.id })
      .then((res: any) => {
        const data = res?.data?.results || res?.data || [];
        if (alive && Array.isArray(data)) setSessions(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [event?.id]);

  const { current, next } = useMemo(() => splitSessions(sessions, now), [sessions, now]);
  const time = (s: SessionLite) => {
    try {
      return new Date(sStart(s)).toLocaleTimeString(appDateLocale(), { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const tiles: { key: string; icon: any; label: string; onPress: () => void }[] = [
    {
      key: 'qa',
      icon: 'chatbubbles-outline',
      label: t('onSite.qa', { defaultValue: 'Q&A en direct' }),
      onPress: () => navigation.navigate('LiveEvent', { eventId: String(event.id) }),
    },
    {
      key: 'plan',
      icon: 'map-outline',
      label: t('onSite.plan', { defaultValue: 'Plan et lieu' }),
      onPress: () => navigation.navigate('EventDetails', { eventId: String(event.slug || event.id) }),
    },
    {
      key: 'network',
      icon: 'people-outline',
      label: t('onSite.networking', { defaultValue: 'Networking' }),
      onPress: () =>
        navigation.navigate('EventAttendees', { eventId: String(event.id), registrationId: String(registrationId) }),
    },
  ];

  return (
    <Animated.View
      entering={FadeIn.duration(Durations.enter)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200 }]}
    >
      <View style={styles.headRow}>
        <LiveDot size={8} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>
          {t('onSite.eyebrow', { defaultValue: 'Vous êtes sur place' })}
        </Text>
      </View>

      {(current || next) && (
        <View style={styles.sessions}>
          {current && (
            <Pressable
              onPress={() => navigation.navigate('SessionDetails', { sessionId: String(current.id) })}
              style={[styles.session, { backgroundColor: tintAlpha(accent, 0.08) }]}
              accessibilityRole="button"
            >
              <Text style={[styles.sessionLabel, { color: accent }]}>
                {t('onSite.now', { defaultValue: 'Maintenant' })}
              </Text>
              <Text style={[styles.sessionTitle, { color: colors.gray900 }]} numberOfLines={2}>{current.title}</Text>
              {!!(current.room || current.location) && (
                <Text style={[styles.sessionMeta, { color: colors.gray600 }]} numberOfLines={1}>
                  {current.room || current.location}
                </Text>
              )}
            </Pressable>
          )}
          {next && (
            <Pressable
              onPress={() => navigation.navigate('SessionDetails', { sessionId: String(next.id) })}
              style={[styles.session, { backgroundColor: colors.gray50 }]}
              accessibilityRole="button"
            >
              <Text style={[styles.sessionLabel, { color: colors.gray500 }]}>
                {t('onSite.next', { time: time(next), defaultValue: 'Ensuite · {{time}}' })}
              </Text>
              <Text style={[styles.sessionTitle, { color: colors.gray900 }]} numberOfLines={2}>{next.title}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.key}
            onPress={tile.onPress}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            style={[styles.tile, { borderColor: colors.gray200 }]}
          >
            <Ionicons name={tile.icon} size={20} color={accent} />
            <Text style={[styles.tileText, { color: colors.gray800 }]} numberOfLines={2}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>
      {/* G13 — échanger son contact en secouant (ou par ce bouton). */}
      <ShakeExchange eventId={event?.id ? String(event.id) : null} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12, marginBottom: Spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontFamily: FontFamily.bold, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' },
  sessions: { gap: 8 },
  session: { borderRadius: 14, padding: 12, gap: 2 },
  sessionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  sessionTitle: { fontFamily: FontFamily.bold, fontSize: 15 },
  sessionMeta: { fontFamily: FontFamily.medium, fontSize: 12 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 6 },
  tileText: { fontFamily: FontFamily.semiBold, fontSize: 12, textAlign: 'center' },
});
