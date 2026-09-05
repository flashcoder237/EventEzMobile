import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import {
  EditorialCanvas,
  WatermarkNumeral,
  EditorialHeader,
  editorial,
} from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI, eventsAPI, messagesAPI, connectionsAPI, getMediaUrl } from '../../api';
import { useFeedback } from '../../contexts/FeedbackContext';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { ProfileSkeleton } from '../../components/ui/Skeleton';
import FollowUserButton from '../../components/common/FollowUserButton';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserBadges from '../../components/common/UserBadges';
import { findExistingDirectConversation } from '../../lib/utils/messagingHelpers';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, User, Event } from '../../types';
import { formatCompactNumber } from '../../lib/utils/numberFormatters';
import { displayCurrency } from '../../lib/utils/priceFormatters';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
  AvatarSizes,
} from '../../constants/theme';
import { centeredContent, WIDE_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrganizerProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'OrganizerProfile'>;

// Hauteur estimée d'une eventRow (tile 72 + padding sm*2 + margin sm + border 2)
const ORGANIZER_EVENT_ROW_HEIGHT = 98;

export default function OrganizerProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { organizerId } = route.params;

  const [organizer, setOrganizer] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isFollowingAction, setIsFollowingAction] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { toastSuccess, toastError } = useFeedback();

  useEffect(() => {
    fetchOrganizerData();
  }, [organizerId]);

  const fetchOrganizerData = async () => {
    setIsLoading(true);
    try {
      const response = await usersAPI.getUser(organizerId);
      setOrganizer(response.data);

      // Fetch organizer's events
      setIsLoadingEvents(true);
      try {
        const eventsResponse = await eventsAPI.getEvents({
          organizer: organizerId,
          status: 'validated',
          ordering: '-start_date',
          page_size: 10, // « événements récents » : on borne, pas toute la liste
        });
        setEvents(eventsResponse.data?.results || eventsResponse.data || []);
      } catch {
        if (__DEV__) console.warn('[OrganizerProfile] Could not fetch organizer events');
      } finally {
        setIsLoadingEvents(false);
      }
    } catch (err: any) {
      if (__DEV__) console.error('[OrganizerProfile] Error fetching organizer:', err);
      // Pas de modale : l'ecran rend deja son propre etat « introuvable »
      // (en-tete + retour). La modale n'ajoutait qu'une interruption a
      // acquitter par-dessus un ecran qui disait deja la meme chose.
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = useCallback(async () => {
    if (!organizer) return;
    // 1) Cherche une conversation directe existante avec cet organisateur.
    //    Si oui → on l'ouvre (préserve l'historique, évite duplication).
    // 2) Sinon → mode "new conversation" : la conv ne sera créée côté
    //    backend que lorsque l'utilisateur enverra son premier message.
    const existingConv = await findExistingDirectConversation(
      messagesAPI,
      user?.id,
      organizer.id,
    );
    if (existingConv) {
      navigation.navigate('Conversation', { conversationId: String(existingConv.id) });
      return;
    }
    navigation.navigate('Conversation', {
      userId: String(organizer.id),
      userName: getDisplayName(organizer),
    });
  }, [organizer, navigation, user?.id]);

  // Détecte si on est déjà connecté à ce profil (pour l'état du bouton).
  useEffect(() => {
    let cancelled = false;
    if (!organizer || !user || String(organizer.id) === String(user.id)) return;
    connectionsAPI.list()
      .then((res) => {
        if (cancelled) return;
        const ids = (res.data?.results || []).map((c: any) => String(c.user?.id));
        setIsConnected(ids.includes(String(organizer.id)));
      })
      .catch(() => { /* non bloquant */ });
    return () => { cancelled = true; };
  }, [organizer?.id, user?.id]);

  const handleConnect = useCallback(async () => {
    if (!organizer || connecting || isConnected) return;
    setConnecting(true);
    try {
      await connectionsAPI.connect(organizer.id);
      setIsConnected(true);
      toastSuccess(t('organizerProfile.connectSuccess', { name: getDisplayName(organizer) }));
    } catch (error: any) {
      toastError(getApiErrorMessage(error, t, { fallbackKey: 'organizerProfile.connectError' }).message);
    } finally {
      setConnecting(false);
    }
  }, [organizer, connecting, isConnected, t, toastSuccess, toastError]);

  const handleOpenLink = useCallback((url: string | undefined, title?: string) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    navigation.navigate('Browser', { url: fullUrl, title });
  }, [navigation]);

  const navigateToEvent = useCallback((eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  }, [navigation]);

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>ORG</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <EditorialHeader
            eyebrow={t('organizerProfile.eyebrow')}
            title={t('organizerProfile.title')}
            back
            onBack={() => navigation.goBack()}
          />
          <ProfileSkeleton />
        </View>
      </EditorialCanvas>
    );
  }

  if (!organizer) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>NO</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <EditorialHeader
            eyebrow={t('organizerProfile.eyebrow')}
            title={t('organizerProfile.title')}
            back
            onBack={() => navigation.goBack()}
          />
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
            <Text style={[styles.errorText, { color: colors.gray500 }]}>{t('organizerProfile.notFound')}</Text>
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  const displayName = getDisplayName(organizer);
  const profile = organizer.organizer_profile;
  // DEUX images distinctes : le LOGO de l'organisation (organizer_profile.logo)
  // et la PHOTO du gérant (profile_picture). Avant, seule la photo était
  // affichée → un logo téléversé n'apparaissait jamais. On montre les deux :
  // logo = avatar principal (c'est un profil d'organisation), photo = médaillon.
  const orgLogo = (profile as any)?.logo || null;
  const managerPhoto = organizer.profile_picture || organizer.image || organizer.logo_url || null;
  // Avatar principal = logo si présent, sinon la photo (fallback historique).
  const primaryImage = orgLogo || managerPhoto;
  // Médaillon = la photo du gérant, affichée seulement si DISTINCTE de l'avatar
  // principal (inutile de la répéter quand il n'y a pas de logo).
  const showManagerMedallion = !!orgLogo && !!managerPhoto;
  const description = profile?.description || profile?.company_description || organizer.bio;
  const isVerified = profile?.verified_status || profile?.verified || organizer.is_verified;
  // DRF sérialise les DecimalField en string par défaut → coerce en Number
  // sinon `rating.toFixed()` crash. NaN si parsing échoue → traité comme 0.
  const ratingRaw = profile?.rating;
  const rating = ratingRaw != null ? Number(ratingRaw) : null;
  const eventCount = profile?.event_count ?? events.length;
  const socialLinks = profile?.social_links;
  // Site web : trim + exige un contenu réel (une chaîne d'espaces ou « http:// »
  // seul ne doit pas afficher la chip). Avant, `profile?.website` truthy suffisait.
  const websiteRaw = (profile?.website || '').trim();
  const website = /\.\w{2,}/.test(websiteRaw) ? websiteRaw : '';

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>ORG</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

        {/* Header éditorial : eyebrow + titre + back */}
        <EditorialHeader
          eyebrow={isVerified ? t('organizerProfile.eyebrowVerified') : t('organizerProfile.eyebrow')}
          title={t('organizerProfile.title')}
          back
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          {/* Hero card éditoriale : avatar + nom display + badge vérifié */}
          <View
            style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.gray200, shadowColor: colors.primary }]}
          >
            {/* Type pill : ORGANISATEUR */}
            <View style={styles.typePillRow}>
              <View style={[styles.typePill, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="business" size={10} color={colors.primary} />
                <Text style={[styles.typePillText, { color: colors.primary }]}>
                  {organizer.organizer_type === 'organization' ? t('organizerProfile.typeOrganization') : t('organizerProfile.typeOrganizer')}
                </Text>
              </View>
              {(organizer.city || organizer.country) && (
                <Text style={[styles.categoryEyebrow, { color: colors.gray500 }]} numberOfLines={1}>
                  · {[organizer.city, organizer.country].filter(Boolean).join(', ').toUpperCase()}
                </Text>
              )}
            </View>

            {/* Hero row : avatar à gauche + nom display à droite */}
            <View style={styles.heroRow}>
              {/* Avatar principal (logo de l'organisation, sinon photo/initiale)
                  + médaillon photo du gérant en bas-droite quand les deux existent. */}
              <View style={styles.heroAvatarWrap}>
                {primaryImage ? (
                  <Image source={primaryImage} style={styles.heroAvatar} cachePolicy="memory-disk" transition={200} />
                ) : (
                  <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.heroAvatarInitial}>
                      {displayName[0]?.toUpperCase() || 'O'}
                    </Text>
                  </View>
                )}
                {showManagerMedallion && (
                  <Image
                    source={managerPhoto}
                    style={[styles.heroManagerMedallion, { borderColor: colors.card }]}
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                )}
              </View>
              <View style={{ flex: 1, paddingLeft: Spacing.md }}>
                <View style={styles.nameRowInline}>
                  <Text style={[styles.heroName, { color: colors.gray900 }]} numberOfLines={2}>
                    {displayName}
                  </Text>
                </View>
                {/* Badges : « Vérifié » (KYC) et « Pionnier » sont deux signaux
                    DIFFÉRENTS — l'un atteste de l'identité, l'autre de
                    l'ancienneté. Une simple coche sans libellé ne disait ni
                    lequel, ni pourquoi. */}
                <UserBadges user={organizer} size="md" style={{ marginTop: 4 }} />
                {organizer.company_name && organizer.company_name !== displayName && (
                  <Text style={[styles.heroSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
                    {organizer.company_name}
                  </Text>
                )}
              </View>
            </View>

            {/* Stats : 3 blocks éditoriaux (eyebrow + display number) */}
            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizerProfile.statsEvents')}</Text>
                <Text style={[editorial.statNumberSm, { color: colors.gray900 }]}>{eventCount}</Text>
              </View>
              {rating != null && Number.isFinite(rating) && rating > 0 && (
                <View style={styles.statCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizerProfile.statsRating')}</Text>
                  <View style={styles.ratingRow}>
                    <Text style={[editorial.statNumberSm, { color: colors.gray900 }]}>{rating.toFixed(1)}</Text>
                    <Ionicons name="star" size={14} color={colors.warning} />
                  </View>
                </View>
              )}
              {organizer.created_at && (
                <View style={styles.statCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizerProfile.statsSince')}</Text>
                  <Text style={[editorial.statNumberSm, { color: colors.gray900 }]}>
                    {new Date(organizer.created_at).getFullYear()}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons : Follow plein largeur + Contacter en icône */}
            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <FollowUserButton
                  userId={Number(organizerId)}
                  variant="default"
                  showFollowerCount
                  initialFollowing={!!(organizer as any)?.is_following}
                />
              </View>
              {/* Se connecter (source='manual') — masqué sur son propre profil.
                  Une connexion débloque le DM direct. */}
              {!!user && String(user.id) !== String(organizerId) && (
                <TouchableOpacity
                  style={[
                    styles.contactIconButton,
                    { backgroundColor: isConnected ? `${colors.primary}18` : colors.gray100 },
                  ]}
                  onPress={handleConnect}
                  disabled={connecting || isConnected}
                  activeOpacity={TOUCH_OPACITY}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isConnected ? t('organizerProfile.connectedA11y') : t('organizerProfile.connectA11y')
                  }
                >
                  <Ionicons
                    name={isConnected ? 'people' : 'person-add-outline'}
                    size={20}
                    color={isConnected ? colors.primary : colors.gray700}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.contactIconButton, { backgroundColor: colors.gray100 }]}
                onPress={handleContact}
                activeOpacity={TOUCH_OPACITY}
                accessibilityRole="button"
                accessibilityLabel={t('organizerProfile.contactA11y')}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.gray700} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description — pattern éditorial : eyebrow + texte */}
          {description && (
            <View style={styles.editorialSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizerProfile.bioEyebrow')}</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>{t('organizerProfile.bioTitle')}</Text>
              </View>
              <Text style={[styles.descriptionText, { color: colors.gray700 }]}>{description}</Text>
            </View>
          )}

          {/* Réseaux sociaux + site web — chips horizontales unifiées */}
          {(socialLinks?.facebook || socialLinks?.twitter || socialLinks?.instagram || socialLinks?.linkedin || website) && (
            <View style={styles.editorialSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('organizerProfile.linksEyebrow')}</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>{t('organizerProfile.linksTitle')}</Text>
              </View>
              <View style={styles.socialChipsRow}>
                {!!website && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(website)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="globe-outline" size={14} color={colors.primary} />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>{t('organizerProfile.website')}</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.facebook && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.facebook)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-facebook" size={14} color="#1877F2" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>{t('organizerProfile.facebook')}</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.instagram && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.instagram)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-instagram" size={14} color="#E4405F" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>{t('organizerProfile.instagram')}</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.twitter && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.twitter)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-twitter" size={14} color="#1DA1F2" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>{t('organizerProfile.twitter')}</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.linkedin && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.linkedin)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-linkedin" size={14} color="#0A66C2" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>{t('organizerProfile.linkedin')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Events — date tile orange + titre display, style cohérent MyTickets */}
          <View style={styles.editorialSection}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>
                {t('organizerProfile.agendaEyebrow', { count: events.length })}
              </Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                {t('organizerProfile.agendaTitle')}
              </Text>
            </View>
            {isLoadingEvents ? (
              <View style={styles.eventsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.eventsLoadingText, { color: colors.gray500 }]}>{t('organizerProfile.loadingEvents')}</Text>
              </View>
            ) : events.length > 0 ? (
              <FlatList
                data={events}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews
                getItemLayout={(_, i) => ({ length: ORGANIZER_EVENT_ROW_HEIGHT, offset: ORGANIZER_EVENT_ROW_HEIGHT * i, index: i })}
                renderItem={({ item: event }) => {
                  const startDate = event.start_date ? new Date(event.start_date) : null;
                  return (
                    <TouchableOpacity
                      style={[styles.eventRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => navigateToEvent(event.id)}
                      activeOpacity={TOUCH_OPACITY}
                    >
                      {/* Date tile orange à gauche */}
                      {startDate ? (
                        <View style={[styles.eventDateTile, { backgroundColor: `${colors.accent}1A` }]}>
                          <Text style={[styles.eventDateDay, { color: colors.accent }]}>
                            {startDate.getDate().toString().padStart(2, '0')}
                          </Text>
                          <Text style={[styles.eventDateMonth, { color: colors.accent }]}>
                            {startDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '')}
                          </Text>
                        </View>
                      ) : event.banner_image ? (
                        <Image
                          source={getMediaUrl(event.banner_image)!}
                          style={styles.eventDateTile}
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      ) : (
                        <View style={[styles.eventDateTile, { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="image-outline" size={20} color={colors.gray400} />
                        </View>
                      )}

                      {/* Corps : titre + meta + price */}
                      <View style={styles.eventBody}>
                        <Text style={[styles.eventTitle, { color: colors.gray900 }]} numberOfLines={2}>
                          {event.title}
                        </Text>
                        {event.location_name && (
                          <View style={styles.eventMetaItem}>
                            <Ionicons name="location-outline" size={11} color={colors.gray500} />
                            <Text style={[styles.eventMetaText, { color: colors.gray500 }]} numberOfLines={1}>
                              {event.location_name}
                            </Text>
                          </View>
                        )}
                        <View style={styles.eventBottomRow}>
                          {event.is_free ? (
                            <View style={[styles.freeBadge, { backgroundColor: colors.successLight }]}>
                              <Text style={[styles.freeBadgeText, { color: colors.successDark }]}>{t('organizerProfile.freeBadge')}</Text>
                            </View>
                          ) : event.base_price != null ? (
                            <Text style={[styles.eventPrice, { color: colors.gray900 }]}>
                              {Number(event.base_price).toLocaleString()} {displayCurrency(event.currency)}
                            </Text>
                          ) : null}
                          <View style={styles.eventStatRow}>
                            <Ionicons name="people-outline" size={11} color={colors.gray400} />
                            <Text style={[styles.eventStat, { color: colors.gray500 }]} numberOfLines={1}>
                              {formatCompactNumber(event.registration_count, { fallbackZero: true })}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View style={[styles.emptyEventsContainer, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={32} color={colors.gray400} />
                <Text style={[styles.emptyEventsText, { color: colors.gray500 }]}>{t('organizerProfile.noEvents')}</Text>
              </View>
            )}
          </View>

          <View style={{ height: Spacing.xl * 2 }} />
        </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

function getDisplayName(user: User): string {
  if (user.company_name) return user.company_name;
  if (user.organizer_name) return user.organizer_name;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return fullName || user.username || user.email;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
    ...centeredContent(WIDE_MAX),
  },

  // ─── Hero card éditoriale ───────────────────────────────────────────
  heroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  typePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  typePillText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  categoryEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroAvatarWrap: {
    width: 72,
    height: 72,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  heroAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Photo du gérant en médaillon, bas-droite, quand un logo occupe l'avatar.
  heroManagerMedallion: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  heroAvatarInitial: {
    color: '#FFFFFF',
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  nameRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  heroName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 4,
  },

  // Stats grid (3 colonnes éditoriales)
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  statCell: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },

  // Section éditoriale (description, social, events)
  editorialSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  editorialSectionHead: {
    gap: 4,
    marginBottom: Spacing.md,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FontFamily.regular,
  },

  // Social chips horizontales unifiées
  socialChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  socialChipText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.1,
  },

  // Event row éditorial : date tile orange + titre display
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  eventDateTile: {
    width: 64,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  eventDateDay: {
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
    letterSpacing: -1,
    lineHeight: 26,
  },
  eventDateMonth: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  eventBody: {
    flex: 1,
    gap: 4,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    flexShrink: 1,
  },
  eventBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  errorText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: AvatarSizes['2xl'],
    height: AvatarSizes['2xl'],
    borderRadius: AvatarSizes['2xl'] / 2,
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: AvatarSizes['2xl'],
    height: AvatarSizes['2xl'],
    borderRadius: AvatarSizes['2xl'] / 2,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    textAlign: 'center',
  },
  verifiedBadge: {
    marginTop: 2,
  },
  companyName: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  locationText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing['2xl'],
  },
  statItem: {
    alignItems: 'center',
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  // Actions inline dans la hero card
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  contactButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  // Bouton Contacter version icône secondaire (à côté du Follow primaire)
  contactIconButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Loader des events (pendant fetch)
  eventsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  eventsLoadingText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  eventTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  freeBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.8,
  },
  eventPrice: {
    fontSize: 13,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.2,
  },
  eventStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eventStat: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
  // Empty Events — éditorial : card avec border et icon centré
  emptyEventsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  emptyEventsText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
});
