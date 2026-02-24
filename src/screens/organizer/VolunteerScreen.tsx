import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { volunteersAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VolunteerRouteProp = RouteProp<RootStackParamList, 'Volunteers'>;

interface VolunteerRole {
  id: string;
  title: string;
  description?: string;
  event_name?: string;
  event_title?: string;
  capacity: number;
  filled_count?: number;
  applications_count?: number;
  requirements?: string;
  is_active?: boolean;
}

interface VolunteerApplication {
  id: string;
  role_title?: string;
  role_name?: string;
  role?: string;
  applicant_name?: string;
  applicant_email?: string;
  motivation?: string;
  availability?: string;
  experience?: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  created_at: string;
}

const APPLICATION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: Colors.warning, bg: Colors.warningLight },
  approved: { label: 'Approuvee', color: Colors.success, bg: Colors.successLight },
  rejected: { label: 'Refusee', color: Colors.error, bg: Colors.errorLight },
  withdrawn: { label: 'Retiree', color: Colors.textLight, bg: Colors.gray100 },
};

export default function VolunteerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VolunteerRouteProp>();
  const eventId = route.params?.eventId;

  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'roles' | 'applications'>('roles');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const params = eventId ? { event: eventId } : undefined;
      const [rolesRes, appsRes] = await Promise.all([
        volunteersAPI.getRoles(params),
        volunteersAPI.getMyApplications(),
      ]);
      setRoles(rolesRes.data.results || rolesRes.data || []);
      setApplications(appsRes.data.results || appsRes.data || []);
    } catch (error) {
      console.error('Erreur volunteers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [eventId]);

  const handleApply = (role: VolunteerRole) => {
    Alert.alert(
      'Postuler comme benevole',
      `Souhaitez-vous postuler pour le role "${role.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Postuler',
          onPress: async () => {
            setActionLoading(role.id);
            try {
              await volunteersAPI.apply({ role: role.id });
              Alert.alert('Succes', 'Votre candidature a ete envoyee !');
              fetchData();
            } catch (error: any) {
              console.error('Erreur apply volunteer:', error);
              const message = error?.response?.data?.detail || 'Impossible de postuler.';
              Alert.alert('Erreur', message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleWithdraw = (applicationId: string) => {
    Alert.alert(
      'Retirer la candidature',
      'Etes-vous sur de vouloir retirer votre candidature ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(applicationId);
            try {
              await volunteersAPI.withdrawApplication(applicationId);
              Alert.alert('Succes', 'Candidature retiree.');
              fetchData();
            } catch (error) {
              console.error('Erreur withdraw:', error);
              Alert.alert('Erreur', 'Impossible de retirer la candidature.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderRoleCard = ({ item }: { item: VolunteerRole }) => {
    const filled = item.filled_count || 0;
    const capacity = item.capacity || 0;
    const fillPercentage = capacity > 0 ? Math.min((filled / capacity) * 100, 100) : 0;
    const isFull = filled >= capacity && capacity > 0;
    const isProcessing = actionLoading === item.id;
    const hasApplied = applications.some(
      (a) => a.role === item.id && (a.status === 'pending' || a.status === 'approved')
    );

    return (
      <View style={styles.roleCard}>
        <View style={styles.roleHeader}>
          <View style={styles.roleIconContainer}>
            <Ionicons name="hand-right-outline" size={22} color={Colors.primary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle} numberOfLines={1}>{item.title}</Text>
            {(item.event_title || item.event_name) && (
              <Text style={styles.roleEvent} numberOfLines={1}>
                {item.event_title || item.event_name}
              </Text>
            )}
          </View>
        </View>

        {item.description ? (
          <Text style={styles.roleDescription} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {item.requirements ? (
          <View style={styles.requirementsRow}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.requirementsText} numberOfLines={2}>
              {item.requirements}
            </Text>
          </View>
        ) : null}

        {/* Capacity Bar */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityLabelRow}>
            <Text style={styles.capacityLabel}>Places</Text>
            <Text style={styles.capacityValue}>
              {filled}/{capacity}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${fillPercentage}%` },
                isFull && styles.progressBarFull,
              ]}
            />
          </View>
        </View>

        {/* Action */}
        {hasApplied ? (
          <View style={styles.appliedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.appliedText}>Candidature envoyee</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.applyButton, (isFull || !item.is_active) && styles.applyButtonDisabled]}
            onPress={() => handleApply(item)}
            disabled={isFull || isProcessing || !item.is_active}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="add" size={18} color={Colors.white} />
                <Text style={styles.applyButtonText}>
                  {isFull ? 'Complet' : 'Postuler'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderApplicationCard = ({ item }: { item: VolunteerApplication }) => {
    const statusConfig = APPLICATION_STATUS_CONFIG[item.status] || APPLICATION_STATUS_CONFIG.pending;
    const isPending = item.status === 'pending';
    const isProcessing = actionLoading === item.id;

    return (
      <View style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicationInfo}>
            <Text style={styles.applicationRole} numberOfLines={1}>
              {item.role_title || item.role_name || 'Role benevole'}
            </Text>
            {item.applicant_name && (
              <Text style={styles.applicationApplicant}>
                {item.applicant_name}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {item.motivation ? (
          <Text style={styles.motivationText} numberOfLines={2}>
            "{item.motivation}"
          </Text>
        ) : null}

        <View style={styles.applicationFooter}>
          <Text style={styles.applicationDate}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textLight} />{' '}
            {formatDate(item.created_at)}
          </Text>

          {isPending && (
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => handleWithdraw(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                  <Text style={styles.withdrawText}>Retirer</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const currentData = activeTab === 'roles' ? roles : applications;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Benevoles</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roles' && styles.activeTab]}
          onPress={() => setActiveTab('roles')}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={activeTab === 'roles' ? Colors.primary : Colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'roles' && styles.activeTabText]}>
            Roles ({roles.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
          onPress={() => setActiveTab('applications')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'applications' ? Colors.primary : Colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
            Candidatures ({applications.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'roles' ? (
        <FlatList
          data={roles}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>Aucun role disponible</Text>
              <Text style={styles.emptySubtext}>
                Les postes de benevoles seront affiches ici lorsqu'ils seront disponibles.
              </Text>
            </View>
          }
          renderItem={renderRoleCard}
        />
      ) : (
        <FlatList
          data={applications}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>Aucune candidature</Text>
              <Text style={styles.emptySubtext}>
                Postulez a un role pour voir votre candidature ici.
              </Text>
            </View>
          }
          renderItem={renderApplicationCard}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.md },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  activeTab: { backgroundColor: Colors.white, ...Shadows.md },
  tabText: { fontSize: FontSizes.sm, color: Colors.textLight, fontWeight: '600' },
  activeTabText: { color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  // Role Card
  roleCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  roleIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  roleEvent: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  roleDescription: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  requirementsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: Spacing.sm, backgroundColor: Colors.gray50, padding: Spacing.sm, borderRadius: BorderRadius.md },
  requirementsText: { flex: 1, fontSize: FontSizes.xs, color: Colors.textSecondary, lineHeight: 16 },
  capacitySection: { marginBottom: Spacing.md },
  capacityLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  capacityLabel: { fontSize: FontSizes.xs, color: Colors.textLight },
  capacityValue: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.text },
  progressBarBg: { height: 6, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressBarFull: { backgroundColor: Colors.error },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, backgroundColor: Colors.successLight, borderRadius: BorderRadius.lg },
  appliedText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.success },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.lg },
  applyButtonDisabled: { backgroundColor: Colors.gray300 },
  applyButtonText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.white },
  // Application Card
  applicationCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  applicationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  applicationInfo: { flex: 1, marginRight: Spacing.sm },
  applicationRole: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  applicationApplicant: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  motivationText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: Spacing.sm, lineHeight: 18 },
  applicationFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  applicationDate: { fontSize: FontSizes.xs, color: Colors.textLight },
  withdrawButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, backgroundColor: Colors.errorLight, borderRadius: BorderRadius.lg },
  withdrawText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.error },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textLight, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, color: Colors.textLight, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
