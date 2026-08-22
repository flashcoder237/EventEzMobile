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

import React, { useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { messagesAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';

import { useFeedback } from '../../contexts/FeedbackContext';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
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
  titleKey: string;
  descKey: string;
}> = [
  { value: 'all', titleKey: 'componentsMessages.groupModeAllTitle', descKey: 'componentsMessages.groupModeAllDesc' },
  { value: 'organizer_only', titleKey: 'componentsMessages.groupModeOrganizerTitle', descKey: 'componentsMessages.groupModeOrganizerDesc' },
  { value: 'admins_only', titleKey: 'componentsMessages.groupModeAdminsTitle', descKey: 'componentsMessages.groupModeAdminsDesc' },
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
  const { t } = useTranslation();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { toastSuccess } = useFeedback();

  const [mode, setMode] = useState<'all' | 'organizer_only' | 'admins_only'>(initialPostingMode);
  const [savingMode, setSavingMode] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<number>>(new Set());
  const [loadingMuted, setLoadingMuted] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  // IDs des participants retirés depuis l'ouverture du panel — filtre la liste
  // affichée sans avoir à refetcher conversationDetails côté parent. Le parent
  // re-fetch au prochain mount via `onMutationApplied`.
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  const [removingId, setRemovingId] = useState<number | null>(null);

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
      toastSuccess(t('componentsMessages.groupPermissionsUpdated'));
      onMutationApplied?.();
    } catch (err: any) {
      showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'componentsMessages.groupPermissionsError' }).message);
    } finally {
      setSavingMode(false);
    }
  };

  const handleRemoveParticipant = (userId: number, displayName: string) => {
    // Action destructive et irréversible → modale de confirmation du design
    // system (cf. échelle de retour dans FeedbackContext).
    showConfirm(
      t('componentsMessages.groupRemoveConfirmTitle'),
      t('componentsMessages.groupRemoveConfirmBody', { name: displayName }),
      async () => {
        setRemovingId(userId);
        try {
          await messagesAPI.removeParticipant(String(conversationId), String(userId));
          setRemovedIds(prev => {
            const next = new Set(prev);
            next.add(userId);
            return next;
          });
          showSuccess(
            t('componentsMessages.groupRemoveSuccess'),
            t('componentsMessages.groupRemoveSuccessBody', { name: displayName }),
          );
          onMutationApplied?.();
        } catch (err: any) {
          showError(
            t('common.error'),
            getApiErrorMessage(err, t, { fallbackKey: 'componentsMessages.groupRemoveError' }).message,
          );
        } finally {
          setRemovingId(null);
        }
      },
      undefined,
      { confirmText: t('common.remove', { defaultValue: 'Retirer' }), destructive: true },
    );
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
        showSuccess(t('componentsMessages.groupUnmuted'), t('componentsMessages.groupUnmutedMsg'));
      } else {
        await messagesAPI.muteParticipant(conversationId, userId);
        setMutedIds((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });
        showSuccess(t('componentsMessages.groupMuted'), t('componentsMessages.groupMutedMsg'));
      }
      onMutationApplied?.();
    } catch (err: any) {
      showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'componentsMessages.groupActionImpossible' }).message);
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
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{t('componentsMessages.groupBadgeOrganizer')}</Text>
                </View>
              )}
              {isMuted && (
                <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: '#92400e' }]}>{t('componentsMessages.groupBadgeMuted')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.email, { color: colors.gray500 }]} numberOfLines={1}>
              {p.email}
            </Text>
          </View>
        </View>
        {!isOrganizer && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
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
                {isMuted ? t('componentsMessages.groupBtnUnmute') : t('componentsMessages.groupBtnMute')}
              </Text>
            </Pressable>
            {/* Bouton retirer du groupe — destructif. Confirmation native
                avant l'appel backend (removeParticipant). */}
            <Pressable
              onPress={() => handleRemoveParticipant(p.id, displayName)}
              disabled={removingId === p.id}
              style={({ pressed }) => [
                styles.removeButton,
                {
                  backgroundColor: '#FEE2E2',
                  opacity: pressed || removingId === p.id ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('componentsMessages.groupRemoveA11y', { name: displayName })}
            >
              {removingId === p.id ? (
                <ActivityIndicator size="small" color="#991B1B" />
              ) : (
                <Ionicons name="person-remove-outline" size={14} color="#991B1B" />
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  // Liste filtrée : exclure les participants déjà retirés (UI optimiste).
  const visibleParticipants = useMemo(
    () => participants.filter(p => !removedIds.has(p.id)),
    [participants, removedIds],
  );

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
                  {t('componentsMessages.groupHeaderTitle')}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.gray500 }]}>
                  {t('componentsMessages.groupHeaderSubtitle')}
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
                {t('componentsMessages.groupSectionWho')}
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
                        {t(opt.titleKey)}
                      </Text>
                      <Text style={[styles.modeDescription, { color: colors.gray500 }]}>
                        {t(opt.descKey)}
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
                  {t('componentsMessages.groupSectionMembers', { count: visibleParticipants.length })}
                </Text>
                {mutedIds.size > 0 && (
                  <Text style={[styles.mutedCount, { color: colors.gray500 }]}>
                    {t('componentsMessages.groupMutedCount', { count: mutedIds.size })}
                  </Text>
                )}
              </View>
              {loadingMuted ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="small" color={colors.gray500} />
                </View>
              ) : (
                <FlatList
                  data={visibleParticipants}
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
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
