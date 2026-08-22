import React, { useState, useEffect, useRef, memo } from 'react';
import { haptics } from '../../utils/haptics';
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
import { useTranslation } from 'react-i18next';
import { eventsAPI } from '../../api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useVerificationGuard } from '../../hooks/useVerificationGuard';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCompactNumber } from '../../lib/utils/numberFormatters';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
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

function FollowEventButtonImpl({
  eventId,
  variant = 'default',
  showFollowerCount = false,
  onFollowChange,
  initialFollowing = false,
}: FollowEventButtonProps) {
  const { user } = useAuth();
  const { requireVerification } = useVerificationGuard();
  const { maybePromptForPushPermission } = useNotifications();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showAlert, showError, showWarning } = useAlert();
  const { toastError } = useFeedback();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
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

  // Sync avec le prop `initialFollowing` quand il change après mount.
  // Cas typique : sur EventDetailsScreen il y a 2 instances de ce composant
  // (icône-only dans le header + default dans la section "Reste connecté").
  // Quand l'une toggle, le parent met à jour son state et le rediffuse via
  // initialFollowing — sans cet effet, l'autre instance reste désynchronisée
  // (l'icône reste "non suivi" alors que le bouton "Sauvegardé" l'est, etc.).
  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

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

  // Garde anti double-tap (l'UI bascule instantanément, sans spinner).
  const toggleInFlight = useRef(false);

  const handleToggleFollow = async () => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    requireVerification(async () => {
      if (toggleInFlight.current) return;
      toggleInFlight.current = true;

      const next = !isFollowing;
      // UI OPTIMISTE : on bascule immédiatement (feel instantané), on rollback
      // seulement si l'API échoue.
      haptics.selection();
      setIsFollowing(next);
      if (showFollowerCount) {
        setFollowersCount(prev => (next ? prev + 1 : Math.max(0, prev - 1)));
      }
      onFollowChange?.(next);
      if (next) {
        // Moment idéal pour demander la permission push : l'utilisateur vient
        // de signaler qu'il veut être tenu au courant. No-op si déjà traité.
        maybePromptForPushPermission();
      }

      try {
        if (next) {
          await eventsAPI.followEvent(eventId, preferences);
        } else {
          await eventsAPI.unfollowEvent(eventId);
        }
      } catch (error) {
        if (__DEV__) console.error('Error toggling follow:', error);
        // Rollback
        setIsFollowing(!next);
        if (showFollowerCount) {
          setFollowersCount(prev => (next ? Math.max(0, prev - 1) : prev + 1));
        }
        onFollowChange?.(!next);
        toastError(t('componentsEvents.followError'));
      } finally {
        toggleInFlight.current = false;
      }
    });
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    try {
      await eventsAPI.updateFollowPreferences(eventId, preferences);
      setShowPreferences(false);
    } catch (error) {
      if (__DEV__) console.error('Error updating preferences:', error);
      toastError(t('componentsEvents.followPreferencesError'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectNotificationLevel = () => {
    showAlert(
      t('componentsEvents.followLevelTitle'),
      t('componentsEvents.followLevelMessage'),
      [
        {
          text: t('componentsEvents.followLevelAll'),
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'all' })),
        },
        {
          text: t('componentsEvents.followLevelImportant'),
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'important' })),
        },
        {
          text: t('componentsEvents.followLevelNone'),
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'none' })),
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      'info'
    );
  };

  const getNotificationLabel = () => {
    switch (preferences.notification_preference) {
      case 'all':
        return t('componentsEvents.followNotifAll');
      case 'important':
        return t('componentsEvents.followNotifImportant');
      case 'none':
        return t('componentsEvents.followNotifNone');
      default:
        return t('componentsEvents.followNotifImportant');
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
          isFollowing && { backgroundColor: colors.accent + '1A' },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.accent : colors.gray500} />
        ) : (
          <Ionicons
            name={isFollowing ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isFollowing ? colors.accent : colors.gray600}
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
          isFollowing && { backgroundColor: colors.accent + '1A' },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.accent : colors.gray600} />
        ) : (
          <>
            <Ionicons
              name={isFollowing ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isFollowing ? colors.accent : colors.gray600}
            />
            <Text style={[styles.compactText, { color: colors.gray700 }, isFollowing && { color: colors.accent }]}>
              {isFollowing ? t('componentsEvents.followSaveLabel') : t('componentsEvents.followSaveLabelDefault')}
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
            isFollowing ? [styles.mainButtonFollowing, { backgroundColor: colors.accent + '1A', borderColor: colors.accent + '40' }] : [styles.mainButtonDefault, { backgroundColor: colors.primary }],
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.accent : Colors.white} />
          ) : (
            <>
              <Ionicons
                name={isFollowing ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isFollowing ? colors.accent : Colors.white}
              />
              <Text style={[styles.mainButtonText, isFollowing && { color: colors.accent }]}>
                {isFollowing ? t('componentsEvents.followMainSaved') : t('componentsEvents.followMainDefault')}
              </Text>
              {showFollowerCount && followersCount > 0 && (
                <View style={[styles.badge, isFollowing && { backgroundColor: colors.accent + '26' }]}>
                  <Text
                    style={[styles.badgeText, isFollowing && { color: colors.accent }]}
                    numberOfLines={1}
                  >
                    {formatCompactNumber(followersCount, { fallbackZero: true })}
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

      {/* === EDITORIAL PREFERENCES MODAL === */}
      <Modal
        visible={showPreferences}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreferences(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header tile */}
          <View style={[styles.modalHeaderE, { backgroundColor: colors.background, borderBottomColor: 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.modalHeaderTopRow}>
              <TouchableOpacity
                onPress={() => setShowPreferences(false)}
                style={[styles.modalIconDisc, { backgroundColor: colors.gray100 }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.gray600} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrowE, { color: colors.accent }]}>{t('componentsEvents.followModalEyebrow')}</Text>
                <Text style={[styles.modalTitleE, { color: colors.text }]}>{t('componentsEvents.followModalTitle')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.modalContentE}>
            {/* === LEVEL SEGMENTED === */}
            <View style={styles.section}>
              <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>{t('componentsEvents.followStepLevel')}</Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('componentsEvents.followLevelSectionTitle')}</Text>
              <View style={styles.levelSegmented}>
                {[
                  { key: 'all' as const, label: t('componentsEvents.followLevelAll'), icon: 'notifications' as const, eyebrow: t('componentsEvents.followLevelMaxEyebrow') },
                  { key: 'important' as const, label: t('componentsEvents.followLevelImportant'), icon: 'star' as const, eyebrow: t('componentsEvents.followLevelMediumEyebrow') },
                  { key: 'none' as const, label: t('componentsEvents.followLevelNone'), icon: 'notifications-off' as const, eyebrow: t('componentsEvents.followLevelOffEyebrow') },
                ].map((level) => {
                  const active = preferences.notification_preference === level.key;
                  return (
                    <TouchableOpacity
                      key={level.key}
                      style={[
                        styles.levelSegment,
                        {
                          backgroundColor: colors.card,
                          borderColor: active ? colors.primary : 'rgba(0,0,0,0.06)',
                        },
                        active && Shadows.buttonPrimary,
                      ]}
                      onPress={() => setPreferences(p => ({ ...p, notification_preference: level.key }))}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[
                          styles.levelIconBox,
                          { backgroundColor: active ? colors.primary : `${colors.primary}15` },
                        ]}
                      >
                        <Ionicons
                          name={level.icon}
                          size={16}
                          color={active ? '#FFFFFF' : colors.primary}
                        />
                      </View>
                      <Text style={[styles.levelEyebrow, { color: colors.accent }]}>{level.eyebrow}</Text>
                      <Text style={[styles.levelLabelE, { color: colors.text }]}>{level.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* === CHANNELS === */}
            <View style={styles.section}>
              <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>{t('componentsEvents.followStepChannels')}</Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('componentsEvents.followChannelsTitle')}</Text>
              <View style={[styles.switchCard, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }]}>
                <View style={styles.switchRowE}>
                  <View style={[styles.switchIcon, { backgroundColor: '#3B82F615' }]}>
                    <Ionicons name="mail" size={14} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: colors.text }]}>{t('componentsEvents.followChannelEmailTitle')}</Text>
                    <Text style={[styles.switchSub, { color: colors.gray500 }]}>{t('componentsEvents.followChannelEmailSub')}</Text>
                  </View>
                  <Switch
                    value={preferences.notify_email}
                    onValueChange={(value) => setPreferences(p => ({ ...p, notify_email: value }))}
                    trackColor={{ false: Colors.gray200, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={[styles.switchDivider, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.switchRowE}>
                  <View style={[styles.switchIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="notifications" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: colors.text }]}>{t('componentsEvents.followChannelPushTitle')}</Text>
                    <Text style={[styles.switchSub, { color: colors.gray500 }]}>{t('componentsEvents.followChannelPushSub')}</Text>
                  </View>
                  <Switch
                    value={preferences.notify_push}
                    onValueChange={(value) => setPreferences(p => ({ ...p, notify_push: value }))}
                    trackColor={{ false: Colors.gray200, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* === EVENTS === */}
            <View style={styles.section}>
              <Text style={[styles.sectionEyebrowE, { color: colors.accent }]}>{t('componentsEvents.followStepTypes')}</Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('componentsEvents.followTypesTitle')}</Text>
              <View style={[styles.switchCard, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }]}>
                <View style={styles.switchRowE}>
                  <View style={[styles.switchIcon, { backgroundColor: '#A855F715' }]}>
                    <Ionicons name="megaphone" size={14} color="#A855F7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: colors.text }]}>{t('componentsEvents.followTypeUpdatesTitle')}</Text>
                    <Text style={[styles.switchSub, { color: colors.gray500 }]}>{t('componentsEvents.followTypeUpdatesSub')}</Text>
                  </View>
                  <Switch
                    value={preferences.notify_updates}
                    onValueChange={(value) => setPreferences(p => ({ ...p, notify_updates: value }))}
                    trackColor={{ false: Colors.gray200, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={[styles.switchDivider, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.switchRowE}>
                  <View style={[styles.switchIcon, { backgroundColor: '#F59E0B15' }]}>
                    <Ionicons name="alarm" size={14} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: colors.text }]}>{t('componentsEvents.followTypeRemindersTitle')}</Text>
                    <Text style={[styles.switchSub, { color: colors.gray500 }]}>{t('componentsEvents.followTypeRemindersSub')}</Text>
                  </View>
                  <Switch
                    value={preferences.notify_reminders}
                    onValueChange={(value) => setPreferences(p => ({ ...p, notify_reminders: value }))}
                    trackColor={{ false: Colors.gray200, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={[styles.switchDivider, { backgroundColor: 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.switchRowE}>
                  <View style={[styles.switchIcon, { backgroundColor: '#EF444415' }]}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchTitle, { color: colors.text }]}>{t('componentsEvents.followTypeCancellationTitle')}</Text>
                    <Text style={[styles.switchSub, { color: colors.gray500 }]}>{t('componentsEvents.followTypeCancellationSub')}</Text>
                  </View>
                  <Switch
                    value={preferences.notify_cancellation}
                    onValueChange={(value) => setPreferences(p => ({ ...p, notify_cancellation: value }))}
                    trackColor={{ false: Colors.gray200, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* === FOOTER CTA === */}
          <View style={[styles.modalFooter, { backgroundColor: colors.background, borderTopColor: 'rgba(0,0,0,0.06)' }]}>
            <TouchableOpacity
              style={[styles.modalSavePill, isLoading && { opacity: 0.5 }, Shadows.buttonPrimary]}
              onPress={handleUpdatePreferences}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalSaveEyebrow}>{t('componentsEvents.followSaveEyebrow')}</Text>
                    <Text style={styles.modalSaveLabel}>{t('componentsEvents.followSaveCta')}</Text>
                  </View>
                  <View style={styles.modalSaveArrow}>
                    <Ionicons name="checkmark" size={18} color={Colors.white} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const FollowEventButton = memo(FollowEventButtonImpl);
export default FollowEventButton;

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
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.3,
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
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.gray500,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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

  // === EDITORIAL MODAL ===
  modalHeaderE: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  modalHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalIconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  modalContentE: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 19,
    letterSpacing: -0.5,
    lineHeight: 23,
    marginBottom: Spacing.sm,
  },

  // === LEVEL SEGMENTED ===
  levelSegmented: {
    flexDirection: 'row',
    gap: 6,
  },
  levelSegment: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'flex-start',
    gap: 4,
  },
  levelIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  levelEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  levelLabelE: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.3,
    lineHeight: 16,
  },

  // === SWITCH CARD ===
  switchCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  switchRowE: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
  },
  switchIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
  },
  switchSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  switchDivider: {
    height: 1,
  },

  // === FOOTER ===
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  modalSavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
  },
  modalSaveEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  modalSaveLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  modalSaveArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
});
