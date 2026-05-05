// ============================================
// SponsorManagementScreen — gestion des sponsors d'un event (organizer)
// ============================================
//
// Liste les EventSponsor d'un event donné avec :
//   - état confirmé / en attente (badge)
//   - métriques visibility_count + click_count
//   - bouton "Confirmer" pour les sponsors en attente (passe is_confirmed=true)
//
// Routes : navigué depuis MyEventsScreen → action "Sponsors". Le backend
// vérifie déjà que le user est organizer/admin.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { sponsorsAPI, getMediaUrl } from '../../api';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'SponsorManagement'>;

interface Sponsor {
  id: string;
  event: string;
  package: number | null;
  package_name: string | null;
  sponsor_name: string;
  sponsor_logo?: string | null;
  sponsor_website?: string | null;
  sponsor_description?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  amount_paid?: number | string;
  is_confirmed: boolean;
  visibility_count: number;
  click_count: number;
}

export default function SponsorManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchSponsors = useCallback(async () => {
    try {
      const res = await sponsorsAPI.getByEvent(eventId);
      const data: Sponsor[] = res.data?.results || res.data || [];
      setSponsors(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError('Erreur', error?.response?.data?.detail || 'Impossible de charger les sponsors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, showError]);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSponsors();
  };

  const handleConfirm = async (sponsor: Sponsor) => {
    if (sponsor.is_confirmed || confirmingId) return;
    setConfirmingId(sponsor.id);
    // Optimistic flip — rollback sur erreur. Le backend revient avec le sponsor
    // mis à jour ; on patche localement avec is_confirmed=true en attendant.
    setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, is_confirmed: true } : s));
    try {
      await sponsorsAPI.confirm(sponsor.id);
      showSuccess('Sponsor confirmé', `${sponsor.sponsor_name} apparaît maintenant publiquement.`);
    } catch (error: any) {
      setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, is_confirmed: false } : s));
      showError('Erreur', error?.response?.data?.detail || 'Impossible de confirmer.');
    } finally {
      setConfirmingId(null);
    }
  };

  const renderItem = ({ item }: { item: Sponsor }) => {
    const logo = getMediaUrl(item.sponsor_logo);
    const isConfirming = confirmingId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardTop}>
          {logo ? (
            <Image source={logo} style={styles.logo} contentFit="contain" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="business-outline" size={22} color={colors.gray400} />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.sponsor_name}
            </Text>
            {item.package_name && (
              <Text style={[styles.packageLabel, { color: colors.gray500 }]} numberOfLines={1}>
                {item.package_name}
              </Text>
            )}
          </View>
          <View style={[
            styles.statusPill,
            item.is_confirmed
              ? { backgroundColor: '#10B98115' }
              : { backgroundColor: '#F59E0B15' },
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.is_confirmed ? '#059669' : '#B45309' },
            ]}>
              {item.is_confirmed ? 'CONFIRMÉ' : 'EN ATTENTE'}
            </Text>
          </View>
        </View>

        <View style={[styles.statsRow, { borderTopColor: hairline }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.visibility_count ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>VUES</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: hairline }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.click_count ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>CLICS</Text>
          </View>
          {item.amount_paid != null && Number(item.amount_paid) > 0 && (
            <>
              <View style={[styles.statDivider, { backgroundColor: hairline }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Number(item.amount_paid).toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.gray500 }]}>PAYÉ</Text>
              </View>
            </>
          )}
        </View>

        {!item.is_confirmed && (
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: colors.primary },
              isConfirming && { opacity: 0.6 },
            ]}
            onPress={() => handleConfirm(item)}
            disabled={isConfirming}
            activeOpacity={0.85}
          >
            {isConfirming ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                <Text style={styles.confirmBtnText}>Confirmer le sponsor</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>PARTENARIATS</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sponsors</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sponsors}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, sponsors.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun sponsor</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                Les sponsors apparaîtront ici quand un partenariat sera ajouté.
              </Text>
            </View>
          }
        />
      )}
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  name: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
  },
  packageLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  confirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
