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
import { usersAPI, eventsAPI, getMediaUrl } from '../../api';
import { ProfileSkeleton } from '../../components/ui/Skeleton';
import FollowUserButton from '../../components/common/FollowUserButton';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, User, Event } from '../../types';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrganizerProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'OrganizerProfile'>;

export default function OrganizerProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const { showError, showSuccess } = useAlert();
  const { colors } = useTheme();
  const { organizerId } = route.params;

  const [organizer, setOrganizer] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isFollowingAction, setIsFollowingAction] = useState(false);

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
        });
        setEvents(eventsResponse.data?.results || eventsResponse.data || []);
      } catch {
        if (__DEV__) console.warn('[OrganizerProfile] Could not fetch organizer events');
      } finally {
        setIsLoadingEvents(false);
      }
    } catch (err: any) {
      if (__DEV__) console.error('[OrganizerProfile] Error fetching organizer:', err);
      showError('Erreur', 'Impossible de charger le profil de l\'organisateur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = useCallback(() => {
    if (!organizer) return;
    // Navigate to a conversation with this organizer
    navigation.navigate('Conversation', {
      userId: String(organizer.id),
      userName: getDisplayName(organizer),
    });
  }, [organizer, navigation]);

  const handleOpenLink = useCallback(async (url: string | undefined) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    try {
      await Linking.openURL(fullUrl);
    } catch {
      showError('Erreur', 'Impossible d\'ouvrir le lien.');
    }
  }, []);

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
            eyebrow="PROFIL"
            title="Organisateur"
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
            eyebrow="PROFIL"
            title="Organisateur"
            back
            onBack={() => navigation.goBack()}
          />
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
            <Text style={[styles.errorText, { color: colors.gray500 }]}>Organisateur introuvable</Text>
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  const displayName = getDisplayName(organizer);
  const profileImage = organizer.profile_picture || organizer.image || organizer.logo_url;
  const profile = organizer.organizer_profile;
  const description = profile?.description || profile?.company_description || organizer.bio;
  const isVerified = profile?.verified_status || profile?.verified || organizer.is_verified;
  // DRF sérialise les DecimalField en string par défaut → coerce en Number
  // sinon `rating.toFixed()` crash. NaN si parsing échoue → traité comme 0.
  const ratingRaw = profile?.rating;
  const rating = ratingRaw != null ? Number(ratingRaw) : null;
  const eventCount = profile?.event_count ?? events.length;
  const socialLinks = profile?.social_links;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>ORG</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

        {/* Header éditorial : eyebrow + titre + back */}
        <EditorialHeader
          eyebrow={isVerified ? 'PROFIL · VÉRIFIÉ' : 'PROFIL'}
          title="Organisateur"
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
                  {organizer.organizer_type === 'organization' ? 'ORGANISATION' : 'ORGANISATEUR'}
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
              {profileImage ? (
                <Image source={profileImage} style={styles.heroAvatar} cachePolicy="disk" transition={200} />
              ) : (
                <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.heroAvatarInitial}>
                    {displayName[0]?.toUpperCase() || 'O'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, paddingLeft: Spacing.md }}>
                <View style={styles.nameRowInline}>
                  <Text style={[styles.heroName, { color: colors.gray900 }]} numberOfLines={2}>
                    {displayName}
                  </Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </View>
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
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>ÉVÉNEMENTS</Text>
                <Text style={[editorial.statNumberSm, { color: colors.gray900 }]}>{eventCount}</Text>
              </View>
              {rating != null && Number.isFinite(rating) && rating > 0 && (
                <View style={styles.statCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>NOTE</Text>
                  <View style={styles.ratingRow}>
                    <Text style={[editorial.statNumberSm, { color: colors.gray900 }]}>{rating.toFixed(1)}</Text>
                    <Ionicons name="star" size={14} color={colors.warning} />
                  </View>
                </View>
              )}
              {organizer.created_at && (
                <View style={styles.statCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>DEPUIS</Text>
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
              <TouchableOpacity
                style={[styles.contactIconButton, { backgroundColor: colors.gray100 }]}
                onPress={handleContact}
                activeOpacity={TOUCH_OPACITY}
                accessibilityRole="button"
                accessibilityLabel="Contacter l'organisateur"
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.gray700} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description — pattern éditorial : eyebrow + texte */}
          {description && (
            <View style={styles.editorialSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>BIO</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>À propos</Text>
              </View>
              <Text style={[styles.descriptionText, { color: colors.gray700 }]}>{description}</Text>
            </View>
          )}

          {/* Réseaux sociaux + site web — chips horizontales unifiées */}
          {(socialLinks?.facebook || socialLinks?.twitter || socialLinks?.instagram || socialLinks?.linkedin || profile?.website) && (
            <View style={styles.editorialSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>EN LIGNE</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Liens</Text>
              </View>
              <View style={styles.socialChipsRow}>
                {profile?.website && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(profile.website)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="globe-outline" size={14} color={colors.primary} />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>Site web</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.facebook && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.facebook)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-facebook" size={14} color="#1877F2" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>Facebook</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.instagram && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.instagram)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-instagram" size={14} color="#E4405F" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>Instagram</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.twitter && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.twitter)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-twitter" size={14} color="#1DA1F2" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>Twitter</Text>
                  </TouchableOpacity>
                )}
                {socialLinks?.linkedin && (
                  <TouchableOpacity
                    style={[styles.socialChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                    onPress={() => handleOpenLink(socialLinks.linkedin)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Ionicons name="logo-linkedin" size={14} color="#0A66C2" />
                    <Text style={[styles.socialChipText, { color: colors.gray800 }]}>LinkedIn</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Events — date tile orange + titre display, style cohérent MyTickets */}
          <View style={styles.editorialSection}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>
                AGENDA · {events.length} ÉVÉNEMENT{events.length > 1 ? 'S' : ''}
              </Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                Événements publiés
              </Text>
            </View>
            {isLoadingEvents ? (
              <View style={styles.eventsLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.eventsLoadingText, { color: colors.gray500 }]}>Chargement…</Text>
              </View>
            ) : events.length > 0 ? (
              events.map((event) => {
                const startDate = event.start_date ? new Date(event.start_date) : null;
                return (
                  <TouchableOpacity
                    key={event.id}
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
                        cachePolicy="disk"
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
                            <Text style={[styles.freeBadgeText, { color: colors.successDark }]}>GRATUIT</Text>
                          </View>
                        ) : event.base_price != null ? (
                          <Text style={[styles.eventPrice, { color: colors.gray900 }]}>
                            {Number(event.base_price).toLocaleString()} {event.currency || 'FCFA'}
                          </Text>
                        ) : null}
                        <View style={styles.eventStatRow}>
                          <Ionicons name="people-outline" size={11} color={colors.gray400} />
                          <Text style={[styles.eventStat, { color: colors.gray500 }]}>
                            {event.registration_count || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={[styles.emptyEventsContainer, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={32} color={colors.gray400} />
                <Text style={[styles.emptyEventsText, { color: colors.gray500 }]}>Aucun événement publié</Text>
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
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  heroAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
