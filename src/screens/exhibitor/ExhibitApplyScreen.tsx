import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { exhibitorsAPI, eventsAPI } from '../../api';
import { Input } from '../../components/ui/Input';
import { Spacing, Shadows, BorderRadius, FontFamily, FontSizes } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { formatPriceAmount, displayCurrency } from '../../lib/utils/priceFormatters';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'ExhibitApply'>;

const norm = (res: any): any[] => res?.data?.results || res?.data || [];

interface AvailableBooth {
  id: string;
  code: string;
  category_name?: string;
  price?: string | number;
  currency?: string;
}

/**
 * Candidature exposant (mobile) — l'entrée du parcours exposant, jusqu'ici
 * absente sur mobile (seul le web l'implémentait).
 *
 * Flux : réutilise/crée la fiche Exhibitor de l'utilisateur → soumet une
 * BoothApplication pour le salon, avec un stand souhaité OPTIONNEL. L'organisateur
 * arbitre ensuite (accept → réservation), puis l'exposant paie dans « Mon stand ».
 */
export default function ExhibitApplyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { eventId, eventTitle } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { showError } = useAlert();
  useFeedback();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const [resolvedEventId, setResolvedEventId] = useState<string>(eventId);
  const [title, setTitle] = useState<string | undefined>(eventTitle);
  const [booths, setBooths] = useState<AvailableBooth[]>([]);
  const [selectedBooth, setSelectedBooth] = useState<string | null>(null);

  // Fiche société (préremplie si l'utilisateur en a déjà une).
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [website, setWebsite] = useState('');
  const [pitch, setPitch] = useState('');
  // Fiche existante mémorisée : un ré-essai ne crée pas de fiche orpheline.
  const [existing, setExisting] = useState<{ id: string; slug: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Résout l'UUID réel (le param peut être un slug) + le titre.
      let evId = eventId;
      try {
        const evRes = await eventsAPI.getEvent(eventId);
        evId = String(evRes.data?.id || eventId);
        if (evRes.data?.title) setTitle(evRes.data.title);
      } catch {
        /* on garde le param brut si l'event ne charge pas */
      }
      setResolvedEventId(evId);

      const [boothsRes, appsRes, exRes] = await Promise.all([
        exhibitorsAPI.getBooths({ event: evId, status: 'available' }).catch(() => null),
        isAuthenticated
          ? exhibitorsAPI.getApplications({ event: evId }).catch(() => null)
          : Promise.resolve(null),
        isAuthenticated
          ? exhibitorsAPI.getExhibitors({ mine: 'true' }).catch(() => null)
          : Promise.resolve(null),
      ]);

      setBooths(boothsRes ? (norm(boothsRes) as AvailableBooth[]) : []);
      if (appsRes && norm(appsRes).length > 0) setAlreadyApplied(true);

      const mine = exRes ? norm(exRes) : [];
      if (mine.length > 0) {
        setCompanyName(mine[0].company_name || '');
        setCategory(mine[0].category || '');
        setWebsite(mine[0].website || '');
        setExisting({ id: mine[0].id, slug: mine[0].slug });
      } else if (user) {
        // Pré-remplit avec le nom de l'utilisateur à défaut de fiche.
        const fallback = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        if (fallback) setCompanyName(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, isAuthenticated, user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!resolvedEventId || !companyName.trim()) return;
    setSubmitting(true);
    try {
      // 1. Réutilise la fiche déjà chargée (pas de re-fetch), sinon la crée.
      let exhibitorId: string;
      if (existing) {
        exhibitorId = existing.id;
        await exhibitorsAPI.updateExhibitor(existing.slug, {
          company_name: companyName.trim(),
          category: category.trim(),
          website: website.trim(),
        }).catch(() => null);
      } else {
        const created = await exhibitorsAPI.createExhibitor({
          company_name: companyName.trim(),
          category: category.trim(),
          website: website.trim(),
        });
        exhibitorId = created.data.id;
        // Mémorise : si la candidature échoue, un ré-essai ne recrée pas de fiche.
        setExisting({ id: created.data.id, slug: created.data.slug });
      }

      // 2. Soumet la candidature (stand souhaité optionnel).
      await exhibitorsAPI.createApplication({
        event: resolvedEventId,
        exhibitor: exhibitorId,
        requested_booth: selectedBooth || undefined,
        pitch: pitch.trim(),
      });
      setDone(true);
    } catch (e: any) {
      const data = e?.response?.data;
      const codeVal = Array.isArray(data?.code) ? data.code[0] : data?.code;
      if (codeVal === 'already_applied' || e?.response?.status === 409) {
        setAlreadyApplied(true);
        return;
      }
      showError(
        t('common.error'),
        getApiErrorMessage(e, t, {
          fallbackKey: 'exhibitApply.errorSubmit',
          fallbackValues: { defaultValue: 'Impossible d\'envoyer la candidature.' },
        }).message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const Header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.backDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        accessibilityRole="button"
        accessibilityLabel={t('common.back', { defaultValue: 'Retour' })}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          {t('exhibitApply.eyebrow', { defaultValue: 'EXPOSANT' })}
        </Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title || t('exhibitApply.title', { defaultValue: 'Candidater à un stand' })}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {Header}
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  // Non connecté → invite à se connecter.
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {Header}
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={44} color={colors.gray300} />
          <Text style={[styles.stateText, { color: colors.gray600 }]}>
            {t('exhibitApply.loginRequired', { defaultValue: 'Connecte-toi pour candidater à un stand.' })}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login' as any)}
            style={[styles.cta, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{t('exhibitApply.login', { defaultValue: 'Se connecter' })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {Header}
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={52} color={colors.success} />
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            {t('exhibitApply.successTitle', { defaultValue: 'Candidature envoyée !' })}
          </Text>
          <Text style={[styles.stateText, { color: colors.gray600 }]}>
            {t('exhibitApply.successSubtitle', { defaultValue: 'L\'organisateur va l\'examiner. Tu seras notifié de sa décision.' })}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyBooth')}
            style={[styles.cta, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="storefront" size={18} color="#fff" />
            <Text style={styles.ctaText}>{t('exhibitApply.goToMyBooth', { defaultValue: 'Voir Mon stand' })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (alreadyApplied) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {Header}
        <View style={styles.center}>
          <Ionicons name="information-circle" size={48} color={colors.info} />
          <Text style={[styles.stateText, { color: colors.gray600 }]}>
            {t('exhibitApply.alreadyApplied', { defaultValue: 'Tu as déjà candidaté à ce salon.' })}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MyBooth')}
            style={[styles.cta, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="storefront" size={18} color="#fff" />
            <Text style={styles.ctaText}>{t('exhibitApply.goToMyBooth', { defaultValue: 'Voir Mon stand' })}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = !!companyName.trim() && !submitting;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {Header}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['3xl'], ...centeredContent(CARD_MAX) }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.lead, { color: colors.gray600 }]}>
            {t('exhibitApply.lead', { defaultValue: 'Présente ta société pour tenir un stand à ce salon. L\'organisateur examinera ta demande.' })}
          </Text>

          <Input
            label={t('exhibitApply.companyLabel', { defaultValue: 'Nom de la société' })}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t('exhibitApply.companyPlaceholder', { defaultValue: 'Ex : Acme SARL' })}
            icon="business-outline"
          />
          <Input
            label={t('exhibitApply.categoryLabel', { defaultValue: 'Secteur / catégorie' })}
            value={category}
            onChangeText={setCategory}
            placeholder={t('exhibitApply.categoryPlaceholder', { defaultValue: 'Ex : Tech, Agroalimentaire…' })}
            icon="pricetag-outline"
          />
          <Input
            label={t('exhibitApply.websiteLabel', { defaultValue: 'Site web (optionnel)' })}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
            icon="globe-outline"
          />

          {/* Choix d'un stand souhaité (optionnel) */}
          {booths.length > 0 && (
            <View style={{ gap: Spacing.sm }}>
              <Text style={[styles.sectionLabel, { color: colors.gray700 }]}>
                {t('exhibitApply.boothLabel', { defaultValue: 'Stand souhaité (optionnel)' })}
              </Text>
              {booths.map((b) => {
                const active = selectedBooth === b.id;
                const priceNum = Number(b.price ?? 0);
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setSelectedBooth(active ? null : b.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.boothRow,
                      { backgroundColor: colors.card, borderColor: active ? colors.primary : hairline },
                    ]}
                  >
                    <View style={[styles.radio, { borderColor: active ? colors.primary : colors.gray300 }]}>
                      {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.boothCode, { color: colors.text }]}>{b.code}</Text>
                      {!!b.category_name && (
                        <Text style={[styles.boothCat, { color: colors.gray500 }]}>{b.category_name}</Text>
                      )}
                    </View>
                    {priceNum > 0 && (
                      <Text style={[styles.boothPrice, { color: colors.primary }]}>
                        {formatPriceAmount(priceNum)} {displayCurrency(b.currency)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Input
            label={t('exhibitApply.pitchLabel', { defaultValue: 'Message à l\'organisateur (optionnel)' })}
            value={pitch}
            onChangeText={setPitch}
            placeholder={t('exhibitApply.pitchPlaceholder', { defaultValue: 'Décris ton activité, ce que tu exposeras…' })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            onPress={submit}
            disabled={!canSubmit}
            style={[styles.cta, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.5, marginTop: Spacing.sm }]}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={16} color="#fff" />}
            <Text style={styles.ctaText}>
              {submitting
                ? t('exhibitApply.submitting', { defaultValue: 'Envoi…' })
                : t('exhibitApply.submit', { defaultValue: 'Envoyer ma candidature' })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 12 },
  backDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 1.4 },
  title: { fontSize: 21, fontFamily: FontFamily.displayExtraBold, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: Spacing.sm },
  lead: { fontSize: FontSizes.sm, fontFamily: FontFamily.regular, lineHeight: 20 },
  sectionLabel: { fontSize: FontSizes.sm, fontFamily: FontFamily.semiBold },
  stateTitle: { fontSize: 18, fontFamily: FontFamily.displayExtraBold, marginTop: Spacing.xs, textAlign: 'center' },
  stateText: { fontSize: FontSizes.sm, fontFamily: FontFamily.regular, textAlign: 'center', lineHeight: 20 },
  boothRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  boothCode: { fontSize: FontSizes.base, fontFamily: FontFamily.semiBold },
  boothCat: { fontSize: FontSizes.xs, fontFamily: FontFamily.regular, marginTop: 1 },
  boothPrice: { fontSize: FontSizes.sm, fontFamily: FontFamily.bold },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: Spacing.lg,
  },
  ctaText: { color: '#fff', fontSize: 14, fontFamily: FontFamily.bold },
});
