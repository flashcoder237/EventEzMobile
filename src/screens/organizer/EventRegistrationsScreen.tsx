import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { registrationsAPI, eventsAPI } from '../../api';
import { Registration, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';
import { SkeletonList, RegistrationItemSkeleton } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import RegistrationSearchBar from '../../components/organizer/RegistrationSearchBar';
import BulkActionBar from '../../components/organizer/BulkActionBar';
import SendEmailModal from '../../components/organizer/SendEmailModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'EventRegistrations'>;

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  pending_approval: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  confirmed: { label: 'Confirme', color: '#10B981', bgColor: '#D1FAE5' },
  approved: { label: 'Approuve', color: '#10B981', bgColor: '#D1FAE5' },
  rejected: { label: 'Refuse', color: '#EF4444', bgColor: '#FEE2E2' },
  cancelled: { label: 'Annule', color: '#6B7280', bgColor: '#F3F4F6' },
  completed: { label: 'Complete', color: '#3B82F6', bgColor: '#DBEAFE' },
  checked_in: { label: 'Enregistre', color: '#6366F1', bgColor: '#E0E7FF' },
};

const approvalStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  not_required: { label: 'Auto', color: '#6B7280', bgColor: '#F3F4F6' },
  pending: { label: 'En attente', color: '#F59E0B', bgColor: '#FEF3C7' },
  approved: { label: 'Approuve', color: '#10B981', bgColor: '#D1FAE5' },
  rejected: { label: 'Refuse', color: '#EF4444', bgColor: '#FEE2E2' },
};

const getApprovalBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'rejected': return 'destructive';
    case 'not_required': return 'secondary';
    default: return 'secondary';
  }
};

