import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI, eventsAPI } from '../../api/client';
import { DetailScreenSkeleton } from '../../components/ui/Skeleton';
import { useAlert } from '../../contexts/AlertContext';
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
  const route = useRoute<RouteProps>();
  const { showError, showSuccess } = useAlert();
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
        console.warn('[OrganizerProfile] Could not fetch organizer events');
      } finally {
        setIsLoadingEvents(false);
      }
    } catch (err: any) {
      console.error('[OrganizerProfile] Error fetching organizer:', err);
      showError('Erreur', 'Impossible de charger le profil de l\'organisateur.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContact = useCallback(() => {
    if (!organizer) return;
    // Navigate to a conversation with this organizer
    navigation.navigate('Conversation', {
      userId: organizer.id,
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organisateur</Text>
          <View style={styles.headerRight} />
        </View>
        <DetailScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (!organizer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organisateur</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.gray400} />
          <Text style={styles.errorText}>Organisateur introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = getDisplayName(organizer);
  const profileImage = organizer.profile_picture || organizer.image || organizer.logo_url;
  const profile = organizer.organizer_profile;
  const description = profile?.description || profile?.company_description || organizer.bio;
  const isVerified = profile?.verified_status || profile?.verified || organizer.is_verified;
  const rating = profile?.rating;
  const eventCount = profile?.event_count ?? events.length;
  const socialLinks = profile?.social_links;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organisateur</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="business" size={40} color={Colors.gray400} />
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            )}
          </View>

          {organizer.company_name && organizer.company_name !== displayName && (
            <Text style={styles.companyName}>{organizer.company_name}</Text>
          )}

          {(organizer.city || organizer.country) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={Colors.gray400} />
              <Text style={styles.locationText}>
                {[organizer.city, organizer.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{eventCount}</Text>
            <Text style={styles.statLabel}>{eventCount === 1 ? 'Evenement' : 'Evenements'}</Text>
          </View>
          {rating != null && rating > 0 && (
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
                <Ionicons name="star" size={16} color={Colors.warning} />
              </View>
              <Text style={styles.statLabel}>Note</Text>
            </View>
          )}
          {organizer.created_at && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {new Date(organizer.created_at).getFullYear()}
              </Text>
              <Text style={styles.statLabel}>Membre depuis</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContact}
            activeOpacity={TOUCH_OPACITY}
          >
            <Ionicons name="chatbubble-outline" size={20} color={Colors.white} />
            <Text style={styles.contactButtonText}>Contacter</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>A propos</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        )}

        {/* Social Links */}
        {socialLinks && (socialLinks.facebook || socialLinks.twitter || socialLinks.instagram || socialLinks.linkedin) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reseaux sociaux</Text>
            <View style={styles.socialLinksRow}>
              {socialLinks.facebook && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(socialLinks.facebook)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  <Text style={styles.socialButtonText}>Facebook</Text>
                </TouchableOpacity>
              )}
              {socialLinks.instagram && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(socialLinks.instagram)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                  <Text style={styles.socialButtonText}>Instagram</Text>
                </TouchableOpacity>
              )}
              {socialLinks.twitter && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(socialLinks.twitter)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                  <Text style={styles.socialButtonText}>Twitter</Text>
                </TouchableOpacity>
              )}
              {socialLinks.linkedin && (
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleOpenLink(socialLinks.linkedin)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                  <Text style={styles.socialButtonText}>LinkedIn</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Website */}
        {profile?.website && (
          <TouchableOpacity
            style={styles.websiteCard}
            onPress={() => handleOpenLink(profile.website)}
            activeOpacity={TOUCH_OPACITY}
          >
            <View style={styles.websiteIconContainer}>
              <Ionicons name="globe-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.websiteTextContainer}>
              <Text style={styles.websiteLabel}>Site web</Text>
              <Text style={styles.websiteUrl} numberOfLines={1}>{profile.website}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        )}

        {/* Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evenements</Text>
          {isLoadingEvents ? (
            <View style={styles.eventsLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.eventsLoadingText}>Chargement des evenements...</Text>
            </View>
          ) : events.length > 0 ? (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigateToEvent(event.id)}
                activeOpacity={TOUCH_OPACITY}
              >
                {event.banner_image ? (
                  <Image source={{ uri: event.banner_image }} style={styles.eventImage} />
                ) : (
                  <View style={styles.eventImagePlaceholder}>
                    <Ionicons name="image-outline" size={24} color={Colors.gray300} />
                  </View>
                )}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.eventDateRow}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.gray400} />
                    <Text style={styles.eventDate}>{formatDate(event.start_date)}</Text>
                  </View>
                  {event.location_name && (
                    <View style={styles.eventLocationRow}>
                      <Ionicons name="location-outline" size={14} color={Colors.gray400} />
                      <Text style={styles.eventLocation} numberOfLines={1}>
                        {event.location_name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.eventMetaRow}>
                    {event.is_free ? (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>Gratuit</Text>
                      </View>
                    ) : event.base_price != null ? (
                      <Text style={styles.eventPrice}>
                        {event.base_price.toLocaleString()} FCFA
                      </Text>
                    ) : null}
                    <View style={styles.eventStatRow}>
                      <Ionicons name="people-outline" size={14} color={Colors.gray400} />
                      <Text style={styles.eventStat}>{event.registration_count || 0}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyEventsContainer}>
              <Ionicons name="calendar-outline" size={32} color={Colors.gray300} />
              <Text style={styles.emptyEventsText}>Aucun evenement publie</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
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
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  descriptionText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: FontSizes.md * 1.6,
  },
  // Social Links
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    minWidth: 80,
  },
  socialButtonText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  // Website Card
  websiteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  websiteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  websiteTextContainer: {
    flex: 1,
  },
  websiteLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  websiteUrl: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.primary,
    marginTop: 2,
  },
  // Events
  eventsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  eventsLoadingText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  eventImage: {
    width: 100,
    height: 100,
  },
  eventImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eventDate: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  eventLocation: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    flex: 1,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  freeBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  freeBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.successDark,
  },
  eventPrice: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
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
  // Empty Events
  emptyEventsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyEventsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
});
