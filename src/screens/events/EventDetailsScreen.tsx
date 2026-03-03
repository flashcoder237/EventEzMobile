import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Linking,
  Modal,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  FadeInUp,
} from 'react-native-reanimated';
import { RootStackParamList } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows, TextStyles } from '../../constants/theme';
import BlurHeader from '../../components/ui/BlurHeader';
import FollowEventButton from '../../components/events/FollowEventButton';
import AddToCalendarButton from '../../components/events/AddToCalendarButton';
import SponsorsTab from '../../components/events/SponsorsTab';
import VenueTab from '../../components/events/VenueTab';
import VolunteersTab from '../../components/events/VolunteersTab';
import NewsletterTab from '../../components/events/NewsletterTab';
import CfpTab from '../../components/events/CfpTab';
import VirtualTab from '../../components/events/VirtualTab';
import SocialTab from '../../components/events/SocialTab';
import LocationTab from '../../components/events/LocationTab';
import AboutTab from '../../components/events/AboutTab';
import TicketsTab from '../../components/events/TicketsTab';
import AgendaTab from '../../components/events/AgendaTab';
import ReviewsTab from '../../components/events/ReviewsTab';
import { useEventDetails } from '../../hooks/useEventDetails';
import { DetailScreenSkeleton } from '../../components/ui/Skeleton';
import { eventsAPI } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../../components/ui/Badge';

