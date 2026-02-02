import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { registrationsAPI, eventsAPI } from '../../api/client';
import { Registration, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'EventRegistrations'>;

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  pending_approval: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  confirmed: { label: 'Confirmé', color: '#10B981', bgColor: '#D1FAE5' },
  approved: { label: 'Approuvé', color: '#10B981', bgColor: '#D1FAE5' },
  rejected: { label: 'Refusé', color: '#EF4444', bgColor: '#FEE2E2' },
  cancelled: { label: 'Annulé', color: '#6B7280', bgColor: '#F3F4F6' },
  completed: { label: 'Complété', color: '#3B82F6', bgColor: '#DBEAFE' },
  checked_in: { label: 'Enregistré', color: '#8B5CF6', bgColor: '#EDE9FE' },
};

const approvalStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  not_required: { label: 'Auto', color: '#6B7280', bgColor: '#F3F4F6' },
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  approved: { label: 'Approuvé', color: '#10B981', bgColor: '#D1FAE5' },
  rejected: { label: 'Refusé', color: '#EF4444', bgColor: '#FEE2E2' },
};

export default function EventRegistrationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { eventId } = route.params;
  const { showAlert, showSuccess, showError } = useAlert();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    fetchRegistrations();
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      // Fetch event details and registrations in parallel
      const [eventResponse, registrationsResponse] = await Promise.all([
        eventsAPI.getEvent(eventId),
        registrationsAPI.getRegistrations({ event: eventId, event_id: eventId }),
      ]);

      // Set event title
      if (eventResponse.data) {
        setEventTitle(eventResponse.data.title || '');
      }

      // Set registrations - filter to make sure we only get this event's registrations
      const data = registrationsResponse.data.results || registrationsResponse.data || [];
      const filteredData = data.filter((r: Registration) => {
        // Handle both cases: event as string or event as object
        const regEventId = typeof r.event === 'string' ? r.event : r.event?.id;
        return regEventId === eventId;
      });
      setRegistrations(filteredData);
    } catch (error) {
      console.error('Erreur chargement inscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRegistrations();
    setRefreshing(false);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: registrations.length,
      pending: registrations.filter(r => r.approval_status === 'pending').length,
      approved: registrations.filter(r => r.approval_status === 'approved' || r.status === 'confirmed').length,
      rejected: registrations.filter(r => r.approval_status === 'rejected').length,
    };
  }, [registrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    switch (filter) {
      case 'pending':
        return registrations.filter(r => r.approval_status === 'pending');
      case 'approved':
        return registrations.filter(r => r.approval_status === 'approved' || r.status === 'confirmed');
      case 'rejected':
        return registrations.filter(r => r.approval_status === 'rejected');
      default:
        return registrations;
    }
  }, [registrations, filter]);

  const handleApprove = async (registration: Registration) => {
    setProcessing(true);
    try {
      await registrationsAPI.approveRegistration(registration.id);
      // Update local state
      setRegistrations(prev =>
        prev.map(r => r.id === registration.id
          ? { ...r, approval_status: 'approved' as any, status: 'confirmed' as any }
          : r
        )
      );
      setShowDetailModal(false);
      showSuccess('Succès', 'Inscription approuvée avec succès');
    } catch (error) {
      console.error('Erreur approbation:', error);
      showError('Erreur', 'Impossible d\'approuver l\'inscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showError('Erreur', 'Veuillez indiquer une raison de refus');
      return;
    }

    if (!selectedRegistration) return;

    setProcessing(true);
    try {
      await registrationsAPI.rejectRegistration(selectedRegistration.id, rejectReason);
      // Update local state
      setRegistrations(prev =>
        prev.map(r => r.id === selectedRegistration.id
          ? { ...r, approval_status: 'rejected' as any, status: 'rejected' as any }
          : r
        )
      );
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
      showSuccess('Succès', 'Inscription refusée');
    } catch (error) {
      console.error('Erreur refus:', error);
      showError('Erreur', 'Impossible de refuser l\'inscription');
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (registration: Registration) => {
    setSelectedRegistration(registration);
    setShowRejectModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = (registration: Registration): string => {
    if (registration.user) {
      const user = registration.user;
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      if (user.email) return user.email.split('@')[0];
    }
    if (registration.user_name) return registration.user_name;
    return 'Participant';
  };

  const getEmail = (registration: Registration): string => {
    if (registration.user && registration.user.email) {
      return registration.user.email;
    }
    if (registration.user_email) return registration.user_email;
    return '';
  };

  const renderRegistration = ({ item }: { item: Registration }) => {
    const statusInfo = statusConfig[item.status] || statusConfig.pending;
    const approvalInfo = approvalStatusConfig[item.approval_status || 'not_required'];
    const isPending = item.approval_status === 'pending';

    return (
      <TouchableOpacity
        style={[styles.registrationCard, isPending && styles.pendingCard]}
        onPress={() => {
          setSelectedRegistration(item);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.registrationHeader}>
          <View style={styles.participantInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getDisplayName(item).substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.participantDetails}>
              <Text style={styles.participantName} numberOfLines={1}>
                {getDisplayName(item)}
              </Text>
              <Text style={styles.participantEmail} numberOfLines={1}>
                {getEmail(item)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: approvalInfo.bgColor }]}>
            <Text style={[styles.statusText, { color: approvalInfo.color }]}>
              {approvalInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.registrationInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gray400} />
            <Text style={styles.infoText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="ticket-outline" size={14} color={Colors.gray400} />
            <Text style={styles.infoText}>{item.reference_code}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item)}
            >
              <Ionicons name="checkmark" size={18} color={Colors.white} />
              <Text style={styles.approveButtonText}>Approuver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => openRejectModal(item)}
            >
              <Ionicons name="close" size={18} color={Colors.error} />
              <Text style={styles.rejectButtonText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={48} color={Colors.gray400} />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === 'pending' ? 'Aucune inscription en attente' : 'Aucune inscription'}
      </Text>
      <Text style={styles.emptyText}>
        {filter === 'pending'
          ? 'Toutes les inscriptions ont été traitées.'
          : 'Les inscriptions à cet événement apparaîtront ici.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.container}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#7C3AED', '#9333EA', '#D946EF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Inscriptions</Text>
                {eventTitle && (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>{eventTitle}</Text>
                )}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, stats.pending > 0 && { color: '#FCD34D' }]}>
                  {stats.pending}
                </Text>
                <Text style={styles.statLabel}>En attente</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.approved}</Text>
                <Text style={styles.statLabel}>Approuvés</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.rejected}</Text>
                <Text style={styles.statLabel}>Refusés</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : 'Refusés'}
                </Text>
                {f === 'pending' && stats.pending > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{stats.pending}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          <FlatList
            data={filteredRegistrations}
            renderItem={renderRegistration}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          />

          {/* Detail Modal */}
          <Modal
            visible={showDetailModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDetailModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedRegistration && (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Détails de l'inscription</Text>
                      <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                        <Ionicons name="close" size={24} color={Colors.gray600} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Participant</Text>
                        <Text style={styles.detailValue}>{getDisplayName(selectedRegistration)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{getEmail(selectedRegistration)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Référence</Text>
                        <Text style={styles.detailValue}>{selectedRegistration.reference_code}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date d'inscription</Text>
                        <Text style={styles.detailValue}>{formatDate(selectedRegistration.created_at)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Statut</Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: (approvalStatusConfig[selectedRegistration.approval_status || 'not_required']).bgColor }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: (approvalStatusConfig[selectedRegistration.approval_status || 'not_required']).color }
                          ]}>
                            {(approvalStatusConfig[selectedRegistration.approval_status || 'not_required']).label}
                          </Text>
                        </View>
                      </View>

                      {selectedRegistration.form_data && Object.keys(selectedRegistration.form_data).length > 0 && (
                        <View style={styles.formDataSection}>
                          <Text style={styles.formDataTitle}>Données du formulaire</Text>
                          {Object.entries(selectedRegistration.form_data).map(([key, value]) => (
                            <View key={key} style={styles.formDataRow}>
                              <Text style={styles.formDataKey}>{key}</Text>
                              <Text style={styles.formDataValue}>{String(value)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {selectedRegistration.approval_status === 'pending' && (
                      <View style={styles.modalFooter}>
                        <TouchableOpacity
                          style={styles.modalRejectButton}
                          onPress={() => openRejectModal(selectedRegistration)}
                        >
                          <Text style={styles.modalRejectButtonText}>Refuser</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalApproveButton}
                          onPress={() => handleApprove(selectedRegistration)}
                          disabled={processing}
                        >
                          {processing ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <Text style={styles.modalApproveButtonText}>Approuver</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </Modal>

          {/* Reject Modal */}
          <Modal
            visible={showRejectModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setShowRejectModal(false);
              setRejectReason('');
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.rejectModalContent}>
                <View style={styles.rejectModalHeader}>
                  <Ionicons name="close-circle" size={48} color={Colors.error} />
                  <Text style={styles.rejectModalTitle}>Refuser l'inscription</Text>
                  <Text style={styles.rejectModalSubtitle}>
                    Veuillez indiquer la raison du refus
                  </Text>
                </View>

                <TextInput
                  style={styles.rejectInput}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Raison du refus..."
                  placeholderTextColor={Colors.gray400}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <View style={styles.rejectModalFooter}>
                  <TouchableOpacity
                    style={styles.rejectCancelButton}
                    onPress={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                  >
                    <Text style={styles.rejectCancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectConfirmButton}
                    onPress={handleReject}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.rejectConfirmButtonText}>Confirmer le refus</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#7C3AED',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.sm,
  },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  filterTextActive: {
    color: Colors.white,
  },
  filterBadge: {
    marginLeft: Spacing.xs,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    flexGrow: 1,
  },

  // Registration Card
  registrationCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  pendingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  registrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  participantDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  participantName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  participantEmail: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  registrationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  approveButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  rejectButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    ...TextStyles.h4,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
    maxWidth: '60%',
    textAlign: 'right',
  },
  formDataSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
  },
  formDataTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  formDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  formDataKey: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  formDataValue: {
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    maxWidth: '60%',
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    gap: Spacing.sm,
  },
  modalRejectButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalRejectButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.error,
  },
  modalApproveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: '#10B981',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  modalApproveButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },

  // Reject Modal
  rejectModalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  rejectModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  rejectModalTitle: {
    ...TextStyles.h4,
    marginTop: Spacing.sm,
  },
  rejectModalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  rejectInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  rejectModalFooter: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  rejectCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  rejectCancelButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
  rejectConfirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  rejectConfirmButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
});
