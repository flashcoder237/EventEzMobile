import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { speakersAPI } from '../../api';
import { ProfileSkeleton } from '../../components/ui/Skeleton';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList, Speaker, Session } from '../../types';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SpeakerDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'SpeakerDetails'>;

export default function SpeakerDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { showError } = useAlert();
  const { colors } = useTheme();
  const { speakerId } = route.params;

  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    fetchSpeakerData();
  }, [speakerId]);

  const fetchSpeakerData = async () => {
    setIsLoading(true);
    try {
      const response = await speakersAPI.getSpeaker(speakerId);
      setSpeaker(response.data);

      // Fetch sessions for this speaker
      setIsLoadingSessions(true);
      try {
        const sessionsResponse = await speakersAPI.getSpeakerSessions(speakerId);
        setSessions(sessionsResponse.data?.results || sessionsResponse.data || []);
      } catch {
        // Sessions endpoint might not be available, not critical
        if (__DEV__) console.warn('[SpeakerDetails] Could not fetch speaker sessions');
      } finally {
        setIsLoadingSessions(false);
      }
    } catch (err: any) {
      if (__DEV__) console.error('[SpeakerDetails] Error fetching speaker:', err);
      showError('Erreur', 'Impossible de charger le profil de l\'intervenant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLink = useCallback((url: string | undefined, title?: string) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    navigation.navigate('Browser', { url: fullUrl, title });
  }, [navigation]);

  const navigateToSession = useCallback((sessionId: string) => {
    navigation.navigate('SessionDetails', { sessionId });
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
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>MIC</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.gray700} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Intervenant</Text>
            <View style={styles.headerRight} />
          </View>
          <ProfileSkeleton />
        </View>
      </EditorialCanvas>
    );
  }

  if (!speaker) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>NO</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.gray700} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Intervenant</Text>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
            <Text style={[styles.errorText, { color: colors.gray500 }]}>Intervenant introuvable</Text>
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  const fullName = speaker.full_name || speaker.display_name || speaker.name || `${speaker.first_name || ''} ${speaker.last_name || ''}`.trim();
  const hasSocialLinks = speaker.website || speaker.linkedin || speaker.twitter;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>MIC</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Intervenant</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {speaker.photo ? (
            <Image source={speaker.photo} style={styles.avatar} cachePolicy="disk" transition={200} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="person" size={40} color={colors.gray400} />
            </View>
          )}

          <Text style={[styles.name, { color: colors.gray900 }]}>{fullName}</Text>

          {(speaker.title || speaker.company) && (
            <Text style={[styles.roleText, { color: colors.gray500 }]}>
              {[speaker.title, speaker.company].filter(Boolean).join(' chez ')}
            </Text>
          )}

          {speaker.is_featured && (
            <View style={[styles.featuredBadge, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={[styles.featuredText, { color: colors.warningDark }]}>Intervenant vedette</Text>
            </View>
          )}
        </View>

        {/* Social Links */}
        {hasSocialLinks && (
          <View style={styles.socialLinksRow}>
            {speaker.website && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.gray50 }]}
                onPress={() => handleOpenLink(speaker.website)}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="globe-outline" size={22} color={colors.primary} />
                <Text style={[styles.socialButtonText, { color: colors.gray600 }]}>Site web</Text>
              </TouchableOpacity>
            )}
            {speaker.linkedin && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.gray50 }]}
                onPress={() => handleOpenLink(speaker.linkedin)}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                <Text style={[styles.socialButtonText, { color: colors.gray600 }]}>LinkedIn</Text>
              </TouchableOpacity>
            )}
            {speaker.twitter && (
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.gray50 }]}
                onPress={() => handleOpenLink(speaker.twitter)}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
                <Text style={[styles.socialButtonText, { color: colors.gray600 }]}>Twitter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bio */}
        {speaker.bio && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Biographie</Text>
            <Text style={[styles.bioText, { color: colors.gray600 }]}>{speaker.bio}</Text>
          </View>
        )}

        {/* Contact Info */}
        {(speaker.email || speaker.phone) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Contact</Text>
            <View style={[styles.contactCard, { backgroundColor: colors.gray50 }]}>
              {speaker.email && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`mailto:${speaker.email}`)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.contactText, { color: colors.gray700 }]}>{speaker.email}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
              {speaker.email && speaker.phone && <View style={[styles.contactDivider, { backgroundColor: colors.gray200 }]} />}
              {speaker.phone && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`tel:${speaker.phone}`)}
                  activeOpacity={TOUCH_OPACITY}
                >
                  <View style={[styles.contactIconContainer, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.contactText, { color: colors.gray700 }]}>{speaker.phone}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Sessions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Sessions</Text>
          {isLoadingSessions ? (
            <View style={styles.sessionsLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.sessionsLoadingText, { color: colors.gray500 }]}>Chargement des sessions...</Text>
            </View>
          ) : sessions.length > 0 ? (
            sessions.map((sessionItem) => (
              <TouchableOpacity
                key={sessionItem.id}
                style={[styles.sessionCard, { backgroundColor: colors.gray50 }]}
                onPress={() => navigateToSession(sessionItem.id)}
                activeOpacity={TOUCH_OPACITY}
              >
                <View style={styles.sessionTimeColumn}>
                  <Text style={[styles.sessionDate, { color: colors.gray500 }]}>{formatDate(sessionItem.start_time)}</Text>
                  <Text style={[styles.sessionTime, { color: colors.primary }]}>
                    {formatTime(sessionItem.start_time)}
                  </Text>
                </View>
                <View style={[styles.sessionDividerLine, { backgroundColor: colors.gray200 }]} />
                <View style={styles.sessionInfoColumn}>
                  <Text style={[styles.sessionTitle, { color: colors.gray900 }]} numberOfLines={2}>
                    {sessionItem.title}
                  </Text>
                  {sessionItem.session_type && (
                    <Text style={[styles.sessionType, { color: colors.gray500 }]}>
                      {sessionItem.session_type.charAt(0).toUpperCase() + sessionItem.session_type.slice(1)}
                    </Text>
                  )}
                  {(sessionItem.room || sessionItem.location) && (
                    <View style={styles.sessionLocationRow}>
                      <Ionicons name="location-outline" size={14} color={colors.gray400} />
                      <Text style={[styles.sessionLocation, { color: colors.gray400 }]}>
                        {sessionItem.room || sessionItem.location}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySessionsContainer}>
              <Ionicons name="calendar-outline" size={32} color={colors.gray300} />
              <Text style={[styles.emptySessionsText, { color: colors.gray400 }]}>Aucune session programmee</Text>
            </View>
          )}
        </View>
      </ScrollView>
      </View>
    </EditorialCanvas>
  );
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
    marginBottom: Spacing.xl,
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
  name: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    textAlign: 'center',
  },
  roleText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  featuredText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.warningDark,
  },
  // Social Links
  socialLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
  bioText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: FontSizes.md * 1.6,
  },
  // Contact Card
  contactCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  contactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontFamily: FontFamily.regular,
    color: Colors.gray700,
  },
  contactDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.md,
  },
  // Sessions
  sessionsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  sessionsLoadingText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sessionTimeColumn: {
    alignItems: 'center',
    minWidth: 50,
  },
  sessionDate: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
  sessionTime: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginTop: 2,
  },
  sessionDividerLine: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.md,
  },
  sessionInfoColumn: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  sessionType: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginTop: 2,
  },
  sessionLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  sessionLocation: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
  // Empty sessions
  emptySessionsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptySessionsText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
});
