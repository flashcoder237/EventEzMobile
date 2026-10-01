/**
 * G13 — échanger son contact en secouant (hub sur place, écran Connexions).
 *
 * Secousse (si la localisation est DÉJÀ autorisée) ou bouton « Échanger par
 * secousse » / « Chercher autour de moi » → POST /connections/bump/ avec la
 * position grossière ; second essai 1,5 s plus tard si personne. Liste de
 * candidats : jamais de choix automatique, « Se connecter ? » pour chacun,
 * puis /bump/confirm/ (en attente → connecté, haptique « succès »).
 * Réglage serveur `allow_shake_exchange` (désactivé par défaut).
 */
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';
import { SpringSheet } from '../ui/motion/SpringSheet';
import { connectionsAPI, getMediaUrl } from '../../api';
import type { BumpCandidate } from '../../api/connections';
import { useShakeAction } from '../../hooks/useShakeAction';
import { haptics } from '../../utils/haptics';
import { BUMP_RETRY_DELAY_MS, BumpError, bumpErrorFrom, coarse } from '../../lib/gestures/bump';

type Phase = 'idle' | 'searching' | 'results' | 'none' | 'error';

const ACCENT = '#4F46E5';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ShakeExchange({
  eventId,
  variant = 'exchange',
}: {
  /** UUID de l'événement où l'on est scanné ; sans lui, rien ne s'affiche. */
  eventId: string | null | undefined;
  variant?: 'exchange' | 'nearby';
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<BumpError | null>(null);
  const [candidates, setCandidates] = useState<BumpCandidate[]>([]);
  const [states, setStates] = useState<Record<string, 'sending' | 'waiting' | 'connected' | 'error'>>({});
  const running = useRef(false);

  const run = useCallback(
    async (fromShake: boolean) => {
      if (!eventId || running.current) return;
      running.current = true;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        let granted = perm.status === 'granted';
        // La secousse n'ouvre JAMAIS de demande de permission ; le bouton, oui.
        if (!granted && fromShake) return;
        if (!granted) granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
        setOpen(true);
        setCandidates([]);
        setStates({});
        setError(null);
        if (!granted) {
          setError('noLocation');
          setPhase('error');
          return;
        }
        setPhase('searching');
        haptics.light();
        const pos =
          (await Location.getLastKnownPositionAsync({ maxAge: 30_000 })) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        const body = () => ({
          event_id: eventId,
          lat: coarse(pos.coords.latitude),
          lng: coarse(pos.coords.longitude),
          ts: Date.now(),
        });
        let res = await connectionsAPI.bump(body());
        let list = res.data?.candidates ?? [];
        if (list.length === 0) {
          // L'autre téléphone a pu secouer un peu après : un second essai.
          await wait(BUMP_RETRY_DELAY_MS);
          res = await connectionsAPI.bump(body());
          list = res.data?.candidates ?? [];
        }
        setCandidates(list);
        setPhase(list.length ? 'results' : 'none');
        if (list.length) haptics.selection();
      } catch (err) {
        setOpen(true);
        setError(bumpErrorFrom(err));
        setPhase('error');
      } finally {
        running.current = false;
      }
    },
    [eventId],
  );

  useShakeAction(() => run(true), !!eventId && !open);

  const confirm = useCallback(
    async (c: BumpCandidate) => {
      if (!eventId) return;
      const key = String(c.id);
      setStates((s) => ({ ...s, [key]: 'sending' }));
      try {
        const res = await connectionsAPI.bumpConfirm(eventId, c.id);
        if (res.data?.status === 'connected') {
          haptics.success();
          setStates((s) => ({ ...s, [key]: 'connected' }));
        } else {
          setStates((s) => ({ ...s, [key]: 'waiting' }));
        }
      } catch (err) {
        const e = bumpErrorFrom(err);
        setStates((s) => ({ ...s, [key]: 'error' }));
        if (e !== 'generic') {
          setError(e);
          setPhase('error');
        }
      }
    },
    [eventId],
  );

  if (!eventId) return null;

  const buttonLabel = variant === 'nearby' ? t('gestures.bump.nearbyButton') : t('gestures.bump.button');

  return (
    <>
      <Pressable
        onPress={() => run(false)}
        style={({ pressed }) => [styles.trigger, { borderColor: colors.gray200, opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityHint={t('gestures.bump.hint')}
      >
        <Ionicons name="phone-portrait-outline" size={16} color={ACCENT} />
        <Text style={[styles.triggerText, { color: colors.gray800 }]}>{buttonLabel}</Text>
      </Pressable>

      <SpringSheet
        visible={open}
        onClose={() => setOpen(false)}
        backgroundColor={colors.card}
        accessibilityLabel={t('gestures.bump.title')}
      >
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.gray900 }]}>{t('gestures.bump.title')}</Text>
          {phase === 'searching' && (
            <View style={styles.center}>
              <ActivityIndicator color={ACCENT} />
              <Text style={[styles.text, { color: colors.gray600 }]}>{t('gestures.bump.searching')}</Text>
            </View>
          )}
          {phase === 'none' && (
            <Text style={[styles.text, { color: colors.gray600 }]}>{t('gestures.bump.none')}</Text>
          )}
          {phase === 'error' && error && (
            <>
              <Text style={[styles.text, { color: colors.gray600 }]}>{t(`gestures.bump.error.${error}`)}</Text>
              {error === 'disabled' && (
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    navigation.navigate('Settings');
                  }}
                  style={[styles.primary, { backgroundColor: ACCENT }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>{t('gestures.bump.openSettings')}</Text>
                </Pressable>
              )}
            </>
          )}
          {phase === 'results' && (
            <>
              <Text style={[styles.text, { color: colors.gray600 }]}>{t('gestures.bump.pick')}</Text>
              {candidates.map((c) => {
                const st = states[String(c.id)];
                return (
                  <View key={c.id} style={[styles.row, { borderColor: colors.gray200 }]}>
                    {c.profile_picture ? (
                      <Image source={{ uri: getMediaUrl(c.profile_picture) || undefined }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: colors.gray100 }]}>
                        <Ionicons name="person" size={18} color={colors.gray400} />
                      </View>
                    )}
                    <Text style={[styles.name, { color: colors.gray900 }]} numberOfLines={1}>
                      {c.full_name}
                    </Text>
                    {st === 'connected' ? (
                      <Text style={[styles.state, { color: '#059669' }]}>{t('gestures.bump.connected')}</Text>
                    ) : st === 'waiting' ? (
                      <Text style={[styles.state, { color: colors.gray500 }]}>{t('gestures.bump.waiting')}</Text>
                    ) : (
                      <Pressable
                        onPress={() => confirm(c)}
                        disabled={st === 'sending'}
                        style={[styles.connect, { backgroundColor: ACCENT }]}
                        accessibilityRole="button"
                        accessibilityLabel={t('gestures.bump.connectA11y', { name: c.full_name })}
                      >
                        {st === 'sending' ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.connectText}>{t('gestures.bump.connect')}</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </>
          )}
          <Pressable onPress={() => setOpen(false)} style={styles.secondary} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: colors.gray700 }]}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </SpringSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  triggerText: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md },
  title: { fontFamily: FontFamily.bold, fontSize: 18, textAlign: 'center' },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  center: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 15 },
  state: { fontFamily: FontFamily.medium, fontSize: 13 },
  connect: { paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  connectText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: 13 },
  primary: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: 15 },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: FontFamily.medium, fontSize: 15 },
});
