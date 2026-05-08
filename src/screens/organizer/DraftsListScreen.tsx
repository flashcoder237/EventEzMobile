/**
 * DraftsListScreen — Liste des brouillons d'événement nommés.
 *
 * Permet à l'organisateur qui jongle entre plusieurs idées de retrouver
 * et reprendre un brouillon précédemment snapshotté via useNamedDrafts.
 * Tap = ouvre EventCreate avec draftId pré-chargé. Long-press = supprimer.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useNamedDrafts, NamedDraftMeta } from '../../hooks/useNamedDrafts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function useFormatRelative() {
  const { t } = useTranslation();
  return React.useCallback((iso: string) => {
    try {
      const d = new Date(iso);
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return t('organizer.draftsList.relativeNow');
      if (diff < 3600) return t('organizer.draftsList.relativeMin', { count: Math.floor(diff / 60) });
      if (diff < 86400) return t('organizer.draftsList.relativeHour', { count: Math.floor(diff / 3600) });
      if (diff < 604800) return t('organizer.draftsList.relativeDay', { count: Math.floor(diff / 86400) });
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  }, [t]);
}

export default function DraftsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showConfirm } = useAlert();
  const formatRelative = useFormatRelative();
  const { drafts, loading, deleteById, refresh } = useNamedDrafts();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleOpen = (draft: NamedDraftMeta) => {
    navigation.navigate('EventCreate' as any, { draftId: draft.id });
  };

  const handleDelete = (draft: NamedDraftMeta) => {
    showConfirm(
      t('organizer.draftsList.deleteConfirmTitle'),
      t('organizer.draftsList.deleteConfirmMessage', { name: draft.name }),
      () => deleteById(draft.id),
    );
  };

  const renderItem = ({ item }: { item: NamedDraftMeta }) => (
    <TouchableOpacity
      onPress={() => handleOpen(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.85}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)' },
        Shadows.sm,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('organizer.draftsList.draftA11y', { name: item.name, saved: formatRelative(item.savedAt) })}
    >
      <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="document-text" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.titleSnapshot && item.titleSnapshot !== item.name ? (
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
            {item.titleSnapshot}
          </Text>
        ) : null}
        <Text style={[styles.cardTime, { color: colors.gray400 }]}>
          {t('organizer.draftsList.savedAt', { time: formatRelative(item.savedAt) })}
        </Text>
      </View>
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="document-outline" size={32} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.draftsList.emptyTitle')}</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {t('organizer.draftsList.emptyText')}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('EventCreate' as any, undefined)}
        style={[styles.emptyCta, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.emptyCtaText}>{t('organizer.draftsList.newDraft')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>WIP</WatermarkNumeral>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>WIP</WatermarkNumeral>
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('organizer.draftsList.eyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.draftsList.title')}</Text>
          </View>
          {drafts.length > 0 && (
            <View style={[styles.countPill, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.countPillText, { color: colors.primary }]}>{drafts.length}</Text>
            </View>
          )}
        </View>

        {drafts.length > 0 && (
          <Text style={[styles.hint, { color: colors.gray500 }]}>
            {t('organizer.draftsList.hint')}
          </Text>
        )}

        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, drafts.length === 0 && { flex: 1 }]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginBottom: 2,
  },
  cardTime: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  chevron: {
    paddingLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    lineHeight: 18,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: Spacing.lg,
  },
  emptyCtaText: {
    color: '#fff',
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
