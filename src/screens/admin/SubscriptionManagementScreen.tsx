import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { subscriptionsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
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

interface SubscriptionPlan {
  id: string;
  name: string;
  slug?: string;
  price_monthly: number;
  price_yearly?: number;
  max_events?: number;
  max_registrations_per_event?: number;
  commission_rate?: number;
  features?: string[];
  is_active?: boolean;
}

export default function SubscriptionManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await subscriptionsAPI.getPlans();
      const data = res.data?.results || res.data || [];
      setPlans(data);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlans();
    setRefreshing(false);
  };

  const renderPlan = ({ item }: { item: SubscriptionPlan }) => (
    <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      <View style={styles.planHeader}>
        <View style={[styles.planIcon, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}>
          <Ionicons name="diamond-outline" size={24} color="#4F46E5" />
        </View>
        <View style={styles.planInfo}>
          <Text style={[styles.planName, { color: colors.gray900 }]}>{item.name}</Text>
          <Text style={[styles.planPrice, { color: colors.primary }]}>
            {item.price_monthly.toLocaleString()} {platformCurrency}/mois
          </Text>
        </View>
        <Badge
          label={item.is_active !== false ? 'Actif' : 'Inactif'}
          variant={item.is_active !== false ? 'success' : 'secondary'}
          size="sm"
        />
      </View>

      <View style={[styles.planDetails, { borderTopColor: colors.gray100 }]}>
        {item.max_events !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.gray400} />
            <Text style={[styles.detailText, { color: colors.gray600 }]}>
              {item.max_events === 0 ? 'Evenements illimites' : `${item.max_events} evenements max`}
            </Text>
          </View>
        )}
        {item.commission_rate !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.gray400} />
            <Text style={[styles.detailText, { color: colors.gray600 }]}>
              Commission: {item.commission_rate}%
            </Text>
          </View>
        )}
        {item.max_registrations_per_event !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color={colors.gray400} />
            <Text style={[styles.detailText, { color: colors.gray600 }]}>
              {item.max_registrations_per_event === 0 ? 'Inscriptions illimitees' : `${item.max_registrations_per_event} inscriptions/event`}
            </Text>
          </View>
        )}
      </View>

      {item.features && item.features.length > 0 && (
        <View style={[styles.featuresSection, { borderTopColor: colors.gray100 }]}>
          {item.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.featureText, { color: colors.gray700 }]}>{feature}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Abonnements</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="diamond-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aucun plan d'abonnement</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3 },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  planCard: { borderRadius: BorderRadius['2xl'], borderWidth: 1, marginBottom: Spacing.md, overflow: 'hidden' },
  planHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  planIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  planInfo: { flex: 1, marginLeft: Spacing.md },
  planName: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.lg },
  planPrice: { fontFamily: FontFamily.bold, fontSize: FontSizes.md, marginTop: 2 },
  planDetails: { padding: Spacing.md, borderTopWidth: 1, gap: Spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  featuresSection: { padding: Spacing.md, borderTopWidth: 1, gap: Spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.base },
});
