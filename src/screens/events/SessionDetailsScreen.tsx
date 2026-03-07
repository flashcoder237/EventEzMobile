import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { sessionsAPI } from '../../api/client';
import { DetailScreenSkeleton } from '../../components/ui/Skeleton';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Session, Speaker, SessionResource } from '../../types';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SessionDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'SessionDetails'>;

const SESSION_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  keynote: { label: 'Keynote', color: '#4F46E5', bgColor: '#EEF2FF', icon: 'star' },
  talk: { label: 'Conference', color: '#2563EB', bgColor: '#DBEAFE', icon: 'chatbubble' },
  panel: { label: 'Table ronde', color: '#D97706', bgColor: '#FEF3C7', icon: 'people' },
  workshop: { label: 'Atelier', color: '#059669', bgColor: '#D1FAE5', icon: 'construct' },
  networking: { label: 'Networking', color: '#A855F7', bgColor: '#FCE7F3', icon: 'git-network' },
  break: { label: 'Pause', color: '#6B7280', bgColor: '#F3F4F6', icon: 'cafe' },
  lunch: { label: 'Dejeuner', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'restaurant' },
  other: { label: 'Autre', color: '#6B7280', bgColor: '#F3F4F6', icon: 'ellipsis-horizontal' },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Debutant',
  intermediate: 'Intermediaire',
  advanced: 'Avance',
  all: 'Tous niveaux',
};

