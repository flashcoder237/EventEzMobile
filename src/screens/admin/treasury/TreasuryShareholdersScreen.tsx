import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../contexts/ThemeContext';
import { useAlert } from '../../../contexts/AlertContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { treasuryAPI } from '../../../api';
import { RootStackParamList, Shareholder, DividendDistribution } from '../../../types';
import Badge from '../../../components/ui/Badge';
import RoleGuard from '../../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'shareholders' | 'dividends';

const SHAREHOLDER_COLOR = '#A855F7';

export default function TreasuryShareholdersScreen() {
  return (
    <RoleGuard allow={['admin']} watermark="SHA" title="Actionnaires">
      <TreasuryShareholdersContent />
    </RoleGuard>
  );
}

function TreasuryShareholdersContent() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const [activeTab, setActiveTab] = useState<TabType>('shareholders');
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);

  // Distribution preview / création
  const today = new Date();
  const firstOfMonthIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDayMonthIso = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStart, setPreviewStart] = useState(firstOfMonthIso);
  const [previewEnd, setPreviewEnd] = useState(lastDayMonthIso);
  const [previewPercentage, setPreviewPercentage] = useState('30');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [creatingDist, setCreatingDist] = useState(false);

  const closePreview = () => {
    if (previewLoading || creatingDist) return;
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const runPreview = async () => {
    const pct = parseFloat(previewPercentage.replace(',', '.'));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      showError('Pourcentage invalide', 'Le pourcentage à distribuer doit être entre 0 et 100.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(previewStart) || !/^\d{4}-\d{2}-\d{2}$/.test(previewEnd)) {
      showError('Format de date', 'Format attendu : YYYY-MM-DD.');
      return;
    }
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await treasuryAPI.previewDividend({
        period_start: previewStart,
        period_end: previewEnd,
        distribution_percentage: pct,
      });
      setPreviewData(res.data);
    } catch (error: any) {
      showError('Erreur', error?.response?.data?.detail || 'Aperçu impossible.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const createDistribution = async () => {
    if (!previewData) return;
    const pct = parseFloat(previewPercentage.replace(',', '.'));
    setCreatingDist(true);
    try {
      // L'API createDividend prend un payload qu'on construit à partir des
      // mêmes paramètres que le preview. Le backend répartit ensuite selon
      // les ownership_percentage de chaque actionnaire actif.
      await treasuryAPI.createDividend({
        period_start: previewStart,
        period_end: previewEnd,
        distribution_percentage: pct,
      });
      showSuccess('Distribution créée', "Elle apparaît dans l'onglet Dividendes en attente d'approbation.");
      setPreviewOpen(false);
      setPreviewData(null);
      // Refresh la liste des dividendes
      fetchData();
      setActiveTab('dividends');
    } catch (error: any) {
      showError('Erreur', error?.response?.data?.detail || 'Impossible de créer la distribution.');
    } finally {
      setCreatingDist(false);
    }
  };
  const [dividends, setDividends] = useState<DividendDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shRes, divRes] = await Promise.all([
        treasuryAPI.getShareholders().catch(() => ({ data: [] })),
        treasuryAPI.getDividends().catch(() => ({ data: [] })),
      ]);
      setShareholders(shRes.data?.results || shRes.data || []);
      setDividends(divRes.data?.results || divRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur actionnaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const totalOwnership = shareholders.reduce((sum, s) => sum + s.ownership_percentage, 0);
  const ownershipComplete = totalOwnership === 100;

  const renderShareholder = ({ item }: { item: Shareholder }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: `${SHAREHOLDER_COLOR}15` }]}>
          <Text style={[styles.avatarText, { color: SHAREHOLDER_COLOR }]}>
            {(item.name?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
            Depuis {new Date(item.joined_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Text style={[styles.percentage, { color: SHAREHOLDER_COLOR }]}>{item.ownership_percentage}%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.bar, { width: `${item.ownership_percentage}%`, backgroundColor: SHAREHOLDER_COLOR }]} />
      </View>
    </View>
  );

  const renderDividend = ({ item }: { item: DividendDistribution }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWell, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="cash-outline" size={18} color="#10B981" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.total_amount.toLocaleString()} {platformCurrency}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
            {new Date(item.period_start).toLocaleDateString('fr-FR', { month: 'short' })} - {new Date(item.period_end).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Badge
          label={item.status === 'distributed' ? 'Distribué' : item.status === 'approved' ? 'Approuvé' : 'Brouillon'}
          variant={item.status === 'distributed' ? 'success' : item.status === 'approved' ? 'info' : 'secondary'}
          size="sm"
        />
      </View>
    </View>
  );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'shareholders', label: 'Actionnaires', count: shareholders.length },
    { key: 'dividends', label: 'Dividendes', count: dividends.length },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>LE CAPITAL</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Actionnaires</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${SHAREHOLDER_COLOR}15`, borderColor: `${SHAREHOLDER_COLOR}30` }, Shadows.sm]}
          onPress={() => {
            setPreviewData(null);
            setPreviewOpen(true);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Distribuer les dividendes"
        >
          <Ionicons name="cash-outline" size={18} color={SHAREHOLDER_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <View style={[styles.ownershipCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ownershipEyebrow, { color: colors.gray500 }]}>PARTS ATTRIBUÉES</Text>
            <Text style={[styles.ownershipValue, { color: ownershipComplete ? '#10B981' : '#F59E0B' }]}>
              {totalOwnership}%
            </Text>
          </View>
          <View style={[styles.ownershipBadge, { backgroundColor: ownershipComplete ? '#10B98115' : '#F59E0B15' }]}>
            <Ionicons
              name={ownershipComplete ? 'checkmark-circle' : 'alert-circle-outline'}
              size={14}
              color={ownershipComplete ? '#10B981' : '#F59E0B'}
            />
            <Text style={[styles.ownershipBadgeText, { color: ownershipComplete ? '#10B981' : '#F59E0B' }]}>
              {ownershipComplete ? 'Complet' : `Reste ${100 - totalOwnership}%`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.text, borderColor: colors.text }
                    : { backgroundColor: colors.card, borderColor: hairline },
                ]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? colors.background : colors.gray600 }]}>
                  {t.label} ({t.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={activeTab === 'shareholders' ? shareholders as any[] : dividends as any[]}
        renderItem={activeTab === 'shareholders' ? renderShareholder as any : renderDividend as any}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>
              {activeTab === 'shareholders' ? 'Aucun actionnaire' : 'Aucun dividende'}
            </Text>
          </View>
        }
      />

      {/* === DIVIDEND PREVIEW + DISTRIBUTE MODAL === */}
      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.divModalBackdrop}>
          <View style={[styles.divModalCard, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.divModalEyebrow, { color: SHAREHOLDER_COLOR }]}>RÉPARTITION</Text>
              <Text style={[styles.divModalTitle, { color: colors.text }]}>Distribuer les dividendes</Text>

              {/* Période */}
              <View style={styles.divDateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.divLabel, { color: colors.gray500 }]}>Période début</Text>
                  <TextInput
                    style={[styles.divInput, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                    value={previewStart}
                    onChangeText={setPreviewStart}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray400}
                    autoCapitalize="none"
                    editable={!previewLoading && !creatingDist}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.divLabel, { color: colors.gray500 }]}>Période fin</Text>
                  <TextInput
                    style={[styles.divInput, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                    value={previewEnd}
                    onChangeText={setPreviewEnd}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray400}
                    autoCapitalize="none"
                    editable={!previewLoading && !creatingDist}
                  />
                </View>
              </View>

              <Text style={[styles.divLabel, { color: colors.gray500, marginTop: Spacing.md }]}>
                % du résultat à distribuer
              </Text>
              <TextInput
                style={[styles.divInput, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                value={previewPercentage}
                onChangeText={setPreviewPercentage}
                placeholder="30"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
                editable={!previewLoading && !creatingDist}
              />

              <TouchableOpacity
                style={[styles.divPreviewBtn, { backgroundColor: `${SHAREHOLDER_COLOR}15`, borderColor: `${SHAREHOLDER_COLOR}40` }]}
                onPress={runPreview}
                disabled={previewLoading || creatingDist}
                activeOpacity={0.85}
              >
                {previewLoading ? (
                  <ActivityIndicator size="small" color={SHAREHOLDER_COLOR} />
                ) : (
                  <>
                    <Ionicons name="calculator-outline" size={16} color={SHAREHOLDER_COLOR} />
                    <Text style={[styles.divPreviewText, { color: SHAREHOLDER_COLOR }]}>
                      Calculer l'aperçu
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {previewData && (
                <View style={[styles.divResultCard, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline }]}>
                  <Text style={[styles.divResultEyebrow, { color: colors.gray500 }]}>RÉSULTAT NET PÉRIODE</Text>
                  <Text style={[styles.divResultValue, { color: colors.text }]}>
                    {Number(previewData.net_profit ?? previewData.profit ?? 0).toLocaleString()} {platformCurrency}
                  </Text>
                  <Text style={[styles.divResultEyebrow, { color: colors.gray500, marginTop: Spacing.sm }]}>
                    À DISTRIBUER ({previewPercentage}%)
                  </Text>
                  <Text style={[styles.divResultValue, { color: SHAREHOLDER_COLOR }]}>
                    {Number(previewData.total_distribution ?? previewData.amount_to_distribute ?? 0).toLocaleString()} {platformCurrency}
                  </Text>

                  {Array.isArray(previewData.allocations) && previewData.allocations.length > 0 && (
                    <View style={{ marginTop: Spacing.md }}>
                      <Text style={[styles.divResultEyebrow, { color: colors.gray500, marginBottom: 8 }]}>RÉPARTITION</Text>
                      {previewData.allocations.map((a: any, idx: number) => (
                        <View key={idx} style={[styles.divAllocRow, idx > 0 && { borderTopColor: hairline, borderTopWidth: 1 }]}>
                          <Text style={[styles.divAllocName, { color: colors.text }]} numberOfLines={1}>
                            {a.shareholder_name || a.name || 'Actionnaire'}
                          </Text>
                          <Text style={[styles.divAllocPct, { color: colors.gray500 }]}>
                            {Number(a.ownership_percentage ?? a.percentage ?? 0).toFixed(1)}%
                          </Text>
                          <Text style={[styles.divAllocAmount, { color: colors.text }]}>
                            {Number(a.amount ?? 0).toLocaleString()} {platformCurrency}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.divModalActions}>
                <TouchableOpacity
                  style={[styles.divModalBtn, { backgroundColor: colors.gray100 }]}
                  onPress={closePreview}
                  disabled={previewLoading || creatingDist}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.divModalBtnText, { color: colors.gray700 }]}>Fermer</Text>
                </TouchableOpacity>
                {previewData && (
                  <TouchableOpacity
                    style={[styles.divModalBtn, { backgroundColor: SHAREHOLDER_COLOR }, creatingDist && { opacity: 0.6 }]}
                    onPress={createDistribution}
                    disabled={creatingDist}
                    activeOpacity={0.85}
                  >
                    {creatingDist ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.divModalBtnText, { color: '#fff' }]}>Créer la distribution</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  ownershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  ownershipEyebrow: { fontFamily: FontFamily.bold, fontSize: 9, letterSpacing: 1.2, marginBottom: 2 },
  ownershipValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['2xl'], letterSpacing: -0.5 },
  ownershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  ownershipBadgeText: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs },
  filtersRow: {
    paddingVertical: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginHorizontal: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  cardSubtitle: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  percentage: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg, letterSpacing: -0.3 },
  barTrack: {
    height: 4,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: { height: 4, borderRadius: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },

  // Dividend preview modal
  divModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  divModalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  divModalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  divModalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  divDateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  divLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  divInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  divPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    marginTop: Spacing.lg,
  },
  divPreviewText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  divResultCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  divResultEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  divResultValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  divAllocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  divAllocName: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  divAllocPct: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    width: 50,
    textAlign: 'right',
  },
  divAllocAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    minWidth: 100,
    textAlign: 'right',
  },
  divModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  divModalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divModalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
