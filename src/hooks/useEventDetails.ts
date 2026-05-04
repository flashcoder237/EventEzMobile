import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollView, Share, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { eventsAPI, feedbacksAPI, messagesAPI, waitlistAPI, registrationsAPI, sessionsAPI, recommendationsAPI } from '../api';
import { Event, RootStackParamList, Feedback, WaitlistEntry, Registration, Session } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { getEventUrl } from '../constants/urls';

// Dedup module-level — un même event ouvert plusieurs fois dans la session ne
// remonte qu'une seule view au backend. Évite de polluer le signal recommandation
// avec du back-navigation ou des re-mounts dûs au focus effect.
const viewedEventsThisSession = new Set<string>();

function trackEventInteraction(
  eventId: string,
  interactionType: 'view' | 'share' | 'follow' | 'register' | 'search',
) {
  // Best effort : recommandation = signal, jamais bloquant. On no-op silencieusement.
  recommendationsAPI
    .recordInteraction({ event: eventId, interaction_type: interactionType })
    .catch(() => {});
}

export type TabType = 'about' | 'tickets' | 'agenda' | 'location' | 'reviews' | 'live' | 'sponsors' | 'venue' | 'volunteers' | 'newsletter' | 'cfp' | 'virtual' | 'social';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface UseEventDetailsReturn {
  // Core data
  event: Event | null;
  loading: boolean;
  // Follow state
  isFollowing: boolean;
  setIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
  followersCount: number;
  setFollowersCount: React.Dispatch<React.SetStateAction<number>>;
  // Tab state
  activeTab: TabType;
  setActiveTab: React.Dispatch<React.SetStateAction<TabType>>;
  // Review state
  showReviewForm: boolean;
  setShowReviewForm: React.Dispatch<React.SetStateAction<boolean>>;
  reviewRating: number;
  setReviewRating: React.Dispatch<React.SetStateAction<number>>;
  reviewComment: string;
  setReviewComment: React.Dispatch<React.SetStateAction<string>>;
  submittingReview: boolean;
  userReview: Feedback | null;
  // Waitlist state
  waitlistEntry: WaitlistEntry | null;
  joiningWaitlist: boolean;
  // User registration state
  userRegistration: Registration | null;
  // Feedbacks state
  feedbacks: Feedback[];
  loadingFeedbacks: boolean;
  // Sessions state
  sessions: Session[];
  loadingSessions: boolean;
  // Image viewer state
  showImageViewer: boolean;
  setShowImageViewer: React.Dispatch<React.SetStateAction<boolean>>;
  // Scroll refs
  scrollViewRef: React.RefObject<ScrollView | null>;
  tabsOffsetY: React.MutableRefObject<number>;
  // Actions
  handleShare: () => Promise<void>;
  handleShareToWhatsApp: () => Promise<void>;
  handleContactOrganizer: () => Promise<void>;
  handleSubmitReview: () => Promise<void>;
  handleJoinWaitlist: () => Promise<void>;
  handleLeaveWaitlist: () => Promise<void>;
  // Helpers
  getTicketAvailability: (ticket: any) => number;
  areAllTicketsSoldOut: () => boolean;
  formatDate: (dateString: string) => string;
  formatDateShort: (dateString: string) => { day: string; dayNum: number; month: string };
  formatTime: (dateString: string) => string;
  isPaymentRequired: (registration: Registration | null) => boolean;
  // Navigation
  navigation: NavigationProp;
  // Auth
  user: ReturnType<typeof useAuth>['user'];
  // Alert
  showAlert: ReturnType<typeof useAlert>['showAlert'];
  showSuccess: ReturnType<typeof useAlert>['showSuccess'];
  showError: ReturnType<typeof useAlert>['showError'];
  showConfirm: ReturnType<typeof useAlert>['showConfirm'];
}

