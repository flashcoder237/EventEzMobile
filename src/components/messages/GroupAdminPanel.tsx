/**
 * GroupAdminPanel (mobile) — Modale React Native équivalente du composant web.
 *
 * Permet à l'organisateur de :
 *   - Choisir qui peut écrire (`posting_mode`)
 *   - Muter / démuter un participant
 *
 * Visible uniquement si l'utilisateur est organizer / admin / moderator pour
 * cette conversation. Le contrôle d'accès final est côté backend, mais on
 * cache l'UI pour ne pas tromper les autres membres.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messagesAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';

export interface GroupAdminParticipant {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  profile_picture?: string | null;
}

interface GroupAdminPanelProps {
  visible: boolean;
  conversationId: number | string;
  participants: GroupAdminParticipant[];
  initialPostingMode?: 'all' | 'organizer_only' | 'admins_only';
  organizerId?: number | null;
  onClose: () => void;
  onMutationApplied?: () => void;
}

const MODE_OPTIONS: Array<{
  value: 'all' | 'organizer_only' | 'admins_only';
  title: string;
  description: string;
}> = [
  {
    value: 'all',
    title: 'Tout le monde peut écrire',
    description: 'Les participants peuvent envoyer des messages et fichiers (par défaut).',
  },
  {
    value: 'organizer_only',
    title: 'Vous uniquement',
    description: 'Seul l\'organisateur peut écrire. Les participants peuvent lire.',
  },
  {
    value: 'admins_only',
    title: 'Vous et les modérateurs EventEz',
    description: 'Vous + l\'équipe plateforme. Les participants peuvent lire.',
  },
];

// Hauteur estimée d'une ligne participant
const GROUP_PARTICIPANT_HEIGHT = 56;

export default function GroupAdminPanel({
  visible,
  conversationId,
  participants,
  initialPostingMode = 'all',
  organizerId,
  onClose,
  onMutationApplied,
}: GroupAdminPanelProps) {
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();

  const [mode, setMode] = useState<'all' | 'organizer_only' | 'admins_only'>(initialPostingMode);
  const [savingMode, setSavingMode] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<number>>(new Set());
  const [loadingMuted, setLoadingMuted] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Re-sync à chaque ouverture (la conv peut avoir évolué entre 2 ouvertures).
  useEffect(() => {
    if (!visible) return;
    setMode(initialPostingMode);
    let cancelled = false;
    (async () => {
      setLoadingMuted(true);
      try {
        const res = await messagesAPI.getMutedList(conversationId);
        if (!cancelled) {
          const ids: number[] = (res.data?.users || []).map((u: any) => Number(u.id));
          setMutedIds(new Set(ids));
        }
      } catch (err) {
        if (!cancelled && __DEV__) console.warn('[GroupAdminPanel] muted list', err);
      } finally {
        if (!cancelled) setLoadingMuted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, conversationId, initialPostingMode]);

  const handleModeChange = async (newMode: 'all' | 'organizer_only' | 'admins_only') => {
    if (newMode === mode) return;
    setSavingMode(true);
    try {
      await messagesAPI.setPostingMode(conversationId, newMode);
      setMode(newMode);
      showSuccess('Permissions mises à jour', '');
      onMutationApplied?.();
    } catch (err: any) {
      showError('Erreur', err?.response?.data?.detail || 'Impossible de modifier les permissions.');
    } finally {
      setSavingMode(false);
    }
  };

  const toggleMute = async (userId: number) => {
    setTogglingId(userId);
    const wasMuted = mutedIds.has(userId);
    try {
      if (wasMuted) {
        await messagesAPI.unmuteParticipant(conversationId, userId);
        setMutedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        showSuccess('Démuté', 'Le participant peut à nouveau écrire.');
      } else {
        await messagesAPI.muteParticipant(conversationId, userId);
        setMutedIds((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
        showSuccess('Muté', 'Le participant ne peut plus écrire.');
      }
      onMutationApplied?.();
    } catch (err: any) {
      showError('Erreur', err?.response?.data?.detail || 'Action impossible.');
    } finally {
      setTogglingId(null);
    }
  };

  const renderParticipant = ({ item: p }: { item: GroupAdminParticipant }) => {
    const displayName = p.full_name
      || `${p.first_name || ''} ${p.last_name || ''}`.trim()
      || p.email;
    const isMuted = mutedIds.has(p.id);
    const isOrganizer = organizerId != null && Number(p.id) === Number(organizerId);
    const isToggling = togglingId === p.id;
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <View style={[styles.participantRow, { borderBottomColor: colors.gray100 }]}>
        <View style={styles.participantLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
          </View>
          <View style={styles.participantInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              {isOrganizer && (
                <View style={[styles.badge, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>ORGANISATEUR</Text>
                </View>
              )}
              {isMuted && (
                <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: '#92400e' }]}>MUTÉ</Text>
                </View>
              )}
            </View>
            <Text style={[styles.email, { color: colors.gray500 }]} numberOfLines={1}>
              {p.email}
            </Text>
          </View>
        </View>
        {!isOrganizer && (
          <Pressable
            onPress={() => toggleMute(p.id)}
            disabled={isToggling}
            style={({ pressed }) => [
              styles.toggleButton,
              {
                backgroundColor: isMuted ? '#d1fae5' : colors.gray100,
                opacity: pressed || isToggling ? 0.6 : 1,
              },
            ]}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color={isMuted ? '#065f46' : colors.text} />
            ) : (
              <Ionicons
                name={isMuted ? 'mic-outline' : 'mic-off-outline'}
                size={14}
                color={isMuted ? '#065f46' : colors.text}
              />
            )}
            <Text
              style={[
                styles.toggleText,
                { color: isMuted ? '#065f46' : colors.text },
              ]}
            >
              {isMuted ? 'Démuter' : 'Muter'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primary + '22' }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Permissions du groupe
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.gray500 }]}>
                  Réservé à l&apos;organisateur
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Section : qui peut écrire */}
            <View style={[styles.section, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Qui peut écrire ?
              </Text>
              {MODE_OPTIONS.map((opt) => {
                const isActive = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleModeChange(opt.value)}
                    disabled={savingMode}
                    style={({ pressed }) => [
                      styles.modeRow,
                      {
                        borderColor: isActive ? colors.primary : colors.gray200,
                        backgroundColor: isActive ? colors.primary + '11' : colors.card,
                        opacity: pressed || savingMode ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isActive ? colors.primary : colors.gray300 },
                      ]}
                    >
                      {isActive && (
                        <View
                          style={[styles.radioInner, { backgroundColor: colors.primary }]}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modeTitle, { color: isActive ? colors.primary : colors.text }]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.modeDescription, { color: colors.gray500 }]}>
                        {opt.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Section : participants + mute */}
            <View style={styles.section}>
              <View style={styles.participantsHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Membres du groupe ({participants.length})
                </Text>
                {mutedIds.size > 0 && (
                  <Text style={[styles.mutedCount, { color: colors.gray500 }]}>
                    {mutedIds.size} muté{mutedIds.size > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              {loadingMuted ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.gray500} />
                </View>
              ) : (
                <FlatList
                  data={participants}
                  keyExtractor={(p) => String(p.id)}
                  renderItem={renderParticipant}
                  scrollEnabled={false}
                  initialNumToRender={8}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews
                  getItemLayout={(_, i) => ({ length: GROUP_PARTICIPANT_HEIGHT, offset: GROUP_PARTICIPANT_HEIGHT * i, index: i })}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mutedCount: {
    fontSize: 11,
  },
  loaderWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '700',
  },
  participantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  email: {
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
