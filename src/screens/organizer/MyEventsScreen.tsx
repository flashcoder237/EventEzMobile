import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Events as EventsIllustration, AnimatedIllustration } from '../../components/illustrations';
import { eventsAPI, getMediaUrl } from '../../api';
import CacheService from '../../services/CacheService';
import { Event, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { MyEventsScreenSkeleton } from '../../components/ui/Skeleton';
import { StaggeredItem } from '../../components/ui/Animations';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useTabletLayout } from '../../hooks/useTabletLayout';
import { formatCompactNumber } from '../../lib/utils/numberFormatters';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterStatus = 'all' | 'draft' | 'submitted' | 'validated' | 'rejected' | 'completed' | 'cancelled';

const statusConfig: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { color: '#6B7280', label: 'Brouillon', icon: 'document-outline' },
  submitted: { color: '#F59E0B', label: 'En attente', icon: 'time-outline' },
  changes_requested: { color: '#D97706', label: 'À corriger', icon: 'create-outline' },
  validated: { color: '#10B981', label: 'Validé', icon: 'checkmark-circle-outline' },
  published: { color: '#10B981', label: 'Publié', icon: 'checkmark-circle-outline' },
  rejected: { color: '#EF4444', label: 'Rejeté', icon: 'close-circle-outline' },
  completed: { color: '#3B82F6', label: 'Terminé', icon: 'flag-outline' },
  cancelled: { color: '#6B7280', label: 'Annulé', icon: 'ban-outline' },
};

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'validated', label: 'Validés' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'submitted', label: 'En attente' },
  { value: 'rejected', label: 'Rejetés' },
  { value: 'completed', label: 'Terminés' },
];

