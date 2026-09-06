/**
 * Mes contacts de salon (lead retrieval).
 *
 * C'EST LE LIVRABLE QUI JUSTIFIE LE STAND. Sans cet écran, un exposant
 * pouvait scanner 200 visiteurs et repartir les mains vides : la capture
 * existait, la récupération non.
 *
 * L'export CSV est le geste final — le fichier qu'on ouvre au bureau le
 * lundi matin. Il est donc placé en tête, pas enfoui.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { exhibitorsAPI } from '../../api/exhibitors';
import ExportButton from '../../components/common/ExportButton';
import { Spacing, BorderRadius, FontFamily } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'MyLeads'>;

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  rating?: 'hot' | 'warm' | 'cold' | '';
  notes?: string;
  captured_at?: string | null;
}

// Le statut ne repose JAMAIS sur la seule couleur : une icône et un mot
// l'accompagnent, sinon un daltonien ne distingue pas chaud de froid.
const RATING_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; key: string }> = {
  hot: { icon: 'flame', key: 'leadCapture.rating_hot' },
  warm: { icon: 'partly-sunny', key: 'leadCapture.rating_warm' },
  cold: { icon: 'snow', key: 'leadCapture.rating_cold' },
};

export default function MyLeadsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const eventId = route.params?.eventId;
  const eventTitle = route.params?.eventTitle;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hairline = isDark ? colors.gray800 : colors.gray200;

  const load = useCallback(async () => {
    try {
      const response = await exhibitorsAPI.getMyLeads({ event: eventId });
      setLeads((response.data?.results ?? []) as Lead[]);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);
  // Un contact capturé sur l'écran de scan doit apparaître au retour.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderLead = ({ item }: { item: Lead }) => {
    const meta = item.rating ? RATING_META[item.rating] : undefined;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }]}>
        <View style={styles.cardHead}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {item.full_name || t('myLeads.unnamed')}
          </Text>
          {meta && (
            <View style={[styles.ratingChip, { borderColor: hairline }]}>
              <Ionicons name={meta.icon} size={13} color={colors.primary} />
              <Text
                style={[styles.ratingText, { color: colors.gray500 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.3}
              >
                {t(meta.key)}
              </Text>
            </View>
          )}
        </View>
        {!!item.company && (
          <Text
            style={[styles.line, { color: colors.gray500 }]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {item.company}
          </Text>
        )}
        {!!item.email && (
          <Text
            style={[styles.line, { color: colors.gray500 }]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {item.email}
          </Text>
        )}
        {!!item.phone && (
          <Text
            style={[styles.line, { color: colors.gray500 }]}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {item.phone}
          </Text>
        )}
        {!!item.notes && (
          <Text
            style={[styles.notes, { color: colors.gray500 }]}
            numberOfLines={3}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {item.notes}
          </Text>
        )}
      </View>
    );
  };

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
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.4}
          >
            {t('myLeads.title')}
          </Text>
          {!!eventTitle && (
            <Text
              style={[styles.headerSub, { color: colors.gray500 }]}
              numberOfLines={1}
              allowFontScaling
              maxFontSizeMultiplier={1.4}
            >
              {eventTitle}
            </Text>
          )}
        </View>
        {/* L'export est le geste final : il reste visible en permanence. */}
        <ExportButton
          endpoint="/exhibitor-leads/export/"
          filename={`contacts-${eventId}`}
          params={{ event: eventId }}
          formats={['csv']}
          compact
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={renderLead}
          contentContainerStyle={[centeredContent(CARD_MAX), styles.list]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                            tintColor={colors.primary} />
          }
          ListHeaderComponent={
            leads.length > 0 ? (
              <Text
                style={[styles.count, { color: colors.gray500 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {t('myLeads.count', { count: leads.length })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={44} color={colors.gray400} />
              <Text
                style={[styles.emptyTitle, { color: colors.text }]}
                allowFontScaling
                maxFontSizeMultiplier={1.6}
              >
                {t('myLeads.emptyTitle')}
              </Text>
              {/* Un vide est une invitation à agir, pas un constat. */}
              <Text
                style={[styles.emptyBody, { color: colors.gray500 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.6}
              >
                {t('myLeads.emptyBody')}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('LeadCapture', {
                  eventId, eventTitle,
                })}
                style={[styles.cta, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
              >
                <Ionicons name="scan-outline" size={18} color="#fff" />
                <Text style={styles.ctaText} allowFontScaling maxFontSizeMultiplier={1.4}>
                  {t('myBoothMobile.captureLeads')}
                </Text>
              </TouchableOpacity>
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
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17 },
  headerSub: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 1 },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
  count: { fontFamily: FontFamily.regular, fontSize: 13, marginBottom: Spacing.xs },

  card: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { flex: 1, fontFamily: FontFamily.bold, fontSize: 16 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  ratingText: { fontFamily: FontFamily.medium, fontSize: 11 },
  line: { fontFamily: FontFamily.regular, fontSize: 14 },
  notes: {
    fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19,
    marginTop: Spacing.xs, fontStyle: 'italic',
  },

  emptyBox: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 17, textAlign: 'center' },
  emptyBody: {
    fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21,
    textAlign: 'center', paddingHorizontal: Spacing.lg,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    minHeight: 48, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.sm,
  },
  ctaText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 15 },
});
