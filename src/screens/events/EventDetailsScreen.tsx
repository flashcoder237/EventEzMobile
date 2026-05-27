import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  Dimensions,
  StatusBar,
  Linking,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import ImageView from 'react-native-image-viewing';
import { DEFAULT_BLUR_DATA_URL } from '../../utils/imageUtils';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
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
  runOnJS,
} from 'react-native-reanimated';

// Wrapper anime autour d'expo-image pour garder parallax + placeholder LQIP
import { RootStackParamList } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows, TextStyles } from '../../constants/theme';
import BlurHeader from '../../components/ui/BlurHeader';
import FollowEventButton from '../../components/events/FollowEventButton';
import EventCoverMedia from '../../components/events/EventCoverMedia';
import FollowUserButton from '../../components/common/FollowUserButton';
import AddToCalendarButton from '../../components/events/AddToCalendarButton';
// Tabs visibles immédiatement (above-the-fold) : import statique.
import AboutTab from '../../components/events/AboutTab';
import TicketsTab from '../../components/events/TicketsTab';

// Tabs heavy (rendus seulement quand heavyRevealed=true après scroll) :
// React.lazy → leur code n'est pas dans le bundle initial, parsé seulement
// quand l'user scrolle suffisamment. Gros gain sur le mount d'un EventDetails.
const AgendaTab = React.lazy(() => import('../../components/events/AgendaTab'));
const LocationTab = React.lazy(() => import('../../components/events/LocationTab'));
const ReviewsTab = React.lazy(() => import('../../components/events/ReviewsTab'));
const SponsorsTab = React.lazy(() => import('../../components/events/SponsorsTab'));

// NOTE : VenueTab, VolunteersTab, NewsletterTab, CfpTab, VirtualTab, SocialTab
// étaient importés mais jamais utilisés dans le rendu — supprimés (dead imports).
// Si tu as besoin d'eux, les ajouter en lazy comme les heavy tabs ci-dessus.
import SimilarEventsSection from '../../components/events/SimilarEventsSection';
import { useEventDetails } from '../../hooks/useEventDetails';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { DetailScreenSkeleton } from '../../components/ui/Skeleton';
import { eventsAPI, getMediaUrl } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../../components/ui/Badge';
import ConvertedPrice from '../../components/common/ConvertedPrice';
import { EditorialCanvas, WatermarkNumeral, EditorialPillCTA, EditorialColors } from '../../components/ui/editorial';
import {
  TourTarget,
  useTour,
  getEventDetailsTourSteps,
  EVENT_DETAILS_TOUR_STORAGE_KEY,
  EVENT_DETAILS_TOUR_DELAY_MS,
} from '../../components/tour';
import { formatCompactNumber } from '../../lib/utils/numberFormatters';
import { displayCurrency } from '../../lib/utils/priceFormatters';

