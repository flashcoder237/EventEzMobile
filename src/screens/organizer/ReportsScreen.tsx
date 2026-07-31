import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { analyticsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
import ExportButton from '../../components/common/ExportButton';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Report {
  id: string;
  title: string;
  report_type?: string;
  status?: string;
  created_at: string;
  file_url?: string;
}

export default function ReportsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await analyticsAPI.getReports();
      const data = res.data?.results || res.data || [];
      setReports(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement rapports:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await analyticsAPI.generateReport({
        report_type: 'custom',
        title: `${t('organizer.reports.reportTitlePrefix')} ${new Date().toLocaleDateString('fr-FR')}`,
      });
      showSuccess(t('common.success'), t('organizer.reports.generateSuccess'));
      fetchReports();
    } catch (error) {
      showError(t('common.error'), t('organizer.reports.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status?: string): { label: string; variant: 'success' | 'warning' | 'info' | 'secondary' } => {
    switch (status) {
      case 'completed': return { label: t('organizer.reports.statusCompleted'), variant: 'success' };
      case 'processing': return { label: t('organizer.reports.statusProcessing'), variant: 'warning' };
      case 'scheduled': return { label: t('organizer.reports.statusScheduled'), variant: 'info' };
      default: return { label: status || t('organizer.reports.statusNew'), variant: 'secondary' };
    }
  };

  const renderReport = ({ item }: { item: Report }) => {
    const statusInfo = getStatusBadge(item.status);

    return (
      <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
        <View style={styles.reportHeader}>
          <View style={[styles.reportIcon, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}>
            <Ionicons name="document-text" size={20} color="#4F46E5" />
          </View>
          <View style={styles.reportInfo}>
            <Text style={[styles.reportTitle, { color: colors.gray900 }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.reportDate, { color: colors.gray500 }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <Badge label={statusInfo.label} variant={statusInfo.variant} size="sm" />
        </View>
        {item.report_type && (
          <Text style={[styles.reportType, { color: colors.gray400 }]}>
            {t('organizer.reports.typeLabel')}: {item.report_type}
          </Text>
        )}
        <View style={styles.reportActions}>
          <ExportButton
            endpoint={`/analytics/reports/${item.id}/export/`}
            filename={(item.title || `rapport_${item.id}`).slice(0, 40)}
          />
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="document-text-outline" size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>{t('organizer.reports.emptyTitle')}</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {t('organizer.reports.emptyText')}
      </Text>
    </View>
  );

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>RPT</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('organizer.reports.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>{t('organizer.reports.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: '#4F46E5' }]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>{t('organizer.reports.generate')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { ...TextStyles.h3, textAlign: 'center', letterSpacing: -0.3 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, gap: 4 },
  generateBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: '#FFFFFF' },
  listContent: { padding: Spacing.lg, flexGrow: 1, ...centeredContent(CARD_MAX) },
  reportCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1 },
  reportHeader: { flexDirection: 'row', alignItems: 'center' },
  reportIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reportInfo: { flex: 1, marginLeft: Spacing.md, marginRight: Spacing.sm },
  reportTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  reportDate: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  reportType: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: Spacing.sm, marginLeft: 52 },
  reportActions: { flexDirection: 'row', marginTop: Spacing.sm, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, gap: 4 },
  actionBtnText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  emptyTitle: { ...TextStyles.h3, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSizes.base, textAlign: 'center', lineHeight: 22 },
});