type RouteProps = RouteProp<RootStackParamList, 'EventDetails'>;

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const route = useRoute<RouteProps>();
  const { eventId, imageUrl: routeImageUrl } = route.params;
  const { colors, isDark, gradients } = useTheme();

  const {
    event,
    loading,
    isFollowing,
    setIsFollowing,
    followersCount,
    setFollowersCount,
    // activeTab and setActiveTab no longer used (sections replace tabs)
    showReviewForm,
    setShowReviewForm,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    submittingReview,
    waitlistEntry,
    joiningWaitlist,
    userRegistration,
    feedbacks,
    loadingFeedbacks,
    sessions,
    loadingSessions,
    showImageViewer,
    setShowImageViewer,
    scrollViewRef,
    // tabsOffsetY no longer used
    handleShare,
    handleShareToWhatsApp,
    handleContactOrganizer,
    handleSubmitReview,
    handleJoinWaitlist,
    handleLeaveWaitlist,
    getTicketAvailability,
    areAllTicketsSoldOut,
    formatDate,
    formatDateShort,
    formatTime,
    isPaymentRequired,
    navigation,
    user,
    showError,
  } = useEventDetails(eventId);

  // All hooks must be called before any early returns
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const bannerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.3, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 360],
      [0, 180],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Fade out banner buttons as BlurHeader fades in
  const bannerOverlayOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [100, 200],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  // Access code state
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  const handleVerifyAccessCode = async () => {
    if (!accessCodeInput.trim()) return;
    setVerifyingCode(true);
    try {
      const response = await eventsAPI.verifyAccessCode(eventId, accessCodeInput);
      if (response.data?.valid) {
        // Reload the page - the event details will now show
        navigation.replace('EventDetails', { eventId });
      }
    } catch {
      showError('Erreur', "Code d'accès invalide");
    } finally {
      setVerifyingCode(false);
    }
  };

  if (!loading && !event) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={60} color={colors.gray400} />
        <Text style={[styles.errorText, { color: colors.gray500 }]}>Evenement non trouve</Text>
        <TouchableOpacity
          style={[styles.backButtonError, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonErrorText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Invite-only gate
  if (event?.visibility === 'invite_only' && event?.user_has_access === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={visibilityStyles.gateContainer}>
          <TouchableOpacity style={visibilityStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray700} />
          </TouchableOpacity>
          <View style={[visibilityStyles.gateIconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="lock-closed" size={48} color={colors.primary} />
          </View>
          <Text style={[visibilityStyles.gateTitle, { color: colors.gray900 }]}>Événement sur invitation</Text>
          <Text style={[visibilityStyles.gateDesc, { color: colors.gray500 }]}>
            Cet événement est réservé aux personnes invitées.
            Si vous avez reçu une invitation, veuillez l'accepter pour y accéder.
          </Text>
          <TouchableOpacity style={[visibilityStyles.gateBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={visibilityStyles.gateBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Access code gate
  if (event?.requires_access_code) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={visibilityStyles.gateContainer}>
          <TouchableOpacity style={visibilityStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray700} />
          </TouchableOpacity>

          {event.banner_image && (
            <Image source={{ uri: event.banner_image }} style={visibilityStyles.gateBanner} />
          )}

          <Text style={[visibilityStyles.gateTitle, { color: colors.gray900 }]}>{event.title}</Text>
          {event.start_date && (
            <Text style={[visibilityStyles.gateDate, { color: colors.gray500 }]}>
              {new Date(event.start_date).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </Text>
          )}

          <View style={[visibilityStyles.codeCard, { backgroundColor: colors.card }]}>
            <Ionicons name="key-outline" size={28} color={colors.warning} />
            <Text style={[visibilityStyles.codeTitle, { color: colors.gray900 }]}>Code d'accès requis</Text>
            <Text style={[visibilityStyles.codeDesc, { color: colors.gray500 }]}>
              Entrez le code pour voir les détails complets
            </Text>
            <TextInput
              style={[visibilityStyles.codeInput, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.gray50 }]}
              value={accessCodeInput}
              onChangeText={setAccessCodeInput}
              placeholder="Entrez le code d'accès"
              placeholderTextColor={colors.gray400}
              autoFocus
            />
            <TouchableOpacity
              style={[visibilityStyles.codeBtn, { backgroundColor: colors.primary }, (!accessCodeInput.trim() || verifyingCode) && { opacity: 0.5 }]}
              onPress={handleVerifyAccessCode}
              disabled={!accessCodeInput.trim() || verifyingCode}
            >
              {verifyingCode ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={visibilityStyles.codeBtnText}>Accéder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const dateInfo = event ? formatDateShort(event.start_date) : null;
  const minPrice = event?.ticket_types && event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map(t => t.price))
    : 0;

  const handleFollowChange = (following: boolean) => {
    setIsFollowing(following);
    setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* BlurHeader that appears on scroll */}
      <BlurHeader
        scrollY={scrollY}
        title={event?.title || ''}
        titleShowOffset={280}
        bgShowOffset={200}
        leftAction={
          <TouchableOpacity
            style={[styles.blurHeaderBtn, { backgroundColor: colors.gray100 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.gray900} />
          </TouchableOpacity>
        }
        rightActions={
          <TouchableOpacity
            style={[styles.blurHeaderBtn, { backgroundColor: colors.gray100 }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={colors.gray900} />
          </TouchableOpacity>
        }
      />

      <Animated.ScrollView
        ref={scrollViewRef as any}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Banner Image with parallax */}
        <View style={styles.bannerContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowImageViewer(true)}
          >
            <Animated.Image
              source={{ uri: event?.banner_image || event?.category?.default_event_image || routeImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' }}
              style={[styles.bannerImage, { backgroundColor: colors.gray200 }, bannerAnimatedStyle]}
              sharedTransitionTag={`event-image-${eventId}`}
            />
            {/* Triple gradient overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Image zoom hint */}
            <View style={styles.imageZoomHint}>
              <Ionicons name="expand-outline" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          {/* Header Overlay — fades out as BlurHeader fades in */}
          <Animated.View style={[StyleSheet.absoluteFill, bannerOverlayOpacity]}>
            <SafeAreaView style={styles.headerOverlay} edges={['top']}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <FollowEventButton
                  eventId={eventId}
                  variant="icon-only"
                  initialFollowing={isFollowing}
                  onFollowChange={handleFollowChange}
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                  <Ionicons name="share-outline" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={[styles.content, { backgroundColor: colors.surface, padding: Spacing.lg }]}>
            <View style={{ height: 20, width: '40%', backgroundColor: colors.gray200, borderRadius: 4, marginBottom: 12 }} />
            <View style={{ height: 28, width: '80%', backgroundColor: colors.gray200, borderRadius: 4, marginBottom: 16 }} />
            <View style={{ height: 60, width: '100%', backgroundColor: colors.gray100, borderRadius: 12, marginBottom: 16 }} />
            <View style={{ height: 16, width: '60%', backgroundColor: colors.gray200, borderRadius: 4, marginBottom: 8 }} />
            <View style={{ height: 16, width: '90%', backgroundColor: colors.gray200, borderRadius: 4, marginBottom: 8 }} />
            <View style={{ height: 16, width: '70%', backgroundColor: colors.gray200, borderRadius: 4 }} />
          </View>
        ) : event ? (
        <Animated.View entering={FadeInUp.delay(200).duration(400).springify()}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          {/* Pending Payment Alert */}
          {userRegistration && userRegistration.status === 'pending' && isPaymentRequired(userRegistration) && (
            <View style={[styles.pendingPaymentBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
              <View style={styles.pendingPaymentInfo}>
                <Ionicons name="warning" size={24} color={colors.warning} />
                <View style={styles.pendingPaymentTextContainer}>
                  <Text style={[styles.pendingPaymentTitle, { color: colors.warning }]}>Paiement en attente</Text>
                  <Text style={[styles.pendingPaymentDescription, { color: colors.gray600 }]}>
                    Finalisez votre paiement pour confirmer votre inscription
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.pendingPaymentButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Payment', { registrationId: userRegistration.id })}
              >
                <Ionicons name="card-outline" size={18} color={colors.white} />
                <Text style={styles.pendingPaymentButtonText}>Finaliser le paiement</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Date — Accent orange (Eventbrite pattern) */}
          <Text style={[styles.dateAccent, { color: colors.accent }]}>
            {formatDate(event.start_date)} · {formatTime(event.start_date)}
          </Text>

          {/* Title — Large & bold */}
          <Text style={[styles.title, { color: colors.gray900 }]}>{event.title}</Text>

          {/* Category Badge */}
          {event.category?.name && (
            <Badge label={event.category.name} variant="default" size="md" style={{ marginBottom: Spacing.lg }} />
          )}

          {/* Organizer Card */}
          <View style={[styles.organizerCard, { backgroundColor: colors.gray50 }]}>
            <View style={[styles.organizerAvatar, { backgroundColor: colors.primary }]}>
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
              <Text style={[styles.organizerLabel, { color: colors.gray500 }]}>Organise par</Text>
              <Text style={[styles.organizerName, { color: colors.gray900 }]}>
                {event.organizer?.first_name} {event.organizer?.last_name}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.contactOrgButton, { borderColor: colors.primary }]}
              onPress={handleContactOrganizer}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={[styles.contactOrgText, { color: colors.primary }]}>Contacter</Text>
            </TouchableOpacity>
          </View>

          {/* Share & Calendar Buttons */}
          <View style={styles.shareRow}>
            <Text style={[styles.shareLabel, { color: colors.gray500 }]}>Partager :</Text>
            <View style={styles.shareButtons}>
              <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.gray100 }]} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color={colors.gray600} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareButton, { backgroundColor: isDark ? '#1A3D1A' : '#E7F5E7' }]} onPress={handleShareToWhatsApp}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
              <AddToCalendarButton event={event} size="sm" />
            </View>
          </View>

          {/* Location Card */}
          {event.location_type === 'online' ? (
            <View style={[styles.onlineEventCard, { backgroundColor: colors.card, borderColor: isDark ? colors.border : '#DBEAFE' }]}>
              <View style={styles.onlineEventHeader}>
                <View style={[styles.infoIconContainer, { backgroundColor: isDark ? colors.infoLight : '#DBEAFE' }]}>
                  <Ionicons name="videocam" size={22} color={colors.info} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: colors.gray900 }]}>Evenement en ligne</Text>
                  <Text style={[styles.infoSubtitle, { color: colors.gray500 }]}>
                    {event.online_platform || 'Plateforme de visioconference'}
                  </Text>
                </View>
              </View>

              {/* Show meeting info only if user is registered */}
              {userRegistration ? (
                <>
                  {event.online_instructions && (
                    <Text style={[styles.onlineInstructions, { color: colors.gray600, borderTopColor: colors.gray100 }]}>
                      {event.online_instructions}
                    </Text>
                  )}
                  {!!(event.online_meeting_id || event.online_passcode) && (
                    <View style={[styles.onlineMeetingInfo, { backgroundColor: colors.gray50 }]}>
                      {event.online_meeting_id && (
                        <View style={styles.meetingInfoRow}>
                          <Text style={[styles.meetingInfoLabel, { color: colors.gray500 }]}>ID de reunion :</Text>
                          <Text style={[styles.meetingInfoValue, { color: colors.gray900 }]}>{event.online_meeting_id}</Text>
                        </View>
                      )}
                      {event.online_passcode && (
                        <View style={styles.meetingInfoRow}>
                          <Text style={[styles.meetingInfoLabel, { color: colors.gray500 }]}>Code d'acces :</Text>
                          <Text style={[styles.meetingInfoValue, { color: colors.gray900 }]}>{event.online_passcode}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {event.online_url ? (
                    <TouchableOpacity
                      style={styles.joinOnlineButton}
                      onPress={() => {
                        Linking.openURL(event.online_url!).catch(() => {
                          showError('Erreur', 'Impossible d\'ouvrir le lien de l\'evenement');
                        });
                      }}
                    >
                      <Ionicons name="videocam" size={18} color={colors.white} />
                      <Text style={styles.joinOnlineButtonText}>Rejoindre l'evenement</Text>
                    </TouchableOpacity>
                  ) : event.online_platform?.toLowerCase().includes('eventez') ? (
                    <View style={[styles.eventezVisioNotice, { backgroundColor: isDark ? colors.infoLight : '#F0F9FF' }]}>
                      <Ionicons name="information-circle" size={18} color={colors.info} />
                      <Text style={[styles.eventezVisioNoticeText, { color: colors.gray600 }]}>
                        La visioconference EventEz sera disponible le jour de l'evenement
                      </Text>
                    </View>
                  ) : !event.online_meeting_id && !event.online_passcode ? (
                    <View style={[styles.eventezVisioNotice, { backgroundColor: isDark ? colors.infoLight : '#F0F9FF' }]}>
                      <Ionicons name="time-outline" size={18} color={colors.gray500} />
                      <Text style={[styles.eventezVisioNoticeText, { color: colors.gray600 }]}>
                        Les informations de connexion seront communiquees avant l'evenement
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={[styles.onlineLockedInfo, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="lock-closed" size={20} color={colors.gray400} />
                  <Text style={[styles.onlineLockedText, { color: colors.gray500 }]}>
                    Les informations de connexion seront disponibles apres votre inscription
                  </Text>
                </View>
              )}
            </View>
          ) : event.location_type === 'hybrid' ? (
            <View style={styles.hybridEventCard}>
              {/* Physical location */}
              <TouchableOpacity style={[styles.infoCard, { backgroundColor: colors.gray50 }]} activeOpacity={0.7}>
                <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="location" size={22} color={colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: colors.gray900 }]}>{event.location_name || 'Lieu a definir'}</Text>
                  <Text style={[styles.infoSubtitle, { color: colors.gray500 }]}>
                    {event.location_address || `${event.location_city}, ${event.location_country}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
              </TouchableOpacity>
              {/* Online option */}
              <View style={[styles.hybridOnlineOption, { backgroundColor: isDark ? colors.infoLight : '#EFF6FF' }]}>
                <Ionicons name="videocam" size={18} color={colors.info} />
                <Text style={[styles.hybridOnlineText, { color: isDark ? colors.infoDark : '#1D4ED8' }]}>
                  Egalement disponible en ligne via {event.online_platform || 'visioconference'}
                </Text>
              </View>
              {/* Show meeting info if registered */}
              {userRegistration && event.online_url && (
                <TouchableOpacity
                  style={[styles.joinOnlineButton, { marginTop: Spacing.sm }]}
                  onPress={() => {
                    Linking.openURL(event.online_url!).catch(() => {
                      showError('Erreur', 'Impossible d\'ouvrir le lien de l\'evenement');
                    });
                  }}
                >
                  <Ionicons name="videocam" size={18} color={colors.white} />
                  <Text style={styles.joinOnlineButtonText}>Rejoindre en ligne</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={[styles.infoCard, { backgroundColor: colors.gray50 }]} activeOpacity={0.7}>
              <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.gray900 }]}>{event.location_name || 'Lieu a definir'}</Text>
                <Text style={[styles.infoSubtitle, { color: colors.gray500 }]}>
                  {event.location_address || `${event.location_city}, ${event.location_country}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}

          {/* Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: colors.gray50 }]}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={20} color={colors.gray500} />
              <Text style={[styles.statValue, { color: colors.gray900 }]}>{event.registration_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>inscrits</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color={colors.gray500} />
              <Text style={[styles.statValue, { color: colors.gray900 }]}>{event.view_count || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>vues</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={20} color={colors.gray500} />
              <Text style={[styles.statValue, { color: colors.gray900 }]}>{followersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>favoris</Text>
            </View>
          </View>

          {/* ===== ALL SECTIONS (scrollable, no tabs) ===== */}

          {/* Section: About */}
          <AboutTab
            event={event}
            eventId={eventId}
            isFollowing={isFollowing}
            onFollowChange={handleFollowChange}
            onNavigateVolunteers={() => navigation.navigate('Volunteers', { eventId: event.id })}
          />

          {/* Section: Good to Know */}
          <View style={[styles.goodToKnowSection, { borderTopColor: colors.gray100 }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Bon à savoir</Text>
            <View style={styles.goodToKnowGrid}>
              {event.start_date && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Check-in dès {formatTime(event.start_date)}</Text>
                </View>
              )}
              {event.location_type === 'in_person' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="navigate-outline" size={20} color={colors.primary} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Événement présentiel</Text>
                </View>
              )}
              {event.location_type === 'online' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="videocam-outline" size={20} color={colors.primary} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Événement en ligne</Text>
                </View>
              )}
              {event.location_type === 'hybrid' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="globe-outline" size={20} color={colors.primary} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Hybride (présentiel + en ligne)</Text>
                </View>
              )}
              {(event as any).max_attendees && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{(event as any).max_attendees} places max</Text>
                </View>
              )}
              {event.is_free && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="pricetag-outline" size={20} color={colors.success} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Événement gratuit</Text>
                </View>
              )}
              {event.visibility === 'unlisted' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="link-outline" size={20} color="#F97316" />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Non listé (accessible via le lien)</Text>
                </View>
              )}
              {event.visibility === 'invite_only' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50 }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>Sur invitation uniquement</Text>
                </View>
              )}
            </View>
          </View>

          {/* Section: Who's Going */}
          {(event.registration_count || 0) > 0 && (
            <View style={[styles.whoIsGoingSection, { borderTopColor: colors.gray100 }]}>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Qui y va ?</Text>
              <View style={styles.whoIsGoingRow}>
                <View style={styles.avatarStack}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={[styles.avatarCircle, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i, backgroundColor: colors.gray200, borderColor: colors.surface }]}>
                      <Ionicons name="person" size={16} color={colors.gray400} />
                    </View>
                  ))}
                </View>
                <Text style={[styles.whoIsGoingText, { color: colors.gray700 }]}>
                  +{event.registration_count} personne{(event.registration_count || 0) > 1 ? 's' : ''} inscrite{(event.registration_count || 0) > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Section: Tickets */}
          <TicketsTab
            event={event}
            waitlistEntry={waitlistEntry}
            joiningWaitlist={joiningWaitlist}
            getTicketAvailability={getTicketAvailability}
            areAllTicketsSoldOut={areAllTicketsSoldOut}
            onJoinWaitlist={handleJoinWaitlist}
            onLeaveWaitlist={handleLeaveWaitlist}
          />

          {/* Section: Agenda */}
          {sessions && sessions.length > 0 && (
            <AgendaTab
              sessions={sessions}
              loadingSessions={loadingSessions}
            />
          )}

          {/* Section: Location */}
          {event && (
            <LocationTab event={event} />
          )}

          {/* Section: Reviews */}
          <ReviewsTab
            feedbacks={feedbacks}
            loadingFeedbacks={loadingFeedbacks}
            user={user}
            showReviewForm={showReviewForm}
            setShowReviewForm={setShowReviewForm}
            reviewRating={reviewRating}
            setReviewRating={setReviewRating}
            reviewComment={reviewComment}
            setReviewComment={setReviewComment}
            submittingReview={submittingReview}
            onSubmitReview={handleSubmitReview}
          />

          {/* Section: Sponsors */}
          <SponsorsTab eventId={eventId} />

          {/* Spacer for bottom bar */}
          <View style={{ height: 120 }} />
        </View>
        </Animated.View>
        ) : null}
      </Animated.ScrollView>

      {/* Bottom CTA with glass effect */}
      {!loading && event ? <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 0}
        tint={isDark ? 'dark' : 'light'}
        style={styles.bottomBar}
      >
        {Platform.OS === 'android' && (
          <View style={[styles.bottomBarAndroidBg, { backgroundColor: isDark ? 'rgba(15,15,26,0.95)' : 'rgba(255,255,255,0.95)' }]} />
        )}
      <View style={[styles.bottomBarContent, { borderTopColor: colors.gray100 }]}>
        <View style={styles.priceContainer}>
          {userRegistration ? (
            <>
              <Text style={[styles.priceLabel, { color: colors.gray500 }]}>Statut</Text>
              <Badge
                label={userRegistration.status === 'confirmed' ? 'Inscrit' : userRegistration.status === 'pending' ? 'En attente' : 'Inscrit'}
                variant={userRegistration.status === 'confirmed' ? 'success' : userRegistration.status === 'pending' ? 'warning' : 'success'}
              />
            </>
          ) : (
            <>
              <Text style={[styles.priceLabel, { color: colors.gray500 }]}>
                {minPrice > 0 ? 'A partir de' : 'Prix'}
              </Text>
              <Text style={[styles.priceValue, { color: colors.gray900 }]}>
                {minPrice > 0 ? `${minPrice.toLocaleString()} FCFA` : 'Gratuit'}
              </Text>
            </>
          )}
        </View>
        {userRegistration ? (
          userRegistration.status === 'pending' && isPaymentRequired(userRegistration) ? (
            <View style={styles.ctaButtonsRow}>
              <TouchableOpacity
                style={[styles.ctaButtonIcon, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                onPress={() => navigation.navigate('TicketPurchase', { eventId, registrationId: userRegistration.id })}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, styles.ctaButtonCompact, { backgroundColor: colors.warning }]}
                onPress={() => navigation.navigate('Payment', { registrationId: userRegistration.id })}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={18} color={colors.white} />
                <Text style={styles.ctaButtonText}>Payer</Text>
              </TouchableOpacity>
            </View>
          ) : userRegistration.status === 'confirmed' ? (
            event.event_type === 'billetterie' ? (
              // Billetterie: bouton "+" pour acheter des billets supplementaires
              <View style={styles.ctaButtonsRow}>
                <TouchableOpacity
                  style={[styles.ctaButtonIcon, { backgroundColor: colors.surface, borderColor: colors.primary }]}
                  onPress={() => navigation.navigate('TicketPurchase', {
                    eventId,
                    additionalTickets: true,
                    registrationId: userRegistration.id
                  })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ctaButton, styles.ctaButtonCompact, { backgroundColor: colors.success }]}
                  onPress={() => navigation.navigate('RegistrationDetails', { registrationId: userRegistration.id })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="ticket-outline" size={18} color={colors.white} />
                  <Text style={styles.ctaButtonText}>Mon Billet</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Inscription: pas de bouton "+" supplementaire
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: colors.success }]}
                onPress={() => navigation.navigate('RegistrationDetails', { registrationId: userRegistration.id })}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.white} />
                <Text style={styles.ctaButtonText}>Mon Inscription</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.success }]}
              onPress={() => navigation.navigate('RegistrationDetails', { registrationId: userRegistration.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Voir mon inscription</Text>
              <Ionicons name="ticket-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('TicketPurchase', { eventId })}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {event.event_type === 'billetterie' ? 'Acheter des billets' : 'S\'inscrire'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
      </BlurView> : null}

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Image
            source={{ uri: event?.banner_image || event?.category?.default_event_image || routeImageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800' }}
            style={styles.imageViewerImage}
            resizeMode="contain"
          />
          <Text style={styles.imageViewerTitle} numberOfLines={2}>{event?.title}</Text>
        </View>
      </Modal>
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
    ...TextStyles.button,
  },
  bannerContainer: {
    height: 360,
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
    marginTop: -Spacing['2xl'],
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['4xl'],
    borderTopRightRadius: BorderRadius['4xl'],
  },
  // Date accent — orange, uppercase (Eventbrite pattern)
  dateAccent: {
    ...TextStyles.dateAccent,
    fontSize: FontSizes.base,
    marginBottom: Spacing.sm,
  },
  title: {
    ...TextStyles.editorial,
    marginBottom: Spacing.sm,
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
    ...TextStyles.label,
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
    ...TextStyles.caption,
  },
  organizerName: {
    ...TextStyles.bodyBold,
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
    ...TextStyles.label,
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
    ...TextStyles.bodyBold,
  },
  infoSubtitle: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...TextStyles.price,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...TextStyles.caption,
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
    ...TextStyles.h4,
    marginBottom: Spacing.md,
  },
  blurHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ===== STICKY BOTTOM CTA (glass effect) =====
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  bottomBarAndroidBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  priceContainer: {},
  priceLabel: {
    ...TextStyles.caption,
  },
  priceValue: {
    ...TextStyles.h3,
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
    ...TextStyles.button,
  },
  ctaButtonCompact: {
    paddingHorizontal: Spacing.lg,
  },
  ctaButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
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
    ...TextStyles.button,
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
  // Live Section
  liveSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  liveIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  liveDescription: {
    ...TextStyles.body,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  liveButtonText: {
    ...TextStyles.button,
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
    ...TextStyles.bodyBold,
    color: Colors.warning,
    marginBottom: 4,
  },
  pendingPaymentDescription: {
    ...TextStyles.small,
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
    ...TextStyles.button,
  },
  // Image Zoom Hint
  imageZoomHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageViewerImage: {
    width: width,
    height: width * 0.75,
  },
  imageViewerTitle: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
  // ===== BON À SAVOIR =====
  goodToKnowSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  goodToKnowGrid: {
    gap: Spacing.md,
  },
  goodToKnowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.gray50,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  goodToKnowText: {
    ...TextStyles.label,
    flex: 1,
  },
  // ===== QUI Y VA =====
  whoIsGoingSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  whoIsGoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  whoIsGoingText: {
    ...TextStyles.body,
    fontFamily: FontFamily.medium,
  },
});

const visibilityStyles = StyleSheet.create({
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backBtn: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    padding: Spacing.sm,
  },
  gateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  gateTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  gateDate: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginBottom: Spacing.md,
  },
  gateDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  gateBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
  },
  gateBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  gateBanner: {
    width: width - Spacing.xl * 2,
    height: 160,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  codeCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  codeTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  codeDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  codeInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    backgroundColor: Colors.gray50,
    marginBottom: Spacing.md,
  },
  codeBtn: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
});
