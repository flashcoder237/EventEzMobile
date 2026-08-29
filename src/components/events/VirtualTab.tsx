import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { virtualRoomsAPI, recordingsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../ui/LoadingOverlay';
import { formatCount } from '../../lib/utils/numberFormatters';
import { withJwt } from '../../lib/utils/visioUrl';
import { useLiveStatus } from '../../hooks/useLiveStatus';

interface VirtualRoom {
  id: string;
  name: string;
  description?: string;
  status?: string;
  is_active?: boolean;
  participants_count?: number;
  max_participants?: number;
  room_type?: string;
}

interface Recording {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  view_count?: number;
  created_at?: string;
}

interface VirtualTabProps {
  eventId: string;
  isRegistered?: boolean;
}

export default function VirtualTab({ eventId, isRegistered = false }: VirtualTabProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const { showError } = useFeedback();
  const [rooms, setRooms] = useState<VirtualRoom[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  // Statut « en direct » temps réel (bannière + CTA quand c'est en cours).
  const { status: live } = useLiveStatus(eventId, { enabled: true });

  useEffect(() => {
    fetchVirtualData();
  }, [eventId]);

  const fetchVirtualData = async () => {
    setLoading(true);
    try {
      const [roomsRes, recordingsRes] = await Promise.all([
        virtualRoomsAPI.getByEvent(eventId).catch(() => ({ data: [] })),
        recordingsAPI.getByEvent(eventId).catch(() => ({ data: [] })),
      ]);

      const roomsList = roomsRes.data?.results || roomsRes.data || [];
      const recordingsList = recordingsRes.data?.results || recordingsRes.data || [];

      setRooms(Array.isArray(roomsList) ? roomsList : []);
      setRecordings(Array.isArray(recordingsList) ? recordingsList : []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement donnees virtuelles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rejoindre depuis la bannière « en direct » (pas de room précise ciblée) :
  // même flux gaté que handleJoinRoom, avec un id de spinner dédié.
  const LIVE_JOIN_ID = '__live__';
  const handleJoinLive = () => handleJoinRoom(LIVE_JOIN_ID);

  const handleJoinRoom = async (_roomId: string) => {
    // Utiliser event_join qui retourne le token et l'URL selon le provider
    if (!isRegistered) {
      showError(
        t('componentsEvents.virtualRegistrationRequiredTitle'),
        t('componentsEvents.virtualRegistrationRequiredMessage')
      );
      return;
    }

    setJoiningRoomId(_roomId);
    try {
      const res = await virtualRoomsAPI.eventJoin(eventId);
      const data = res.data;

      if (!data.url) {
        showError(t('common.error'), t('componentsEvents.virtualUrlError'));
        return;
      }

      // L'accès est TOUJOURS par JWT (jitsi_jwt : url a déjà ?jwt= ; jaas : on
      // ajoute le token). withJwt place le param AVANT tout fragment #config… —
      // une concaténation naïve `?jwt=` casserait l'URL si une query/fragment
      // existe déjà (le JWT serait ignoré → prejoin/accès refusé).
      const finalUrl = data.provider === 'jaas' && data.token
        ? withJwt(data.url, data.token)
        : data.url;

      navigation.navigate('Browser', { url: finalUrl });
      fetchVirtualData();
    } catch (error: any) {
      const msg = error?.response?.data?.error || t('componentsEvents.virtualGenericError');
      const minsRemaining = error?.response?.data?.minutes_remaining;
      showError(
        t('componentsEvents.virtualAccessDenied'),
        minsRemaining
          ? t('componentsEvents.virtualAccessLater', { minutes: minsRemaining })
          : msg
      );
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleViewRecording = async (recordingId: string) => {
    try {
      await recordingsAPI.incrementView(recordingId);
    } catch (error) {
      if (__DEV__) console.error('Erreur enregistrement vue:', error);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h${remainMins.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isRoomActive = (room: VirtualRoom): boolean => {
    return room.is_active === true || room.status === 'active' || room.status === 'live';
  };

  // Bannière « en direct » rouge + CTA de rejointe (rendue quel que soit l'état
  // de contenu tant que l'event est effectivement live).
  const liveBanner = live?.is_live ? (
    <View style={styles.liveBanner}>
      <View style={styles.liveBannerLeft}>
        <View style={styles.liveDot} />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.liveBannerTitle}>{t('componentsEvents.virtualLiveNow')}</Text>
          {live.participants > 0 && (
            <Text style={styles.liveBannerSub}>
              {t('componentsEvents.virtualLiveParticipants', { count: live.participants })}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.liveJoinButton, joiningRoomId !== null && { opacity: 0.6 }]}
        onPress={handleJoinLive}
        disabled={joiningRoomId !== null}
        activeOpacity={0.7}
      >
        {joiningRoomId === LIVE_JOIN_ID ? (
          <LoadingSpinner size="small" color={Colors.error} />
        ) : (
          <Ionicons name="videocam" size={16} color={Colors.error} />
        )}
        <Text style={styles.liveJoinButtonText}>{t('componentsEvents.virtualJoinLive')}</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <LoadingSpinner />
        <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  const hasContent = rooms.length > 0 || recordings.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.section}>
        {liveBanner}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('componentsEvents.virtualTitle')}</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="videocam-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>{t('componentsEvents.virtualEmpty')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {liveBanner}
      {/* Virtual Rooms */}
      {rooms.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>{t('componentsEvents.virtualRoomsTitle')}</Text>
          {rooms.map((room) => {
            const active = isRoomActive(room);
            return (
              <View key={room.id} style={[styles.roomCard, { backgroundColor: colors.gray50 }]}>
                <View style={styles.roomHeader}>
                  <View style={[styles.roomStatusDot, { backgroundColor: active ? colors.success : colors.gray400 }]} />
                  <View style={styles.roomInfo}>
                    <Text style={[styles.roomName, { color: colors.gray900 }]}>{room.name}</Text>
                    <Text style={[styles.roomStatus, { color: colors.gray500 }]}>
                      {active ? t('componentsEvents.virtualRoomActive') : t('componentsEvents.virtualRoomEnded')}
                    </Text>
                  </View>
                  {room.participants_count !== undefined && (
                    <View style={[styles.participantsCount, { backgroundColor: colors.gray200 }]}>
                      <Ionicons name="people-outline" size={14} color={colors.gray500} />
                      <Text style={[styles.participantsText, { color: colors.gray600 }]}>
                        {room.participants_count}
                        {room.max_participants ? `/${room.max_participants}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
                {room.description && (
                  <Text style={[styles.roomDescription, { color: colors.gray600 }]} numberOfLines={2}>{room.description}</Text>
                )}
                {room.room_type && (
                  <View style={[styles.roomTypeBadge, { backgroundColor: colors.primaryBg }]}>
                    <Text style={[styles.roomTypeText, { color: colors.primary }]}>{room.room_type}</Text>
                  </View>
                )}
                {active && (
                  <TouchableOpacity
                    style={[styles.joinButton, joiningRoomId === room.id && { opacity: 0.6 }]}
                    onPress={() => handleJoinRoom(room.id)}
                    disabled={joiningRoomId !== null}
                    activeOpacity={0.7}
                  >
                    {joiningRoomId === room.id ? (
                      <LoadingSpinner size="small" color={Colors.white} />
                    ) : (
                      <Ionicons name="videocam" size={16} color={Colors.white} />
                    )}
                    <Text style={styles.joinButtonText}>
                      {joiningRoomId === room.id ? t('componentsEvents.virtualConnecting') : t('componentsEvents.virtualJoinAction')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* Recordings */}
      {recordings.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }, rooms.length > 0 && { marginTop: Spacing.lg }]}>
            {t('componentsEvents.virtualReplaysTitle')}
          </Text>
          {recordings.map((recording) => (
            <TouchableOpacity
              key={recording.id}
              style={[styles.recordingCard, { backgroundColor: colors.gray50 }]}
              onPress={() => handleViewRecording(recording.id)}
              activeOpacity={0.7}
            >
              <View style={styles.recordingThumbnailContainer}>
                {recording.thumbnail ? (
                  <Image source={recording.thumbnail} style={styles.recordingThumbnail} cachePolicy="memory-disk" transition={200} />
                ) : (
                  <View style={[styles.recordingThumbnailPlaceholder, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name="play-circle" size={32} color={colors.primary} />
                  </View>
                )}
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{formatDuration(recording.duration)}</Text>
                </View>
              </View>
              <View style={styles.recordingInfo}>
                <Text style={[styles.recordingTitle, { color: colors.gray900 }]} numberOfLines={2}>{recording.title}</Text>
                {recording.description && (
                  <Text style={[styles.recordingDescription, { color: colors.gray600 }]} numberOfLines={1}>{recording.description}</Text>
                )}
                {recording.view_count !== undefined && (
                  <View style={styles.viewCountRow}>
                    <Ionicons name="eye-outline" size={12} color={colors.gray500} />
                    <Text style={[styles.viewCountText, { color: colors.gray500 }]} numberOfLines={1}>
                      {formatCount(recording.view_count, 'vue')}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  // Bannière « en direct »
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  liveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
  },
  liveBannerTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  liveBannerSub: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  liveJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flexShrink: 0,
  },
  liveJoinButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  // Room styles
  roomCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  roomStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  roomStatus: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginTop: 2,
  },
  participantsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gray200,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  participantsText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  roomDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  roomTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  roomTypeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  joinButtonText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  // Recording styles
  recordingCard: {
    flexDirection: 'row',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  recordingThumbnailContainer: {
    width: 120,
    height: 80,
    position: 'relative',
  },
  recordingThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.gray200,
  },
  recordingThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  durationText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  recordingInfo: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  recordingTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 2,
  },
  recordingDescription: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    marginBottom: 4,
  },
  viewCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
});
