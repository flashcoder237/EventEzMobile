import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Events as EventsIllustration, AnimatedIllustration } from '../../components/illustrations';
import { eventsAPI, getMediaUrl, invitationsAPI } from '../../api';
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
import {
  TourTarget,
  useTour,
  getOrganizerTourSteps,
  ORGANIZER_TOUR_STORAGE_KEY,
  ORGANIZER_TOUR_DELAY_MS,
} from '../../components/tour';
import EventActionsSheet, {
  EventActionSection,
  EventAction,
} from '../../components/organizer/EventActionsSheet';
import { useTabletLayout } from '../../hooks/useTabletLayout';
import { centeredContent, WIDE_MAX } from '../../constants/layout';
import { formatCompactNumber } from '../../lib/utils/numberFormatters';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import EventImage from '../../components/events/EventImage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterStatus = 'all' | 'draft' | 'submitted' | 'validated' | 'rejected' | 'completed' | 'cancelled';

type SortKey =
  | 'created_desc'
  | 'created_asc'
  | 'start_asc'
  | 'start_desc'
  | 'registrations_desc'
  | 'views_desc'
  | 'title_asc';

const statusColorIcon: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft: { color: '#6B7280', icon: 'document-outline' },
  submitted: { color: '#F59E0B', icon: 'time-outline' },
  changes_requested: { color: '#D97706', icon: 'create-outline' },
  validated: { color: '#10B981', icon: 'checkmark-circle-outline' },
  published: { color: '#10B981', icon: 'checkmark-circle-outline' },
  rejected: { color: '#EF4444', icon: 'close-circle-outline' },
  completed: { color: '#3B82F6', icon: 'flag-outline' },
  cancelled: { color: '#6B7280', icon: 'ban-outline' },
};

/**
 * Vrai si l'événement est TERMINÉ (date de fin dépassée).
 *
 * On se base sur `end_date` et non `start_date` : pendant l'événement, toutes
 * les actions (scan, statistiques, diffusion) restent pertinentes. Repli sur
 * `start_date` quand la date de fin est absente.
 */
function isEventEnded(event: any): boolean {
  const end = event?.end_date || event?.start_date;
  if (!end) return false;
  const t = new Date(end).getTime();
  return Number.isFinite(t) && t < Date.now();
}

