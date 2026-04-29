import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { eventsAPI, getMediaUrl } from '../../api';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AccessDenied, WellDone, AnimatedIllustration } from '../../components/illustrations';
import Badge from '../../components/ui/Badge';
import EditorialCanvas from '../../components/ui/editorial/EditorialCanvas';
import WatermarkNumeral from '../../components/ui/editorial/WatermarkNumeral';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
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
  // Le serializer backend (EventListSerializer) expose `organizer_name` (string),
  // pas un objet `organizer` complet. Le fallback `organizer` reste typé pour
  // la retro-compat si un autre endpoint retourne l'objet imbrique.
  organizer_name?: string;
  organizer?: {
    id: string;
    email: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

type FilterType = 'all' | 'billetterie' | 'inscription';

const BILLET_COLOR = '#4F46E5';
const INSCRIPTION_COLOR = '#A855F7';

export default function ModerationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  // 3e action : demander des modifications (changes_requested) — moins drastique que rejet
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesNote, setChangesNote] = useState('');
  // Multi-select bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectMode = selectedIds.size > 0;
  const [bulkRejectModal, setBulkRejectModal] = useState(false);
  const [bulkReason, setBulkReason] = useState('');

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
      if (__DEV__) console.error('Error fetching pending events:', error);
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

  const openChangesModal = (event: PendingEvent) => {
    setSelectedEvent(event);
    setChangesNote('');
    setShowChangesModal(true);
  };

  const toggleSelected = (eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkValidate = async () => {
    const ids = Array.from(selectedIds);
    setActionLoading('bulk');
    let validated = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await eventsAPI.validateEvent(id);
        validated += 1;
      } catch {
        failed += 1;
      }
    }
    setEvents((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    clearSelection();
    setActionLoading(null);
    showSuccess('Bulk', `${validated} validé${validated > 1 ? 's' : ''}${failed > 0 ? ` · ${failed} échoué${failed > 1 ? 's' : ''}` : ''}`);
  };

  const handleBulkReject = async () => {
    if (!bulkReason.trim()) {
      showError('Erreur', 'Indique une raison pour le rejet en masse');
      return;
    }
    const ids = Array.from(selectedIds);
    setActionLoading('bulk');
    let rejected = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await eventsAPI.rejectEvent(id, bulkReason);
        rejected += 1;
      } catch {
        failed += 1;
      }
    }
    setEvents((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setBulkRejectModal(false);
    setBulkReason('');
    clearSelection();
    setActionLoading(null);
    showSuccess('Bulk', `${rejected} rejeté${rejected > 1 ? 's' : ''}${failed > 0 ? ` · ${failed} échoué${failed > 1 ? 's' : ''}` : ''}`);
  };

  const handleRequestChanges = async () => {
    if (!selectedEvent || !changesNote.trim()) {
      showError('Erreur', 'Indique une note pour l\'organisateur');
      return;
    }
    setActionLoading(selectedEvent.id);
    try {
      await eventsAPI.requestChanges(selectedEvent.id, changesNote);
      showSuccess('Envoyé', 'Demande de modifications envoyée');
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setShowChangesModal(false);
      setSelectedEvent(null);
      setChangesNote('');
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Impossible d\'envoyer la demande');
    } finally {
      setActionLoading(null);
    }
  };

  const stats = useMemo(() => ({
    total: events.length,
    billetterie: events.filter(e => e.event_type === 'billetterie').length,
    inscription: events.filter(e => e.event_type === 'inscription').length,
  }), [events]);

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
    // Tri par ancienneté de soumission (les plus anciens d'abord) — respecte le SLA
    // affiché aux organizers (24h en moyenne).
    result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return result;
  }, [events, filterType, searchQuery]);

  // Compteur d'events en retard (> 24h en attente) pour alerter sur le SLA
  const overdueCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return events.filter(e => new Date(e.created_at).getTime() < cutoff).length;
  }, [events]);

  const isOverdue = (createdAt?: string) => {
    if (!createdAt) return false;
    const t = new Date(createdAt).getTime();
    if (isNaN(t)) return false;
    return Date.now() - t > 24 * 60 * 60 * 1000;
  };

  const isValidDate = (d: Date) => !isNaN(d.getTime());

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (!isValidDate(date)) return '—';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDateTile = (dateString?: string) => {
    if (!dateString) return { day: '--', month: '---' };
    const date = new Date(dateString);
    if (!isValidDate(date)) return { day: '--', month: '---' };
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', ''),
    };
  };

  const getTimeSince = (dateString?: string) => {
    if (!dateString) return 'date inconnue';
    const date = new Date(dateString);
    if (!isValidDate(date)) return 'date inconnue';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return "hier";
    if (diffDays < 7) return `il y a ${diffDays} j`;
    return formatDate(dateString);
  };

  const getOrganizerName = (event: PendingEvent) => {
    // Le backend expose `organizer_name` (string) sur EventListSerializer.
    if (event.organizer_name) return event.organizer_name;
    if (event.organizer?.full_name) return event.organizer.full_name;
    if (event.organizer?.first_name || event.organizer?.last_name) {
      return `${event.organizer.first_name || ''} ${event.organizer.last_name || ''}`.trim();
    }
    return event.organizer?.email || 'Organisateur inconnu';
  };

  if (!isModerator) {
    return (
      <EditorialCanvas edges={['top', 'bottom']}>
        <WatermarkNumeral>MOD</WatermarkNumeral>
        <View style={styles.accessDenied}>
          <AnimatedIllustration entry="scaleIn" idle="float">
            <AccessDenied color={colors.primary} size={160} />
          </AnimatedIllustration>
          <Text style={[styles.accessDeniedEyebrow, { color: colors.accent }]}>ACCÈS RESTREINT</Text>
          <Text style={[styles.accessDeniedTitle, { color: colors.text }]}>Zone modération</Text>
          <Text style={[styles.accessDeniedText, { color: colors.gray500 }]}>
            Cette section est réservée aux modérateurs et administrateurs.
          </Text>
          <TouchableOpacity
            style={[styles.backCta, { backgroundColor: colors.text }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={[styles.backCtaText, { color: colors.background }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </EditorialCanvas>
    );
  }

  const renderEvent = ({ item }: { item: PendingEvent }) => {
    const isActionLoading = actionLoading === item.id || actionLoading === 'bulk';
    const isBilletterie = item.event_type === 'billetterie';
    const typeColor = isBilletterie ? BILLET_COLOR : INSCRIPTION_COLOR;
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={() => toggleSelected(item.id)}
        onPress={() => {
          if (isSelectMode) toggleSelected(item.id);
        }}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : hairline, borderWidth: isSelected ? 2 : 1 },
          Shadows.sm,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        {isSelected && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      <View>
        <View style={styles.cardImage}>
          {item.banner_image ? (
            <Image source={getMediaUrl(item.banner_image)!} style={styles.image} cachePolicy="disk" transition={200} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: `${typeColor}12` }]}>
              <Ionicons
                name={isBilletterie ? 'ticket-outline' : 'document-text-outline'}
                size={28}
                color={typeColor}
              />
            </View>
          )}
          {/* Gradient subtil pour la lisibilite des elements flottants */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.35)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Date tile flottante (canonical EventCard pattern) */}
          <View style={[styles.dateTileFloat, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Text style={[styles.dateTileDay, { color: colors.text }]}>
              {getDateTile(item.start_date).day}
            </Text>
            <Text style={[styles.dateTileMonth, { color: colors.accent }]}>
              {getDateTile(item.start_date).month}
            </Text>
          </View>
          {/* Type badge en haut-droite (eyebrow pill float) */}
          <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
            <Ionicons
              name={isBilletterie ? 'ticket' : 'document-text'}
              size={10}
              color={typeColor}
            />
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {isBilletterie ? 'BILLETTERIE' : 'INSCRIPTION'}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>

          {item.short_description && (
            <Text style={[styles.cardDescription, { color: colors.gray600 }]} numberOfLines={2}>
              {item.short_description}
            </Text>
          )}

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={11} color={colors.gray500} />
              <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>
                {getOrganizerName(item)}
              </Text>
            </View>
            {item.location_city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={11} color={colors.gray500} />
                <Text style={[styles.metaText, { color: colors.gray500 }]}>{item.location_city}</Text>
              </View>
            )}
          </View>

          <View style={[styles.submittedInfo, { borderTopColor: hairline }]}>
            <Ionicons
              name={isOverdue(item.created_at) ? 'alert-circle' : 'time-outline'}
              size={12}
              color={isOverdue(item.created_at) ? '#DC2626' : colors.gray400}
            />
            <Text
              style={[
                styles.submittedText,
                { color: isOverdue(item.created_at) ? '#DC2626' : colors.gray500 },
              ]}
            >
              {isOverdue(item.created_at) ? 'En retard · ' : 'Soumis · '}
              {getTimeSince(item.created_at)}
            </Text>
            {isOverdue(item.created_at) && (
              <View
                style={{
                  backgroundColor: '#DC2626',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: 'auto',
                }}
              >
                <Text style={{ color: '#fff', fontFamily: FontFamily.bold, fontSize: 9, letterSpacing: 0.5 }}>
                  URGENT
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.cardActions, { borderTopColor: hairline }]}>
          {/* Disque "Voir" — action tertiaire (consultation) */}
          <TouchableOpacity
            style={[styles.actionDisc, { backgroundColor: colors.gray100 }]}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
            activeOpacity={0.7}
            accessibilityLabel="Voir l'evenement"
          >
            <Ionicons name="eye-outline" size={16} color={colors.gray600} />
          </TouchableOpacity>

          {/* Pill "Modifs" — action secondaire (request changes) */}
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: '#F59E0B15' }]}
            onPress={() => openChangesModal(item)}
            disabled={isActionLoading}
            activeOpacity={0.7}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color="#D97706" />
            ) : (
              <>
                <Ionicons name="create-outline" size={13} color="#D97706" />
                <Text style={[styles.actionPillText, { color: '#D97706' }]}>Modifs</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Pill "Rejeter" — action destructive */}
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: '#EF444415' }]}
            onPress={() => openRejectModal(item)}
            disabled={isActionLoading}
            activeOpacity={0.7}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={13} color="#EF4444" />
                <Text style={[styles.actionPillText, { color: '#EF4444' }]}>Rejeter</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Pill primaire "Valider" — action principale, prend l'espace restant */}
          <TouchableOpacity
            style={[styles.actionPillPrimary, { backgroundColor: '#10B981' }]}
            onPress={() => handleValidate(item.id)}
            disabled={isActionLoading}
            activeOpacity={0.85}
          >
            {isActionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                <Text style={[styles.actionPillPrimaryText, { color: '#FFFFFF' }]}>Valider</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="bounce" idle="breathe">
        <WellDone color="#10B981" size={160} />
      </AnimatedIllustration>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun événement en attente</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || filterType !== 'all'
          ? 'Aucun événement ne correspond à vos critères.'
          : 'Tous les événements ont été traités. Excellent travail !'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top', 'bottom']}>
        <WatermarkNumeral>MOD</WatermarkNumeral>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'Tous', count: stats.total },
    { key: 'billetterie', label: 'Billetterie', count: stats.billetterie },
    { key: 'inscription', label: 'Inscription', count: stats.inscription },
  ];

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>MOD</WatermarkNumeral>
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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>GARDE LE CAP</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Modération</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{stats.total}</Text>
        </View>
      </View>

      {/* Barre d'actions bulk — visible en mode multi-select */}
      {isSelectMode && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: Spacing.lg,
            paddingVertical: 10,
            backgroundColor: `${colors.primary}10`,
            borderBottomWidth: 1,
            borderBottomColor: `${colors.primary}30`,
          }}
        >
          <TouchableOpacity onPress={clearSelection} style={{ padding: 6 }}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontFamily: FontFamily.bold, fontSize: 14, color: colors.text }}>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: '#EF4444',
            }}
            onPress={() => setBulkRejectModal(true)}
            disabled={actionLoading === 'bulk'}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={14} color="#fff" />
            <Text style={{ fontFamily: FontFamily.bold, fontSize: 12, color: '#fff' }}>Rejeter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: '#10B981',
            }}
            onPress={handleBulkValidate}
            disabled={actionLoading === 'bulk'}
            activeOpacity={0.85}
          >
            {actionLoading === 'bulk' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 12, color: '#fff' }}>Valider</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* SLA banner — visible quand des events traînent depuis > 24h */}
        {overdueCount > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#FEE2E2',
              borderWidth: 1,
              borderColor: '#FCA5A5',
              marginBottom: Spacing.md,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={{ flex: 1, fontFamily: FontFamily.medium, fontSize: 12, color: '#991B1B', lineHeight: 16 }}>
              <Text style={{ fontFamily: FontFamily.bold }}>
                {overdueCount} événement{overdueCount > 1 ? 's' : ''} en retard
              </Text>
              {' · '}plus de 24h en attente. Priorise-les pour respecter le SLA.
            </Text>
          </View>
        )}

        {/* Stats strip — aligne sur NotificationsScreen.statStrip */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: hairline }]}>
          <View style={[styles.statItem, { borderRightColor: hairline }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>EN ATTENTE</Text>
          </View>
          <View style={[styles.statItem, { borderRightColor: hairline }]}>
            <View style={styles.statRow}>
              <Ionicons name="ticket" size={13} color={BILLET_COLOR} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.billetterie}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>BILLETTERIE</Text>
          </View>
          <View style={[styles.statItem, styles.statItemLast]}>
            <View style={styles.statRow}>
              <Ionicons name="document-text" size={13} color={INSCRIPTION_COLOR} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.inscription}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>INSCRIPTION</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: hairline }]}>
          <Ionicons name="search" size={16} color={colors.gray500} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher par titre, organisateur..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {filters.map((f) => {
              const active = filterType === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterPill,
                    active
                      ? { backgroundColor: colors.text, borderColor: colors.text }
                      : { backgroundColor: colors.card, borderColor: hairline },
                  ]}
                  onPress={() => setFilterType(f.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterText, { color: active ? colors.background : colors.gray600 }]}>
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Events list */}
        <View style={{ marginTop: Spacing.sm }}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <View key={event.id}>{renderEvent({ item: event })}</View>
            ))
          ) : (
            renderEmpty()
          )}
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: hairline }, Shadows.lg]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWell, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalEyebrow, { color: colors.gray500 }]}>REJET</Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Motif requis</Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: colors.background, borderColor: hairline }]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setSelectedEvent(null);
                    setRejectionReason('');
                  }}
                >
                  <Ionicons name="close" size={16} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              {selectedEvent && (
                <View style={[styles.modalEventChip, { backgroundColor: colors.background, borderColor: hairline }]}>
                  <Text style={[styles.modalEventTitle, { color: colors.text }]} numberOfLines={2}>
                    {selectedEvent.title}
                  </Text>
                </View>
              )}

              <Text style={[styles.modalDescription, { color: colors.gray600 }]}>
                Indique la raison du rejet. L'organisateur recevra cette information.
              </Text>

              {/* Templates de raisons fréquentes — tap pour pré-remplir le textarea */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: Spacing.sm }}
                contentContainerStyle={{ gap: 6, paddingRight: 8 }}
              >
                {[
                  'Image inappropriée ou floue',
                  'Description trop courte ou incomplète',
                  'Date ou lieu incohérents',
                  'Tarification suspecte',
                  'Doublon d\'événement existant',
                  'Contenu interdit (politique / haine)',
                  'Informations de contact manquantes',
                  'Suspicion de spam',
                ].map((tpl) => {
                  const isActive = rejectionReason.trim() === tpl;
                  return (
                    <TouchableOpacity
                      key={tpl}
                      onPress={() => setRejectionReason(tpl)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: isActive ? colors.primary : `${colors.primary}15`,
                        borderWidth: 1,
                        borderColor: isActive ? colors.primary : `${colors.primary}30`,
                      }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={{
                          fontFamily: FontFamily.semiBold,
                          fontSize: 11,
                          color: isActive ? '#fff' : colors.primary,
                        }}
                      >
                        {tpl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.background, borderColor: hairline, color: colors.text }]}
                placeholder="Raison personnalisée ou édite un template ci-dessus..."
                placeholderTextColor={colors.gray400}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.background, borderColor: hairline }]}
                  onPress={() => {
                    setShowRejectModal(false);
                    setSelectedEvent(null);
                    setRejectionReason('');
                  }}
                  disabled={actionLoading !== null}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: colors.gray700 }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalRejectBtn,
                    { backgroundColor: '#EF4444' },
                    (!rejectionReason.trim() || actionLoading !== null) && { opacity: 0.5 },
                  ]}
                  onPress={handleReject}
                  disabled={!rejectionReason.trim() || actionLoading !== null}
                  activeOpacity={0.8}
                >
                  {actionLoading !== null ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.modalRejectText}>Confirmer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* === DEMANDER MODIFS MODAL === */}
      <Modal
        visible={showChangesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangesModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: hairline }, Shadows.lg]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWell, { backgroundColor: '#F59E0B15' }]}>
                  <Ionicons name="create" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalEyebrow, { color: colors.gray500 }]}>MODIFICATIONS</Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Note à l'organisateur</Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: colors.background, borderColor: hairline }]}
                  onPress={() => {
                    setShowChangesModal(false);
                    setSelectedEvent(null);
                    setChangesNote('');
                  }}
                >
                  <Ionicons name="close" size={16} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              {selectedEvent && (
                <View style={[styles.modalEventChip, { backgroundColor: colors.background, borderColor: hairline }]}>
                  <Text style={[styles.modalEventTitle, { color: colors.text }]} numberOfLines={2}>
                    {selectedEvent.title}
                  </Text>
                </View>
              )}

              <Text style={[styles.modalDescription, { color: colors.gray600 }]}>
                L'organisateur recevra ta note et pourra corriger puis re-soumettre. Moins drastique qu'un rejet.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: Spacing.sm }}
                contentContainerStyle={{ gap: 6, paddingRight: 8 }}
              >
                {[
                  'Image bannière de meilleure qualité (>1200px)',
                  'Description plus détaillée svp',
                  'Préciser le lieu exact',
                  'Ajouter au moins un type de billet',
                  'Date limite d\'inscription manquante',
                  'Coordonnées de contact à ajouter',
                ].map((tpl) => {
                  const isActive = changesNote.trim() === tpl;
                  return (
                    <TouchableOpacity
                      key={tpl}
                      onPress={() => setChangesNote(tpl)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: isActive ? '#D97706' : '#F59E0B15',
                        borderWidth: 1,
                        borderColor: isActive ? '#D97706' : '#F59E0B40',
                      }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={{
                          fontFamily: FontFamily.semiBold,
                          fontSize: 11,
                          color: isActive ? '#fff' : '#92400E',
                        }}
                      >
                        {tpl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.background, borderColor: hairline, color: colors.text }]}
                placeholder="Décris ce qu'il faut corriger..."
                placeholderTextColor={colors.gray400}
                value={changesNote}
                onChangeText={setChangesNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.background, borderColor: hairline }]}
                  onPress={() => {
                    setShowChangesModal(false);
                    setSelectedEvent(null);
                    setChangesNote('');
                  }}
                  disabled={actionLoading !== null}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: colors.gray700 }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalRejectBtn,
                    { backgroundColor: '#D97706' },
                    (!changesNote.trim() || actionLoading !== null) && { opacity: 0.5 },
                  ]}
                  onPress={handleRequestChanges}
                  disabled={!changesNote.trim() || actionLoading !== null}
                  activeOpacity={0.8}
                >
                  {actionLoading !== null ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={14} color="#FFFFFF" />
                      <Text style={styles.modalRejectText}>Envoyer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* === BULK REJECT MODAL === */}
      <Modal
        visible={bulkRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setBulkRejectModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: hairline }, Shadows.lg]}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWell, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="layers" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalEyebrow, { color: colors.gray500 }]}>BULK · REJETER</Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedIds.size} événement{selectedIds.size > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: colors.background, borderColor: hairline }]}
                  onPress={() => setBulkRejectModal(false)}
                >
                  <Ionicons name="close" size={16} color={colors.gray600} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalDescription, { color: colors.gray600 }]}>
                Cette raison sera envoyée à tous les organisateurs concernés.
              </Text>

              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.background, borderColor: hairline, color: colors.text }]}
                placeholder="Raison commune du rejet..."
                placeholderTextColor={colors.gray400}
                value={bulkReason}
                onChangeText={setBulkReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.background, borderColor: hairline }]}
                  onPress={() => {
                    setBulkRejectModal(false);
                    setBulkReason('');
                  }}
                  disabled={actionLoading === 'bulk'}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalCancelText, { color: colors.gray700 }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalRejectBtn,
                    { backgroundColor: '#EF4444' },
                    (!bulkReason.trim() || actionLoading === 'bulk') && { opacity: 0.5 },
                  ]}
                  onPress={handleBulkReject}
                  disabled={!bulkReason.trim() || actionLoading === 'bulk'}
                  activeOpacity={0.8}
                >
                  {actionLoading === 'bulk' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={14} color="#FFFFFF" />
                      <Text style={styles.modalRejectText}>Rejeter en masse</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
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
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  // Stats — aligne sur NotificationsScreen.statStrip (canonical editorial)
  statsCard: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
    borderRightWidth: 1,
  },
  statItemLast: { borderRightWidth: 0 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.9,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Search — aligne sur FollowingEventsScreen.searchInputWrapper (canonical)
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    paddingVertical: 0,
  },

  // Filters
  filtersRow: { paddingVertical: Spacing.md },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },

  // Card — aligne sur EventCard (radius 18, image hero + date tile flottante)
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  cardImage: { height: 160, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Date tile flottante (canonical EventCard pattern)
  dateTileFloat: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  dateTileDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: -0.7,
  },
  dateTileMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  // Type badge — pill flottante en haut-droite (canonical eyebrowPillFloat)
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  cardContent: { padding: Spacing.md, gap: 6 },
  cardTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  cardDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.sm,
    marginTop: 6,
    borderTopWidth: 1,
  },
  submittedText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  // Disque tertiaire (Voir) — 36×36, juste icone
  actionDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pill secondaire (Modifs / Rejeter) — fond teinte, sans border
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  actionPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  // Pill primaire (Valider) — flex 1, fond plein
  actionPillPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  actionPillPrimaryText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },

  // Access Denied
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  accessDeniedEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
  },
  accessDeniedTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
  },
  accessDeniedText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.5,
  },
  backCta: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.full,
  },
  backCtaText: { fontFamily: FontFamily.bold, fontSize: FontSizes.base, letterSpacing: -0.2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
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
  modalIconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEventChip: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  modalEventTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  modalDescription: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  modalTextInput: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  modalCancelText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  modalRejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  modalRejectText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm, color: '#FFFFFF' },
});