export default function MyEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { columns, padding: containerPadding, cardGap } = useTabletLayout();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? colors.gray100 : colors.gray50;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [user?.id])
  );

  const fetchEvents = async (bypassCache = false) => {
    const cacheKey = `my-events:${user?.id}`;
    try {
      if (!bypassCache && user?.id) {
        const cached = await CacheService.get<Event[]>(cacheKey);
        if (cached) {
          setEvents(cached.data);
          setLoading(false);
          if (!cached.isStale) return;
        }
      }
      const response = await eventsAPI.getMyEvents();
      const data = response.data?.results || response.data || [];
      setEvents(data);
      if (user?.id) {
        CacheService.set(cacheKey, data, 2 * 60 * 1000);
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement événements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents(true);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const statusMatch = filter === 'all' || event.status === filter;
      const searchMatch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.short_description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [events, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: events.length,
    draft: events.filter(e => e.status === 'draft').length,
    validated: events.filter(e => e.status === 'validated').length,
    submitted: events.filter(e => e.status === 'submitted').length,
  }), [events]);

  const handleDeleteEvent = (eventId: string) => {
    showConfirm(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      async () => {
        try {
          await eventsAPI.deleteEvent(eventId);
          setEvents(prev => prev.filter(e => e.id !== eventId));
          if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
          showSuccess('Succès', 'Événement supprimé');
        } catch (error) {
          if (__DEV__) console.error('Erreur suppression:', error);
          showError('Erreur', 'Impossible de supprimer l\'événement');
        }
      }
    );
  };

  const handleSubmitForValidation = (eventId: string) => {
    showConfirm(
      'Soumettre pour validation',
      'Voulez-vous soumettre cet événement pour validation ?',
      async () => {
        try {
          await eventsAPI.submitForValidation(eventId);
          setEvents(prev => prev.map(e =>
            e.id === eventId ? { ...e, status: 'submitted' } : e
          ));
          showSuccess('Succès', 'Événement soumis pour validation');
        } catch (error: any) {
          if (__DEV__) console.error('Erreur soumission:', error);
          showError('Erreur', error.response?.data?.detail || 'Impossible de soumettre l\'événement');
        }
      }
    );
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

  const getLocationDisplay = (event: Event) => {
    if (event.location_type === 'online') {
      return { icon: 'videocam-outline' as const, text: 'En ligne', color: '#3B82F6' };
    } else if (event.location_type === 'hybrid') {
      return { icon: 'globe-outline' as const, text: `${event.location_city || 'Hybride'} + En ligne`, color: '#6366F1' };
    }
    return { icon: 'location-outline' as const, text: event.location_city || 'Non spécifié', color: colors.gray500 };
  };

  const showEventActions = (event: Event) => {
    const actions: { text: string; onPress: () => void; style?: 'destructive' | 'cancel' | 'default' }[] = [
      {
        text: 'Voir l\'événement',
        onPress: () => navigation.navigate('EventDetails', { eventId: event.id }),
      },
    ];

    if (event.status === 'validated') {
      actions.push({
        text: 'Scanner QR (Check-in)',
        onPress: () => navigation.navigate('QRScanner', { eventId: event.id }),
      });
      actions.push({
        text: 'Voir les statistiques',
        onPress: () => navigation.navigate('EventAnalytics', { eventId: event.id }),
      });
      actions.push({
        text: 'Gérer les inscriptions',
        onPress: () => navigation.navigate('EventRegistrations', { eventId: event.id }),
      });
      actions.push({
        text: 'Bénévoles',
        onPress: () => navigation.navigate('Volunteers', { eventId: event.id }),
      });
    }

    if (event.status === 'validated' || event.status === 'draft') {
      actions.push({
        text: 'Codes promo',
        onPress: () => navigation.navigate('DiscountManagement', { eventId: event.id }),
      });
      actions.push({
        text: 'Lier billets aux sessions',
        onPress: () => navigation.navigate('EventSessionsLink', { eventId: event.id }),
      });
    }

    if (event.status === 'draft' || event.status === 'rejected') {
      actions.push({
        text: 'Modifier',
        onPress: () => navigation.navigate('EventEdit', { eventId: event.id }),
      });
    }

    if (event.status === 'draft') {
      actions.push({
        text: 'Soumettre pour validation',
        onPress: () => handleSubmitForValidation(event.id),
      });
    }

    actions.push({
      text: 'Supprimer',
      onPress: () => handleDeleteEvent(event.id),
      style: 'destructive',
    });

    actions.push({
      text: 'Annuler',
      style: 'cancel',
      onPress: () => {},
    });

    showAlert('Actions', event.title, actions);
  };

  const renderEvent = ({ item, index }: { item: Event; index: number }) => {
    const config = statusConfig[item.status] || statusConfig.draft;
    const location = getLocationDisplay(item);
    const startDate = new Date(item.start_date);
    const day = String(startDate.getDate()).padStart(2, '0');
    const month = startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
    const time = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const statusEyebrow = item.status === 'validated' ? 'EN LIGNE' :
                          item.status === 'submitted' ? 'EN ATTENTE' :
                          item.status === 'changes_requested' ? 'À CORRIGER' :
                          item.status === 'draft' ? 'BROUILLON' :
                          item.status === 'rejected' ? 'REJETÉ' :
                          item.status === 'completed' ? 'TERMINÉ' :
                          item.status === 'cancelled' ? 'ANNULÉ' : 'PUBLIÉ';

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.eventCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.lg,
          ]}
          onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          onLongPress={() => showEventActions(item)}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel={`Evenement ${item.title}`}
        >
          {/* === BANNER WITH OVERLAY === */}
          <View style={styles.imageWrap}>
            <Image
              source={
                getMediaUrl(item.banner_image || item.category?.default_event_image || item.display_image)
                  || require('../../../assets/defaults/default-event.png')
              }
              placeholder={item.banner_placeholder || item.category?.default_event_image_placeholder || item.display_placeholder || undefined}
              placeholderContentFit="cover"
              style={[styles.eventImage, { backgroundColor: colors.gray200 }]}
              cachePolicy="memory-disk"
              transition={300}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Status pill top-left */}
            <View style={[styles.statusEyebrowPill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <View style={[styles.statusEyebrowDot, { backgroundColor: config.color }]} />
              <Text style={[styles.statusEyebrowText, { color: '#111' }]}>{statusEyebrow}</Text>
            </View>

            {/* Date tile top-right */}
            <View style={[styles.dateTileTop, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <Text style={[styles.dateTileDay, { color: colors.text }]}>{day}</Text>
              <Text style={[styles.dateTileMonth, { color: colors.accent }]}>{month}</Text>
            </View>

            {/* Title overlay */}
            <View style={styles.titleOverlay}>
              {item.category?.name && (
                <Text style={styles.categoryEyebrow}>{item.category.name.toUpperCase()}</Text>
              )}
              <Text style={styles.titleOverlayText} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </View>

          {/* === META ROW === */}
          <View style={styles.metaRow}>
            <View style={styles.metaItemE}>
              <Ionicons name="time-outline" size={13} color={colors.gray500} />
              <Text style={[styles.metaTextE, { color: colors.gray600 }]}>{time}</Text>
            </View>
            <View style={[styles.metaDot, { backgroundColor: colors.gray300 }]} />
            <View style={styles.metaItemE}>
              <Ionicons name={location.icon} size={13} color={location.color} />
              <Text style={[styles.metaTextE, { color: location.color }]} numberOfLines={1}>
                {location.text}
              </Text>
            </View>
          </View>

          {/* === STATS BAR ===
              Compteurs formatés en notation compacte ("1,2 k", "1,5 M") pour
              ne pas casser le layout sur les events viraux. */}
          <View style={[styles.eventStats, { borderTopColor: hairline, borderBottomColor: hairline }]}>
            <View style={styles.statBlockE}>
              <Text style={[styles.statBlockValueE, { color: colors.text }]} numberOfLines={1}>
                {formatCompactNumber(item.registration_count || item.registrations_count, { fallbackZero: true })}
              </Text>
              <Text style={[styles.statBlockLabelE, { color: colors.gray500 }]}>INSCRITS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <View style={styles.statBlockE}>
              <Text style={[styles.statBlockValueE, { color: colors.text }]} numberOfLines={1}>
                {formatCompactNumber(item.view_count, { fallbackZero: true })}
              </Text>
              <Text style={[styles.statBlockLabelE, { color: colors.gray500 }]}>VUES</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <View style={styles.statBlockE}>
              <Text style={[styles.statBlockValueE, { color: colors.primary }]}>
                {item.is_free ? 'FREE' : `${item.base_price?.toLocaleString() || 0}`}
              </Text>
              <Text style={[styles.statBlockLabelE, { color: colors.gray500 }]}>
                {item.is_free ? 'GRATUIT' : (item.currency || 'XAF')}
              </Text>
            </View>
          </View>

          {/* Note modérateur visible sur les events à corriger ou rejetés */}
          {item.status === 'changes_requested' && item.moderator_notes ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                padding: 10,
                marginVertical: 8,
                borderRadius: 12,
                backgroundColor: '#FEF3C7',
                borderWidth: 1,
                borderColor: '#FDE68A',
              }}
            >
              <Ionicons name="create" size={14} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: FontFamily.bold,
                    fontSize: 10,
                    letterSpacing: 1,
                    color: '#92400E',
                    marginBottom: 2,
                  }}
                >
                  NOTE DU MODÉRATEUR
                </Text>
                <Text
                  style={{
                    fontFamily: FontFamily.medium,
                    fontSize: 12,
                    color: '#92400E',
                    lineHeight: 16,
                  }}
                >
                  {item.moderator_notes}
                </Text>
              </View>
            </View>
          ) : null}

          {item.status === 'rejected' && item.rejection_reason ? (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                padding: 10,
                marginVertical: 8,
                borderRadius: 12,
                backgroundColor: '#FEE2E2',
                borderWidth: 1,
                borderColor: '#FCA5A5',
              }}
            >
              <Ionicons name="close-circle" size={14} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: FontFamily.bold,
                    fontSize: 10,
                    letterSpacing: 1,
                    color: '#991B1B',
                    marginBottom: 2,
                  }}
                >
                  RAISON DU REJET
                </Text>
                <Text
                  style={{
                    fontFamily: FontFamily.medium,
                    fontSize: 12,
                    color: '#991B1B',
                    lineHeight: 16,
                  }}
                >
                  {item.rejection_reason}
                </Text>
              </View>
            </View>
          ) : null}

          {/* === ACTIONS === */}
          <View style={styles.actionsRow}>
            {item.status === 'validated' && (
              <>
                <TouchableOpacity
                  style={[styles.primaryActionPill, Shadows.buttonPrimary]}
                  onPress={() => navigation.navigate('QRScanner', { eventId: item.id })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Scanner QR code"
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="qr-code" size={14} color={Colors.white} />
                  <Text style={styles.primaryActionPillText}>Scanner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
                  onPress={() => navigation.navigate('EventRegistrations', { eventId: item.id })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Voir les inscrits"
                >
                  <Ionicons name="people-outline" size={14} color={colors.gray700} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
                  onPress={() => navigation.navigate('EventAnalytics', { eventId: item.id })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Voir les statistiques"
                >
                  <Ionicons name="stats-chart-outline" size={14} color={colors.gray700} />
                </TouchableOpacity>
              </>
            )}

            {item.status === 'draft' && (
              <TouchableOpacity
                style={[styles.primaryActionPill, Shadows.buttonPrimary]}
                onPress={() => handleSubmitForValidation(item.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Publier l'evenement"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="send" size={14} color={Colors.white} />
                <Text style={styles.primaryActionPillText}>Publier</Text>
              </TouchableOpacity>
            )}

            {(item.status === 'draft' || item.status === 'rejected' || item.status === 'changes_requested') && (
              <TouchableOpacity
                style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
                onPress={() => navigation.navigate('EventEdit', { eventId: item.id })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Modifier l'evenement"
              >
                <Ionicons name="create-outline" size={14} color={colors.gray700} />
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
              onPress={() => showEventActions(item)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Plus d'actions"
            >
              <Ionicons name="ellipsis-horizontal" size={14} color={colors.gray700} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </StaggeredItem>
    );
  };

  const renderEventItem = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <View style={columns > 1 ? { flex: 1 } : undefined}>
        {renderEvent({ item, index })}
      </View>
    ),
    [columns, renderEvent],
  );

  const renderFilterItem = useCallback(
    ({ item }: { item: { value: FilterStatus; label: string } }) => {
      const active = filter === item.value;
      const itemColor = item.value === 'all' ? colors.text :
                        item.value === 'validated' ? '#10B981' :
                        item.value === 'submitted' ? '#F59E0B' :
                        item.value === 'draft' ? colors.gray500 :
                        item.value === 'rejected' ? '#EF4444' :
                        item.value === 'completed' ? '#3B82F6' : colors.gray500;
      return (
        <TouchableOpacity
          style={[
            styles.filterPill,
            active
              ? { backgroundColor: colors.text}
              : {
                  backgroundColor: colors.card,
                  borderColor: hairline,
                  borderWidth: 1,
                },
          ]}
          onPress={() => setFilter(item.value)}
          activeOpacity={0.75}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={`Filtre ${item.label}`}
        >
          {item.value !== 'all' && (
            <View
              style={[
                styles.filterDot,
                { backgroundColor: active ? Colors.white : itemColor },
              ]}
            />
          )}
          <Text
            style={[
              styles.filterPillText,
              { color: active ? Colors.white : colors.gray700 },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [filter, colors, hairline],
  );

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
          borderBottomColor: hairline,
        },
      ]}
    >
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.gray600} />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
            CATALOGUE • ORGANISATEUR
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mes Events</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.gray100, marginRight: 8 }]}
          onPress={() => navigation.navigate('Drafts' as any)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Mes brouillons"
        >
          <Ionicons name="document-text-outline" size={18} color={colors.gray600} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerCreateBtn, Shadows.buttonPrimary]}
          onPress={() => navigation.navigate('EventCreate')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Creer un evenement"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        <EventsIllustration color={colors.primary} size={160} />
      </AnimatedIllustration>
      <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>
        {searchQuery || filter !== 'all' ? 'AUCUN RÉSULTAT' : 'CATALOGUE VIDE'}
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery || filter !== 'all' ? 'Aucun événement trouvé' : 'Démarre ton aventure'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || filter !== 'all'
          ? 'Essayez de modifier vos critères de recherche'
          : 'Créez votre premier événement pour commencer.\nC\'est rapide et 100% gratuit.'}
      </Text>
      {!searchQuery && filter === 'all' && (
        <TouchableOpacity
          style={[styles.createPillBtn, Shadows.buttonPrimary]}
          onPress={() => navigation.navigate('EventCreate')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Creer un evenement"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.createPillEyebrow}>NOUVEAU EVENT</Text>
            <Text style={styles.createPillLabel}>Créer mon premier event</Text>
          </View>
          <View style={styles.createPillArrow}>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>LIVE</WatermarkNumeral>
        {renderHeader()}
        <MyEventsScreenSkeleton />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>LIVE</WatermarkNumeral>
      {renderHeader()}

      {/* === EDITORIAL STAT STRIP === */}
      <View
        style={[
          styles.statsCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={[styles.statItem, { borderRightColor: hairline }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>TOTAL</Text>
        </View>
        <View style={[styles.statItem, { borderRightColor: hairline }]}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.validated}</Text>
            {stats.validated > 0 && <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />}
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>VALIDÉS</Text>
        </View>
        <View style={[styles.statItem, { borderRightColor: hairline }]}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.submitted}</Text>
            {stats.submitted > 0 && <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />}
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>EN ATTENTE</Text>
        </View>
        <View style={styles.statItemLast}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.draft}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>BROUILLONS</Text>
        </View>
      </View>

      {/* === SEARCH TRIGGER === */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: hairline }]}>
          <Ionicons name="search" size={16} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher un événement..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Rechercher mes evenements"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Effacer la recherche">
              <Ionicons name="close-circle" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
          <View style={[styles.searchPill, { backgroundColor: colors.gray100 }]}>
            <Ionicons name="filter" size={12} color={colors.gray600} />
          </View>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={renderFilterItem}
        />
      </View>

      {/* Events List */}
      <FlatList
        key={columns}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: cardGap } : undefined}
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: containerPadding, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTextCol: { flex: 1 },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCreateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
  },
  statItem: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
    alignItems: 'flex-start',
  },
  statItemLast: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.7,
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statCardDivider: { width: 1 },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 46,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
  },
  searchPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginRight: 8,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  listContent: {
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },

  // === EDITORIAL: EVENT CARD ===
  eventCard: {
    borderRadius: 24,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageWrap: {
    position: 'relative',
    height: 200,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  statusEyebrowPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusEyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusEyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  dateTileTop: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  dateTileDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.8,
  },
  dateTileMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  titleOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  categoryEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  titleOverlayText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  metaItemE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaTextE: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 4,
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statBlockE: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statBlockValueE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  statBlockLabelE: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: Spacing.sm,
  },

  // === ACTIONS ===
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
  },
  primaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  primaryActionPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  actionChipE: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // === EMPTY ===
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.xl,
    maxWidth: 300,
  },
  createPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minWidth: 280,
  },
  createPillEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  createPillLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  createPillArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
});
