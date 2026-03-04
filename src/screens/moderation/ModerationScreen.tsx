import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { eventsAPI, getMediaUrl } from '../../api/client';
import { Event, RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AccessDenied, WellDone } from '../../components/illustrations';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PendingEvent {
  id: string;
  title: string;
  description?: string;
  short_description?: string;
  event_type: 'billetterie' | 'inscription';
  start_date: string;
  end_date: string;
  location_city?: string;
  status: string;
  created_at: string;
  banner_image?: string;
  organizer?: {
    id: string;
    email: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function ModerationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();

  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'billetterie' | 'inscription'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Check if user is moderator or admin
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';

  useEffect(() => {
    if (isModerator) {
      fetchPendingEvents();
    }
  }, [isModerator]);

  const fetchPendingEvents = async () => {
    try {
      const response = await eventsAPI.getPendingValidation();
      const data = response.data?.results || response.data || [];
      setEvents(data);
    } catch (error: any) {
      console.error('Error fetching pending events:', error);
      showError('Erreur', 'Impossible de charger les événements en attente');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingEvents();
    setRefreshing(false);
  };

  const handleValidate = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      await eventsAPI.validateEvent(eventId);
      showSuccess('Succès', 'Événement validé avec succès');
      // Remove from list
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Impossible de valider l\'événement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedEvent || !rejectionReason.trim()) {
      showError('Erreur', 'Veuillez indiquer une raison de rejet');
      return;
    }

    setActionLoading(selectedEvent.id);
    try {
      await eventsAPI.rejectEvent(selectedEvent.id, rejectionReason);
      showSuccess('Succès', 'Événement rejeté');
      // Remove from list
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setShowRejectModal(false);
      setSelectedEvent(null);
      setRejectionReason('');
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Impossible de rejeter l\'événement');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (event: PendingEvent) => {
    setSelectedEvent(event);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: events.length,
      billetterie: events.filter(e => e.event_type === 'billetterie').length,
      inscription: events.filter(e => e.event_type === 'inscription').length,
    };
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (filterType !== 'all') {
      result = result.filter(e => e.event_type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.organizer?.full_name?.toLowerCase().includes(query) ||
        e.organizer?.email?.toLowerCase().includes(query) ||
        e.location_city?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [events, filterType, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return formatDate(dateString);
  };

  const getOrganizerName = (event: PendingEvent) => {
    if (event.organizer?.full_name) return event.organizer.full_name;
    if (event.organizer?.first_name || event.organizer?.last_name) {
      return `${event.organizer.first_name || ''} ${event.organizer.last_name || ''}`.trim();
    }
    return event.organizer?.email || 'Organisateur inconnu';
  };

  // Access denied for non-moderators
  if (!isModerator) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
        <View style={styles.accessDenied}>
          <AccessDenied color={colors.primary} size={160} />
          <Text style={[styles.accessDeniedTitle, { color: colors.gray700 }]}>Accès restreint</Text>
          <Text style={[styles.accessDeniedText, { color: colors.gray500 }]}>
            Cette section est réservée aux modérateurs et administrateurs.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.white }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderEvent = ({ item }: { item: PendingEvent }) => {
    const isActionLoading = actionLoading === item.id;
    const isBilletterie = item.event_type === 'billetterie';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
        {/* Image */}
        <View style={styles.cardImage}>
          {item.banner_image ? (
            <Image source={{ uri: getMediaUrl(item.banner_image)! }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, isBilletterie ? styles.imagePlaceholderBillet : styles.imagePlaceholderInscription]}>
              <Ionicons
                name={isBilletterie ? 'ticket' : 'document-text'}
                size={24}
                color={isBilletterie ? colors.primary : '#8B5CF6'}
              />
            </View>
          )}
          <View style={[styles.typeBadge, isBilletterie ? styles.typeBadgeBillet : styles.typeBadgeInscription]}>
            <Ionicons
              name={isBilletterie ? 'ticket' : 'document-text'}
              size={10}
              color={colors.white}
            />
            <Text style={styles.typeBadgeText}>
              {isBilletterie ? 'Billetterie' : 'Inscription'}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.gray900 }]} numberOfLines={2}>{item.title}</Text>

          {item.short_description && (
            <Text style={[styles.cardDescription, { color: colors.gray600 }]} numberOfLines={2}>
              {item.short_description}
            </Text>
          )}

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color={colors.gray400} />
              <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>{getOrganizerName(item)}</Text>
            </View>
            {item.location_city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color={colors.gray400} />
                <Text style={[styles.metaText, { color: colors.gray500 }]}>{item.location_city}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
              <Text style={[styles.metaText, { color: colors.gray500 }]}>{formatDate(item.start_date)}</Text>
            </View>
          </View>

          <View style={[styles.submittedInfo, { borderTopColor: colors.gray100 }]}>
            <Ionicons name="time-outline" size={12} color={colors.gray400} />
            <Text style={[styles.submittedText, { color: colors.gray400 }]}>Soumis {getTimeSince(item.created_at)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: colors.gray100, backgroundColor: colors.gray50 }]}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          >
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: colors.errorLight }]}
            onPress={() => openRejectModal(item)}
            disabled={isActionLoading}
          >
            {isActionLoading && actionLoading === item.id ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="close-circle" size={20} color={colors.error} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.validateButton, { backgroundColor: colors.success }]}
            onPress={() => handleValidate(item.id)}
            disabled={isActionLoading}
          >
            {isActionLoading && actionLoading === item.id ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <WellDone color={colors.success} size={160} />
      <Text style={[styles.emptyTitle, { color: colors.gray700 }]}>Aucun événement en attente</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || filterType !== 'all'
          ? 'Aucun événement ne correspond à vos critères.'
          : 'Tous les événements ont été traités. Excellent travail !'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#312E81" />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#312E81" />

      {/* Header - gradient/colored background, Colors.white is fine */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Modération</Text>
            <Text style={styles.headerSubtitle}>Événements en attente de validation</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>En attente</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="ticket" size={14} color="#A78BFA" />
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.billetterie}</Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Billetterie</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
        <View style={styles.statItem}>
          <View style={styles.statRow}>
            <Ionicons name="document-text" size={14} color="#60A5FA" />
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.inscription}</Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>Inscription</Text>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          <Ionicons name="search" size={18} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.gray900 }]}
            placeholder="Rechercher par titre, organisateur..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.gray200 }, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, { color: colors.gray600 }, filterType === 'all' && styles.filterChipTextActive]}>
            Tous ({stats.total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'billetterie' && styles.filterChipActiveBillet]}
          onPress={() => setFilterType('billetterie')}
        >
          <Ionicons
            name="ticket"
            size={12}
            color={filterType === 'billetterie' ? Colors.white : colors.primary}
          />
          <Text style={[
            styles.filterChipText,
            filterType === 'billetterie' && styles.filterChipTextActive,
            filterType !== 'billetterie' && { color: colors.primary }
          ]}>
            Billetterie ({stats.billetterie})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'inscription' && styles.filterChipActiveInscription]}
          onPress={() => setFilterType('inscription')}
        >
          <Ionicons
            name="document-text"
            size={12}
            color={filterType === 'inscription' ? Colors.white : '#8B5CF6'}
          />
          <Text style={[
            styles.filterChipText,
            filterType === 'inscription' && styles.filterChipTextActive,
            filterType !== 'inscription' && { color: '#8B5CF6' }
          ]}>
            Inscription ({stats.inscription})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      <View style={styles.resultsInfo}>
        <Text style={[styles.resultsText, { color: colors.gray500 }]}>
          {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} en attente
        </Text>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.gray900 }]}>Rejeter l'événement</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedEvent(null);
                  setRejectionReason('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <Text style={[styles.modalEventTitle, { color: colors.gray700 }]}>
                "{selectedEvent.title}"
              </Text>
            )}

            <Text style={[styles.modalDescription, { color: colors.gray600 }]}>
              Veuillez indiquer la raison du rejet. L'organisateur recevra cette information.
            </Text>

            <TextInput
              style={[styles.modalTextInput, { backgroundColor: colors.gray50, color: colors.gray900 }]}
              placeholder="Raison du rejet (obligatoire)..."
              placeholderTextColor={colors.gray400}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.gray100 }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedEvent(null);
                  setRejectionReason('');
                }}
                disabled={actionLoading !== null}
              >
                <Text style={[styles.modalCancelButtonText, { color: colors.gray700 }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalRejectButton,
                  { backgroundColor: colors.error },
                  (!rejectionReason.trim() || actionLoading !== null) && styles.modalButtonDisabled
                ]}
                onPress={handleReject}
                disabled={!rejectionReason.trim() || actionLoading !== null}
              >
                {actionLoading !== null ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={16} color={colors.white} />
                    <Text style={[styles.modalRejectButtonText, { color: colors.white }]}>Confirmer le rejet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    backgroundColor: '#312E81',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    paddingVertical: 0,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: Colors.gray700,
    borderColor: Colors.gray700,
  },
  filterChipActiveBillet: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipActiveInscription: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  filterChipTextActive: {
    color: Colors.white,
  },

  // Results
  resultsInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  resultsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },

  // List
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  cardImage: {
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderBillet: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  imagePlaceholderInscription: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  typeBadgeBillet: {
    backgroundColor: Colors.primary,
  },
  typeBadgeInscription: {
    backgroundColor: '#8B5CF6',
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    marginBottom: Spacing.sm,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  submittedText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.gray50,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...TextStyles.h4,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.gray500,
    textAlign: 'center',
  },

  // Access Denied
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  accessDeniedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  accessDeniedTitle: {
    ...TextStyles.h3,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  accessDeniedText: {
    ...TextStyles.body,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  backButtonText: {
    ...TextStyles.button,
    color: Colors.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalEventTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  modalDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  modalTextInput: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
  },
  modalCancelButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  modalRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.error,
  },
  modalRejectButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});