export default function EventRegistrationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { eventId } = route.params;
  const { showAlert, showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

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

  // New state for advanced features
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      const [eventResponse, registrationsResponse] = await Promise.all([
        eventsAPI.getEvent(eventId),
        registrationsAPI.getRegistrations({ event: eventId, event_id: eventId }),
      ]);

      if (eventResponse.data) {
        setEventTitle(eventResponse.data.title || '');
      }

      const data = registrationsResponse.data.results || registrationsResponse.data || [];
      const filteredData = data.filter((r: Registration) => {
        const regEventId = typeof r.event === 'string' ? r.event : r.event?.id;
        return regEventId === eventId;
      });
      setRegistrations(filteredData);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement inscriptions:', error);
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

  // Search + Filter
  const filteredRegistrations = useMemo(() => {
    let result = registrations;

    // Apply filter
    switch (filter) {
      case 'pending':
        result = result.filter(r => r.approval_status === 'pending');
        break;
      case 'approved':
        result = result.filter(r => r.approval_status === 'approved' || r.status === 'confirmed');
        break;
      case 'rejected':
        result = result.filter(r => r.approval_status === 'rejected');
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        const name = getDisplayName(r).toLowerCase();
        const email = getEmail(r).toLowerCase();
        const ref = (r.reference_code || '').toLowerCase();
        return name.includes(q) || email.includes(q) || ref.includes(q);
      });
    }

    return result;
  }, [registrations, filter, searchQuery]);

  // Selection handlers
  const handleLongPress = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setSelectionMode(false);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk actions
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      await registrationsAPI.bulkApprove(ids);
      setRegistrations(prev =>
        prev.map(r => ids.includes(r.id)
          ? { ...r, approval_status: 'approved' as any, status: 'confirmed' as any }
          : r
        )
      );
      showSuccess('Succes', `${ids.length} inscription(s) approuvee(s)`);
      cancelSelection();
    } catch (error) {
      showError('Erreur', 'Impossible d\'approuver les inscriptions');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    if (Alert.prompt) {
      Alert.prompt(
        'Raison du refus',
        'Veuillez indiquer la raison du refus',
        async (reason: string) => {
          if (!reason?.trim()) return;
          setBulkLoading(true);
          try {
            await registrationsAPI.bulkReject(ids, reason);
            setRegistrations(prev =>
              prev.map(r => ids.includes(r.id)
                ? { ...r, approval_status: 'rejected' as any, status: 'rejected' as any }
                : r
              )
            );
            showSuccess('Succes', `${ids.length} inscription(s) refusee(s)`);
            cancelSelection();
          } catch (error) {
            showError('Erreur', 'Impossible de refuser les inscriptions');
          } finally {
            setBulkLoading(false);
          }
        }
      );
    } else {
      // Fallback for Android (no Alert.prompt)
      setBulkLoading(true);
      registrationsAPI.bulkReject(ids, 'Refuse par l\'organisateur')
        .then(() => {
          setRegistrations(prev =>
            prev.map(r => ids.includes(r.id)
              ? { ...r, approval_status: 'rejected' as any, status: 'rejected' as any }
              : r
            )
          );
          showSuccess('Succes', `${ids.length} inscription(s) refusee(s)`);
          cancelSelection();
        })
        .catch(() => showError('Erreur', 'Impossible de refuser les inscriptions'))
        .finally(() => setBulkLoading(false));
    }
  };

  const handleBulkCheckIn = async () => {
    const ids = Array.from(selectedIds);
    setBulkLoading(true);
    try {
      await registrationsAPI.bulkCheckIn(ids);
      setRegistrations(prev =>
        prev.map(r => ids.includes(r.id)
          ? { ...r, status: 'checked_in' as any }
          : r
        )
      );
      showSuccess('Succes', `${ids.length} participant(s) enregistre(s)`);
      cancelSelection();
    } catch (error) {
      showError('Erreur', 'Impossible d\'enregistrer les participants');
    } finally {
      setBulkLoading(false);
    }
  };

  // Export
  const handleExport = async () => {
    setExporting(true);
    try {
      await registrationsAPI.exportRegistrations({ event_id: eventId, format: 'csv' });
      showSuccess('Succes', 'Export telecharge avec succes');
    } catch (error) {
      showError('Erreur', 'Impossible d\'exporter les inscriptions');
    } finally {
      setExporting(false);
    }
  };

  const handleApprove = async (registration: Registration) => {
    setProcessing(true);
    try {
      await registrationsAPI.approveRegistration(registration.id);
      setRegistrations(prev =>
        prev.map(r => r.id === registration.id
          ? { ...r, approval_status: 'approved' as any, status: 'confirmed' as any }
          : r
        )
      );
      setShowDetailModal(false);
      showSuccess('Succes', 'Inscription approuvee avec succes');
    } catch (error) {
      if (__DEV__) console.error('Erreur approbation:', error);
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
      setRegistrations(prev =>
        prev.map(r => r.id === selectedRegistration.id
          ? { ...r, approval_status: 'rejected' as any, status: 'rejected' as any }
          : r
        )
      );
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
      showSuccess('Succes', 'Inscription refusee');
    } catch (error) {
      if (__DEV__) console.error('Erreur refus:', error);
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
    const approvalInfo = approvalStatusConfig[item.approval_status || 'not_required'];
    const isPending = item.approval_status === 'pending';
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.registrationCard,
          { backgroundColor: colors.card, borderColor: colors.gray100 },
          isPending && styles.pendingCard,
          isSelected && { borderColor: '#4F46E5', borderWidth: 2 },
        ]}
        onPress={() => {
          if (selectionMode) {
            toggleSelection(item.id);
          } else {
            setSelectedRegistration(item);
            setShowDetailModal(true);
          }
        }}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.registrationHeader}>
          <View style={styles.participantInfo}>
            {selectionMode && (
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
            )}
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getDisplayName(item).substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.participantDetails}>
              <Text style={[styles.participantName, { color: colors.gray900 }]} numberOfLines={1}>
                {getDisplayName(item)}
              </Text>
              <Text style={[styles.participantEmail, { color: colors.gray500 }]} numberOfLines={1}>
                {getEmail(item)}
              </Text>
            </View>
          </View>
          <Badge
            label={approvalInfo.label}
            variant={getApprovalBadgeVariant(item.approval_status || 'not_required')}
            size="sm"
          />
        </View>

        <View style={[styles.registrationInfo, { borderTopColor: colors.gray100 }]}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.gray400} />
            <Text style={[styles.infoText, { color: colors.gray500 }]}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="ticket-outline" size={14} color={colors.gray400} />
            <Text style={[styles.infoText, { color: colors.gray500 }]}>{item.reference_code}</Text>
          </View>
        </View>

        {!selectionMode && isPending && (
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
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="people-outline" size={48} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
        {searchQuery ? 'Aucun resultat' : filter === 'pending' ? 'Aucune inscription en attente' : 'Aucune inscription'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery
          ? 'Essayez avec d\'autres termes de recherche.'
          : filter === 'pending'
          ? 'Toutes les inscriptions ont ete traitees.'
          : 'Les inscriptions a cet evenement apparaitront ici.'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.rootContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
            <View style={styles.loadingContainer}>
              <SkeletonList count={5} Component={RegistrationItemSkeleton} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
          {/* Header */}
          <LinearGradient
            colors={['#4F46E5', '#9333EA', '#D946EF']}
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
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={() => setShowEmailModal(true)}
                >
                  <Ionicons name="mail-outline" size={20} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons name="download-outline" size={20} color={Colors.white} />
                  )}
                </TouchableOpacity>
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
                <Text style={styles.statLabel}>Approuves</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.rejected}</Text>
                <Text style={styles.statLabel}>Refuses</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
            <RegistrationSearchBar onSearch={setSearchQuery} />
          </View>

          {/* Filters */}
          <View style={[styles.filtersContainer, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
            {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, { backgroundColor: colors.gray100 }, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, { color: colors.gray600 }, filter === f && styles.filterTextActive]}>
                  {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuves' : 'Refuses'}
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
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.lg }, selectionMode && { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews
          />

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedIds.size}
            onApprove={handleBulkApprove}
            onReject={handleBulkReject}
            onCheckIn={handleBulkCheckIn}
            onCancel={cancelSelection}
            loading={bulkLoading}
          />

          {/* Send Email Modal */}
          <SendEmailModal
            visible={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            registrationIds={
              selectedIds.size > 0
                ? Array.from(selectedIds)
                : registrations.map(r => r.id)
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
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                {selectedRegistration && (
                  <>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
                      <Text style={[styles.modalTitle, { color: colors.gray900 }]}>Details de l'inscription</Text>
                      <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                        <Ionicons name="close" size={24} color={colors.gray600} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Participant</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{getDisplayName(selectedRegistration)}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Email</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{getEmail(selectedRegistration)}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Reference</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{selectedRegistration.reference_code}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Date d'inscription</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{formatDate(selectedRegistration.created_at)}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Statut</Text>
                        <Badge
                          label={(approvalStatusConfig[selectedRegistration.approval_status || 'not_required']).label}
                          variant={getApprovalBadgeVariant(selectedRegistration.approval_status || 'not_required')}
                          size="sm"
                        />
                      </View>

                      {selectedRegistration.form_data && Object.keys(selectedRegistration.form_data).length > 0 && (
                        <View style={[styles.formDataSection, { backgroundColor: colors.gray50 }]}>
                          <Text style={[styles.formDataTitle, { color: colors.gray700 }]}>Donnees du formulaire</Text>
                          {Object.entries(selectedRegistration.form_data).map(([key, value]) => (
                            <View key={key} style={styles.formDataRow}>
                              <Text style={[styles.formDataKey, { color: colors.gray500 }]}>{key}</Text>
                              <Text style={[styles.formDataValue, { color: colors.gray900 }]}>{String(value)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {selectedRegistration.approval_status === 'pending' && (
                      <View style={[styles.modalFooter, { borderTopColor: colors.gray100 }]}>
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
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <View style={styles.modalOverlay}>
              <View style={[styles.rejectModalContent, { backgroundColor: colors.card }]}>
                <View style={styles.rejectModalHeader}>
                  <Ionicons name="close-circle" size={48} color={Colors.error} />
                  <Text style={[styles.rejectModalTitle, { color: colors.gray900 }]}>Refuser l'inscription</Text>
                  <Text style={[styles.rejectModalSubtitle, { color: colors.gray500 }]}>
                    Veuillez indiquer la raison du refus
                  </Text>
                </View>

                <TextInput
                  style={[styles.rejectInput, { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 }]}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Raison du refus..."
                  placeholderTextColor={colors.gray400}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <View style={styles.rejectModalFooter}>
                  <TouchableOpacity
                    style={[styles.rejectCancelButton, { backgroundColor: colors.gray100 }]}
                    onPress={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                  >
                    <Text style={[styles.rejectCancelButtonText, { color: colors.gray700 }]}>Annuler</Text>
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
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#4F46E5' },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['2xl'], color: Colors.white },
  headerSubtitle: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.lg, padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.xl, color: Colors.white },
  statLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.sm },
  searchContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  filtersContainer: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, gap: Spacing.sm },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full },
  filterButtonActive: { backgroundColor: Colors.primary },
  filterText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  filterTextActive: { color: Colors.white },
  filterBadge: { marginLeft: Spacing.xs, backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  filterBadgeText: { fontFamily: FontFamily.bold, fontSize: 10, color: Colors.white },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  registrationCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1 },
  pendingCard: { borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  registrationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  participantInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  checkboxChecked: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm, color: Colors.white },
  participantDetails: { flex: 1, marginLeft: Spacing.sm },
  participantName: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  participantEmail: { fontSize: FontSizes.sm, marginTop: 2 },
  registrationInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: FontSizes.xs },
  quickActions: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: 4 },
  approveButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: Colors.white },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, gap: 4 },
  rejectButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: Colors.error },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  emptyTitle: { ...TextStyles.h3, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSizes.base, textAlign: 'center', lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1 },
  modalTitle: { ...TextStyles.h4 },
  modalBody: { padding: Spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  detailLabel: { fontSize: FontSizes.sm },
  detailValue: { fontSize: FontSizes.sm, fontFamily: FontFamily.medium, maxWidth: '60%', textAlign: 'right' },
  formDataSection: { marginTop: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md },
  formDataTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  formDataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  formDataKey: { fontSize: FontSizes.sm },
  formDataValue: { fontSize: FontSizes.sm, maxWidth: '60%', textAlign: 'right' },
  modalFooter: { flexDirection: 'row', padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  modalRejectButton: { flex: 1, paddingVertical: Spacing.md, backgroundColor: '#FEE2E2', borderRadius: BorderRadius.lg, alignItems: 'center' },
  modalRejectButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, color: Colors.error },
  modalApproveButton: { flex: 1, paddingVertical: Spacing.md, backgroundColor: '#10B981', borderRadius: BorderRadius.lg, alignItems: 'center' },
  modalApproveButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, color: Colors.white },
  rejectModalContent: { borderRadius: BorderRadius.xl, margin: Spacing.lg, padding: Spacing.lg },
  rejectModalHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  rejectModalTitle: { ...TextStyles.h4, marginTop: Spacing.sm },
  rejectModalSubtitle: { fontSize: FontSizes.sm, marginTop: Spacing.xs, textAlign: 'center' },
  rejectInput: { borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.base, minHeight: 100, borderWidth: 1 },
  rejectModalFooter: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.sm },
  rejectCancelButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: 'center' },
  rejectCancelButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  rejectConfirmButton: { flex: 1, paddingVertical: Spacing.md, backgroundColor: Colors.error, borderRadius: BorderRadius.lg, alignItems: 'center' },
  rejectConfirmButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, color: Colors.white },
});
