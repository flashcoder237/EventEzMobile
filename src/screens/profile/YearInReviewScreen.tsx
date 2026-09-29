/**
 * S11 — L'année EventEz.
 *
 * Un récit en 6-7 slides, qu'on fait avancer d'un tap (tiers gauche = retour).
 * Une seule animation par slide (entrée via les tokens), simple fondu quand
 * « Réduire les animations » est actif. La dernière carte, teintée par
 * l'événement favori, se partage en story. Privé : rien sur les autres
 * participants. Sur un 404 (moins de 2 événements, fonction désactivée), on
 * ne montre rien d'autre qu'un retour.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { registrationsAPI } from '../../api';
import { FontFamily, Spacing } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { tintBase } from '../../lib/utils/themeTint';
import { appDateLocale } from '../../lib/utils/dateFormatters';
import type { RootStackParamList } from '../../types';

interface Review {
  available?: boolean;
  year: number;
  events_count: number;
  cities_count?: number;
  cities?: string[];
  top_category?: { name?: string } | string | null;
  season?: { month?: number; count?: number } | null;
  first_event?: { title?: string; start_date?: string } | null;
  last_event?: { title?: string; start_date?: string } | null;
  first_arrivals?: number;
  top_organizer?: { name?: string } | string | null;
  favorite_event?: { title?: string; theme_tint?: any } | null;
}

interface Slide {
  key: string;
  eyebrow: string;
  big: string;
  line?: string;
}

function monthName(month?: number): string {
  if (!month) return '';
  try {
    return new Date(2000, month - 1, 1).toLocaleDateString(appDateLocale(), { month: 'long' });
  } catch {
    return '';
  }
}

const nameOf = (v: any) => (typeof v === 'string' ? v : v?.name || '');

export default function YearInReviewScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'YearInReview'>>();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const [review, setReview] = useState<Review | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none'>('loading');
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    let alive = true;
    registrationsAPI
      .getYearInReview(route.params?.year)
      .then((res: any) => {
        if (!alive) return;
        if (res?.data?.available === false || !res?.data) setState('none');
        else {
          setReview(res.data);
          setState('ready');
        }
      })
      .catch(() => alive && setState('none'));
    return () => {
      alive = false;
    };
  }, [route.params?.year]);

  const slides = useMemo<Slide[]>(() => {
    if (!review) return [];
    const out: Slide[] = [
      {
        key: 'count',
        eyebrow: t('yearInReview.s1Eyebrow', { year: review.year, defaultValue: 'Votre année {{year}}' }),
        big: String(review.events_count),
        line: t('yearInReview.s1Line', { count: review.events_count, defaultValue: 'événements vécus' }),
      },
    ];
    if (review.cities_count) {
      out.push({
        key: 'cities',
        eyebrow: t('yearInReview.citiesEyebrow', { defaultValue: 'Sur la route' }),
        big: String(review.cities_count),
        line: (review.cities || []).slice(0, 3).join(' · '),
      });
    }
    if (nameOf(review.top_category)) {
      out.push({
        key: 'category',
        eyebrow: t('yearInReview.categoryEyebrow', { defaultValue: 'Votre registre' }),
        big: nameOf(review.top_category),
        line: review.season?.month
          ? t('yearInReview.season', { month: monthName(review.season.month), defaultValue: 'Votre mois : {{month}}' })
          : undefined,
      });
    }
    if (review.first_event?.title) {
      out.push({
        key: 'first',
        eyebrow: t('yearInReview.firstEyebrow', { defaultValue: 'Tout a commencé avec' }),
        big: review.first_event.title,
        line: review.last_event?.title
          ? t('yearInReview.lastLine', { title: review.last_event.title, defaultValue: 'et s’est fini avec {{title}}' })
          : undefined,
      });
    }
    if (review.first_arrivals) {
      out.push({
        key: 'arrivals',
        eyebrow: t('yearInReview.arrivalsEyebrow', { defaultValue: 'Toujours à l’heure' }),
        big: String(review.first_arrivals),
        line: t('yearInReview.arrivalsLine', { count: review.first_arrivals, defaultValue: 'fois premier arrivé' }),
      });
    }
    if (nameOf(review.top_organizer)) {
      out.push({
        key: 'organizer',
        eyebrow: t('yearInReview.organizerEyebrow', { defaultValue: 'Votre organisateur' }),
        big: nameOf(review.top_organizer),
      });
    }
    out.push({
      key: 'final',
      eyebrow: t('yearInReview.finalEyebrow', { year: review.year, defaultValue: 'Mon année EventEz {{year}}' }),
      big: String(review.events_count),
      line: review.favorite_event?.title
        ? t('yearInReview.favoriteLine', { title: review.favorite_event.title, defaultValue: 'Coup de cœur : {{title}}' })
        : t('yearInReview.s1Line', { count: review.events_count, defaultValue: 'événements vécus' }),
    });
    return out;
  }, [review, t]);

  const close = () => navigation.goBack();

  if (state !== 'ready' || slides.length === 0) {
    return (
      <View style={[styles.root, styles.center]}>
        <LinearGradient colors={['#4F46E5', '#A855F7']} style={StyleSheet.absoluteFill} />
        {state === 'loading' ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <Pressable onPress={close} accessibilityRole="button" style={styles.noneBtn}>
            <Text style={styles.noneText}>{t('common.back', { defaultValue: 'Retour' })}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const slide = slides[Math.min(index, slides.length - 1)];
  const isFinal = slide.key === 'final';
  const tint = tintBase(review?.favorite_event?.theme_tint);
  const onTap = (x: number) => {
    if (x < width / 3) setIndex((i) => Math.max(0, i - 1));
    else if (index < slides.length - 1) setIndex((i) => i + 1);
  };
  const enter = reduced
    ? FadeIn.duration(Durations.respond)
    : slide.key === 'count' || slide.key === 'arrivals' || isFinal
    ? ZoomIn.duration(Durations.enter)
    : FadeInDown.duration(Durations.enter);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: slide.eyebrow });
      }
    } catch {
      /* partage annulé */
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.root}>
      <View ref={cardRef} collapsable={false} style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={isFinal ? [tint, '#A855F7', '#FF6B6B'] : ['#1E1B4B', '#4F46E5', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.progress}>
            {slides.map((s, i) => (
              <View key={s.key} style={[styles.progressSeg, { opacity: i <= index ? 1 : 0.3 }]} />
            ))}
          </View>
          <Pressable style={styles.tapZone} onPress={(e) => onTap(e.nativeEvent.locationX)} accessibilityRole="button" accessibilityHint={t('yearInReview.tapHint', { defaultValue: 'Touchez pour continuer' })}>
            <Animated.View key={slide.key} entering={enter} style={styles.slide}>
              <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
              <Text style={[styles.big, slide.big.length > 6 && styles.bigText]} numberOfLines={4}>{slide.big}</Text>
              {!!slide.line && <Text style={styles.line}>{slide.line}</Text>}
            </Animated.View>
          </Pressable>
          <View style={styles.bottom}>
            {isFinal ? (
              <Pressable onPress={share} disabled={sharing} style={styles.shareBtn} accessibilityRole="button">
                {sharing ? <ActivityIndicator size="small" color="#111" /> : <Ionicons name="share-social" size={16} color="#111" />}
                <Text style={styles.shareText}>{t('yearInReview.share', { defaultValue: 'Partager ma carte' })}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={close} accessibilityRole="button" style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1E1B4B' },
  center: { alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1 },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  tapZone: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl },
  slide: { gap: 10 },
  eyebrow: { color: 'rgba(255,255,255,0.88)', fontFamily: FontFamily.bold, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  big: { color: '#FFFFFF', fontFamily: FontFamily.displayExtraBold, fontSize: 88, lineHeight: 92 },
  bigText: { fontSize: 38, lineHeight: 44 },
  line: { color: 'rgba(255,255,255,0.92)', fontFamily: FontFamily.semiBold, fontSize: 18 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18 },
  shareText: { color: '#111111', fontFamily: FontFamily.bold, fontSize: 14 },
  closeBtn: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  noneBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20 },
  noneText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 14 },
});
