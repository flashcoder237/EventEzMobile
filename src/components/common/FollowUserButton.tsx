import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usersAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';

interface FollowUserButtonProps {
  userId: number;
  variant?: 'default' | 'compact' | 'icon-only';
  showFollowerCount?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  initialFollowing?: boolean;
}

interface FollowPreferences {
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_new_event: boolean;
}

export default function FollowUserButton({
  userId,
  variant = 'default',
  showFollowerCount = false,
  onFollowChange,
  initialFollowing = false,
}: FollowUserButtonProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showAlert, showError, showWarning } = useAlert();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<FollowPreferences>({
    notification_preference: 'important',
    notify_email: true,
    notify_push: true,
    notify_new_event: true,
  });

  useEffect(() => {
    if (user) {
      loadFollowStatus();
    }
    if (showFollowerCount) {
      loadFollowersCount();
    }
  }, [userId, user]);

  const loadFollowStatus = async () => {
    try {
      const response = await usersAPI.isFollowingUser(userId);
      setIsFollowing(response.data.is_following);
      if (response.data.is_following && response.data.follow) {
        setPreferences({
          notification_preference: response.data.follow.notification_preference || 'important',
          notify_email: response.data.follow.notify_email ?? true,
          notify_push: response.data.follow.notify_push ?? true,
          notify_new_event: response.data.follow.notify_new_event ?? true,
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Error checking user follow status:', error);
    }
  };

  const loadFollowersCount = async () => {
    try {
      const response = await usersAPI.getUserFollowersCount(userId);
      setFollowersCount(response.data.followers_count || 0);
    } catch (error) {
      if (__DEV__) console.error('Error loading user followers count:', error);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      showWarning('Connexion requise', 'Vous devez etre connecte pour suivre un utilisateur');
      return;
    }

    setIsLoading(true);

    try {
      if (isFollowing) {
        await usersAPI.unfollowUser(userId);
        setIsFollowing(false);
        if (showFollowerCount) setFollowersCount(prev => Math.max(0, prev - 1));
        onFollowChange?.(false);
      } else {
        await usersAPI.followUser(userId, preferences);
        setIsFollowing(true);
        if (showFollowerCount) setFollowersCount(prev => prev + 1);
        onFollowChange?.(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling user follow:', error);
      showError('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    try {
      await usersAPI.updateUserFollowPreferences(userId, preferences);
      setShowPreferences(false);
    } catch (error) {
      if (__DEV__) console.error('Error updating user follow preferences:', error);
      showError('Erreur', 'Impossible de mettre a jour les preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const selectNotificationLevel = () => {
    showAlert(
      'Niveau de notifications',
      'Choisissez le niveau de notifications',
      [
        {
          text: 'Toutes',
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'all' })),
        },
        {
          text: 'Importantes',
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'important' })),
        },
        {
          text: 'Aucune',
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'none' })),
        },
        { text: 'Annuler', style: 'cancel' },
      ],
      'info'
    );
  };

  const getNotificationLabel = () => {
    switch (preferences.notification_preference) {
      case 'all':
        return 'Toutes les notifications';
      case 'important':
        return 'Importantes uniquement';
      case 'none':
        return 'Aucune notification';
      default:
        return 'Importantes uniquement';
    }
  };

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <TouchableOpacity
        onPress={handleToggleFollow}
        disabled={isLoading}
        activeOpacity={TOUCH_OPACITY}
        style={[
          styles.iconButton,
          { backgroundColor: colors.gray100 },
          isFollowing && [styles.iconButtonActive, { backgroundColor: colors.primaryBg }],
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.primary : colors.gray500} />
        ) : (
          <Ionicons
            name={isFollowing ? 'person' : 'person-add-outline'}
            size={22}
            color={isFollowing ? colors.primary : colors.gray600}
          />
        )}
      </TouchableOpacity>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={handleToggleFollow}
        disabled={isLoading}
        activeOpacity={TOUCH_OPACITY}
        style={[
          styles.compactButton,
          { backgroundColor: colors.gray100 },
          isFollowing && [styles.compactButtonActive, { backgroundColor: colors.primaryBg }],
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.primary : colors.gray600} />
        ) : (
          <>
            <Ionicons
              name={isFollowing ? 'person' : 'person-add-outline'}
              size={16}
              color={isFollowing ? colors.primary : colors.gray600}
            />
            <Text style={[styles.compactText, { color: colors.gray700 }, isFollowing && [styles.compactTextActive, { color: colors.primary }]]}>
              {isFollowing ? 'Suivi' : 'Suivre'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // Default variant (full button with preferences)
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={handleToggleFollow}
          disabled={isLoading}
          activeOpacity={TOUCH_OPACITY}
          style={[
            styles.mainButton,
            isFollowing
              ? [styles.mainButtonFollowing, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]
              : [styles.mainButtonDefault, { backgroundColor: colors.primary }],
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.primary : Colors.white} />
          ) : (
            <>
              <Ionicons
                name={isFollowing ? 'person' : 'person-add-outline'}
                size={20}
                color={isFollowing ? colors.primary : Colors.white}
              />
              <Text style={[styles.mainButtonText, isFollowing && [styles.mainButtonTextFollowing, { color: colors.primary }]]}>
                {isFollowing ? 'Vous suivez cet utilisateur' : 'Suivre cet utilisateur'}
              </Text>
              {showFollowerCount && followersCount > 0 && (
                <View style={[styles.badge, isFollowing && [styles.badgeFollowing, { backgroundColor: colors.primaryBg }]]}>
                  <Text style={[styles.badgeText, isFollowing && [styles.badgeTextFollowing, { color: colors.primary }]]}>
                    {followersCount}
                  </Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>

        {isFollowing && (
          <TouchableOpacity
            onPress={() => setShowPreferences(true)}
            activeOpacity={TOUCH_OPACITY}
            style={[styles.preferencesButton, { backgroundColor: colors.gray100 }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.gray600} />
          </TouchableOpacity>
        )}
      </View>

      {/* Preferences Modal */}
      <Modal
        visible={showPreferences}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreferences(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
            <TouchableOpacity onPress={() => setShowPreferences(false)}>
              <Text style={[styles.modalCancel, { color: colors.gray600 }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.gray900 }]}>Preferences</Text>
            <TouchableOpacity onPress={handleUpdatePreferences} disabled={isLoading}>
              <Text style={[styles.modalSave, { color: colors.primary }, isLoading && styles.modalSaveDisabled]}>
                Enregistrer
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>Niveau de notifications</Text>
            <TouchableOpacity style={[styles.levelSelector, { backgroundColor: colors.gray50 }]} onPress={selectNotificationLevel}>
              <Text style={[styles.levelText, { color: colors.gray900 }]}>{getNotificationLabel()}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>Canaux de notification</Text>
            <View style={[styles.switchRow, { borderBottomColor: colors.gray100 }]}>
              <View style={styles.switchLabel}>
                <Ionicons name="mail-outline" size={20} color={colors.gray600} />
                <Text style={[styles.switchText, { color: colors.gray700 }]}>Notifications par email</Text>
              </View>
              <Switch
                value={preferences.notify_email}
                onValueChange={(value) => setPreferences(p => ({ ...p, notify_email: value }))}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={preferences.notify_email ? colors.primary : colors.gray400}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.gray100 }]}>
              <View style={styles.switchLabel}>
                <Ionicons name="notifications-outline" size={20} color={colors.gray600} />
                <Text style={[styles.switchText, { color: colors.gray700 }]}>Notifications push</Text>
              </View>
              <Switch
                value={preferences.notify_push}
                onValueChange={(value) => setPreferences(p => ({ ...p, notify_push: value }))}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={preferences.notify_push ? colors.primary : colors.gray400}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>Me notifier pour</Text>
            <View style={[styles.switchRow, { borderBottomColor: colors.gray100 }]}>
              <View style={styles.switchLabel}>
                <Ionicons name="calendar-outline" size={20} color={colors.gray600} />
                <Text style={[styles.switchText, { color: colors.gray700 }]}>Nouveaux evenements</Text>
              </View>
              <Switch
                value={preferences.notify_new_event}
                onValueChange={(value) => setPreferences(p => ({ ...p, notify_new_event: value }))}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={preferences.notify_new_event ? colors.primary : colors.gray400}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  mainButtonDefault: {
    backgroundColor: Colors.primary,
  },
  mainButtonFollowing: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  mainButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  mainButtonTextFollowing: {
    color: Colors.primary,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeFollowing: {
    backgroundColor: Colors.primaryBg,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  badgeTextFollowing: {
    color: Colors.primary,
  },
  preferencesButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: Colors.primaryBg,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    gap: Spacing.xs,
  },
  compactButtonActive: {
    backgroundColor: Colors.primaryBg,
  },
  compactText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  compactTextActive: {
    color: Colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  modalCancel: {
    fontSize: FontSizes.base,
    color: Colors.gray600,
  },
  modalSave: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  levelText: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  switchText: {
    fontSize: FontSizes.base,
    color: Colors.gray700,
  },
});