export function useEventDetails(eventId: string): UseEventDetailsReturn {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('about');
  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userReview, setUserReview] = useState<Feedback | null>(null);
  // Waitlist state
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  // User registration state
  const [userRegistration, setUserRegistration] = useState<Registration | null>(null);
  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  // Image viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);
  // Scroll refs
  const scrollViewRef = useRef<ScrollView | null>(null);
  const tabsOffsetY = useRef(0);

  useEffect(() => {
    fetchEvent();
    fetchFeedbacks();
    fetchSessions();
    if (user) {
      fetchWaitlistStatus();
      fetchUserRegistration();
    }
  }, [eventId, user]);

  const fetchUserRegistration = async () => {
    try {
      const response = await registrationsAPI.getRegistrations({ event: eventId, page_size: 1 });
      const registrations = response.data?.results || response.data || [];
      const registration = registrations.find((r: Registration) => r.status !== 'cancelled');
      setUserRegistration(registration || null);
    } catch (error) {
      if (__DEV__) console.log('No registration found for this event');
    }
  };

  const fetchEvent = async () => {
    try {
      const [eventResponse, followResponse, countResponse] = await Promise.all([
        eventsAPI.getEvent(eventId),
        eventsAPI.isFollowing(eventId).catch(() => ({ data: { is_following: false } })),
        eventsAPI.getFollowersCount(eventId).catch(() => ({ data: { followers_count: 0 } })),
      ]);
      setEvent(eventResponse.data);
      setIsFollowing(followResponse.data?.is_following || eventResponse.data.is_following || false);
      setFollowersCount(countResponse.data?.followers_count || eventResponse.data.followers_count || 0);
      // Track view côté reco (une fois par session par event). Best effort.
      if (!viewedEventsThisSession.has(eventId)) {
        viewedEventsThisSession.add(eventId);
        trackEventInteraction(eventId, 'view');
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement evenement:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const response = await feedbacksAPI.getFeedbacks({ event: eventId });
      const feedbacksList = response.data?.results || response.data || [];
      setFeedbacks(feedbacksList);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement avis:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await sessionsAPI.getSessions({ event: eventId });
      const sessionsList = response.data?.results || response.data || [];
      // Trier par heure de debut
      sessionsList.sort((a: Session, b: Session) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setSessions(sessionsList);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchWaitlistStatus = async () => {
    try {
      const response = await waitlistAPI.getWaitlist({ event: eventId, page_size: 1 });
      const entries = response.data?.results || response.data || [];
      setWaitlistEntry(entries[0] || null);
    } catch (error) {
      if (__DEV__) console.log('No waitlist entry found');
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      showAlert('Connexion requise', 'Connectez-vous pour rejoindre la liste d\'attente');
      return;
    }

    setJoiningWaitlist(true);
    try {
      const response = await waitlistAPI.joinWaitlist({ event: eventId });
      setWaitlistEntry(response.data);
      showSuccess('Succès', 'Vous avez rejoint la liste d\'attente. Vous serez notifié dès qu\'une place se libère.');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Impossible de rejoindre la liste d\'attente';
      showError('Erreur', message);
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!waitlistEntry) return;

    showConfirm(
      'Quitter la liste d\'attente',
      'Êtes-vous sûr de vouloir quitter la liste d\'attente ?',
      async () => {
        try {
          await waitlistAPI.cancelWaitlist(waitlistEntry.id);
          setWaitlistEntry(null);
          showSuccess('Succès', 'Vous avez quitté la liste d\'attente');
        } catch (error) {
          showError('Erreur', 'Impossible de quitter la liste d\'attente');
        }
      }
    );
  };

  const handleShare = async () => {
    if (!event) return;

    const shareUrl = getEventUrl(event.id);
    const shareMessage = `${event.title}\n\n${event.short_description || event.description?.slice(0, 100) || ''}\n\n${formatDate(event.start_date)}\n${event.location_city || event.location_name || 'Lieu a confirmer'}\n\nDecouvre cet evenement sur EventEz: ${shareUrl}`;

    try {
      const result = await Share.share({
        message: shareMessage,
        title: event.title,
        url: shareUrl,
      });
      // L'utilisateur a effectivement partagé (action !== 'dismissed') : signal fort.
      if ((result as any)?.action === Share.sharedAction) {
        trackEventInteraction(event.id, 'share');
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur partage:', error);
    }
  };

  const handleShareToWhatsApp = async () => {
    if (!event) return;
    const shareUrl = getEventUrl(event.id);
    const message = encodeURIComponent(`${event.title}\n\n${formatDate(event.start_date)}\n${event.location_city || 'En ligne'}\n\nDecouvre cet evenement: ${shareUrl}`);
    const url = `whatsapp://send?text=${message}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        trackEventInteraction(event.id, 'share');
      } else {
        showError('Erreur', 'WhatsApp n\'est pas installe sur cet appareil');
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur partage WhatsApp:', error);
    }
  };

  const handleContactOrganizer = async () => {
    if (!user) {
      showAlert('Connexion requise', 'Connectez-vous pour contacter l\'organisateur');
      return;
    }

    if (!event?.organizer?.id) {
      showError('Erreur', 'Impossible de contacter l\'organisateur');
      return;
    }

    try {
      // Create or get existing conversation with organizer
      const response = await messagesAPI.createConversation({
        participant_ids: [Number(event.organizer.id)],
      });

      navigation.navigate('Conversation', { conversationId: response.data.id });
    } catch (error) {
      if (__DEV__) console.error('Erreur creation conversation:', error);
      showError('Erreur', 'Impossible de creer la conversation');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      showAlert('Connexion requise', 'Connectez-vous pour laisser un avis');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      showError('Erreur', 'Veuillez selectionner une note entre 1 et 5');
      return;
    }

    setSubmittingReview(true);
    try {
      await feedbacksAPI.createFeedback({
        event: eventId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      showSuccess('Merci !', 'Votre avis a ete soumis avec succes');
      setShowReviewForm(false);
      setReviewComment('');
      // Refresh feedbacks
      fetchFeedbacks();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Impossible de soumettre votre avis';
      showError('Erreur', message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getTicketAvailability = (ticket: any) => {
    // Use quantity_available if provided, otherwise calculate
    if (typeof ticket.quantity_available === 'number') {
      return ticket.quantity_available;
    }
    // Calculate from total - sold
    const total = ticket.quantity_total || 0;
    const sold = ticket.quantity_sold || 0;
    return Math.max(0, total - sold);
  };

  const areAllTicketsSoldOut = () => {
    if (!event?.ticket_types || event.ticket_types.length === 0) return false;
    return event.ticket_types.every(ticket => getTicketAvailability(ticket) <= 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3).toUpperCase();
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
    return { day, dayNum, month };
  };

  // Helper pour verifier si le paiement est requis
  const isPaymentRequired = (registration: Registration | null): boolean => {
    if (!registration) return false;
    // Verifier d'abord le champ payment_required
    if (registration.payment_required === true) return true;
    // Fallback: verifier si les billets ont un prix total > 0
    if (registration.tickets && registration.tickets.length > 0) {
      const totalPrice = registration.tickets.reduce((sum, t) => sum + (t.total_price || 0), 0);
      return totalPrice > 0;
    }
    return false;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return {
    // Core data
    event,
    loading,
    // Follow state
    isFollowing,
    setIsFollowing,
    followersCount,
    setFollowersCount,
    // Tab state
    activeTab,
    setActiveTab,
    // Review state
    showReviewForm,
    setShowReviewForm,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    submittingReview,
    userReview,
    // Waitlist state
    waitlistEntry,
    joiningWaitlist,
    // User registration state
    userRegistration,
    // Feedbacks state
    feedbacks,
    loadingFeedbacks,
    // Sessions state
    sessions,
    loadingSessions,
    // Image viewer state
    showImageViewer,
    setShowImageViewer,
    // Scroll refs
    scrollViewRef,
    tabsOffsetY,
    // Actions
    handleShare,
    handleShareToWhatsApp,
    handleContactOrganizer,
    handleSubmitReview,
    handleJoinWaitlist,
    handleLeaveWaitlist,
    // Helpers
    getTicketAvailability,
    areAllTicketsSoldOut,
    formatDate,
    formatDateShort,
    formatTime,
    isPaymentRequired,
    // Navigation
    navigation,
    // Auth
    user,
    // Alert
    showAlert,
    showSuccess,
    showError,
    showConfirm,
  };
}