type RouteProps = RouteProp<RootStackParamList, 'EventDetails'>;

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const route = useRoute<RouteProps>();
  const { eventId, imageUrl: routeImageUrl, previewEvent } = route.params;
  const { colors, isDark, gradients } = useTheme();
  const { requireAuth } = useAuthGuard();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const {
    event,
    loading,
    isPreview,
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
  } = useEventDetails(eventId, previewEvent);

  // Toutes les images : banner en premier, puis gallery_images
  const allImages = useMemo(() => {
    const imgs: { uri: string; caption?: string; placeholder?: string }[] = [];
    const bannerUrl = getMediaUrl(event?.banner_image || event?.category?.default_event_image || routeImageUrl);
    if (bannerUrl) {
      imgs.push({
        uri: bannerUrl,
        placeholder: event?.banner_placeholder || event?.category?.default_event_image_placeholder || undefined,
      });
    }
    event?.gallery_images?.forEach(g => {
      const url = getMediaUrl(g.image);
      if (url) imgs.push({ uri: url, caption: g.caption, placeholder: g.image_placeholder || undefined });
    });
    return imgs;
  }, [event, routeImageUrl]);

  const openViewer = (index: number) => {
    setViewerImageIndex(index);
    setShowImageViewer(true);
  };

  // All hooks must be called before any early returns
  const scrollY = useSharedValue(0);
  // Lazy-load heavy below-the-fold sections (Reviews, Sponsors, Agenda, Location).
  // We reveal them once the user has scrolled past a threshold — saves the
  // parallel API fetches + map mount on first render.
  const HEAVY_REVEAL_THRESHOLD = 600;
  const [heavyRevealed, setHeavyRevealed] = useState(false);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      if (e.contentOffset.y > HEAVY_REVEAL_THRESHOLD) {
        runOnJS(setHeavyRevealed)(true);
      }
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
        // Stocke le token signe HMAC retourne par le backend. L'interceptor
        // axios l'injectera automatiquement en header X-Event-Access-Token
        // sur les requetes GET /events/<id>/ suivantes pendant 24h.
        const token = response.data?.access_token;
        if (token) {
          const { setEventAccessToken } = await import('../../lib/utils/eventAccessToken');
          await setEventAccessToken(eventId, token);
        }
        // Reload — le backend voit maintenant le token via l'interceptor
        // et renvoie les infos completes.
        navigation.replace('EventDetails', { eventId });
      }
    } catch {
      showError(t('common.error'), t('eventDetails.invalidCode'));
    } finally {
      setVerifyingCode(false);
    }
  };

  if (!loading && !event) {
    return (
      <EditorialCanvas edges={['top', 'bottom']}>
        <WatermarkNumeral>404</WatermarkNumeral>
        <View style={[styles.errorContainer, { zIndex: 1 }]}>
          <Text style={[editorialStyles.eyebrow, { color: colors.primary }]}>{t('eventDetails.loadingErrorEyebrow')}</Text>
          <Text style={[editorialStyles.errorTitle, { color: colors.gray900 }]}>{t('eventDetails.loadingError')}</Text>
          <Text style={[styles.errorText, { color: colors.gray500 }]}>{t('eventDetails.loadingErrorMessage')}</Text>
          <View style={{ marginTop: 24, flexDirection: 'row', alignSelf: 'stretch' }}>
            <EditorialPillCTA
              eyebrow={t('eyebrow.back')}
              label="Revenir en arrière"
              icon="arrow-back"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  // Invite-only gate
  if (event?.visibility === 'invite_only' && event?.user_has_access === false) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>VIP</WatermarkNumeral>
        <View style={[visibilityStyles.gateContainer, { zIndex: 1 }]}>
          <TouchableOpacity style={visibilityStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray700} />
          </TouchableOpacity>
          <View style={[visibilityStyles.gateIconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="lock-closed" size={48} color={colors.primary} />
          </View>
          <Text style={[visibilityStyles.gateTitle, { color: colors.gray900 }]}>{t('eventDetails.invitationGate')}</Text>
          <Text style={[visibilityStyles.gateDesc, { color: colors.gray500 }]}>
            Cet événement est réservé aux personnes invitées.
            Si vous avez reçu une invitation, veuillez l'accepter pour y accéder.
          </Text>
          <View style={{ marginTop: 16, flexDirection: 'row', alignSelf: 'stretch' }}>
            <EditorialPillCTA
              eyebrow={t('eyebrow.back')}
              label="Revenir à l'accueil"
              icon="arrow-back"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  // Access code gate
  if (event?.requires_access_code) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>KEY</WatermarkNumeral>
        <View style={[visibilityStyles.gateContainer, { zIndex: 1 }]}>
          <TouchableOpacity style={visibilityStyles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray700} />
          </TouchableOpacity>

          {event.banner_image && (
            <View style={visibilityStyles.gateBanner}>
              {/* Workaround expo-image v3 : placeholder LQIP rendu comme
                  source de fond (contentFit="cover" garanti) sous l'image
                  réelle. placeholderContentFit n'est pas honoré pour les
                  data URIs petits sur natif. */}
              {(event.banner_placeholder || event.category?.default_event_image_placeholder) && (
                <Image
                  source={{ uri: event.banner_placeholder || event.category?.default_event_image_placeholder || DEFAULT_BLUR_DATA_URL }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Image
                source={getMediaUrl(event.banner_image)!}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
                cachePolicy="memory-disk"
                transition={300}
              />
            </View>
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
            <Text style={[visibilityStyles.codeTitle, { color: colors.gray900 }]}>{t('eventDetails.codeRequired')}</Text>
            <Text style={[visibilityStyles.codeDesc, { color: colors.gray500 }]}>
              Entrez le code pour voir les détails complets
            </Text>
            <TextInput
              style={[visibilityStyles.codeInput, { borderColor: colors.gray200, color: colors.gray900, backgroundColor: colors.gray50 }]}
              value={accessCodeInput}
              onChangeText={setAccessCodeInput}
              placeholder={t('eventDetails.accessCodePlaceholder')}
              placeholderTextColor={colors.gray400}
              autoFocus
            />
            <View style={{ marginTop: 8, flexDirection: 'row' }}>
              <EditorialPillCTA
                eyebrow={t('eyebrow.validate')}
                label="Acceder"
                icon="arrow-forward"
                onPress={handleVerifyAccessCode}
                loading={verifyingCode}
                disabled={!accessCodeInput.trim() || verifyingCode}
              />
            </View>
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  const dateInfo = event ? formatDateShort(event.start_date) : null;
  // null = pas encore de donnée fiable (chargement en cours ou ticket_types absents)
  // 0 = vraiment gratuit (event.is_free explicite)
  // > 0 = prix mini calculé depuis les ticket_types
  const minPrice = event?.ticket_types && event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map(t => t.price))
    : event?.is_free
    ? 0
    : null;

  const handleFollowChange = (following: boolean) => {
    setIsFollowing(following);
    setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1));
  };

  // Event details mini-tour. Skipped in preview mode (organizer previewing
  // their own event doesn't need the tour). Gated on loaded event so the
  // sticky CTA target exists.
  const tour = useTour();
  useFocusEffect(useCallback(() => {
    if (isPreview || loading || !event) return;
    const timer = setTimeout(() => {
      if (tour.isActive) return;
      tour.start(getEventDetailsTourSteps(t), { seenKey: EVENT_DETAILS_TOUR_STORAGE_KEY });
    }, EVENT_DETAILS_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, loading, !!event]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="arrow-back" size={22} color={colors.gray900} />
          </TouchableOpacity>
        }
        rightActions={
          <TouchableOpacity
            style={[styles.blurHeaderBtn, { backgroundColor: colors.gray100 }]}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={t('eventDetails.shareEventA11y')}
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
        {/* Banner Image with parallax — structure en couches :
            1. Image (fond, plein cadre 360px)
            2. Gradient (overlay visuel, ne capture pas les touches)
            3. Pressable absoluteFill (capture le tap → ouvre viewer)
            4. Hint visuel "1/N" ou "Agrandir" (pointerEvents none, laisse passer)
            5. Header overlay (boutons back/share/follow, box-none pour les zones vides) */}
        <View style={styles.bannerContainer}>
          {/* 1. Image OU video */}
          {(event?.cover_video || event?.cover_video_embed) ? (
            <Animated.View style={[styles.bannerImage, bannerAnimatedStyle]}>
              <EventCoverMedia
                event={event}
                mode="hero"
                shouldPlay
                style={{ width: '100%', height: '100%' }}
                fallbackImageUri={getMediaUrl(event?.banner_image || event?.category?.default_event_image || routeImageUrl)}
                fallbackPlaceholder={event?.banner_placeholder || event?.category?.default_event_image_placeholder || DEFAULT_BLUR_DATA_URL}
              />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.bannerImage, { backgroundColor: colors.gray200 }, bannerAnimatedStyle]}>
              {/* Workaround expo-image v3 : placeholder LQIP rendu comme
                  source de fond pour garantir le remplissage du conteneur
                  (placeholderContentFit ignoré sur petits data URIs en natif). */}
              {(event?.banner_placeholder || event?.category?.default_event_image_placeholder) && (
                <Image
                  source={{ uri: event?.banner_placeholder || event?.category?.default_event_image_placeholder || DEFAULT_BLUR_DATA_URL }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Image
                source={
                  getMediaUrl(event?.banner_image || event?.category?.default_event_image || routeImageUrl)
                    ? { uri: getMediaUrl(event?.banner_image || event?.category?.default_event_image || routeImageUrl)! }
                    : require('../../../assets/defaults/default-event.png')
                }
                contentFit="cover"
                transition={400}
                cachePolicy="memory-disk"
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          )}

          {/* 2. Triple gradient overlay (visuel uniquement) */}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* 3. Couche tap (absoluteFill) — ouvre le viewer au tap sur la banniere */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => openViewer(0)}
            accessibilityRole="button"
            accessibilityLabel={t('eventDetails.viewPhotosFullscreenA11y')}
          />

          {/* 4. Hint visuel "1/N" ou "Agrandir" — pointerEvents none pour laisser passer */}
          <View style={styles.imageZoomHint} pointerEvents="none">
            <Ionicons
              name={allImages.length > 1 ? 'images-outline' : 'expand-outline'}
              size={14}
              color={Colors.white}
            />
            <Text style={styles.imageZoomHintText}>
              {allImages.length > 1 ? t('eventDetails.imagesCount', { current: 1, total: allImages.length }) : t('eventDetails.imageEnlarge')}
            </Text>
          </View>

          {/* 5. Header overlay — fades out as BlurHeader fades in.
              box-none : laisse passer les touches des zones vides vers le Pressable en dessous.
              Les boutons (back/share/follow) restent interactifs. */}
          <Animated.View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, bannerOverlayOpacity]}
          >
            <SafeAreaView pointerEvents="box-none" style={styles.headerOverlay} edges={['top']}>
              <TouchableOpacity
                style={styles.floatingHeaderBtn}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
              >
                <Ionicons name="arrow-back" size={22} color="#0F172A" />
              </TouchableOpacity>
              <View pointerEvents="box-none" style={styles.headerActions}>
                <TourTarget id="event-details-follow">
                  <FollowEventButton
                    eventId={eventId}
                    variant="icon-only"
                    initialFollowing={isFollowing}
                    onFollowChange={handleFollowChange}
                  />
                </TourTarget>
                <TouchableOpacity
                  style={styles.floatingHeaderBtn}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel={t('eventDetails.shareEventA11y')}
                >
                  <Ionicons name="share-outline" size={20} color="#0F172A" />
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
                  <Text style={[styles.pendingPaymentTitle, { color: colors.warning }]}>{t('eventDetails.pendingPayment')}</Text>
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
                <Text style={styles.pendingPaymentButtonText}>{t('eventDetails.finalizePayment')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Eyebrow above title — soft editorial */}
          <Text style={[styles.titleEyebrow, { color: colors.primary }]}>
            {event.category?.name ? t('eventDetails.eyebrowWithCategory', { category: event.category.name.toUpperCase() }) : t('eventDetails.eyebrow')}
          </Text>

          {/* Date pill — soft editorial */}
          <View style={[styles.datePill, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.datePillText, { color: colors.primary }]}>
              {formatDate(event.start_date)} · {formatTime(event.start_date)}
            </Text>
          </View>

          {/* Title — display extra-bold, no italic */}
          <Text style={[styles.title, { color: colors.gray900 }]}>{event.title}</Text>

          {/* Organizer Card — toute la card tap → OrganizerProfile.
              Bouton Follow inline (compact) + bouton Message + chevron. */}
          <TouchableOpacity
            style={[styles.organizerCard, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}
            onPress={() => {
              if (event.organizer?.id) {
                navigation.navigate('OrganizerProfile', { organizerId: String(event.organizer.id) });
              }
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Voir le profil de ${event.organizer?.first_name || 'l\'organisateur'}`}
          >
            <View style={[styles.organizerAvatar, { backgroundColor: colors.primary }]}>
              {event.organizer?.profile_picture ? (
                <Image
                  source={event.organizer.profile_picture}
                  style={styles.organizerImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={300}
                />
              ) : (
                <Text style={styles.organizerInitial}>
                  {event.organizer?.first_name?.[0] || 'O'}
                </Text>
              )}
            </View>
            <View style={styles.organizerInfo}>
              <Text style={[styles.organizerLabel, { color: colors.gray500 }]}>{t('eventDetails.organizedBy')}</Text>
              <Text style={[styles.organizerName, { color: colors.gray900 }]} numberOfLines={1}>
                {event.organizer?.first_name} {event.organizer?.last_name}
              </Text>
            </View>
            {event.organizer?.id && (
              <View style={styles.organizerActions}>
                {/* Bouton Follow compact (intercepte le tap parent) */}
                <View onStartShouldSetResponder={() => true}>
                  <FollowUserButton
                    userId={Number(event.organizer.id)}
                    variant="compact"
                    initialFollowing={!!(event.organizer as any).is_following}
                  />
                </View>
                {/* Bouton Message — déclenche handleContactOrganizer du hook,
                    qui crée/ouvre la conversation DM. onStartShouldSetResponder
                    intercepte le tap pour qu'il ne remonte pas à la card parente. */}
                <View onStartShouldSetResponder={() => true}>
                  <TouchableOpacity
                    style={[styles.organizerContactBtn, { backgroundColor: colors.primary }]}
                    onPress={handleContactOrganizer}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('eventDetails.contactOrganizerA11y')}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.organizerContactText}>{t('eventDetails.contactOrganizer')}</Text>
                  </TouchableOpacity>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
              </View>
            )}
          </TouchableOpacity>

          {/* Share & Calendar Buttons */}
          <View style={styles.shareRow}>
            <Text style={[styles.shareLabel, { color: colors.gray500 }]}>{t('eventDetails.shareLabel')}</Text>
            <View style={styles.shareButtons}>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.gray100 }]}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel={t('eventDetails.shareEventA11y')}
              >
                <Ionicons name="share-social-outline" size={20} color={colors.gray600} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.successLight }]}
                onPress={handleShareToWhatsApp}
                accessibilityRole="button"
                accessibilityLabel={t('eventDetails.shareWhatsappA11y')}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </TouchableOpacity>
              <AddToCalendarButton event={event} size="sm" />
            </View>
          </View>

          {/* Location Card */}
          {event.location_type === 'online' ? (
            <View style={[styles.onlineEventCard, { backgroundColor: colors.card, borderColor: colors.infoLight }]}>
              <View style={styles.onlineEventHeader}>
                <View style={[styles.infoIconContainer, { backgroundColor: colors.infoLight }]}>
                  <Ionicons name="videocam" size={22} color={colors.info} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: colors.gray900 }]}>{t('eventDetails.onlineEvent')}</Text>
                  <Text style={[styles.infoSubtitle, { color: colors.gray500 }]}>
                    {event.online_platform || t('eventDetails.videoConference')}
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
                          <Text style={[styles.meetingInfoLabel, { color: colors.gray500 }]}>{t('eventDetails.meetingId')}</Text>
                          <Text style={[styles.meetingInfoValue, { color: colors.gray900 }]}>{event.online_meeting_id}</Text>
                        </View>
                      )}
                      {event.online_passcode && (
                        <View style={styles.meetingInfoRow}>
                          <Text style={[styles.meetingInfoLabel, { color: colors.gray500 }]}>{t('eventDetails.meetingPasscode')}</Text>
                          <Text style={[styles.meetingInfoValue, { color: colors.gray900 }]}>{event.online_passcode}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {event.online_url ? (
                    <TouchableOpacity
                      style={styles.joinOnlineButton}
                      onPress={() => {
                        navigation.navigate('Browser', { url: event.online_url!, title: event.title });
                      }}
                    >
                      <Ionicons name="videocam" size={18} color={colors.white} />
                      <Text style={styles.joinOnlineButtonText}>{t('eventDetails.joinEvent')}</Text>
                    </TouchableOpacity>
                  ) : event.online_platform?.toLowerCase().includes('eventez') ? (
                    <View style={[styles.eventezVisioNotice, { backgroundColor: colors.infoBg }]}>
                      <Ionicons name="information-circle" size={18} color={colors.info} />
                      <Text style={[styles.eventezVisioNoticeText, { color: colors.gray600 }]}>
                        La visioconference EventEz sera disponible le jour de l'evenement
                      </Text>
                    </View>
                  ) : !event.online_meeting_id && !event.online_passcode ? (
                    <View style={[styles.eventezVisioNotice, { backgroundColor: colors.infoBg }]}>
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
                  <Text style={[styles.infoTitle, { color: colors.gray900 }]}>{event.location_name || t('eventDetails.venueTBA')}</Text>
                  <Text style={[styles.infoSubtitle, { color: colors.gray500 }]}>
                    {event.location_address || `${event.location_city}, ${event.location_country}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
              </TouchableOpacity>
              {/* Online option */}
              <View style={[styles.hybridOnlineOption, { backgroundColor: colors.infoBg }]}>
                <Ionicons name="videocam" size={18} color={colors.info} />
                <Text style={[styles.hybridOnlineText, { color: colors.infoDark }]}>
                  Egalement disponible en ligne via {event.online_platform || 'visioconference'}
                </Text>
              </View>
              {/* Show meeting info if registered */}
              {userRegistration && event.online_url && (
                <TouchableOpacity
                  style={[styles.joinOnlineButton, { marginTop: Spacing.sm }]}
                  onPress={() => {
                    Linking.openURL(event.online_url!).catch(() => {
                      showError(t('common.error'), t('eventDetails.openLinkError'));
                    });
                  }}
                >
                  <Ionicons name="videocam" size={18} color={colors.white} />
                  <Text style={styles.joinOnlineButtonText}>{t('eventDetails.joinOnline')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={[styles.infoCard, { backgroundColor: colors.gray50 }]} activeOpacity={0.7}>
              <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="location" size={22} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoTitle, { color: colors.gray900 }]}>{event.location_name || t('eventDetails.venueTBA')}</Text>
                <Text style={[styles.infoSubtitle, { color: colors.gray500 }]}>
                  {event.location_address || `${event.location_city}, ${event.location_country}`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}

          {/* Stats Row — vues masquées tant que < 50 (évite l'effet "événement peu populaire").
              Compteurs formatés en notation compacte (ex: "1,2 k", "1,5 M") pour ne pas
              casser le layout sur les events viraux (1 milliard de vues → "1 Md"). */}
          <View style={[styles.statsRow, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gray900 }]} numberOfLines={1}>
                {formatCompactNumber(event.registration_count, { fallbackZero: true })}
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('eventDetails.registered')}</Text>
            </View>
            {(event.view_count || 0) >= 50 && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.gray900 }]} numberOfLines={1}>
                    {formatCompactNumber(event.view_count, { fallbackZero: true })}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('eventDetails.views')}</Text>
                </View>
              </>
            )}
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gray900 }]}>{followersCount}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('eventDetails.favorites')}</Text>
            </View>
          </View>

          {/* ===== ALL SECTIONS (scrollable, no tabs) ===== */}

          {/* Section: About */}
          <AboutTab
            event={event}
            eventId={eventId}
            isFollowing={isFollowing}
            onFollowChange={handleFollowChange}
            onNavigateVolunteers={() => navigation.navigate('Volunteers', { eventId: event.slug || event.id })}
          />

          {/* Section: Good to Know — 2-col icon grid (soft editorial) */}
          <View style={[styles.goodToKnowSection, { borderTopColor: colors.gray100 }]}>
            <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t('eventDetails.infoEyebrow')}</Text>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('eventDetails.infoTitle')}</Text>
            <View style={styles.goodToKnowGrid}>
              {event.start_date && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.checkinFrom', { time: formatTime(event.start_date) })}</Text>
                </View>
              )}
              {event.location_type === 'in_person' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.secondary}18` }]}>
                    <Ionicons name="navigate-outline" size={18} color={colors.secondary} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.inPerson')}</Text>
                </View>
              )}
              {event.location_type === 'online' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.info}18` }]}>
                    <Ionicons name="videocam-outline" size={18} color={colors.info} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.online')}</Text>
                </View>
              )}
              {event.location_type === 'hybrid' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.info}18` }]}>
                    <Ionicons name="globe-outline" size={18} color={colors.info} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.hybrid')}</Text>
                </View>
              )}
              {(event as any).max_attendees && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.accent}18` }]}>
                    <Ionicons name="people-outline" size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{(event as any).max_attendees} places</Text>
                </View>
              )}
              {event.is_free && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.success}18` }]}>
                    <Ionicons name="pricetag-outline" size={18} color={colors.success} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.free')}</Text>
                </View>
              )}
              {event.visibility === 'unlisted' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.warning}18` }]}>
                    <Ionicons name="link-outline" size={18} color={colors.warning} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.linkAccessible')}</Text>
                </View>
              )}
              {event.visibility === 'invite_only' && (
                <View style={[styles.goodToKnowItem, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                  <View style={[styles.goodToKnowIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.goodToKnowText, { color: colors.gray700 }]}>{t('eventDetails.byInvitation')}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Section: Who's Going — real avatars from opt-in registrants, count fallback otherwise */}
          {(event.registration_count || 0) > 0 && (
            <View style={[styles.whoIsGoingSection, { borderTopColor: colors.gray100 }]}>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t('eventDetails.communityEyebrow')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('eventDetails.communityTitle')}</Text>
              <View style={styles.whoIsGoingRow}>
                {event.recent_registrants && event.recent_registrants.length > 0 ? (
                  <>
                    <View style={styles.avatarStack}>
                      {event.recent_registrants.slice(0, 4).map((reg, i) => (
                        <View
                          key={String(reg.id)}
                          style={[
                            styles.avatarCircle,
                            {
                              marginLeft: i > 0 ? -10 : 0,
                              zIndex: 4 - i,
                              backgroundColor: colors.primaryBg,
                              borderColor: colors.surface,
                            },
                          ]}
                        >
                          {reg.profile_picture ? (
                            <Image
                              source={{ uri: reg.profile_picture }}
                              style={{ width: '100%', height: '100%', borderRadius: 999 }}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                              transition={200}
                            />
                          ) : (
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 12,
                                color: colors.primary,
                              }}
                            >
                              {(reg.first_name || '?').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.whoIsGoingText, { color: colors.gray700 }]} numberOfLines={2}>
                      {event.recent_registrants[0].first_name || 'Quelqu\'un'}
                      {event.recent_registrants.length > 1
                        ? `, ${event.recent_registrants[1].first_name || ''}`
                        : ''}
                      {(event.visible_attendees_count || event.registration_count || 0) > event.recent_registrants.length
                        ? ` et ${formatCompactNumber(
                            (event.visible_attendees_count || event.registration_count || 0) - event.recent_registrants.length,
                            { fallbackZero: true },
                          )} autre${
                            (event.visible_attendees_count || event.registration_count || 0) - event.recent_registrants.length > 1 ? 's' : ''
                          }`
                        : ''}
                      {' '}y vont
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}15`, borderColor: colors.surface }]}>
                      <Ionicons name="people" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.whoIsGoingText, { color: colors.gray700 }]}>
                      {formatCompactNumber(event.registration_count, { fallbackZero: true })} personne{(event.registration_count || 0) > 1 ? 's' : ''} inscrite{(event.registration_count || 0) > 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Section: Gallery */}
          {allImages.length > 1 && (
            <View style={[styles.gallerySection, { borderTopColor: colors.gray100 }]}>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>{t('eventDetails.galleryEyebrow')}</Text>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('eventDetails.galleryTitle')}</Text>
              <FlatList
                horizontal
                data={allImages}
                keyExtractor={(_, i) => i.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryList}
                renderItem={({ item, index }) => (
                  <TouchableOpacity onPress={() => openViewer(index)} activeOpacity={0.8}>
                    <Image
                      source={item.uri}
                      placeholder={item.placeholder}
                      placeholderContentFit="cover"
                      contentFit="cover"
                      style={[styles.galleryThumb, { backgroundColor: colors.gray200 }]}
                      cachePolicy="memory-disk"
                      transition={300}
                    />
                    {item.caption ? (
                      <Text style={[styles.galleryCaption, { color: colors.gray500 }]} numberOfLines={1}>
                        {item.caption}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
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

          {/* === Heavy sections — mounted only after the user scrolls past
              HEAVY_REVEAL_THRESHOLD. Lazy-loaded via React.Suspense pour ne pas
              charger leur code dans le bundle initial. Le fallback Suspense est
              le même placeholder que celui pre-reveal. === */}
          {heavyRevealed ? (
            <React.Suspense fallback={
              <View style={{ height: 320, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.gray300} />
              </View>
            }>
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
                eventId={event?.id}
                eventTitle={event?.title}
              />

              {/* Section: Sponsors */}
              <SponsorsTab eventId={eventId} />
            </React.Suspense>
          ) : (
            <View style={{ height: 320, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.gray300} />
              <Text
                style={{
                  fontFamily: FontFamily.medium,
                  fontSize: 11,
                  color: colors.gray400,
                  marginTop: Spacing.sm,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Agenda · Lieu · Avis · Sponsors
              </Text>
            </View>
          )}

          {/* Recommandations : events similaires (silencieux si vide). Affiché
              en bas, après tous les onglets et avant le spacer du bottom bar. */}
          {!loading && event ? <SimilarEventsSection eventId={String(event.id)} /> : null}

          {/* Spacer for bottom bar */}
          <View style={{ height: 120 }} />
        </View>
        </Animated.View>
        ) : null}
      </Animated.ScrollView>

      {/* Bottom CTA — remplacé par un message "Aperçu" en mode preview */}
      {!loading && event && isPreview ? (
        <View style={[styles.previewBottomBar, { backgroundColor: colors.text, paddingBottom: insets.bottom + Spacing.md }]}>
          <Ionicons name="eye-outline" size={18} color={colors.background} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.previewBottomEyebrow, { color: colors.background, opacity: 0.6 }]}>{t('eventDetails.previewEyebrow')}</Text>
            <Text style={[styles.previewBottomText, { color: colors.background }]}>{t('eventDetails.previewBottom')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.previewCloseBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('eventDetails.closePreviewA11y')}
          >
            <Text style={[styles.previewCloseText, { color: colors.background }]}>{t('eventDetails.previewClose')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && event && !isPreview ? <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 0}
        tint={isDark ? 'dark' : 'light'}
        style={styles.bottomBar}
      >
        {Platform.OS === 'android' && (
          <View style={[styles.bottomBarAndroidBg, { backgroundColor: `${colors.card}F2` }]} />
        )}
      <TourTarget id="event-details-cta" style={{ flex: 1 }}>
      <View style={[styles.bottomBarContent, { borderTopColor: colors.gray100, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.priceContainer}>
          {userRegistration ? (
            <>
              <Text style={[styles.priceLabel, { color: colors.gray500 }]}>{t('eventDetails.statusLabel')}</Text>
              <Badge
                label={userRegistration.status === 'confirmed' ? t('eventDetails.registeredStatus') : userRegistration.status === 'pending' ? t('eventDetails.pendingStatus') : t('eventDetails.registeredStatus')}
                variant={userRegistration.status === 'confirmed' ? 'success' : userRegistration.status === 'pending' ? 'warning' : 'success'}
              />
            </>
          ) : (
            <>
              <Text style={[styles.priceLabel, { color: colors.gray500 }]}>
                {minPrice === null ? t('eventDetails.priceLabel') : minPrice > 0 ? t('eventDetails.fromLabel') : t('eventDetails.priceLabel')}
              </Text>
              <Text style={[styles.priceValue, { color: colors.gray900 }]}>
                {minPrice === null
                  ? '—'
                  : minPrice > 0
                  ? `${minPrice.toLocaleString()} ${displayCurrency(event?.currency)}`
                  : t('eventDetails.free')}
              </Text>
              {minPrice !== null && minPrice > 0 && (
                <ConvertedPrice
                  amount={minPrice}
                  eventCurrency={event?.currency || 'XAF'}
                />
              )}
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
                <Text style={styles.ctaButtonText}>{t('eventDetails.ctaPay')}</Text>
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
                  <Text style={styles.ctaButtonText}>{t('eventDetails.ctaMyTicket')}</Text>
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
                <Text style={styles.ctaButtonText}>{t('eventDetails.ctaMyRegistration')}</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.success }]}
              onPress={() => navigation.navigate('RegistrationDetails', { registrationId: userRegistration.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>{t('eventDetails.ctaViewRegistration')}</Text>
              <Ionicons name="ticket-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          )
        ) : event.status === 'cancelled' ? (
          <View style={[styles.ctaButton, { backgroundColor: colors.error || '#EF4444', opacity: 0.85 }]}>
            <Ionicons name="close-circle-outline" size={18} color={colors.white} />
            <Text style={styles.ctaButtonText}>{t('eventDetails.ctaCancelled')}</Text>
          </View>
        ) : event.status === 'completed' ? (
          <View style={[styles.ctaButton, { backgroundColor: colors.gray400 || '#9CA3AF' }]}>
            <Ionicons name="checkmark-done-outline" size={18} color={colors.white} />
            <Text style={styles.ctaButtonText}>{t('eventDetails.ctaEnded')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={requireAuth(
              () => navigation.navigate('TicketPurchase', { eventId }),
              {
                eventTitle: event.title,
                returnScreen: 'TicketPurchase',
                returnParams: { eventId },
                eventIsFree: !!event.is_free,
              },
            )}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={event.event_type === 'billetterie' ? t('eventDetails.ctaBuyTickets') : t('eventDetails.ctaRegister')}
            style={styles.ctaGradientWrap}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="lock-closed" size={14} color={colors.white} />
              <Text style={styles.ctaButtonText}>
                {event.event_type === 'billetterie' ? t('eventDetails.ctaBuyTickets') : t('eventDetails.ctaRegister')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
      </TourTarget>
      </BlurView> : null}

      {/* Image Viewer — pinch-to-zoom + swipe-to-close natifs via react-native-image-viewing */}
      <ImageView
        images={allImages.length > 0
          ? allImages.map(img => ({ uri: img.uri }))
          : [{ uri: '' }]}
        imageIndex={Math.min(Math.max(viewerImageIndex, 0), Math.max(0, allImages.length - 1))}
        visible={showImageViewer && allImages.length > 0}
        onRequestClose={() => setShowImageViewer(false)}
        onImageIndexChange={setViewerImageIndex}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        backgroundColor="rgba(0, 0, 0, 0.95)"
        HeaderComponent={({ imageIndex }) => (
          <SafeAreaView edges={['top']} style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setShowImageViewer(false)}
              accessibilityRole="button"
              accessibilityLabel={t('eventDetails.imageViewerClose')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
            {allImages.length > 1 && (
              <View style={styles.imageViewerCounterPill}>
                <Text style={styles.imageViewerCounterText}>
                  {imageIndex + 1} / {allImages.length}
                </Text>
              </View>
            )}
            <View style={{ width: 40 }} />
          </SafeAreaView>
        )}
        FooterComponent={({ imageIndex }) => {
          const caption = allImages[imageIndex]?.caption;
          return (
            <SafeAreaView edges={['bottom']} style={styles.imageViewerFooter}>
              {event?.title && (
                <Text style={styles.imageViewerTitle} numberOfLines={1}>
                  {event.title}
                </Text>
              )}
              {caption ? (
                <Text style={styles.imageViewerCaption} numberOfLines={2}>
                  {caption}
                </Text>
              ) : null}
            </SafeAreaView>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    overflow: 'hidden',
    backgroundColor: Colors.black,
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
  // Floating white header button — editorial look on hero
  floatingHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    padding: Spacing.lg,
    marginTop: -Spacing['2xl'],
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['4xl'],
    borderTopRightRadius: BorderRadius['4xl'],
  },
  titleEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 6,
  },
  // Date pill — soft editorial
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  datePillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.2,
    marginBottom: Spacing.md,
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
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 6,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  organizerFollowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: BorderRadius.full,
  },
  // Cluster d'actions à droite : Follow + Contact + chevron affordance
  organizerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  organizerContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  organizerContactText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  organizerFollowText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 36,
    alignSelf: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.9,
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
  // ===== PREVIEW BOTTOM BAR =====
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  previewBottomEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  previewBottomText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  previewCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  previewCloseText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.3,
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
    paddingBottom: Spacing.md, // overridden inline with insets.bottom
    borderTopWidth: 1,
  },
  priceContainer: {},
  priceLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  priceValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.6,
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
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  // Primary CTA pill (soft editorial)
  ctaGradientWrap: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  ctaButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: Colors.white,
  },
  ctaArrowDisc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  ctaButtonCompact: {
    paddingHorizontal: Spacing.lg,
  },
  ctaButtonIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  ctaButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  ctaButtonSecondaryText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.1,
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
    borderColor: Colors.infoBg,
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
    backgroundColor: Colors.info,
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
  // Image Zoom Hint — pastille en bas a droite de la banniere
  imageZoomHint: {
    position: 'absolute',
    // Spacing['2xl'] correspond au chevauchement du bloc de contenu (marginTop negatif).
    // On ajoute 12px pour conserver l'espacement visuel d'origine au-dessus de la courbe.
    bottom: Spacing['2xl'] + 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  imageZoomHintText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  // Gallery section
  gallerySection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  galleryList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  galleryThumb: {
    width: 120,
    height: 90,
    borderRadius: BorderRadius.lg,
  },
  galleryCaption: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.1,
    width: 120,
    textAlign: 'center',
  },

  // Image Viewer (react-native-image-viewing) — overlays custom header/footer
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  imageViewerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerCounterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageViewerCounterText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  imageViewerFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  imageViewerTitle: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    textAlign: 'center',
  },
  imageViewerCaption: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
  },
  // ===== BON À SAVOIR (editorial — squircle icons + softer hierarchy) =====
  goodToKnowSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  goodToKnowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm + 2,
    marginTop: Spacing.sm,
  },
  goodToKnowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg + 4,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: '47%',
  },
  goodToKnowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12, // squircle (not full circle) — softer editorial feel
    alignItems: 'center',
    justifyContent: 'center',
  },
  goodToKnowText: {
    fontFamily: FontFamily.semiBold,
    flex: 1,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  // ===== QUI Y VA =====
  whoIsGoingSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  whoIsGoingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.1,
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
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
    fontFamily: FontFamily.displaySemiBold,
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

const editorialStyles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 30,
    fontFamily: FontFamily.displayExtraBold,
    letterSpacing: -0.9,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 12,
  },
});