export default function SessionDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { showError, showSuccess } = useAlert();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { sessionId } = route.params;

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    setIsLoading(true);
    try {
      const response = await sessionsAPI.getSession(sessionId);
      setSession(response.data);
    } catch (err: any) {
      if (__DEV__) console.error('[SessionDetails] Error fetching session:', err);
      showError('Erreur', 'Impossible de charger les details de la session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!session) return;
    setIsRegistering(true);
    try {
      if (session.is_registered) {
        await sessionsAPI.unregisterFromSession(sessionId);
        setSession((prev) => prev ? { ...prev, is_registered: false, registration_count: (prev.registration_count || 1) - 1 } : prev);
        showSuccess('Desinscription reussie');
      } else {
        await sessionsAPI.registerToSession(sessionId);
        setSession((prev) => prev ? { ...prev, is_registered: true, registration_count: (prev.registration_count || 0) + 1 } : prev);
        showSuccess('Inscription reussie !');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      const message = errorData?.detail || errorData?.message || 'Une erreur est survenue.';
      showError('Erreur', message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOpenVirtualLink = useCallback(async () => {
    if (session?.virtual_link) {
      try {
        await Linking.openURL(session.virtual_link);
      } catch {
        showError('Erreur', 'Impossible d\'ouvrir le lien.');
      }
    }
  }, [session?.virtual_link]);

  const handleOpenResource = useCallback(async (resource: SessionResource) => {
    const url = resource.url || resource.file;
    if (url) {
      try {
        await Linking.openURL(url);
      } catch {
        showError('Erreur', 'Impossible d\'ouvrir la ressource.');
      }
    }
  }, []);

  const navigateToSpeaker = useCallback((speakerId: string) => {
    navigation.navigate('SpeakerDetails', { speakerId });
  }, [navigation]);

  const formatTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
        <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Session</Text>
          <View style={styles.headerRight} />
        </View>
        <DetailScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
        <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray700} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Session</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>Session introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = SESSION_TYPE_CONFIG[session.session_type] || SESSION_TYPE_CONFIG.other;
  const speakers = session.speakers_detail || session.speakers || [];
  const resources = session.resources || [];
  const isFull = session.max_capacity != null && (session.registration_count || 0) >= session.max_capacity;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]} numberOfLines={1}>Session</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Type Badge + Level */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bgColor }]}>
            <Ionicons name={typeConfig.icon as any} size={14} color={typeConfig.color} />
            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          {session.level && (
            <View style={[styles.levelBadge, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="bar-chart-outline" size={14} color={colors.gray600} />
              <Text style={[styles.levelBadgeText, { color: colors.gray600 }]}>{LEVEL_LABELS[session.level] || session.level}</Text>
            </View>
          )}
          {session.is_featured && (
            <View style={[styles.featuredBadge, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={[styles.featuredBadgeText, { color: colors.warningDark }]}>En vedette</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.gray900 }]}>{session.title}</Text>

        {/* Track info */}
        {session.track_detail && (
          <View style={styles.trackRow}>
            <View
              style={[
                styles.trackDot,
                { backgroundColor: session.track_detail.color || colors.primary },
              ]}
            />
            <Text style={[styles.trackText, { color: colors.gray600 }]}>{session.track_detail.name}</Text>
          </View>
        )}

        {/* Date & Time */}
        <View style={[styles.infoCard, { backgroundColor: colors.gray50 }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.gray500 }]}>Date</Text>
              <Text style={[styles.infoValue, { color: colors.gray900 }]}>{formatDate(session.start_time)}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.gray500 }]}>Horaire</Text>
              <Text style={[styles.infoValue, { color: colors.gray900 }]}>
                {formatTime(session.start_time)} - {formatTime(session.end_time)}
                {session.duration_minutes ? ` (${session.duration_minutes} min)` : ''}
              </Text>
            </View>
          </View>
          {(session.location || session.room) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="location-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.gray500 }]}>Lieu</Text>
                  <Text style={[styles.infoValue, { color: colors.gray900 }]}>
                    {[session.room, session.location].filter(Boolean).join(' - ')}
                  </Text>
                </View>
              </View>
            </>
          )}
          {session.max_capacity != null && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray200 }]} />
              <View style={styles.infoRow}>
                <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.gray500 }]}>Capacite</Text>
                  <Text style={[styles.infoValue, { color: colors.gray900 }]}>
                    {session.registration_count || 0} / {session.max_capacity} places
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Virtual Link */}
        {session.is_virtual && session.virtual_link && (
          <TouchableOpacity
            style={[styles.virtualCard, { backgroundColor: colors.infoLight }]}
            onPress={handleOpenVirtualLink}
            activeOpacity={TOUCH_OPACITY}
          >
            <View style={[styles.virtualIconContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="videocam" size={24} color={colors.info} />
            </View>
            <View style={styles.virtualTextContainer}>
              <Text style={[styles.virtualTitle, { color: colors.infoDark }]}>Session en ligne</Text>
              <Text style={[styles.virtualLink, { color: colors.info }]} numberOfLines={1}>
                {session.virtual_link}
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.info} />
          </TouchableOpacity>
        )}

        {/* Description */}
        {session.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Description</Text>
            <Text style={[styles.descriptionText, { color: colors.gray600 }]}>{session.description}</Text>
          </View>
        )}

        {/* Speakers */}
        {speakers.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
              {speakers.length === 1 ? 'Intervenant' : 'Intervenants'}
            </Text>
            {speakers.map((speaker: any) => {
              const speakerId = speaker.id;
              const speakerName = speaker.full_name || speaker.name || `${speaker.first_name || ''} ${speaker.last_name || ''}`.trim();
              const speakerTitle = speaker.title;
              const speakerCompany = speaker.company;
              const speakerPhoto = speaker.photo;

              return (
                <TouchableOpacity
                  key={speakerId}
                  style={[styles.speakerCard, { backgroundColor: colors.gray50 }]}
                  onPress={() => navigateToSpeaker(speakerId)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  {speakerPhoto ? (
                    <Image source={speakerPhoto} style={styles.speakerPhoto} cachePolicy="disk" transition={200} />
                  ) : (
                    <View style={[styles.speakerPhotoPlaceholder, { backgroundColor: colors.gray200 }]}>
                      <Ionicons name="person" size={20} color={colors.gray400} />
                    </View>
                  )}
                  <View style={styles.speakerInfo}>
                    <Text style={[styles.speakerName, { color: colors.gray900 }]}>{speakerName}</Text>
                    {(speakerTitle || speakerCompany) && (
                      <Text style={[styles.speakerRole, { color: colors.gray500 }]} numberOfLines={1}>
                        {[speakerTitle, speakerCompany].filter(Boolean).join(' - ')}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Moderator */}
        {session.moderator_detail && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Moderateur</Text>
            <TouchableOpacity
              style={[styles.speakerCard, { backgroundColor: colors.gray50 }]}
              onPress={() => navigateToSpeaker(session.moderator_detail!.id)}
              activeOpacity={TOUCH_OPACITY}
            >
              {session.moderator_detail.photo ? (
                <Image source={session.moderator_detail.photo} style={styles.speakerPhoto} cachePolicy="disk" transition={200} />
              ) : (
                <View style={[styles.speakerPhotoPlaceholder, { backgroundColor: colors.gray200 }]}>
                  <Ionicons name="person" size={20} color={colors.gray400} />
                </View>
              )}
              <View style={styles.speakerInfo}>
                <Text style={[styles.speakerName, { color: colors.gray900 }]}>{session.moderator_detail.full_name}</Text>
                {(session.moderator_detail.title || session.moderator_detail.company) && (
                  <Text style={[styles.speakerRole, { color: colors.gray500 }]} numberOfLines={1}>
                    {[session.moderator_detail.title, session.moderator_detail.company].filter(Boolean).join(' - ')}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Ressources</Text>
            {resources.map((resource: SessionResource) => {
              const resourceIcon = getResourceIcon(resource.resource_type);
              return (
                <TouchableOpacity
                  key={resource.id}
                  style={[styles.resourceCard, { backgroundColor: colors.gray50 }]}
                  onPress={() => handleOpenResource(resource)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <View style={[styles.resourceIconContainer, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name={resourceIcon as any} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={[styles.resourceTitle, { color: colors.gray900 }]}>{resource.title}</Text>
                    {resource.description && (
                      <Text style={[styles.resourceDescription, { color: colors.gray500 }]} numberOfLines={1}>
                        {resource.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="download-outline" size={18} color={colors.gray400} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {session.tags.map((tag, index) => (
                <View key={index} style={[styles.tagBadge, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.tagText, { color: colors.gray600 }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom spacing for registration button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Registration Button (sticky at bottom) */}
      {session.requires_registration && (
        <View style={[styles.bottomBar, { borderTopColor: colors.gray100, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: colors.primary },
              session.is_registered && { backgroundColor: colors.gray700 },
              isFull && !session.is_registered && { backgroundColor: colors.gray300 },
            ]}
            onPress={handleRegister}
            activeOpacity={TOUCH_OPACITY}
            disabled={isRegistering || (isFull && !session.is_registered)}
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={session.is_registered ? 'close-circle-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={Colors.white}
                />
                <Text style={styles.registerButtonText}>
                  {session.is_registered
                    ? 'Se desinscrire'
                    : isFull
                      ? 'Complet'
                      : 'S\'inscrire a cette session'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function getResourceIcon(type: string): string {
  switch (type) {
    case 'slides': return 'easel-outline';
    case 'document': return 'document-text-outline';
    case 'video': return 'videocam-outline';
    case 'link': return 'link-outline';
    case 'code': return 'code-slash-outline';
    default: return 'attach-outline';
  }
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
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
  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  typeBadgeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    gap: Spacing.xs,
  },
  levelBadgeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.warningLight,
    gap: Spacing.xs,
  },
  featuredBadgeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.warningDark,
  },
  // Title
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  // Track
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  trackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trackText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  // Info Card
  infoCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.xs,
  },
  // Virtual Link Card
  virtualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  virtualIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  virtualTextContainer: {
    flex: 1,
  },
  virtualTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.infoDark,
  },
  virtualLink: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.info,
    marginTop: 2,
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
  // Speaker Card
  speakerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  speakerPhoto: {
    width: AvatarSizes.md,
    height: AvatarSizes.md,
    borderRadius: AvatarSizes.md / 2,
  },
  speakerPhotoPlaceholder: {
    width: AvatarSizes.md,
    height: AvatarSizes.md,
    borderRadius: AvatarSizes.md / 2,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  speakerName: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  speakerRole: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  // Resource Card
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resourceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  resourceTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  resourceDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    marginTop: 2,
  },
  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  tagText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  // Bottom Bar
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.white,
    ...Shadows.bottomBar,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  unregisterButton: {
    backgroundColor: Colors.gray700,
  },
  disabledButton: {
    backgroundColor: Colors.gray300,
  },
  registerButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
