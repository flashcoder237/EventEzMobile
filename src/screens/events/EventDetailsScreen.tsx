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
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { eventsAPI } from '../../api/client';
import { Event, RootStackParamList } from '../../types';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';

type RouteProps = RouteProp<RootStackParamList, 'EventDetails'>;

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await eventsAPI.getEvent(eventId);
      setEvent(response.data);
      setIsFollowing(response.data.is_following || false);
    } catch (error) {
      console.error('Erreur chargement événement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await eventsAPI.unfollowEvent(eventId);
      } else {
        await eventsAPI.followEvent(eventId);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Erreur follow:', error);
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: event.banner_image || 'https://via.placeholder.com/400x200' }}
            style={styles.bannerImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.bannerGradient}
          />

          {/* Action Buttons */}
          <View style={styles.bannerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleFollow}>
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={22}
                color={isFollowing ? Colors.error : Colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Category Badge */}
          {event.category?.name && (
            <View style={styles.categoryBadge}>
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                style={styles.categoryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.categoryText}>{event.category.name}</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Organizer */}
          <View style={styles.organizerRow}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.organizerAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.organizerInitial}>
                {event.organizer?.first_name?.[0] || 'O'}
              </Text>
            </LinearGradient>
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerName}>
                {event.organizer?.first_name} {event.organizer?.last_name}
              </Text>
              <Text style={styles.organizerLabel}>Organisateur</Text>
            </View>
          </View>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            {/* Date */}
            <View style={styles.infoCard}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.primaryBg }]}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(event.start_date)}</Text>
                <Text style={styles.infoSubvalue}>{formatTime(event.start_date)}</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.infoCard}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="location" size={20} color={Colors.success} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lieu</Text>
                <Text style={styles.infoValue}>{event.location_name || 'À définir'}</Text>
                <Text style={styles.infoSubvalue}>
                  {event.location_city}, {event.location_country}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={18} color={Colors.primary} />
              <Text style={styles.statText}>
                {event.registration_count} inscrit{event.registration_count > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={18} color={Colors.gray500} />
              <Text style={styles.statText}>{event.view_count} vues</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>
              {event.description || event.short_description || 'Aucune description disponible.'}
            </Text>
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

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>À partir de</Text>
          <Text style={styles.priceValue}>
            {event.ticket_types && event.ticket_types.length > 0
              ? `${Math.min(...event.ticket_types.map(t => t.price)).toLocaleString()} FCFA`
              : 'Gratuit'}
          </Text>
        </View>
        <GradientButton
          onPress={() => navigation.navigate('TicketPurchase' as never, { eventId } as never)}
          title={event.event_type === 'billetterie' ? 'Acheter' : 'S\'inscrire'}
          icon={<Ionicons name="arrow-forward" size={18} color={Colors.white} />}
          style={styles.ctaButton}
        />
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
  },
  bannerContainer: {
    height: 260,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  bannerActions: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  categoryGradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  content: {
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerInitial: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  organizerInfo: {
    marginLeft: Spacing.md,
  },
  organizerName: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.gray900,
  },
  organizerLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  infoCards: {
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    marginLeft: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.gray900,
    marginTop: 2,
  },
  infoSubvalue: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSizes.base,
    color: Colors.gray600,
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    ...Shadows.lg,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  priceValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.gray900,
  },
  ctaButton: {
    width: width * 0.45,
  },
});
