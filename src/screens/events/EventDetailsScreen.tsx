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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { eventsAPI } from '../../api/client';
import { Event, RootStackParamList } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import FollowEventButton from '../../components/events/FollowEventButton';

type RouteProps = RouteProp<RootStackParamList, 'EventDetails'>;

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
  const navigation = useNavigation();
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('about');

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

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


  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvre cet événement sur EventEz: ${event?.title}`,
        title: event?.title,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
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
            <TouchableOpacity style={styles.followOrgButton}>
              <Text style={styles.followOrgText}>Suivre</Text>
            </TouchableOpacity>
          </View>

          {/* Location Card */}
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
                event.ticket_types.map((ticket, index) => (
                  <View key={index} style={styles.ticketCard}>
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      {ticket.description && (
                        <Text style={styles.ticketDescription}>{ticket.description}</Text>
                      )}
                      <Text style={styles.ticketAvailability}>
                        {ticket.quantity_available > 0
                          ? `${ticket.quantity_available} disponible${ticket.quantity_available > 1 ? 's' : ''}`
                          : 'Épuisé'}
                      </Text>
                    </View>
                    <View style={styles.ticketPriceContainer}>
                      <Text style={styles.ticketPrice}>
                        {ticket.price > 0 ? `${ticket.price.toLocaleString()} FCFA` : 'Gratuit'}
                      </Text>
                    </View>
                  </View>
                ))
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
              {event.sessions && event.sessions.length > 0 ? (
                event.sessions.map((session, index) => (
                  <View key={index} style={styles.sessionCard}>
                    <View style={styles.sessionTime}>
                      <Text style={styles.sessionTimeText}>
                        {new Date(session.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {session.location && (
                        <View style={styles.sessionLocation}>
                          <Ionicons name="location-outline" size={12} color={Colors.gray500} />
                          <Text style={styles.sessionLocationText}>{session.location}</Text>
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
              <Text style={styles.sectionTitle}>Avis des participants</Text>
              {event.feedbacks && event.feedbacks.length > 0 ? (
                event.feedbacks.map((feedback, index) => (
                  <View key={index} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {feedback.user?.first_name?.[0] || 'U'}
                        </Text>
                      </View>
                      <View style={styles.reviewUserInfo}>
                        <Text style={styles.reviewUserName}>
                          {feedback.user?.first_name} {feedback.user?.last_name}
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
              ) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="star-outline" size={40} color={Colors.gray300} />
                  <Text style={styles.emptyTabText}>Aucun avis pour le moment</Text>
                </View>
              )}
            </View>
          )}

          {/* Spacer for bottom bar */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>
            {minPrice > 0 ? 'À partir de' : 'Prix'}
          </Text>
          <Text style={styles.priceValue}>
            {minPrice > 0 ? `${minPrice.toLocaleString()} FCFA` : 'Gratuit'}
          </Text>
        </View>
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
  followOrgButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  followOrgText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
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
  ticketPriceContainer: {
    marginLeft: Spacing.md,
  },
  ticketPrice: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
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
});
