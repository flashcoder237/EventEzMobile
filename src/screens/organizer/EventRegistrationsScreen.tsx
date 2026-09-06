import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import { registrationsAPI, eventsAPI } from '../../api';
import ExportButton from '../../components/common/ExportButton';
import EventDocumentsButton from '../../components/organizer/EventDocumentsButton';
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
import {
  EditorialCanvas,
  WatermarkNumeral,
  EditorialHeader,
  editorial,
} from '../../components/ui/editorial';
import { centeredContent, CARD_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'EventRegistrations'>;

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

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
  const { t } = useTranslation();
  const { eventId } = route.params;
  const { showAlert, showSuccess, showError } = useAlert();
  const { toastSuccess } = useFeedback();
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

  // Pagination
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  pageRef.current = page;
  hasMoreRef.current = hasMore;
  loadingMoreRef.current = loadingMore;

  const approvalStatusConfig = useMemo<Record<string, { label: string; color: string; bgColor: string }>>(() => ({
    not_required: { label: t('organizer.eventRegistrations.approvalNotRequired'), color: '#6B7280', bgColor: '#F3F4F6' },
    pending: { label: t('organizer.eventRegistrations.statusPending'), color: '#F59E0B', bgColor: '#FEF3C7' },
    approved: { label: t('organizer.eventRegistrations.statusApproved'), color: '#10B981', bgColor: '#D1FAE5' },
    rejected: { label: t('organizer.eventRegistrations.statusRejected'), color: '#EF4444', bgColor: '#FEE2E2' },
  }), [t]);

  useEffect(() => {
    fetchRegistrations();
  }, [eventId]);

  const fetchRegistrations = async () => {
    try {
      const [eventResponse, registrationsResponse] = await Promise.all([
        eventsAPI.getEvent(eventId),
        registrationsAPI.getRegistrations({
          event: eventId,
          event_id: eventId,
          page: 1,
          page_size: PAGE_SIZE,
        }),
      ]);

      if (eventResponse.data) {
        setEventTitle(eventResponse.data.title || '');
      }

      const results = registrationsResponse.data?.results || registrationsResponse.data || [];
      const next = registrationsResponse.data?.next;
      const filteredData = results.filter((r: Registration) => {
        const regEventId = typeof r.event === 'string' ? r.event : r.event?.id;
        return regEventId === eventId;
      });
      setRegistrations(filteredData);
      setPage(1);
      setHasMore(
        next != null
          ? Boolean(next)
          : Array.isArray(results) && results.length === PAGE_SIZE,
      );
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement inscriptions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const response = await registrationsAPI.getRegistrations({
        event: eventId,
        event_id: eventId,
        page: nextPage,
        page_size: PAGE_SIZE,
      });
      const results = response.data?.results || response.data || [];
      const next = response.data?.next;
      const filtered = results.filter((r: Registration) => {
        const regEventId = typeof r.event === 'string' ? r.event : r.event?.id;
        return regEventId === eventId;
      });
      setRegistrations(prev => {
        // Dédoublonnage par id
        const existingIds = new Set(prev.map(r => r.id));
        const newOnes = filtered.filter((r: Registration) => !existingIds.has(r.id));
        return [...prev, ...newOnes];
      });
      setPage(nextPage);
      setHasMore(
        next != null
          ? Boolean(next)
          : Array.isArray(results) && results.length === PAGE_SIZE,
      );
    } catch (error) {
      if (__DEV__) console.error('Erreur pagination inscriptions:', error);
    } finally {
      setLoadingMore(false);
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
      toastSuccess(t('organizer.eventRegistrations.bulkApproveSuccess', { count: ids.length }));
      cancelSelection();
    } catch (error) {
      showError(t('common.error'), t('organizer.eventRegistrations.bulkApproveError'));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    if (Alert.prompt) {
      Alert.prompt(
        t('organizer.eventRegistrations.bulkRejectPromptTitle'),
        t('organizer.eventRegistrations.bulkRejectPromptMessage'),
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
            toastSuccess(t('organizer.eventRegistrations.bulkRejectSuccess', { count: ids.length }));
            cancelSelection();
          } catch (error) {
            showError(t('common.error'), t('organizer.eventRegistrations.bulkRejectError'));
          } finally {
            setBulkLoading(false);
          }
        }
      );
    } else {
      // Fallback for Android (no Alert.prompt)
      setBulkLoading(true);
      registrationsAPI.bulkReject(ids, t('organizer.eventRegistrations.bulkRejectFallbackReason'))
        .then(() => {
          setRegistrations(prev =>
            prev.map(r => ids.includes(r.id)
              ? { ...r, approval_status: 'rejected' as any, status: 'rejected' as any }
              : r
            )
          );
          toastSuccess(t('organizer.eventRegistrations.bulkRejectSuccess', { count: ids.length }));
          cancelSelection();
        })
        .catch(() => showError(t('common.error'), t('organizer.eventRegistrations.bulkRejectError')))
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
      toastSuccess(t('organizer.eventRegistrations.bulkCheckInSuccess', { count: ids.length }));
      cancelSelection();
    } catch (error) {
      showError(t('common.error'), t('organizer.eventRegistrations.bulkCheckInError'));
    } finally {
      setBulkLoading(false);
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
      toastSuccess(t('organizer.eventRegistrations.approveSuccess'));
    } catch (error) {
      if (__DEV__) console.error('Erreur approbation:', error);
      showError(t('common.error'), t('organizer.eventRegistrations.approveError'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showError(t('common.error'), t('organizer.eventRegistrations.rejectReasonRequired'));
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
      toastSuccess(t('organizer.eventRegistrations.rejectSuccess'));
    } catch (error) {
      if (__DEV__) console.error('Erreur refus:', error);
      showError(t('common.error'), t('organizer.eventRegistrations.rejectError'));
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
    return t('organizer.eventRegistrations.participantDefault');
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
              <Text style={styles.approveButtonText}>{t('organizer.eventRegistrations.approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => openRejectModal(item)}
            >
              <Ionicons name="close" size={18} color={Colors.error} />
              <Text style={styles.rejectButtonText}>{t('organizer.eventRegistrations.reject')}</Text>
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
        {searchQuery
          ? t('organizer.eventRegistrations.emptyNoResults')
          : filter === 'pending'
          ? t('organizer.eventRegistrations.emptyPending')
          : t('organizer.eventRegistrations.empty')}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery
          ? t('organizer.eventRegistrations.emptySearch')
          : filter === 'pending'
          ? t('organizer.eventRegistrations.emptyAllProcessed')
          : t('organizer.eventRegistrations.emptyDefault')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>RSVP</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <EditorialHeader
            eyebrow={t('eyebrow.entryQueue')}
            title={t('organizer.eventRegistrations.title')}
            subtitle={eventTitle || undefined}
            back
            onBack={() => navigation.goBack()}
          />
          <View style={styles.loadingContainer}>
            <SkeletonList count={5} Component={RegistrationItemSkeleton} />
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>RSVP</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        {/* Header éditorial : eyebrow + display title + actions discrètes */}
        <EditorialHeader
          eyebrow={t('eyebrow.entryQueue')}
          title={t('organizer.eventRegistrations.title')}
          subtitle={eventTitle || undefined}
          back
          onBack={() => navigation.goBack()}
          right={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerIconBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setShowEmailModal(true)}
                accessibilityLabel={t('organizer.eventRegistrations.sendEmailA11y')}
              >
                <Ionicons name="mail-outline" size={18} color={colors.gray700} />
              </TouchableOpacity>
              {/* Documents imprimables (badges, émargement, attestations).
                  Les générateurs existaient côté serveur et étaient accessibles
                  depuis le web, mais aucun écran mobile ne les appelait — or
                  l'organisateur qui prépare son accueil a son téléphone en
                  main, pas son ordinateur. */}
              <EventDocumentsButton eventId={eventId} eventTitle={eventTitle} />
              <ExportButton
                endpoint="/registrations/export/"
                filename={t('organizer.eventRegistrations.exportFilename', {
                  name: (eventTitle || t('organizer.eventRegistrations.exportFilenameFallback')).slice(0, 40),
                })}
                params={{ event_id: eventId }}
                compact
              />
            </View>
          }
        />

        {/* Stats éditoriaux : 4 chiffres XL avec dividers verticaux */}
        <View style={styles.statsCard}>
          <View style={styles.statBlock}>
            <Text style={[editorial.statNumber, { color: colors.gray900 }]}>{stats.total}</Text>
            <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.statTotal')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
          <View style={styles.statBlock}>
            <Text style={[editorial.statNumber, { color: stats.pending > 0 ? '#F59E0B' : colors.gray900 }]}>
              {stats.pending}
            </Text>
            <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.statPending')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
          <View style={styles.statBlock}>
            <Text style={[editorial.statNumber, { color: '#10B981' }]}>{stats.approved}</Text>
            <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.statApproved')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
          <View style={styles.statBlock}>
            <Text style={[editorial.statNumber, { color: colors.gray900 }]}>{stats.rejected}</Text>
            <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.statRejected')}</Text>
          </View>
        </View>

        {/* Recherche */}
        <View style={styles.searchContainer}>
          <RegistrationSearchBar onSearch={setSearchQuery} />
        </View>

        {/* Filtres éditoriaux : chips ronds avec eyebrow */}
        <View style={styles.filtersContainer}>
          {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => {
            const isActive = filter === f;
            const label = f === 'all'
              ? t('organizer.eventRegistrations.filterAll')
              : f === 'pending'
              ? t('organizer.eventRegistrations.filterPending')
              : f === 'approved'
              ? t('organizer.eventRegistrations.filterApproved')
              : t('organizer.eventRegistrations.filterRejected');
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  editorial.chip,
                  isActive ? editorial.chipActive : { backgroundColor: colors.gray100, borderColor: 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    editorial.chipText,
                    isActive ? editorial.chipTextActive : { color: colors.gray700 },
                  ]}
                >
                  {label}
                </Text>
                {f === 'pending' && stats.pending > 0 && !isActive && (
                  <View style={[styles.chipBadge, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.chipBadgeText}>{stats.pending}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

          {/* List */}
          <FlatList
            data={filteredRegistrations}
            renderItem={renderRegistration}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.lg }, selectionMode && { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: Spacing.lg }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
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
                      <Text style={[styles.modalTitle, { color: colors.gray900 }]}>{t('organizer.eventRegistrations.detailTitle')}</Text>
                      <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                        <Ionicons name="close" size={24} color={colors.gray600} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.detailParticipant')}</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{getDisplayName(selectedRegistration)}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.detailEmail')}</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{getEmail(selectedRegistration)}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.detailReference')}</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{selectedRegistration.reference_code}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.detailRegistrationDate')}</Text>
                        <Text style={[styles.detailValue, { color: colors.gray900 }]}>{formatDate(selectedRegistration.created_at)}</Text>
                      </View>
                      <View style={[styles.detailRow, { borderBottomColor: colors.gray50 }]}>
                        <Text style={[styles.detailLabel, { color: colors.gray500 }]}>{t('organizer.eventRegistrations.detailStatus')}</Text>
                        <Badge
                          label={(approvalStatusConfig[selectedRegistration.approval_status || 'not_required']).label}
                          variant={getApprovalBadgeVariant(selectedRegistration.approval_status || 'not_required')}
                          size="sm"
                        />
                      </View>

                      {selectedRegistration.form_data && Object.keys(selectedRegistration.form_data).length > 0 && (
                        <View style={[styles.formDataSection, { backgroundColor: colors.gray50 }]}>
                          <Text style={[styles.formDataTitle, { color: colors.gray700 }]}>{t('organizer.eventRegistrations.formData')}</Text>
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
                          <Text style={styles.modalRejectButtonText}>{t('organizer.eventRegistrations.reject')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalApproveButton}
                          onPress={() => handleApprove(selectedRegistration)}
                          disabled={processing}
                        >
                          {processing ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <Text style={styles.modalApproveButtonText}>{t('organizer.eventRegistrations.approve')}</Text>
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
                  <Text style={[styles.rejectModalTitle, { color: colors.gray900 }]}>{t('organizer.eventRegistrations.rejectModalTitle')}</Text>
                  <Text style={[styles.rejectModalSubtitle, { color: colors.gray500 }]}>
                    {t('organizer.eventRegistrations.rejectModalSubtitle')}
                  </Text>
                </View>

                <TextInput
                  style={[styles.rejectInput, { backgroundColor: colors.gray50, color: colors.gray900, borderColor: colors.gray200 }]}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder={t('organizer.eventRegistrations.rejectInputPlaceholder')}
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
                    <Text style={[styles.rejectCancelButtonText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectConfirmButton}
                    onPress={handleReject}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.rejectConfirmButtonText}>{t('organizer.eventRegistrations.rejectConfirm')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            </KeyboardAvoidingView>
          </Modal>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header éditorial : actions discrètes (icônes rondes neutres)
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats card éditoriaux : 4 chiffres XL avec dividers verticaux légers
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    ...centeredContent(CARD_MAX),
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },

  // Badge sur le chip "En attente" quand non sélectionné
  chipBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chipBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  headerTitleContainer: { flex: 1 },
  headerEyebrow: { fontSize: 10, fontFamily: FontFamily.bold, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['2xl'], color: Colors.white, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.lg, padding: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.xl, color: Colors.white },
  statLabel: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  // Divider vertical entre les blocs de stats (canvas éditorial : couleur claire)
  statDivider: { width: 1, height: 36, marginHorizontal: 4 },
  searchContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs, ...centeredContent(CARD_MAX) },
  filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.sm, gap: Spacing.xs, ...centeredContent(CARD_MAX) },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full },
  filterButtonActive: { backgroundColor: Colors.primary },
  filterText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  filterTextActive: { color: Colors.white },
  filterBadge: { marginLeft: Spacing.xs, backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  filterBadgeText: { fontFamily: FontFamily.bold, fontSize: 10, color: Colors.white },
  listContent: { padding: Spacing.lg, flexGrow: 1, ...centeredContent(CARD_MAX) },
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
