import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { virtualRoomsAPI, recordingsAPI } from '../../api/client';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

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
}

export default function VirtualTab({ eventId }: VirtualTabProps) {
  const [rooms, setRooms] = useState<VirtualRoom[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Erreur chargement donnees virtuelles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await virtualRoomsAPI.join(roomId);
      // Refresh rooms after joining
      fetchVirtualData();
    } catch (error) {
      console.error('Erreur rejoindre la salle:', error);
    }
  };

  const handleViewRecording = async (recordingId: string) => {
    try {
      await recordingsAPI.incrementView(recordingId);
    } catch (error) {
      console.error('Erreur enregistrement vue:', error);
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

  if (loading) {
    return (
      <View style={styles.emptyTab}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.emptyTabText}>Chargement...</Text>
      </View>
    );
  }

  const hasContent = rooms.length > 0 || recordings.length > 0;

  if (!hasContent) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Virtuel</Text>
        <View style={styles.emptyTab}>
          <Ionicons name="videocam-outline" size={40} color={Colors.gray300} />
          <Text style={styles.emptyTabText}>Aucun contenu virtuel disponible</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {/* Virtual Rooms */}
      {rooms.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Salles virtuelles</Text>
          {rooms.map((room) => {
            const active = isRoomActive(room);
            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <View style={[styles.roomStatusDot, { backgroundColor: active ? Colors.success : Colors.gray400 }]} />
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomStatus}>
                      {active ? 'En cours' : 'Termine'}
                    </Text>
                  </View>
                  {room.participants_count !== undefined && (
                    <View style={styles.participantsCount}>
                      <Ionicons name="people-outline" size={14} color={Colors.gray500} />
                      <Text style={styles.participantsText}>
                        {room.participants_count}
                        {room.max_participants ? `/${room.max_participants}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
                {room.description && (
                  <Text style={styles.roomDescription} numberOfLines={2}>{room.description}</Text>
                )}
                {room.room_type && (
                  <View style={styles.roomTypeBadge}>
                    <Text style={styles.roomTypeText}>{room.room_type}</Text>
                  </View>
                )}
                {active && (
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoinRoom(room.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="videocam" size={16} color={Colors.white} />
                    <Text style={styles.joinButtonText}>Rejoindre</Text>
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
          <Text style={[styles.sectionTitle, rooms.length > 0 && { marginTop: Spacing.lg }]}>
            Replays
          </Text>
          {recordings.map((recording) => (
            <TouchableOpacity
              key={recording.id}
              style={styles.recordingCard}
              onPress={() => handleViewRecording(recording.id)}
              activeOpacity={0.7}
            >
              <View style={styles.recordingThumbnailContainer}>
                {recording.thumbnail ? (
                  <Image source={{ uri: recording.thumbnail }} style={styles.recordingThumbnail} />
                ) : (
                  <View style={styles.recordingThumbnailPlaceholder}>
                    <Ionicons name="play-circle" size={32} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{formatDuration(recording.duration)}</Text>
                </View>
              </View>
              <View style={styles.recordingInfo}>
                <Text style={styles.recordingTitle} numberOfLines={2}>{recording.title}</Text>
                {recording.description && (
                  <Text style={styles.recordingDescription} numberOfLines={1}>{recording.description}</Text>
                )}
                {recording.view_count !== undefined && (
                  <View style={styles.viewCountRow}>
                    <Ionicons name="eye-outline" size={12} color={Colors.gray500} />
                    <Text style={styles.viewCountText}>{recording.view_count} vue{recording.view_count !== 1 ? 's' : ''}</Text>
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
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
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
