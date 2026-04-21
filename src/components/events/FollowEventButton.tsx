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
import { eventsAPI } from '../../api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';

interface FollowEventButtonProps {
  eventId: string;
  variant?: 'default' | 'compact' | 'icon-only';
  showFollowerCount?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  initialFollowing?: boolean;
}

interface FollowPreferences {
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_updates: boolean;
  notify_reminders: boolean;
  notify_cancellation: boolean;
}

export default function FollowEventButton({
  eventId,
  variant = 'default',
  showFollowerCount = false,
  onFollowChange,
  initialFollowing = false,
}: FollowEventButtonProps) {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showAlert, showError, showWarning } = useAlert();
  const { colors, isDark } = useTheme();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<FollowPreferences>({
    notification_preference: 'important',
    notify_email: true,
    notify_push: true,
    notify_updates: true,
    notify_reminders: true,
    notify_cancellation: true,
  });

  useEffect(() => {
    if (user) {
      loadFollowStatus();
    }
    if (showFollowerCount) {
      loadFollowersCount();
    }
  }, [eventId, user]);

  const loadFollowStatus = async () => {
    try {
      const response = await eventsAPI.isFollowing(eventId);
      setIsFollowing(response.data.is_following);
      if (response.data.is_following && response.data.follow) {
        setPreferences({
          notification_preference: response.data.follow.notification_preference || 'important',
          notify_email: response.data.follow.notify_email ?? true,
          notify_push: response.data.follow.notify_push ?? true,
          notify_updates: response.data.follow.notify_updates ?? true,
          notify_reminders: response.data.follow.notify_reminders ?? true,
          notify_cancellation: response.data.follow.notify_cancellation ?? true,
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Error checking follow status:', error);
    }
  };

  const loadFollowersCount = async () => {
    try {
      const response = await eventsAPI.getFollowersCount(eventId);
      setFollowersCount(response.data.followers_count || 0);
    } catch (error) {
      if (__DEV__) console.error('Error loading followers count:', error);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    setIsLoading(true);

    try {
      if (isFollowing) {
        await eventsAPI.unfollowEvent(eventId);
        setIsFollowing(false);
        if (showFollowerCount) setFollowersCount(prev => Math.max(0, prev - 1));
        onFollowChange?.(false);
      } else {
        await eventsAPI.followEvent(eventId, preferences);
        setIsFollowing(true);
        if (showFollowerCount) setFollowersCount(prev => prev + 1);
        onFollowChange?.(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling follow:', error);
      showError('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    try {
      await eventsAPI.updateFollowPreferences(eventId, preferences);
      setShowPreferences(false);
    } catch (error) {
      if (__DEV__) console.error('Error updating preferences:', error);
      showError('Erreur', 'Impossible de mettre à jour les préférences');
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
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isFollowing ? "Ne plus suivre l'\u00e9v\u00e9nement" : "Suivre l'\u00e9v\u00e9nement"}
        accessibilityState={{ selected: isFollowing }}
        style={[
          styles.iconButton,
          { backgroundColor: colors.gray100 },
          isFollowing && { backgroundColor: colors.errorBg },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.error : colors.gray500} />
        ) : (
          <Ionicons
            name={isFollowing ? 'heart' : 'heart-outline'}
            size={22}
            color={isFollowing ? colors.error : colors.gray600}
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
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isFollowing ? "Ne plus suivre l'\u00e9v\u00e9nement" : "Suivre l'\u00e9v\u00e9nement"}
        accessibilityState={{ selected: isFollowing }}
        style={[
          styles.compactButton,
          { backgroundColor: colors.gray100 },
          isFollowing && { backgroundColor: colors.errorBg },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.error : colors.gray600} />
        ) : (
          <>
            <Ionicons
              name={isFollowing ? 'heart' : 'heart-outline'}
              size={16}
              color={isFollowing ? colors.error : colors.gray600}
            />
            <Text style={[styles.compactText, { color: colors.gray700 }, isFollowing && { color: colors.error }]}>
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? "Ne plus suivre l'\u00e9v\u00e9nement" : "Suivre l'\u00e9v\u00e9nement"}
          accessibilityState={{ selected: isFollowing }}
          style={[
            styles.mainButton,
            isFollowing ? [styles.mainButtonFollowing, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }] : styles.mainButtonDefault,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.error : Colors.white} />
          ) : (
            <>
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={20}
                color={isFollowing ? colors.error : Colors.white}
              />
              <Text style={[styles.mainButtonText, isFollowing && { color: colors.error }]}>
                {isFollowing ? 'Vous suivez cet événement' : 'Suivre cet événement'}
              </Text>
              {showFollowerCount && followersCount > 0 && (
                <View style={[styles.badge, isFollowing && { backgroundColor: colors.errorLight }]}>
                  <Text style={[styles.badgeText, isFollowing && { color: colors.error }]}>
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
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
            <TouchableOpacity onPress={() => setShowPreferences(false)}>
              <Text style={[styles.modalCancel, { color: colors.gray600 }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.gray900 }]}>Préférences</Text>
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
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={preferences.notify_email ? Colors.primary : Colors.gray400}
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
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={preferences.notify_push ? Colors.primary : Colors.gray400}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>Me notifier pour</Text>
            <View style={[styles.switchRow, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.switchText, { color: colors.gray700 }]}>Mises à jour de l'événement</Text>
              <Switch
                value={preferences.notify_updates}
                onValueChange={(value) => setPreferences(p => ({ ...p, notify_updates: value }))}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={preferences.notify_updates ? Colors.primary : Colors.gray400}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.switchText, { color: colors.gray700 }]}>Rappels (7j et 1j avant)</Text>
              <Switch
                value={preferences.notify_reminders}
                onValueChange={(value) => setPreferences(p => ({ ...p, notify_reminders: value }))}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={preferences.notify_reminders ? Colors.primary : Colors.gray400}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.switchText, { color: colors.gray700 }]}>Annulations</Text>
              <Switch
                value={preferences.notify_cancellation}
                onValueChange={(value) => setPreferences(p => ({ ...p, notify_cancellation: value }))}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={preferences.notify_cancellation ? Colors.primary : Colors.gray400}
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
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  mainButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  mainButtonTextFollowing: {
    color: Colors.error,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeFollowing: {
    backgroundColor: Colors.errorLight,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  badgeTextFollowing: {
    color: Colors.error,
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
    backgroundColor: Colors.errorBg,
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
    backgroundColor: Colors.errorBg,
  },
  compactText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  compactTextActive: {
    color: Colors.error,
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