export default function MyEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { toastSuccess, toastInfo } = useFeedback();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const tour = useTour();
  // Fire the organizer tour on first arrival. The seenKey persists in
  // AsyncStorage, so it won't replay on subsequent visits. The mainTabs tour
  // covers the bottom nav separately; this one focuses on this screen's
  // organizer-specific actions. The isActive check avoids stomping on the
  // mainTabs tour if a deep link brings the user straight here.
  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => {
      if (tour.isActive) return;
      tour.start(getOrganizerTourSteps(t), { seenKey: ORGANIZER_TOUR_STORAGE_KEY });
    }, ORGANIZER_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));
  const statusConfig: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => ({
    draft: { ...statusColorIcon.draft, label: t('organizer.myEvents.statusDraft') },
    submitted: { ...statusColorIcon.submitted, label: t('organizer.myEvents.statusSubmitted') },
    changes_requested: { ...statusColorIcon.changes_requested, label: t('organizer.myEvents.statusChangesRequested') },
    validated: { ...statusColorIcon.validated, label: t('organizer.myEvents.statusValidated') },
    published: { ...statusColorIcon.published, label: t('organizer.myEvents.statusPublished') },
    rejected: { ...statusColorIcon.rejected, label: t('organizer.myEvents.statusRejected') },
    completed: { ...statusColorIcon.completed, label: t('organizer.myEvents.statusCompleted') },
    cancelled: { ...statusColorIcon.cancelled, label: t('organizer.myEvents.statusCancelled') },
  }), [t]);
  const filterOptions: { value: FilterStatus; label: string }[] = useMemo(() => [
    { value: 'all', label: t('organizer.myEvents.filterAll') },
    { value: 'validated', label: t('organizer.myEvents.filterValidated') },
    { value: 'draft', label: t('organizer.myEvents.filterDraft') },
    { value: 'submitted', label: t('organizer.myEvents.filterSubmitted') },
    { value: 'rejected', label: t('organizer.myEvents.filterRejected') },
    { value: 'completed', label: t('organizer.myEvents.filterCompleted') },
  ], [t]);
  const { columns, padding: containerPadding, cardGap } = useTabletLayout();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? colors.gray100 : colors.gray50;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Tri par défaut : plus récents d'abord (created_at desc). Le backend
  // /events/my_events/ ne fait pas de .order_by() donc on doit trier client-side
  // pour avoir un ordre prédictible.
  const [sortKey, setSortKey] = useState<SortKey>('created_desc');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  // Modal de confirmation pour l'édition d'un event validé. On veut prévenir
  // l'organizer qu'une modif critique le repassera en "submitted" (re-validation).
  const [editValidatedTarget, setEditValidatedTarget] = useState<Event | null>(null);

  const sortOptions: { key: SortKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = useMemo(() => [
    { key: 'created_desc', label: t('organizer.myEvents.sortRecent'), icon: 'time-outline' },
    { key: 'created_asc', label: t('organizer.myEvents.sortOldest'), icon: 'hourglass-outline' },
    { key: 'start_asc', label: t('organizer.myEvents.sortStartSoonest'), icon: 'calendar-outline' },
    { key: 'start_desc', label: t('organizer.myEvents.sortStartLatest'), icon: 'calendar-clear-outline' },
    { key: 'registrations_desc', label: t('organizer.myEvents.sortMostRegistrations'), icon: 'people-outline' },
    { key: 'views_desc', label: t('organizer.myEvents.sortMostViews'), icon: 'eye-outline' },
    { key: 'title_asc', label: t('organizer.myEvents.sortAlphabetical'), icon: 'text-outline' },
  ], [t]);

  const activeSortLabel = useMemo(
    () => sortOptions.find(o => o.key === sortKey)?.label ?? '',
    [sortOptions, sortKey],
  );
  // Modal d'annulation : on demande une raison qui apparaîtra aux inscrits
  // (email + notification). Pas obligatoire côté backend mais fortement
  // recommandé pour la transparence — un cancel silencieux est une mauvaise UX.
  const [cancelEventTarget, setCancelEventTarget] = useState<Event | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState<string | null>(null);

  // Modal de récurrence — programmer plusieurs occurrences à partir d'un event.
  // Backend `/events/{id}/create_recurrence/` crée le pattern + génère les
  // instances. Une fois fait, l'event a `is_recurring=true` et ne peut pas
  // recréer un autre pattern (le backend renvoie 400).
  const [recurrenceTarget, setRecurrenceTarget] = useState<Event | null>(null);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceCount, setRecurrenceCount] = useState('4');
  const [recurrenceLoading, setRecurrenceLoading] = useState(false);

  // Bottom sheet d'actions — remplace l'Alert natif qui débordait sur Android
  // quand le menu dépassait 12 actions (event validated complet).
  const [actionsSheetEvent, setActionsSheetEvent] = useState<Event | null>(null);

  // Broadcast modal — l'organizer écrit un message à tous les inscrits.
  // type 'announcement' = system (centré, pas de push individuelle) /
  // 'message' = text normal (notif push à tous). Mode choisi via switch.
  const [broadcastTarget, setBroadcastTarget] = useState<Event | null>(null);
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastMode, setBroadcastMode] = useState<'announcement' | 'message'>('announcement');
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const closeBroadcast = () => {
    if (broadcastLoading) return;
    setBroadcastTarget(null);
    setBroadcastContent('');
    setBroadcastMode('announcement');
  };

  // ─── Inviter des invités (par email) ───
  // L'organisateur saisit des emails (séparés par virgule/retour ligne/espace)
  // + un message optionnel. Chaque invité reçoit un email d'invitation (lien
  // d'acceptation) et, s'il a déjà un compte, une notif in-app/push.
  const [inviteTarget, setInviteTarget] = useState<Event | null>(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Relance groupée des invités sans réponse. Toast discret et non bloquant :
  // c'est une confirmation d'action réussie, pas une décision à prendre.
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const handleRemindPending = async (event: Event) => {
    if (remindingId) return;
    setRemindingId(event.id);
    // Retour IMMEDIAT : sur un reseau lent, sans lui l'action semble sans effet
    // et l'organisateur reclique — d'ou des relances en double.
    toastInfo(
      t('organizer.myEvents.remindPendingProgress', {
        defaultValue: 'Envoi des relances…',
      }),
    );
    try {
      const res = await invitationsAPI.remindPending(event.id);
      const sent = res.data?.sent ?? 0;
      const skipped = res.data?.skipped ?? 0;
      if (sent === 0) {
        // Rien envoyé n'est pas une erreur : tout le monde a déjà répondu ou
        // vient d'être relancé. Le dire clairement évite un second clic inutile.
        toastSuccess(
          t('organizer.myEvents.remindNone', {
            defaultValue: 'Aucun invité à relancer pour le moment.',
          }),
        );
      } else {
        toastSuccess(
          skipped > 0
            ? t('organizer.myEvents.remindSentWithSkipped', {
                sent, skipped,
                defaultValue: `${sent} relance(s) envoyée(s), ${skipped} ignorée(s).`,
              })
            : t('organizer.myEvents.remindSent', {
                sent,
                defaultValue: `${sent} relance(s) envoyée(s).`,
              }),
        );
      }
    } catch {
      showError(
        t('organizer.myEvents.remindErrorTitle', { defaultValue: 'Relance impossible' }),
        t('organizer.myEvents.remindErrorMessage', {
          defaultValue: "Les relances n'ont pas pu être envoyées. Réessayez.",
        }),
      );
    } finally {
      setRemindingId(null);
    }
  };

  const closeInvite = () => {
    if (inviteLoading) return;
    setInviteTarget(null);
    setInviteEmails('');
    setInviteMessage('');
  };

  const submitInvite = async () => {
    if (!inviteTarget) return;
    // Découpe sur virgule / retour ligne / espace, filtre le vide + doublons.
    const emails = Array.from(new Set(
      inviteEmails
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ));
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = emails.filter((e) => !EMAIL_RE.test(e));
    if (emails.length === 0) {
      showError(t('organizer.myEvents.inviteEmptyTitle'), t('organizer.myEvents.inviteEmptyMessage'));
      return;
    }
    if (invalid.length > 0) {
      showError(
        t('organizer.myEvents.inviteInvalidTitle'),
        t('organizer.myEvents.inviteInvalidMessage', { emails: invalid.join(', ') }),
      );
      return;
    }
    setInviteLoading(true);
    try {
      const res = await invitationsAPI.bulkInvite({
        event: inviteTarget.id,
        invitees: emails.map((email) => ({ email })),
        message: inviteMessage.trim() || undefined,
      });
      showSuccess(
        t('organizer.myEvents.inviteSentTitle'),
        t('organizer.myEvents.inviteSentMessage', { count: res.data?.count ?? emails.length }),
      );
      closeInvite();
    } catch (error: any) {
      showError(
        t('common.error'),
        getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.inviteError' }).message,
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const submitBroadcast = async () => {
    if (!broadcastTarget) return;
    const trimmed = broadcastContent.trim();
    if (!trimmed) {
      showError(t('organizer.myEvents.broadcastEmptyTitle'), t('organizer.myEvents.broadcastEmptyMessage'));
      return;
    }
    setBroadcastLoading(true);
    try {
      const res = await eventsAPI.broadcastMessage(broadcastTarget.id, {
        content: trimmed,
        message_type: broadcastMode === 'announcement' ? 'system' : 'text',
      });
      showSuccess(
        t('organizer.myEvents.broadcastSentTitle'),
        t('organizer.myEvents.broadcastSentMessage', {
          count: res.data?.recipients_count ?? 0,
        }),
      );
      closeBroadcast();
    } catch (error: any) {
      showError(
        t('common.error'),
        getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.broadcastError' }).message,
      );
    } finally {
      setBroadcastLoading(false);
    }
  };

  const closeRecurrence = () => {
    if (recurrenceLoading) return;
    setRecurrenceTarget(null);
  };

  const submitRecurrence = async () => {
    if (!recurrenceTarget) return;
    const interval = parseInt(recurrenceInterval, 10);
    const count = parseInt(recurrenceCount, 10);
    if (!Number.isFinite(interval) || interval < 1) {
      showError(t('organizer.myEvents.intervalInvalidTitle'), t('organizer.myEvents.intervalInvalidMessage'));
      return;
    }
    if (!Number.isFinite(count) || count < 1 || count > 52) {
      showError(t('organizer.myEvents.countInvalidTitle'), t('organizer.myEvents.countInvalidMessage'));
      return;
    }
    setRecurrenceLoading(true);
    try {
      await eventsAPI.createRecurrence(recurrenceTarget.id, {
        frequency: recurrenceFrequency,
        interval,
        occurrence_count: count,
      });
      // Refetch pour récupérer is_recurring=true côté serveur.
      await fetchEvents(true);
      if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
      showSuccess(
        t('organizer.myEvents.recurrenceCreatedTitle'),
        t('organizer.myEvents.recurrenceCreatedMessage', { count }),
      );
      setRecurrenceTarget(null);
    } catch (error: any) {
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.recurrenceError' }).message);
    } finally {
      setRecurrenceLoading(false);
    }
  };

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
    const filtered = events.filter(event => {
      const statusMatch = filter === 'all' || event.status === filter;
      const searchMatch = !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.short_description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });

    // Tri appliqué après le filtrage. On copie pour ne pas muter l'array d'origine
    // (sinon useState ne déclenche pas de re-render des consommateurs externes).
    const sorted = [...filtered];
    const time = (s?: string) => (s ? new Date(s).getTime() : 0);
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'created_desc': return time(b.created_at) - time(a.created_at);
        case 'created_asc': return time(a.created_at) - time(b.created_at);
        case 'start_asc': return time(a.start_date) - time(b.start_date);
        case 'start_desc': return time(b.start_date) - time(a.start_date);
        case 'registrations_desc':
          return (b.registration_count ?? b.registrations_count ?? 0) - (a.registration_count ?? a.registrations_count ?? 0);
        case 'views_desc': return (b.view_count ?? 0) - (a.view_count ?? 0);
        case 'title_asc': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });
    return sorted;
  }, [events, filter, searchQuery, sortKey]);

  const stats = useMemo(() => ({
    total: events.length,
    draft: events.filter(e => e.status === 'draft').length,
    validated: events.filter(e => e.status === 'validated').length,
    submitted: events.filter(e => e.status === 'submitted').length,
  }), [events]);

  const handleDeleteEvent = (eventId: string) => {
    showConfirm(
      t('organizer.myEvents.deleteTitle'),
      t('organizer.myEvents.deleteMessage'),
      async () => {
        try {
          await eventsAPI.deleteEvent(eventId);
          setEvents(prev => prev.filter(e => e.id !== eventId));
          if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
          toastSuccess(t('organizer.myEvents.deleteSuccess'));
        } catch (error) {
          if (__DEV__) console.error('Erreur suppression:', error);
          showError(t('common.error'), t('organizer.myEvents.deleteError'));
        }
      }
    );
  };

  const handleAddPhotos = async (event: Event) => {
    try {
      // Lazy imports : ImagePicker + ImageManipulator sont déjà tirés côté
      // EventCreate, on les charge à la demande pour ne pas alourdir le bundle
      // initial de MyEventsScreen.
      const ImagePicker = await import('expo-image-picker');
      const ImageManipulator = await import('expo-image-manipulator');

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        showError(t('organizer.myEvents.permissionTitle'), t('organizer.myEvents.permissionMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });
      if (result.canceled || result.assets.length === 0) return;

      // Compression homogène avec la galerie créée à la création (1920px JPEG 0.7)
      const compressed = await Promise.all(
        result.assets.map(async (a) => {
          try {
            const out = await ImageManipulator.manipulateAsync(
              a.uri,
              [{ resize: { width: 1920 } }],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
            );
            return out.uri;
          } catch {
            return a.uri;
          }
        }),
      );

      const formData = new FormData();
      compressed.forEach((uri, idx) => {
        const filename = uri.split('/').pop() || `gallery_${idx}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('images', { uri, name: filename, type } as any);
      });

      await eventsAPI.uploadImages(event.id, formData);
      if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
      showSuccess(
        t('organizer.myEvents.photosAddedTitle'),
        t('organizer.myEvents.photosAddedMessage', { count: compressed.length }),
      );
    } catch (error: any) {
      if (__DEV__) console.error('Erreur upload photos:', error);
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.photosError' }).message);
    }
  };

  const handleRequestFeature = (event: Event) => {
    showConfirm(
      t('organizer.myEvents.featureTitle'),
      t('organizer.myEvents.featureMessage', { title: event.title }),
      async () => {
        try {
          await eventsAPI.requestFeature(event.id);
          showSuccess(t('organizer.myEvents.featureSentTitle'), t('organizer.myEvents.featureSentMessage'));
        } catch (error: any) {
          showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.featureError' }).message);
        }
      },
    );
  };

  const handleDuplicateEvent = async (event: Event) => {
    if (duplicateLoading) return;
    setDuplicateLoading(event.id);
    try {
      const res = await eventsAPI.duplicateEvent(event.id);
      // Backend renvoie { message, event } — l'event complet est sous .event.
      // Sans ce déballage, newEvent valait { message, event } et son id était
      // undefined → la suppression ultérieure tapait /events/undefined/ → 404.
      const payload = res.data || {};
      const newEvent: Event | null = payload.event || (payload.id ? payload : null);
      if (newEvent && newEvent.id) {
        setEvents(prev => [newEvent, ...prev]);
      } else {
        await fetchEvents(true);
      }
      if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
      showSuccess(t('organizer.myEvents.duplicatedTitle'), t('organizer.myEvents.duplicatedMessage'));
    } catch (error: any) {
      if (__DEV__) console.error('Erreur duplication:', error);
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.duplicateError' }).message);
    } finally {
      setDuplicateLoading(null);
    }
  };

  const openCancelModal = (event: Event) => {
    setCancelEventTarget(event);
    setCancelReason('');
  };

  const closeCancelModal = () => {
    if (cancelLoading) return;
    setCancelEventTarget(null);
    setCancelReason('');
  };

  const submitCancelEvent = async () => {
    if (!cancelEventTarget) return;
    const reason = cancelReason.trim();
    if (!reason) {
      showError(t('organizer.myEvents.reasonRequiredTitle'), t('organizer.myEvents.reasonRequiredMessage'));
      return;
    }
    setCancelLoading(true);
    try {
      await eventsAPI.cancelEvent(cancelEventTarget.id, reason);
      setEvents(prev => prev.map(e =>
        e.id === cancelEventTarget.id ? { ...e, status: 'cancelled' } : e,
      ));
      if (user?.id) CacheService.invalidate(`my-events:${user.id}`);
      showSuccess(t('organizer.myEvents.cancelledTitle'), t('organizer.myEvents.cancelledMessage'));
      setCancelEventTarget(null);
      setCancelReason('');
    } catch (error: any) {
      if (__DEV__) console.error('Erreur annulation:', error);
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.cancelError' }).message);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSubmitForValidation = (eventId: string) => {
    showConfirm(
      t('organizer.myEvents.submitTitle'),
      t('organizer.myEvents.submitMessage'),
      async () => {
        try {
          await eventsAPI.submitForValidation(eventId);
          setEvents(prev => prev.map(e =>
            e.id === eventId ? { ...e, status: 'submitted' } : e
          ));
          toastSuccess(t('organizer.myEvents.submitSuccess'));
        } catch (error: any) {
          if (__DEV__) console.error('Erreur soumission:', error);
          showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'organizer.myEvents.submitError' }).message);
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
      return { icon: 'videocam-outline' as const, text: t('organizer.myEvents.online'), color: '#3B82F6' };
    } else if (event.location_type === 'hybrid') {
      return { icon: 'globe-outline' as const, text: `${event.location_city || t('organizer.myEvents.hybrid')} + ${t('organizer.myEvents.online')}`, color: '#6366F1' };
    }
    return { icon: 'location-outline' as const, text: event.location_city || t('organizer.myEvents.notSpecified'), color: colors.gray500 };
  };

  /**
   * Ouvre le bottom sheet d'actions pour un event. Les sections sont
   * construites dynamiquement selon le statut, puis lues par le sheet
   * via `actionsSheetEvent` + `eventActionSections` (mémoizé).
   *
   * Refonte 2026-05-05 : avant on appelait `showAlert` (Alert natif), mais
   * sur Android avec 12-15 actions le menu débordait sur le statusbar.
   */
  const showEventActions = (event: Event) => {
    setActionsSheetEvent(event);
  };

  // Construction des sections d'actions pour le bottom sheet, mémoizée.
  const eventActionSections: EventActionSection[] = useMemo(() => {
    const event = actionsSheetEvent;
    if (!event) return [];

    const sections: EventActionSection[] = [];

    // ─── Événement TERMINÉ : jeu d'actions réduit ───
    // Une fois la date de fin passée, la plupart des actions n'ont plus de sens
    // — scanner un billet, envoyer une invitation, programmer une récurrence ou
    // soumettre à validation sur un événement déjà joué. Pire, « Annuler
    // l'événement » laissait croire qu'on peut défaire ce qui a eu lieu.
    // On ne garde donc que : voir, dupliquer (pour réutiliser la configuration)
    // et supprimer.
    const ended = isEventEnded(event);
    if (ended) {
      sections.push({
        title: t('organizer.myEvents.sectionActions'),
        actions: [
          {
            label: t('organizer.myEvents.actions.view'),
            icon: 'eye-outline',
            onPress: () => navigation.navigate('EventDetails', { eventId: event.slug || event.id }),
          },
          {
            label: t('organizer.myEvents.actions.duplicate'),
            icon: 'copy-outline',
            description: t('organizer.myEvents.actions.duplicatePastDesc'),
            onPress: () => handleDuplicateEvent(event),
          },
          {
            label: t('common.delete'),
            icon: 'trash-outline',
            style: 'destructive',
            description: t('organizer.myEvents.actions.deleteDesc'),
            onPress: () => handleDeleteEvent(event.id),
          },
        ],
      });
      return sections;
    }

    // ─── Suivi : visible sur tous les events ───
    const trackingActions: EventAction[] = [
      {
        label: t('organizer.myEvents.actions.view'),
        icon: 'eye-outline',
        onPress: () => navigation.navigate('EventDetails', { eventId: event.slug || event.id }),
      },
    ];
    if (event.status === 'validated') {
      trackingActions.push(
        {
          label: t('organizer.myEvents.actions.scanQR'),
          icon: 'qr-code-outline',
          onPress: () => navigation.navigate('QRScanner', { eventId: event.slug || event.id }),
        },
        {
          label: t('organizer.myEvents.actions.stats'),
          icon: 'stats-chart-outline',
          onPress: () => navigation.navigate('EventAnalytics', { eventId: event.slug || event.id }),
        },
        {
          label: t('organizer.myEvents.actions.registrations'),
          icon: 'people-outline',
          onPress: () => navigation.navigate('EventRegistrations', { eventId: event.slug || event.id }),
        },
      );
    }
    sections.push({ title: t('organizer.myEvents.sectionTracking'), actions: trackingActions });

    // ─── Configuration : promo + médias ───
    const configActions: EventAction[] = [];
    if (event.status === 'validated' || event.status === 'draft') {
      configActions.push(
        {
          label: t('organizer.myEvents.actions.discountCodes'),
          icon: 'pricetag-outline',
          onPress: () => navigation.navigate('DiscountManagement', { eventId: event.slug || event.id }),
        },
        {
          label: t('organizer.myEvents.actions.linkSessions'),
          icon: 'link-outline',
          onPress: () => navigation.navigate('EventSessionsLink', { eventId: event.slug || event.id }),
        },
        {
          label: t('organizer.myEvents.actions.addPhotos'),
          icon: 'images-outline',
          onPress: () => handleAddPhotos(event),
        },
      );
    }
    // L'equipe (co-organisateurs, scanners, moderateurs) se constitue des la
    // phase de preparation — un co-organisateur aide a monter l'event avant
    // meme sa validation. Le backend n'impose aucune restriction de statut,
    // donc on expose l'action sur tout event non annule (draft / soumis /
    // valide), coherent avec le web.
    if (event.status !== 'cancelled') {
      configActions.push({
        label: t('organizer.myEvents.actions.team', { defaultValue: 'Equipe' }),
        icon: 'people-outline',
        onPress: () =>
          navigation.navigate('TeamManagement', {
            eventId: event.slug || event.id,
            eventTitle: event.title,
          }),
      });
      // Inviter des invités par email — surtout utile pour un event « sur
      // invitation » (seul moyen d'y donner accès), mais valable pour tout event.
      configActions.push({
        label: t('organizer.myEvents.actions.invite', { defaultValue: 'Inviter des invités' }),
        icon: 'mail-outline',
        description: event.visibility === 'invite_only'
          ? t('organizer.myEvents.actions.inviteDescInviteOnly', { defaultValue: '' }) || undefined
          : undefined,
        onPress: () => setInviteTarget(event),
      });
      // Relancer les invités restés sans réponse. La tâche backend existait
      // depuis longtemps mais rien ne l'appelait : sans ce déclencheur,
      // l'organisateur n'avait aucun moyen de relancer.
      configActions.push({
        label: t('organizer.myEvents.actions.remindInvites', { defaultValue: 'Relancer les invités' }),
        icon: 'notifications-outline',
        onPress: () => handleRemindPending(event),
      });
    }
    if (event.status === 'validated') {
      configActions.push(
        {
          label: t('organizer.myEvents.actions.volunteers'),
          icon: 'hand-left-outline',
          onPress: () => navigation.navigate('Volunteers', { eventId: event.slug || event.id, manage: true }),
        },
        {
          label: t('organizer.myEvents.actions.sponsors'),
          icon: 'briefcase-outline',
          onPress: () => navigation.navigate('SponsorManagement', { eventId: event.slug || event.id }),
        },
        {
          label: t('organizer.myEvents.actions.seatingPlans'),
          icon: 'grid-outline',
          onPress: () => navigation.navigate('SeatingPlans', { eventId: event.slug || event.id }),
        },
        {
          label: t('organizer.myEvents.actions.exhibitors', { defaultValue: 'Exposants & stands' }),
          icon: 'storefront-outline',
          onPress: () => navigation.navigate('BoothManagement', { eventId: event.slug || event.id }),
        },
      );
    }
    if (configActions.length > 0) {
      sections.push({ title: t('organizer.myEvents.sectionConfig'), actions: configActions });
    }

    // ─── Promotion : visibilité + récurrence + broadcast ───
    if (event.status === 'validated') {
      const promoActions: EventAction[] = [
        {
          // Diffuser une annonce aux inscrits — endpoint backend
          // /events/{id}/broadcast-message/ qui crée la conv groupe au passage
          // si elle n'existe pas et notifie tous les participants.
          label: t('organizer.myEvents.actions.broadcastMessage'),
          icon: 'megaphone-outline',
          description: t('organizer.myEvents.actions.broadcastMessageDesc'),
          onPress: () => setBroadcastTarget(event),
        },
        {
          label: t('organizer.myEvents.actions.requestFeature'),
          icon: 'star-outline',
          description: t('organizer.myEvents.actions.requestFeatureDesc'),
          onPress: () => handleRequestFeature(event),
        },
      ];
      if (!(event as any).is_recurring) {
        promoActions.push({
          label: t('organizer.myEvents.actions.scheduleRecurrence'),
          icon: 'repeat-outline',
          description: t('organizer.myEvents.actions.scheduleRecurrenceDesc'),
          onPress: () => {
            setRecurrenceFrequency('weekly');
            setRecurrenceInterval('1');
            setRecurrenceCount('4');
            setRecurrenceTarget(event);
          },
        });
      }
      sections.push({ title: t('organizer.myEvents.sectionPromotion'), actions: promoActions });
    }

    // ─── Actions sur l'event ───
    const eventActions: EventAction[] = [];
    // Un événement TERMINÉ (end_date passée) n'est plus modifiable — le backend
    // le refuse aussi (EventViewSet.update, code 'event_ended'). On masque donc
    // « Modifier » sur un event passé, tout en gardant « Dupliquer ».
    const isPastEvent = !!event.end_date && new Date(event.end_date).getTime() < Date.now();
    // Édition libre : brouillon / rejeté / modifs demandées / EN ATTENTE DE
    // VALIDATION (submitted). Un event soumis reste modifiable (corriger une
    // date, une faute…) — le backend l'autorise (EventViewSet.update sans
    // verrou de statut), il repart simplement dans la file de modération. Le
    // 'submitted' était oublié ici → aucun bouton Modifier n'apparaissait,
    // incohérent avec le web qui l'autorise déjà.
    if (
      !isPastEvent && (
        event.status === 'draft'
        || event.status === 'rejected'
        || event.status === 'changes_requested'
        || event.status === 'submitted'
      )
    ) {
      eventActions.push({
        label: t('common.edit'),
        icon: 'create-outline',
        onPress: () => navigation.navigate('EventEdit', { eventId: event.slug || event.id }),
      });
    }
    // Sur un event validé (ET pas encore passé), on autorise l'édition mais avec
    // un warning : si l'organizer touche un champ critique (titre/dates/lieu/
    // type/capacité), le backend repasse l'event en 'submitted' (cf.
    // EventViewSet.update). Le modal d'avertissement évite la mauvaise surprise.
    if (event.status === 'validated' && !isPastEvent) {
      eventActions.push({
        label: t('organizer.myEvents.actionEditValidated'),
        icon: 'create-outline',
        description: t('organizer.myEvents.actionEditValidatedDesc'),
        onPress: () => setEditValidatedTarget(event),
      });
    }
    if (event.status === 'draft') {
      eventActions.push({
        label: t('organizer.myEvents.actions.submitForValidation'),
        icon: 'send-outline',
        onPress: () => handleSubmitForValidation(event.id),
      });
    }
    if (event.status !== 'cancelled') {
      eventActions.push({
        label: t('organizer.myEvents.actions.duplicate'),
        icon: 'copy-outline',
        onPress: () => handleDuplicateEvent(event),
      });
    }
    if (event.status === 'validated' || event.status === 'submitted') {
      eventActions.push({
        label: t('organizer.myEvents.actions.cancelEvent'),
        icon: 'close-circle-outline',
        style: 'destructive',
        description: t('organizer.myEvents.actions.cancelEventDesc'),
        onPress: () => openCancelModal(event),
      });
    }
    eventActions.push({
      label: t('common.delete'),
      icon: 'trash-outline',
      style: 'destructive',
      description: t('organizer.myEvents.actions.deleteDesc'),
      onPress: () => handleDeleteEvent(event.id),
    });
    sections.push({ title: t('organizer.myEvents.sectionActions'), actions: eventActions });

    return sections;
  }, [actionsSheetEvent, navigation, t]);

  /** Sections du sheet de tri — réutilise EventActionsSheet pour rester cohérent
   *  visuellement. L'option active est marquée par checkmark-circle + description "Tri actif". */
  const sortSections: EventActionSection[] = useMemo(() => {
    const actions: EventAction[] = sortOptions.map(opt => ({
      label: opt.label,
      icon: sortKey === opt.key ? 'checkmark-circle' : opt.icon,
      description: sortKey === opt.key ? t('organizer.myEvents.sortActive') : undefined,
      onPress: () => setSortKey(opt.key),
    }));
    return [{ title: t('organizer.myEvents.sortEyebrow'), actions }];
  }, [sortOptions, sortKey, t]);

  const handleEditValidatedConfirm = () => {
    const target = editValidatedTarget;
    setEditValidatedTarget(null);
    if (target) {
      navigation.navigate('EventEdit', { eventId: target.slug || target.id });
    }
  };

  const renderEvent = ({ item, index }: { item: Event; index: number }) => {
    const config = statusConfig[item.status] || statusConfig.draft;
    const location = getLocationDisplay(item);
    const startDate = new Date(item.start_date);
    const day = String(startDate.getDate()).padStart(2, '0');
    const month = startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
    const time = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const statusEyebrow = item.status === 'validated' ? t('organizer.myEvents.eyebrowOnline') :
                          item.status === 'submitted' ? t('organizer.myEvents.eyebrowPending') :
                          item.status === 'changes_requested' ? t('organizer.myEvents.eyebrowChanges') :
                          item.status === 'draft' ? t('organizer.myEvents.eyebrowDraft') :
                          item.status === 'rejected' ? t('organizer.myEvents.eyebrowRejected') :
                          item.status === 'completed' ? t('organizer.myEvents.eyebrowCompleted') :
                          item.status === 'cancelled' ? t('organizer.myEvents.eyebrowCancelled') : t('organizer.myEvents.eyebrowPublished');

    return (
      <StaggeredItem index={index}>
        <TouchableOpacity
          style={[
            styles.eventCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.lg,
          ]}
          onPress={() => navigation.navigate('EventDetails', { eventId: item.slug || item.id })}
          onLongPress={() => showEventActions(item)}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.myEvents.eventA11y', { title: item.title })}
        >
          {/* === BANNER WITH OVERLAY === */}
          <View style={styles.imageWrap}>
            <EventImage
              uri={getMediaUrl(item.banner_image || item.category?.default_event_image || item.display_image)}
              fallbackSource={require('../../../assets/defaults/default-event.png')}
              placeholder={item.banner_placeholder || item.category?.default_event_image_placeholder || item.display_placeholder || undefined}
              style={styles.eventImage}
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
              <Text style={[styles.statBlockLabelE, { color: colors.gray500 }]}>{t('organizer.myEvents.statsRegistered')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <View style={styles.statBlockE}>
              <Text style={[styles.statBlockValueE, { color: colors.text }]} numberOfLines={1}>
                {formatCompactNumber(item.view_count, { fallbackZero: true })}
              </Text>
              <Text style={[styles.statBlockLabelE, { color: colors.gray500 }]}>{t('organizer.myEvents.statsViews')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <View style={styles.statBlockE}>
              <Text style={[styles.statBlockValueE, { color: colors.primary }]}>
                {item.is_free ? t('organizer.myEvents.freeShort') : `${item.base_price?.toLocaleString() || 0}`}
              </Text>
              <Text style={[styles.statBlockLabelE, { color: colors.gray500 }]}>
                {item.is_free ? t('organizer.myEvents.freeLabel') : (item.currency || 'XAF')}
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
                  {t('organizer.myEvents.moderatorNoteTitle')}
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
                  {t('organizer.myEvents.rejectionReasonTitle')}
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
                  onPress={() => navigation.navigate('QRScanner', { eventId: item.slug || item.id })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('organizer.myEvents.scanQRA11y')}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="qr-code" size={14} color={Colors.white} />
                  <Text style={styles.primaryActionPillText}>{t('organizer.myEvents.scan')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
                  onPress={() => navigation.navigate('EventRegistrations', { eventId: item.slug || item.id })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('organizer.myEvents.viewRegistrationsA11y')}
                >
                  <Ionicons name="people-outline" size={14} color={colors.gray700} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
                  onPress={() => navigation.navigate('EventAnalytics', { eventId: item.slug || item.id })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('organizer.myEvents.viewStatsA11y')}
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
                accessibilityLabel={t('organizer.myEvents.publishA11y')}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="send" size={14} color={Colors.white} />
                <Text style={styles.primaryActionPillText}>{t('organizer.myEvents.publish')}</Text>
              </TouchableOpacity>
            )}

            {!(item.end_date && new Date(item.end_date).getTime() < Date.now())
              && (item.status === 'draft' || item.status === 'rejected' || item.status === 'changes_requested' || item.status === 'submitted') && (
              <TouchableOpacity
                style={[styles.actionChipE, { backgroundColor: colors.gray100 }]}
                onPress={() => navigation.navigate('EventEdit', { eventId: item.slug || item.id })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('organizer.myEvents.editA11y')}
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
              accessibilityLabel={t('organizer.myEvents.moreActionsA11y')}
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
          accessibilityLabel={t('organizer.myEvents.filterA11y', { label: item.label })}
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
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.gray600} />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>
            {t('organizer.myEvents.eyebrow')}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.myEvents.title')}</Text>
        </View>
        <TourTarget id="organizer-drafts-btn">
          <TouchableOpacity
            style={[styles.iconDisc, { backgroundColor: colors.gray100, marginRight: 8 }]}
            onPress={() => navigation.navigate('Drafts' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.myEvents.draftsA11y')}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.gray600} />
          </TouchableOpacity>
        </TourTarget>
        <TourTarget id="organizer-create-btn">
          <TouchableOpacity
            style={[styles.headerCreateBtn, Shadows.buttonPrimary]}
            onPress={() => navigation.navigate('EventCreate')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.myEvents.createA11y')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="add" size={20} color={Colors.white} />
          </TouchableOpacity>
        </TourTarget>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AnimatedIllustration entry="fadeIn" idle="sway">
        <EventsIllustration color={colors.primary} size={160} />
      </AnimatedIllustration>
      <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>
        {searchQuery || filter !== 'all' ? t('organizer.myEvents.emptyEyebrowResults') : t('organizer.myEvents.emptyEyebrowCatalog')}
      </Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery || filter !== 'all' ? t('organizer.myEvents.emptyTitleResults') : t('organizer.myEvents.emptyTitleStart')}
      </Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {searchQuery || filter !== 'all'
          ? t('organizer.myEvents.emptyTextResults')
          : t('organizer.myEvents.emptyTextStart')}
      </Text>
      {!searchQuery && filter === 'all' && (
        <TouchableOpacity
          style={[styles.createPillBtn, Shadows.buttonPrimary]}
          onPress={() => navigation.navigate('EventCreate')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.myEvents.createA11y')}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.createPillEyebrow}>{t('organizer.myEvents.createPillEyebrow')}</Text>
            <Text style={styles.createPillLabel}>{t('organizer.myEvents.createPillLabel')}</Text>
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

      <View style={styles.headerBlockInner}>
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
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.myEvents.statTotal')}</Text>
        </View>
        <View style={[styles.statItem, { borderRightColor: hairline }]}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.validated}</Text>
            {stats.validated > 0 && <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />}
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.myEvents.statValidated')}</Text>
        </View>
        <View style={[styles.statItem, { borderRightColor: hairline }]}>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.submitted}</Text>
            {stats.submitted > 0 && <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />}
          </View>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.myEvents.statPending')}</Text>
        </View>
        <View style={styles.statItemLast}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.draft}</Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.myEvents.statDrafts')}</Text>
        </View>
      </View>

      {/* === SEARCH TRIGGER === */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: hairline }]}>
          <Ionicons name="search" size={16} color={colors.gray400} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('organizer.myEvents.searchPlaceholder')}
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel={t('organizer.myEvents.searchA11y')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel={t('organizer.myEvents.clearSearchA11y')}>
              <Ionicons name="close-circle" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sortTriggerPill, { backgroundColor: colors.gray100 }]}
            onPress={() => setSortSheetVisible(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.myEvents.sortA11y')}
          >
            <Ionicons name="swap-vertical" size={13} color={colors.gray700} />
            <Text style={[styles.sortTriggerText, { color: colors.gray700 }]} numberOfLines={1}>
              {activeSortLabel}
            </Text>
          </TouchableOpacity>
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
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />

      {/* === MODAL ANNULATION D'ÉVÉNEMENT === */}
      <Modal
        visible={!!cancelEventTarget}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={[styles.cancelModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cancelModalEyebrow, { color: '#EF4444' }]}>{t('organizer.myEvents.cancelEyebrow')}</Text>
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>
              {t('organizer.myEvents.cancelModalTitle', { title: cancelEventTarget?.title || '' })}
            </Text>
            <Text style={[styles.cancelModalBody, { color: colors.gray500 }]}>
              {t('organizer.myEvents.cancelModalBody')}
            </Text>
            <TextInput
              style={[
                styles.cancelModalInput,
                {
                  backgroundColor: inputBg,
                  borderColor: hairline,
                  color: colors.text,
                },
              ]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t('organizer.myEvents.cancelReasonPlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              editable={!cancelLoading}
            />
            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={closeCancelModal}
                disabled={cancelLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.gray700 }]}>{t('organizer.myEvents.keepBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: '#EF4444' }, cancelLoading && { opacity: 0.6 }]}
                onPress={submitCancelEvent}
                disabled={cancelLoading}
                activeOpacity={0.85}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.cancelModalBtnText, { color: '#fff' }]}>{t('organizer.myEvents.cancelEventBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === MODAL RÉCURRENCE === */}
      <Modal
        visible={!!recurrenceTarget}
        transparent
        animationType="fade"
        onRequestClose={closeRecurrence}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={[styles.cancelModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cancelModalEyebrow, { color: colors.accent }]}>{t('organizer.myEvents.recurrenceEyebrow')}</Text>
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>
              {t('organizer.myEvents.recurrenceModalTitle', { title: recurrenceTarget?.title || '' })}
            </Text>
            <Text style={[styles.cancelModalBody, { color: colors.gray500 }]}>
              {t('organizer.myEvents.recurrenceModalBody')}
            </Text>

            {/* Fréquence */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: Spacing.md }}>
              {(['daily', 'weekly', 'monthly'] as const).map(f => {
                const active = f === recurrenceFrequency;
                const label = f === 'daily' ? t('organizer.myEvents.freqDaily') : f === 'weekly' ? t('organizer.myEvents.freqWeekly') : t('organizer.myEvents.freqMonthly');
                return (
                  <TouchableOpacity
                    key={f}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: BorderRadius.full,
                      borderWidth: 1.5,
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderColor: active ? colors.primary : hairline,
                      alignItems: 'center',
                    }}
                    onPress={() => !recurrenceLoading && setRecurrenceFrequency(f)}
                    activeOpacity={0.85}
                  >
                    <Text style={{
                      fontFamily: FontFamily.bold,
                      fontSize: 12,
                      color: active ? '#fff' : colors.text,
                      letterSpacing: 0.2,
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 11, color: colors.gray500, marginBottom: 6, letterSpacing: 0.8 }}>
                  {t('organizer.myEvents.recurrenceEvery')}
                </Text>
                <TextInput
                  style={[styles.cancelModalInput, { backgroundColor: inputBg, borderColor: hairline, color: colors.text, minHeight: 0, paddingVertical: 12 }]}
                  value={recurrenceInterval}
                  onChangeText={setRecurrenceInterval}
                  keyboardType="number-pad"
                  editable={!recurrenceLoading}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 11, color: colors.gray500, marginBottom: 6, letterSpacing: 0.8 }}>
                  {t('organizer.myEvents.recurrenceOccurrences')}
                </Text>
                <TextInput
                  style={[styles.cancelModalInput, { backgroundColor: inputBg, borderColor: hairline, color: colors.text, minHeight: 0, paddingVertical: 12 }]}
                  value={recurrenceCount}
                  onChangeText={setRecurrenceCount}
                  keyboardType="number-pad"
                  editable={!recurrenceLoading}
                />
              </View>
            </View>

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={closeRecurrence}
                disabled={recurrenceLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.primary }, recurrenceLoading && { opacity: 0.6 }]}
                onPress={submitRecurrence}
                disabled={recurrenceLoading}
                activeOpacity={0.85}
              >
                {recurrenceLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.cancelModalBtnText, { color: '#fff' }]}>{t('organizer.myEvents.scheduleBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === MODAL BROADCAST ANNONCE ===
          L'organizer écrit un message qui sera posté dans la conversation
          groupe de l'event (créée si elle n'existe pas) et notifié à tous
          les inscrits confirmés / acheteurs payés. */}
      <Modal
        visible={!!broadcastTarget}
        transparent
        animationType="fade"
        onRequestClose={closeBroadcast}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={[styles.cancelModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cancelModalEyebrow, { color: colors.accent }]}>
              {t('organizer.myEvents.broadcastEyebrow')}
            </Text>
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>
              {t('organizer.myEvents.broadcastTitle', { title: broadcastTarget?.title || '' })}
            </Text>
            <Text style={[styles.cancelModalBody, { color: colors.gray500 }]}>
              {broadcastMode === 'announcement'
                ? t('organizer.myEvents.broadcastBodyAnnouncement')
                : t('organizer.myEvents.broadcastBodyMessage')}
            </Text>

            {/* Switch entre Annonce (system, pas de push) et Message (text + push) */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: Spacing.md }}>
              {(['announcement', 'message'] as const).map(mode => {
                const active = mode === broadcastMode;
                const label = mode === 'announcement'
                  ? t('organizer.myEvents.broadcastModeAnnouncement')
                  : t('organizer.myEvents.broadcastModeMessage');
                return (
                  <TouchableOpacity
                    key={mode}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: BorderRadius.full,
                      borderWidth: 1.5,
                      backgroundColor: active ? colors.primary : 'transparent',
                      borderColor: active ? colors.primary : hairline,
                      alignItems: 'center',
                    }}
                    onPress={() => !broadcastLoading && setBroadcastMode(mode)}
                    activeOpacity={0.85}
                  >
                    <Text style={{
                      fontFamily: FontFamily.bold,
                      fontSize: 12,
                      color: active ? '#fff' : colors.text,
                      letterSpacing: 0.2,
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.cancelModalInput,
                {
                  backgroundColor: inputBg,
                  borderColor: hairline,
                  color: colors.text,
                  minHeight: 120,
                },
              ]}
              value={broadcastContent}
              onChangeText={setBroadcastContent}
              placeholder={t('organizer.myEvents.broadcastPlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={4000}
              editable={!broadcastLoading}
            />

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={closeBroadcast}
                disabled={broadcastLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.primary }, broadcastLoading && { opacity: 0.6 }]}
                onPress={submitBroadcast}
                disabled={broadcastLoading}
                activeOpacity={0.85}
              >
                {broadcastLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.cancelModalBtnText, { color: '#fff' }]}>
                    {t('organizer.myEvents.broadcastSendBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale « Inviter des invités » — emails + message, envoie une invitation
          (email + notif in-app si compte existant) à chaque adresse. */}
      <Modal
        visible={!!inviteTarget}
        transparent
        animationType="fade"
        onRequestClose={closeInvite}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={[styles.cancelModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cancelModalEyebrow, { color: colors.accent }]}>
              {t('organizer.myEvents.inviteEyebrow')}
            </Text>
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>
              {t('organizer.myEvents.inviteTitle', { title: inviteTarget?.title || '' })}
            </Text>
            <Text style={[styles.cancelModalBody, { color: colors.gray500 }]}>
              {t('organizer.myEvents.inviteBody')}
            </Text>

            <TextInput
              style={[
                styles.cancelModalInput,
                { backgroundColor: inputBg, borderColor: hairline, color: colors.text, minHeight: 80 },
              ]}
              value={inviteEmails}
              onChangeText={setInviteEmails}
              placeholder={t('organizer.myEvents.inviteEmailsPlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              autoCapitalize="none"
              keyboardType="email-address"
              textAlignVertical="top"
              editable={!inviteLoading}
            />

            <TextInput
              style={[
                styles.cancelModalInput,
                { backgroundColor: inputBg, borderColor: hairline, color: colors.text, minHeight: 70, marginTop: Spacing.sm },
              ]}
              value={inviteMessage}
              onChangeText={setInviteMessage}
              placeholder={t('organizer.myEvents.inviteMessagePlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={1000}
              editable={!inviteLoading}
            />

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={closeInvite}
                disabled={inviteLoading}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.primary }, inviteLoading && { opacity: 0.6 }]}
                onPress={submitInvite}
                disabled={inviteLoading}
                activeOpacity={0.85}
              >
                {inviteLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.cancelModalBtnText, { color: '#fff' }]}>
                    {t('organizer.myEvents.inviteSendBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom sheet d'actions — remplace l'ancien Alert natif. */}
      <EventActionsSheet
        visible={!!actionsSheetEvent}
        onClose={() => setActionsSheetEvent(null)}
        title={actionsSheetEvent?.title || ''}
        subtitle={t('organizer.myEvents.sectionActions')}
        sections={eventActionSections}
      />

      {/* Sheet de tri — réutilise EventActionsSheet pour cohérence visuelle. */}
      <EventActionsSheet
        visible={sortSheetVisible}
        onClose={() => setSortSheetVisible(false)}
        title={t('organizer.myEvents.sortEyebrow')}
        subtitle={activeSortLabel}
        sections={sortSections}
      />

      {/* Modal d'avertissement avant édition d'un event publié. Le backend
          (apps/events/views.py:484) repasse l'event en 'submitted' si un champ
          critique change → on prévient avant pour éviter la mauvaise surprise. */}
      <Modal
        visible={!!editValidatedTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setEditValidatedTarget(null)}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={[styles.cancelModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cancelModalEyebrow, { color: '#F59E0B' }]}>
              {t('organizer.myEvents.editValidatedEyebrow')}
            </Text>
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>
              {t('organizer.myEvents.editValidatedTitle', { title: editValidatedTarget?.title || '' })}
            </Text>
            <Text style={[styles.cancelModalBody, { color: colors.gray500 }]}>
              {t('organizer.myEvents.editValidatedBody')}
            </Text>
            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setEditValidatedTarget(null)}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelModalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleEditValidatedConfirm}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelModalBtnText, { color: '#fff' }]}>
                  {t('organizer.myEvents.editValidatedConfirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerBlockInner: {
    ...centeredContent(WIDE_MAX),
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
  sortTriggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    maxWidth: 150,
  },
  sortTriggerText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
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

  // Cancel-event modal
  cancelModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  cancelModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  cancelModalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  cancelModalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 24,
    marginBottom: 8,
  },
  cancelModalBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  cancelModalInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    minHeight: 100,
  },
  cancelModalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
