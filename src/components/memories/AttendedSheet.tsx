/**
 * S8 — « Vous y étiez ».
 *
 * Le lendemain matin, les personnes réellement scannées reçoivent une
 * notification `event_feedback` (kind `attended`). Elle ouvre cette feuille :
 * une carte souvenir teintée (« 37e sur 412 »), une note en un geste, « Plus
 * tard » bien visible, et « Partager en story ». Jamais de QR ni de référence.
 *
 * Ne remplace pas la demande de note du store (`reviewService`) : la note
 * donnée ici est un avis sur l'ÉVÉNEMENT (POST /api/feedbacks/).
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { feedbacksAPI } from '../../api';
import { FontFamily, Spacing } from '../../constants/theme';
import { SpringSheet } from '../ui/motion';
import { tintBase } from '../../lib/utils/themeTint';
import { haptics } from '../../utils/haptics';

export interface AttendedProof {
  event_id: string;
  title: string;
  banner_image?: string | null;
  serial?: number | null;
  total_attendees?: number | null;
  theme_tint?: any;
  is_first?: boolean;
}

export default function AttendedSheet({
  proof,
  visible,
  onClose,
}: {
  proof: AttendedProof | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!proof) return null;
  const tint = tintBase(proof.theme_tint);
  const rankLine =
    proof.serial && proof.total_attendees
      ? t('attended.rank', { rank: proof.serial, total: proof.total_attendees, defaultValue: '{{rank}}e sur {{total}} arrivés' })
      : null;

  const rate = async (value: number) => {
    if (sending || sent) return;
    setRating(value);
    setSending(true);
    haptics.selection();
    try {
      await feedbacksAPI.createFeedback({ event: proof.event_id, rating: value, comment: '' });
      setSent(true);
    } catch {
      // Déjà noté (unicité backend) ou réseau : on garde la note affichée sans insister.
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('memories.shareTitle') });
      }
    } catch {
      /* partage annulé */
    } finally {
      setSharing(false);
    }
  };

  return (
    <SpringSheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel={t('attended.title', { defaultValue: 'Vous y étiez' })}
      backgroundColor={colors.card}
    >
      <View style={styles.body}>
        <View ref={cardRef} collapsable={false} style={styles.card}>
          {proof.banner_image ? (
            <ExpoImage source={{ uri: proof.banner_image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
          ) : null}
          <LinearGradient
            colors={proof.banner_image ? ['rgba(0,0,0,0.1)', `${tint}E6`] : [tint, '#FF6B6B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            <Text style={styles.eyebrow}>{t('memories.iWasThere')}</Text>
            <View>
              <Text style={styles.title} numberOfLines={2}>{proof.title}</Text>
              {!!rankLine && <Text style={styles.rank}>{rankLine}</Text>}
              {proof.is_first && (
                <Text style={styles.first}>{t('attended.firstArrival', { defaultValue: 'Premier arrivé' })}</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={[styles.question, { color: colors.gray900 }]}>
          {sent
            ? t('attended.thanks', { defaultValue: 'Merci pour votre note.' })
            : t('attended.question', { defaultValue: "Qu'en avez-vous pensé ?" })}
        </Text>
        <View style={styles.stars} accessibilityRole="adjustable">
          {[1, 2, 3, 4, 5].map((v) => (
            <Pressable
              key={v}
              onPress={() => rate(v)}
              disabled={sent || sending}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('attended.rateA11y', { count: v, defaultValue: '{{count}} étoile(s)' })}
            >
              <Ionicons name={v <= rating ? 'star' : 'star-outline'} size={32} color={v <= rating ? '#F59E0B' : colors.gray300} />
            </Pressable>
          ))}
        </View>
        {sending && <ActivityIndicator size="small" color={tint} />}

        <View style={styles.actions}>
          <Pressable
            onPress={share}
            disabled={sharing}
            style={[styles.primary, { backgroundColor: tint }]}
            accessibilityRole="button"
          >
            {sharing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="share-social" size={16} color="#FFFFFF" />}
            <Text style={styles.primaryText}>{t('attended.shareStory', { defaultValue: 'Partager en story' })}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.later} accessibilityRole="button">
            <Text style={[styles.laterText, { color: colors.gray600 }]}>
              {sent ? t('common.close', { defaultValue: 'Fermer' }) : t('attended.later', { defaultValue: 'Plus tard' })}
            </Text>
          </Pressable>
        </View>
      </View>
    </SpringSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: 14, alignItems: 'stretch' },
  card: { height: 190, borderRadius: 22, overflow: 'hidden' },
  cardInner: { flex: 1, padding: 18, justifyContent: 'space-between' },
  eyebrow: { color: 'rgba(255,255,255,0.92)', fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontFamily: FontFamily.displayExtraBold, fontSize: 22 },
  rank: { color: 'rgba(255,255,255,0.92)', fontFamily: FontFamily.semiBold, fontSize: 14, marginTop: 4 },
  first: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 12, marginTop: 4 },
  question: { fontFamily: FontFamily.bold, fontSize: 16, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  actions: { gap: 8 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  primaryText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 15 },
  later: { alignItems: 'center', paddingVertical: 10 },
  laterText: { fontFamily: FontFamily.semiBold, fontSize: 14 },
});
