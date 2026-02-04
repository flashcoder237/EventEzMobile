import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  StatusBar,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { eventsAPI, feedbacksAPI, messagesAPI, waitlistAPI, registrationsAPI, sessionsAPI } from '../../api/client';
import { Event, RootStackParamList, Feedback, WaitlistEntry, Registration, Session } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import FollowEventButton from '../../components/events/FollowEventButton';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';

type RouteProps = RouteProp<RootStackParamList, 'EventDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

type TabType = 'about' | 'tickets' | 'agenda' | 'reviews';

const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'about', label: 'À propos', icon: 'information-circle-outline' },
  { id: 'tickets', label: 'Billets', icon: 'ticket-outline' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-outline' },
  { id: 'reviews', label: 'Avis', icon: 'star-outline' },
];

export default function EventDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { showAlert, showSuccess, showError, showConfirm } = useAlert();
  const { eventId } = route.params;
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
      const response = await registrationsAPI.getMyRegistrations();
      const registrations = response.data?.results || response.data || [];
      // Find registration for this event
      const registration = registrations.find((r: Registration) => {
        const regEventId = typeof r.event === 'string' ? r.event : (r.event as any)?.id;
        return regEventId === eventId && r.status !== 'cancelled';
      });
      setUserRegistration(registration || null);
    } catch (error) {
      console.log('No registration found for this event');
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
    } catch (error) {
      console.error('Erreur chargement événement:', error);
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
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await sessionsAPI.getSessions({ event: eventId });
      const sessionsList = response.data?.results || response.data || [];
      // Trier par heure de début
      sessionsList.sort((a: Session, b: Session) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setSessions(sessionsList);
    } catch (error) {
      console.error('Erreur chargement sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchWaitlistStatus = async () => {
    try {
      const response = await waitlistAPI.getMyWaitlist();
      const entries = response.data?.results || response.data || [];
      const entry = entries.find((e: WaitlistEntry) => e.event === eventId || (e as any).event?.id === eventId);
      setWaitlistEntry(entry || null);
    } catch (error) {
      console.log('No waitlist entry found');
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

    const shareUrl = `https://eventez.com/events/${event.id}`;
    const shareMessage = `${event.title}\n\n${event.short_description || event.description?.slice(0, 100) || ''}\n\n📅 ${formatDate(event.start_date)}\n📍 ${event.location_city || event.location_name || 'Lieu à confirmer'}\n\nDécouvre cet événement sur EventEz: ${shareUrl}`;

    try {
      await Share.share({
        message: shareMessage,
        title: event.title,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handleShareToWhatsApp = async () => {
    if (!event) return;
    const shareUrl = `https://eventez.com/events/${event.id}`;
    const message = encodeURIComponent(`${event.title}\n\n📅 ${formatDate(event.start_date)}\n📍 ${event.location_city || 'En ligne'}\n\nDécouvre cet événement: ${shareUrl}`);
    const url = `whatsapp://send?text=${message}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showError('Erreur', 'WhatsApp n\'est pas installé sur cet appareil');
      }
    } catch (error) {
      console.error('Erreur partage WhatsApp:', error);
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
        participant_ids: [event.organizer.id],
      });

      navigation.navigate('Conversation', { conversationId: response.data.id });
    } catch (error) {
      console.error('Erreur création conversation:', error);
      showError('Erreur', 'Impossible de créer la conversation');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      showAlert('Connexion requise', 'Connectez-vous pour laisser un avis');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      showError('Erreur', 'Veuillez sélectionner une note entre 1 et 5');
      return;
    }

    setSubmittingReview(true);
    try {
      await feedbacksAPI.createFeedback({
        event: eventId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      showSuccess('Merci !', 'Votre avis a été soumis avec succès');
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

  // Helper pour vérifier si le paiement est requis
  const isPaymentRequired = (registration: Registration | null): boolean => {
    if (!registration) return false;
    // Vérifier d'abord le champ payment_required
    if (registration.payment_required === true) return true;
    // Fallback: vérifier si les billets ont un prix total > 0
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={Colors.gray400} />
        <Text style={styles.errorText}>Événement non trouvé</Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonErrorText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dateInfo = formatDateShort(event.start_date);
  const minPrice = event.ticket_types && event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map(t => t.price))
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: event.banner_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' }}
            style={styles.bannerImage}
          />

          {/* Header Overlay */}
          <SafeAreaView style={styles.headerOverlay} edges={['top']}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <FollowEventButton
                eventId={eventId}
                variant="icon-only"
                initialFollowing={isFollowing}
                onFollowChange={(following) => {
                  setIsFollowing(following);
                  setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1));
                }}
              />
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Pending Payment Alert */}
          {userRegistration && userRegistration.status === 'pending' && isPaymentRequired(userRegistration) && (
            <View style={styles.pendingPaymentBanner}>
              <View style={styles.pendingPaymentInfo}>
                <Ionicons name="warning" size={24} color={Colors.warning} />
                <View style={styles.pendingPaymentTextContainer}>
                  <Text style={styles.pendingPaymentTitle}>Paiement en attente</Text>
                  <Text style={styles.pendingPaymentDescription}>
                    Finalisez votre paiement pour confirmer votre inscription
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.pendingPaymentButton}
                onPress={() => navigation.navigate('Payment', { registrationId: userRegistration.id })}
              >
                <Ionicons name="card-outline" size={18} color={Colors.white} />
                <Text style={styles.pendingPaymentButtonText}>Finaliser le paiement</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Date Badge */}
          <View style={styles.dateRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateDay}>{dateInfo.dayNum}</Text>
              <Text style={styles.dateMonth}>{dateInfo.month}</Text>
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateText}>{formatDate(event.start_date)}</Text>
              <Text style={styles.timeText}>{formatTime(event.start_date)}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Category Badge */}
          {event.category?.name && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category.name}</Text>
            </View>
          )}

          {/* Organizer Card */}
          <View style={styles.organizerCard}>
            <View style={styles.organizerAvatar}>
              {event.organizer?.profile_picture ? (
                <Image
                  source={{ uri: event.organizer.profile_picture }}
                  style={styles.organizerImage}
                />
              ) : (
                <Text style={styles.organizerInitial}>
                  {event.organizer?.first_name?.[0] || 'O'}
                </Text>
              )}
            </View>
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerLabel}>Organisé par</Text>
              <Text style={styles.organizerName}>
                {event.organizer?.first_name} {event.organizer?.last_name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.contactOrgButton}
              onPress={handleContactOrganizer}
            >
              <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
              <Text style={styles.contactOrgText}>Contacter</Text>
            </TouchableOpacity>
          </View>

          {/* Share Buttons */}
          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Partager :</Text>
            <View style={styles.shareButtons}>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color={Colors.gray600} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareButton, styles.whatsappButton]} onPress={handleShareToWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Card */}
          {event.location_type === 'online' ? (
            <View style={styles.onlineEventCard}>
              <View style={styles.onlineEventHeader}>
                <View style={[styles.infoIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="videocam" size={22} color="#3B82F6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Événement en ligne</Text>
                  <Text style={styles.infoSubtitle}>
                    {event.online_platform || 'Plateforme de visioconférence'}
                  </Text>
                </View>
              </View>

              {/* Show meeting info only if user is registered */}
              {userRegistration ? (
                <>
                  {event.online_instructions && (
                    <Text style={styles.onlineInstructions}>
                      {event.online_instructions}
                    </Text>
                  )}
                  {(event.online_meeting_id || event.online_passcode) && (
                    <View style={styles.onlineMeetingInfo}>
                      {event.online_meeting_id && (
                        <View style={styles.meetingInfoRow}>
                          <Text style={styles.meetingInfoLabel}>ID de réunion :</Text>
                          <Text style={styles.meetingInfoValue}>{event.online_meeting_id}</Text>
                        </View>
                      )}
                      {event.online_passcode && (
                        <View style={styles.meetingInfoRow}>
                          <Text style={styles.meetingInfoLabel}>Code d'accès :</Text>
                          <Text style={styles.meetingInfoValue}>{event.online_passcode}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {event.online_url ? (
                    <TouchableOpacity
                      style={styles.joinOnlineButton}
                      onPress={() => {
                        Linking.openURL(event.online_url!).catch(() => {
                          showError('Erreur', 'Impossible d\'ouvrir le lien de l\'événement');
                        });
                      }}
                    >
                      <Ionicons name="videocam" size={18} color={Colors.white} />
                      <Text style={styles.joinOnlineButtonText}>Rejoindre l'événement</Text>
                    </TouchableOpacity>
                  ) : event.online_platform?.toLowerCase().includes('eventez') ? (
                    <View style={styles.eventezVisioNotice}>
                      <Ionicons name="information-circle" size={18} color="#3B82F6" />
                      <Text style={styles.eventezVisioNoticeText}>
                        La visioconférence EventEz sera disponible le jour de l'événement
                      </Text>
                    </View>
                  ) : !event.online_meeting_id && !event.online_passcode ? (
                    <View style={styles.eventezVisioNotice}>
                      <Ionicons name="time-outline" size={18} color={Colors.gray500} />
                      <Text style={styles.eventezVisioNoticeText}>
                        Les informations de connexion seront communiquées avant l'événement
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.onlineLockedInfo}>
                  <Ionicons name="lock-closed" size={20} color={Colors.gray400} />
                  <Text style={styles.onlineLockedText}>
                    Les informations de connexion seront disponibles après votre inscription
                  </Text>
                </View>
              )}
            </View>
          ) : event.location_type === 'hybrid' ? (
            <View style={styles.hybridEventCard}>
              {/* Physical location */}
              <TouchableOpacity style={styles.infoCard} activeOpacity={0.7}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="location" size={22} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>{event.location_name || 'Lieu à définir'}</Text>
                  <Text style={styles.infoSubtitle}>
                    {event.location_address || `${event.location_city}, ${event.location_country}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
              </TouchableOpacity>
              {/* Online option */}
              <View style={styles.hybridOnlineOption}>
                <Ionicons name="videocam" size={18} color="#3B82F6" />
                <Text style={styles.hybridOnlineText}>
                  Également disponible en ligne via {event.online_platform || 'visioconférence'}
                </Text>
              </View>
              {/* Show meeting info if registered */}
              {userRegistration && event.online_url && (
                <TouchableOpacity
                  style={[styles.joinOnlineButton, { marginTop: Spacing.sm }]}
                  onPress={() => {
                    Linking.openURL(event.online_url!).catch(() => {
                      showError('Erreur', 'Impossible d\'ouvrir le lien de l\'événement');
                    });
                  }}
                >
                  <Ionicons name="videocam" size={18} color={Colors.white} />
                  <Text style={styles.joinOnlineButtonText}>Rejoindre en ligne</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.infoCard} activeOpacity={0.7}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location" size={22} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{event.location_name || 'Lieu à définir'}</Text>
                <Text style={styles.infoSubtitle}>
                  {event.location_address || `${event.location_city}, ${event.location_country}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color={Colors.gray500} />
              <Text style={styles.statValue}>{event.registration_count || 0}</Text>
              <Text style={styles.statLabel}>inscrits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color={Colors.gray500} />
              <Text style={styles.statValue}>{event.view_count || 0}</Text>
              <Text style={styles.statLabel}>vues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={20} color={Colors.gray500} />
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>favoris</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tabsList}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={18}
                      color={activeTab === tab.id ? Colors.primary : Colors.gray500}
                    />
                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Tab Content */}
          {activeTab === 'about' && (
            <>
              {/* About Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>
                  {event.description || event.short_description || 'Aucune description disponible pour cet événement.'}
                </Text>
              </View>

              {/* Follow Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Suivre cet événement</Text>
                <Text style={styles.followDescription}>
                  Recevez des notifications pour les mises à jour, rappels et annonces.
                </Text>
                <FollowEventButton
                  eventId={eventId}
                  variant="default"
                  showFollowerCount
                  initialFollowing={isFollowing}
                  onFollowChange={(following) => {
                    setIsFollowing(following);
                    setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1));
                  }}
                />
              </View>

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tags</Text>
                  <View style={styles.tagsRow}>
                    {event.tags.map((tag) => (
                      <View key={tag.id} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {activeTab === 'tickets' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {event.event_type === 'billetterie' ? 'Types de billets' : 'Inscription'}
              </Text>
              {event.ticket_types && event.ticket_types.length > 0 ? (
                <>
                  {event.ticket_types.map((ticket, index) => {
                    const available = getTicketAvailability(ticket);
                    const isSoldOut = available <= 0;

                    return (
                      <View key={index} style={[styles.ticketCard, isSoldOut && styles.ticketCardSoldOut]}>
                        <View style={styles.ticketInfo}>
                          <Text style={styles.ticketName}>{ticket.name}</Text>
                          {ticket.description && (
                            <Text style={styles.ticketDescription}>{ticket.description}</Text>
                          )}
                          <Text style={[styles.ticketAvailability, isSoldOut && styles.ticketSoldOut]}>
                            {isSoldOut
                              ? 'Épuisé'
                              : `${available} disponible${available > 1 ? 's' : ''}`}
                          </Text>
                        </View>
                        <View style={styles.ticketPriceContainer}>
                          <Text style={[styles.ticketPrice, isSoldOut && styles.ticketPriceSoldOut]}>
                            {ticket.price > 0 ? `${ticket.price.toLocaleString()} FCFA` : 'Gratuit'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Waitlist Section */}
                  {areAllTicketsSoldOut() && (
                    <View style={styles.waitlistSection}>
                      <View style={styles.waitlistInfo}>
                        <Ionicons name="time-outline" size={24} color={Colors.warning} />
                        <View style={styles.waitlistTextContainer}>
                          <Text style={styles.waitlistTitle}>Tous les billets sont épuisés</Text>
                          <Text style={styles.waitlistDescription}>
                            {waitlistEntry
                              ? 'Vous êtes sur la liste d\'attente. Vous serez notifié si une place se libère.'
                              : 'Rejoignez la liste d\'attente pour être notifié si une place se libère.'}
                          </Text>
                        </View>
                      </View>
                      {waitlistEntry ? (
                        <TouchableOpacity
                          style={styles.leaveWaitlistButton}
                          onPress={handleLeaveWaitlist}
                        >
                          <Text style={styles.leaveWaitlistText}>Quitter la liste</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.joinWaitlistButton}
                          onPress={handleJoinWaitlist}
                          disabled={joiningWaitlist}
                        >
                          {joiningWaitlist ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <>
                              <Ionicons name="notifications-outline" size={18} color={Colors.white} />
                              <Text style={styles.joinWaitlistText}>Rejoindre la liste d'attente</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="ticket-outline" size={40} color={Colors.gray300} />
                  <Text style={styles.emptyTabText}>
                    {event.event_type === 'billetterie'
                      ? 'Aucun type de billet disponible'
                      : 'Inscription gratuite'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'agenda' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Programme</Text>
              {loadingSessions ? (
                <View style={styles.emptyTab}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.emptyTabText}>Chargement du programme...</Text>
                </View>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session, index) => (
                  <View key={session.id || index} style={styles.sessionCard}>
                    <View style={styles.sessionTime}>
                      <Text style={styles.sessionTimeText}>
                        {new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {session.end_time && (
                        <Text style={styles.sessionEndTime}>
                          {new Date(session.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {session.session_type && (
                        <View style={styles.sessionTypeBadge}>
                          <Text style={styles.sessionTypeText}>{session.session_type}</Text>
                        </View>
                      )}
                      {(session.location || session.room) && (
                        <View style={styles.sessionLocation}>
                          <Ionicons name="location-outline" size={12} color={Colors.gray500} />
                          <Text style={styles.sessionLocationText}>
                            {session.room ? `${session.room}${session.location ? ` - ${session.location}` : ''}` : session.location}
                          </Text>
                        </View>
                      )}
                      {session.speakers_detail && session.speakers_detail.length > 0 && (
                        <View style={styles.sessionSpeakers}>
                          <Ionicons name="person-outline" size={12} color={Colors.gray500} />
                          <Text style={styles.sessionSpeakersText}>
                            {session.speakers_detail.map((s: any) => s.full_name).join(', ')}
                          </Text>
                        </View>
                      )}
                      {session.description && (
                        <Text style={styles.sessionDescription} numberOfLines={2}>
                          {session.description}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="calendar-outline" size={40} color={Colors.gray300} />
                  <Text style={styles.emptyTabText}>Aucune session programmée</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.section}>
              <View style={styles.reviewsHeader}>
                <Text style={styles.sectionTitle}>Avis des participants</Text>
                {user && !showReviewForm && (
                  <TouchableOpacity
                    style={styles.addReviewButton}
                    onPress={() => setShowReviewForm(true)}
                  >
                    <Ionicons name="add" size={18} color={Colors.primary} />
                    <Text style={styles.addReviewText}>Laisser un avis</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Review Form */}
              {showReviewForm && (
                <View style={styles.reviewFormCard}>
                  <Text style={styles.reviewFormTitle}>Votre avis</Text>

                  {/* Rating Stars */}
                  <View style={styles.ratingInputRow}>
                    <Text style={styles.ratingLabel}>Note :</Text>
                    <View style={styles.ratingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setReviewRating(star)}
                          style={styles.ratingStar}
                        >
                          <Ionicons
                            name={star <= reviewRating ? 'star' : 'star-outline'}
                            size={28}
                            color={star <= reviewRating ? '#FBBF24' : Colors.gray300}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Comment Input */}
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Partagez votre expérience (optionnel)"
                    placeholderTextColor={Colors.gray400}
                    multiline
                    numberOfLines={4}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    textAlignVertical="top"
                  />

                  {/* Actions */}
                  <View style={styles.reviewFormActions}>
                    <TouchableOpacity
                      style={styles.cancelReviewButton}
                      onPress={() => {
                        setShowReviewForm(false);
                        setReviewComment('');
                        setReviewRating(5);
                      }}
                    >
                      <Text style={styles.cancelReviewText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitReviewButton}
                      onPress={handleSubmitReview}
                      disabled={submittingReview}
                    >
                      {submittingReview ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={styles.submitReviewText}>Soumettre</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {loadingFeedbacks ? (
                <View style={styles.emptyTab}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.emptyTabText}>Chargement des avis...</Text>
                </View>
              ) : feedbacks && feedbacks.length > 0 ? (
                feedbacks.map((feedback, index) => (
                  <View key={index} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {feedback.user_name?.[0] || (feedback.user as any)?.first_name?.[0] || 'U'}
                        </Text>
                      </View>
                      <View style={styles.reviewUserInfo}>
                        <Text style={styles.reviewUserName}>
                          {feedback.user_name || `${(feedback.user as any)?.first_name || ''} ${(feedback.user as any)?.last_name || ''}`.trim() || 'Utilisateur'}
                        </Text>
                        <View style={styles.reviewRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= feedback.rating ? 'star' : 'star-outline'}
                              size={14}
                              color={star <= feedback.rating ? '#FBBF24' : Colors.gray300}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    {feedback.comment && (
                      <Text style={styles.reviewComment}>{feedback.comment}</Text>
                    )}
                  </View>
                ))
              ) : !showReviewForm ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="star-outline" size={40} color={Colors.gray300} />
                  <Text style={styles.emptyTabText}>Aucun avis pour le moment</Text>
                  {user && (
                    <TouchableOpacity
                      style={styles.firstReviewButton}
                      onPress={() => setShowReviewForm(true)}
                    >
                      <Text style={styles.firstReviewText}>Soyez le premier à donner votre avis</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </View>
          )}

          {/* Spacer for bottom bar */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          {userRegistration ? (
            <>
              <Text style={styles.priceLabel}>Statut</Text>
              <Text style={[styles.priceValue, { color: Colors.success }]}>Inscrit</Text>
            </>
          ) : (
            <>
              <Text style={styles.priceLabel}>
                {minPrice > 0 ? 'À partir de' : 'Prix'}
              </Text>
              <Text style={styles.priceValue}>
                {minPrice > 0 ? `${minPrice.toLocaleString()} FCFA` : 'Gratuit'}
              </Text>
            </>
          )}
        </View>
        {userRegistration ? (
          userRegistration.status === 'pending' && isPaymentRequired(userRegistration) ? (
            <View style={styles.ctaButtonsRow}>
              <TouchableOpacity
                style={[styles.ctaButtonSecondary]}
                onPress={() => navigation.navigate('TicketPurchase', { eventId, registrationId: userRegistration.id })}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: Colors.warning, flex: 1 }]}
                onPress={() => navigation.navigate('Payment', { registrationId: userRegistration.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Finaliser le paiement</Text>
                <Ionicons name="card-outline" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : userRegistration.status === 'confirmed' ? (
            <View style={styles.ctaButtonsRow}>
              <TouchableOpacity
                style={[styles.ctaButtonSecondary]}
                onPress={() => navigation.navigate('TicketPurchase', { eventId, additionalTickets: true })}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.ctaButtonSecondaryText}>Plus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: Colors.success, flex: 1 }]}
                onPress={() => navigation.navigate('RegistrationDetails', { registrationId: userRegistration.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Voir mon inscription</Text>
                <Ionicons name="ticket-outline" size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: Colors.success }]}
              onPress={() => navigation.navigate('RegistrationDetails', { registrationId: userRegistration.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Voir mon inscription</Text>
              <Ionicons name="ticket-outline" size={18} color={Colors.white} />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('TicketPurchase' as never, { eventId } as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {event.event_type === 'billetterie' ? 'Acheter des billets' : 'S\'inscrire'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.gray500,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backButtonError: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  backButtonErrorText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  bannerContainer: {
    height: 280,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray200,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    marginTop: -Spacing.xl,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dateBadge: {
    width: 56,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dateDay: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.white,
    lineHeight: 24,
  },
  dateMonth: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
  },
  dateInfo: {
    flex: 1,
  },
  dateText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
    lineHeight: 32,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  organizerImage: {
    width: 48,
    height: 48,
  },
  organizerInitial: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  organizerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  organizerLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  organizerName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  contactOrgButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  contactOrgText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  // Share Row
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  shareLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginRight: Spacing.sm,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappButton: {
    backgroundColor: '#E7F5E7',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  infoSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.gray200,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 24,
  },
  followDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  // ===== BOTTOM BAR =====
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  priceValue: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  ctaButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  ctaButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  ctaButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 4,
  },
  ctaButtonSecondaryText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  // Tabs
  tabsContainer: {
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tabsList: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: Spacing.xs,
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  // Empty Tab State
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  // Ticket Card
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ticketCardSoldOut: {
    opacity: 0.6,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 2,
  },
  ticketDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: 4,
  },
  ticketAvailability: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontFamily: FontFamily.medium,
  },
  ticketSoldOut: {
    color: Colors.error,
  },
  ticketPriceContainer: {
    marginLeft: Spacing.md,
  },
  ticketPrice: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
  },
  ticketPriceSoldOut: {
    color: Colors.gray400,
  },
  // Session Card
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionTime: {
    width: 60,
    alignItems: 'center',
    paddingRight: Spacing.md,
    borderRightWidth: 2,
    borderRightColor: Colors.primary,
  },
  sessionTimeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  sessionInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sessionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  sessionLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sessionLocationText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  sessionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 18,
  },
  sessionEndTime: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    marginTop: 2,
  },
  sessionTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  sessionTypeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  sessionSpeakers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sessionSpeakersText: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    flex: 1,
  },
  // Reviews Section
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  addReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  // Review Form
  reviewFormCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  reviewFormTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  ratingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ratingLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
    marginRight: Spacing.md,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingStar: {
    padding: 2,
  },
  reviewInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  reviewFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  cancelReviewButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  cancelReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  submitReviewButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  submitReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  firstReviewButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.md,
  },
  firstReviewText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  // Waitlist Section
  waitlistSection: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  waitlistInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  waitlistTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  waitlistTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  waitlistDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  joinWaitlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  joinWaitlistText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  leaveWaitlistButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  leaveWaitlistText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  // Review Card
  reviewCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  reviewUserInfo: {
    marginLeft: Spacing.sm,
  },
  reviewUserName: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  // Online Event Styles
  onlineEventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  onlineEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  onlineInstructions: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  onlineMeetingInfo: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  meetingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  meetingInfoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  meetingInfoValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  joinOnlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  joinOnlineButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  onlineNote: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  onlineLockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  onlineLockedText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    lineHeight: 20,
  },
  eventezVisioNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  eventezVisioNoticeText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  // Hybrid Event Styles
  hybridEventCard: {
    marginBottom: Spacing.lg,
  },
  hybridOnlineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  hybridOnlineText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#1D4ED8',
  },
  // Pending Payment Banner
  pendingPaymentBanner: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  pendingPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pendingPaymentTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  pendingPaymentTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.warning,
    marginBottom: 4,
  },
  pendingPaymentDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  pendingPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  pendingPaymentButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
