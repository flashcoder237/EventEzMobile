/**
 * Mes données chez les exposants (RGPD art. 15 et 17).
 *
 * POURQUOI CET ÉCRAN EXISTE
 * -------------------------
 * Quand un exposant scanne votre badge, il repart avec votre nom, votre
 * e-mail et votre téléphone. La notification qui vous en informe promet
 * que vous pouvez « retirer ces données depuis vos paramètres de
 * confidentialité » — cette page est cette promesse tenue.
 *
 * Deux droits, deux gestes :
 *  - SAVOIR qui détient vos coordonnées (art. 15). On ne peut pas exercer
 *    ses droits sur ce qu'on ignore.
 *  - FAIRE EFFACER, entreprise par entreprise ou d'un coup (art. 17).
 *
 * Ce qui est effacé l'est vraiment : nom, e-mail, téléphone. L'exposant
 * conserve seulement le FAIT d'avoir rencontré quelqu'un — son décompte
 * de salon — sans aucune donnée permettant de vous recontacter.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { exhibitorsAPI } from '../../api/exhibitors';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { Spacing, BorderRadius, FontFamily } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface LeadHolder {
  id: string;
  exhibitor: string;
  event: string;
  captured_at?: string | null;
}

export default function MyDataAtExhibitorsScreen() {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { showConfirm } = useAlert();
  const { toastSuccess, toastError } = useFeedback();

  const [holders, setHolders] = useState<LeadHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erasing, setErasing] = useState<string | null>(null);

  const hairline = isDark ? colors.gray800 : colors.gray200;

  const load = useCallback(async () => {
    try {
      const response = await exhibitorsAPI.getLeadsAboutMe();
      setHolders((response.data?.results ?? []) as LeadHolder[]);
    } catch {
      setHolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const erase = useCallback((holder?: LeadHolder) => {
    // Effacement irréversible : on demande confirmation en nommant
    // précisément ce qui part, plutôt qu'un « êtes-vous sûr ? » creux.
    showConfirm(
      holder
        ? t('myDataExhibitors.confirmOneTitle', { company: holder.exhibitor })
        : t('myDataExhibitors.confirmAllTitle'),
      holder
        ? t('myDataExhibitors.confirmOneBody', { company: holder.exhibitor })
        : t('myDataExhibitors.confirmAllBody'),
      async () => {
        setErasing(holder?.id ?? 'all');
        try {
          await exhibitorsAPI.eraseMyLead(holder?.id);
          await load();
          toastSuccess(t('myDataExhibitors.erased'));
        } catch (error) {
          toastError(getApiErrorMessage(error, t, {
            fallbackKey: 'myDataExhibitors.eraseError',
          }).message);
        } finally {
          setErasing(null);
        }
      },
      undefined,
      {
        confirmText: t('myDataExhibitors.confirmCta'),
        destructive: true,
      },
    );
  }, [showConfirm, t, load, toastSuccess, toastError]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(i18n.language, {
        day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderHolder = ({ item }: { item: LeadHolder }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.company, { color: colors.text }]}
          numberOfLines={2}
          allowFontScaling
          maxFontSizeMultiplier={1.5}
        >
          {item.exhibitor}
        </Text>
        <Text
          style={[styles.meta, { color: colors.gray500 }]}
          numberOfLines={2}
          allowFontScaling
          maxFontSizeMultiplier={1.5}
        >
          {item.event}
        </Text>
        {!!item.captured_at && (
          <Text
            style={[styles.meta, { color: colors.gray500 }]}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {t('myDataExhibitors.capturedOn', { date: formatDate(item.captured_at) })}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => erase(item)}
        disabled={erasing !== null}
        style={[styles.eraseBtn, { borderColor: colors.error }]}
        accessibilityRole="button"
        accessibilityLabel={t('myDataExhibitors.eraseOneA11y', { company: item.exhibitor })}
      >
        {erasing === item.id ? (
          <ActivityIndicator size="small" color={colors.error} />
        ) : (
          <Text
            style={[styles.eraseText, { color: colors.error }]}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
          >
            {t('myDataExhibitors.erase')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Retour' })}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
          allowFontScaling
          maxFontSizeMultiplier={1.4}
        >
          {t('myDataExhibitors.title')}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={holders}
          keyExtractor={(item) => item.id}
          renderItem={renderHolder}
          contentContainerStyle={[centeredContent(CARD_MAX), styles.list]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                            tintColor={colors.primary} />
          }
          ListHeaderComponent={
            holders.length > 0 ? (
              <View style={styles.intro}>
                <Text
                  style={[styles.introText, { color: colors.gray500 }]}
                  allowFontScaling
                  maxFontSizeMultiplier={1.6}
                >
                  {t('myDataExhibitors.intro', { count: holders.length })}
                </Text>
                <TouchableOpacity
                  onPress={() => erase()}
                  disabled={erasing !== null}
                  style={[styles.eraseAllBtn, { borderColor: colors.error }]}
                  accessibilityRole="button"
                >
                  {erasing === 'all' ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text
                        style={[styles.eraseText, { color: colors.error }]}
                        allowFontScaling
                        maxFontSizeMultiplier={1.3}
                      >
                        {t('myDataExhibitors.eraseAll')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={44} color={colors.gray400} />
              <Text
                style={[styles.emptyTitle, { color: colors.text }]}
                allowFontScaling
                maxFontSizeMultiplier={1.6}
              >
                {t('myDataExhibitors.emptyTitle')}
              </Text>
              <Text
                style={[styles.emptyBody, { color: colors.gray500 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.6}
              >
                {t('myDataExhibitors.emptyBody')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  headerBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: FontFamily.bold, fontSize: 17 },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
  intro: { gap: Spacing.sm, marginBottom: Spacing.sm },
  introText: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  company: { fontFamily: FontFamily.bold, fontSize: 16 },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 2 },

  eraseBtn: {
    minHeight: 44, minWidth: 88, borderWidth: 1, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  eraseAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    minHeight: 44, borderWidth: 1, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, alignSelf: 'flex-start',
  },
  eraseText: { fontFamily: FontFamily.bold, fontSize: 14 },

  emptyBox: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 17, textAlign: 'center' },
  emptyBody: {
    fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21,
    textAlign: 'center', paddingHorizontal: Spacing.lg,
  },
});
