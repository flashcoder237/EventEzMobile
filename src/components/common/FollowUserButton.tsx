import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../../api';
import { formatCompactNumber } from '../../lib/utils/numberFormatters';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isValidNumericId } from '../../lib/utils/numericId';
import { haptics } from '../../utils/haptics';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import {
  EditorialCanvas,
  WatermarkNumeral,
  EditorialHeader,
  editorial,
} from '../ui/editorial';

interface FollowUserButtonProps {
  userId: number;
  variant?: 'default' | 'compact' | 'icon-only';
  showFollowerCount?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  /**
   * État « je suis » connu de l'appelant (UserSerializer.is_following). Quand
   * il est fourni (booléen), on SAUTE l'appel `/users/{id}/is_following/` au
   * montage. `undefined` = inconnu → le bouton le récupère lui-même.
   */
  initialFollowing?: boolean;
  /**
   * Compteur d'abonnés connu de l'appelant (UserSerializer.followers_count).
   * Fourni → pas d'appel `/users/{id}/followers_count/` au montage.
   */
  initialFollowersCount?: number;
}

interface FollowPreferences {
  notification_preference: 'all' | 'important' | 'none';
  notify_email: boolean;
  notify_push: boolean;
  notify_new_event: boolean;
}

function FollowUserButtonImpl({
  userId,
  variant = 'default',
  showFollowerCount = false,
  onFollowChange,
  initialFollowing,
  initialFollowersCount,
}: FollowUserButtonProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showAlert, showError, showWarning } = useAlert();
  const { toastError } = useFeedback();
  // Safe area inset bas — utilisé pour décaler le sticky bottom CTA du modal
  // au-dessus de la nav system Android (gesture bar / 3-button) ou home
  // indicator iOS, sinon le bouton chevauche.
  const insets = useSafeAreaInsets();
  const [isFollowing, setIsFollowing] = useState(initialFollowing ?? false);
  // `isLoading` ne concerne plus que l'enregistrement des préférences : le
  // toggle suivre/ne plus suivre est optimiste (pas de spinner).
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount ?? 0);
  // Anti double-tap pendant la requête de toggle (ref : pas de re-render).
  const toggleInFlightRef = useRef(false);
  // Préférences de suivi déjà chargées depuis le serveur (via is_following) ?
  const prefsLoadedRef = useRef(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<FollowPreferences>({
    notification_preference: 'important',
    notify_email: true,
    notify_push: true,
    notify_new_event: true,
  });

  // Un `userId` invalide (NaN quand l'appelant a fait `Number(slug)`, ou 0)
  // produisait des appels `/api/users/NaN/...` — trois 404 par affichage, et
  // une erreur affichee a l'utilisateur au clic. On ne tente rien tant que
  // l'identifiant n'est pas exploitable.
  const hasValidUserId = isValidNumericId(userId);

  // Requêtes de montage UNIQUEMENT pour ce que l'appelant n'a pas fourni : le
  // UserSerializer renvoie déjà is_following / followers_count, inutile de
  // refaire 2 allers-retours par affichage.
  useEffect(() => {
    if (!hasValidUserId) return;
    if (user && initialFollowing === undefined) {
      loadFollowStatus();
    }
    if (showFollowerCount && initialFollowersCount === undefined) {
      loadFollowersCount();
    }
  }, [userId, user, hasValidUserId]);

  // Sync avec initialFollowing quand le parent le met à jour (cas où
  // plusieurs instances du même bouton coexistent sur un écran et qu'une
  // autre toggle l'état). Sans cet effet, les instances se désynchronisent.
  useEffect(() => {
    if (initialFollowing !== undefined) setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  useEffect(() => {
    if (initialFollowersCount !== undefined) setFollowersCount(initialFollowersCount);
  }, [initialFollowersCount]);

  const loadFollowStatus = async () => {
    try {
      const response = await usersAPI.isFollowingUser(userId);
      setIsFollowing(response.data.is_following);
      prefsLoadedRef.current = true;
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
    // Anti double-tap : ignore les taps pendant qu'une requête tourne
    if (toggleInFlightRef.current) return;

    // Identifiant invalide : l'appel partait quand même vers
    // `/api/users/NaN/follow/` et l'utilisateur voyait « une erreur est
    // survenue » sans comprendre pourquoi.
    if (!hasValidUserId) return;

    if (!user) {
      showWarning(t('componentsCommon.followLoginRequiredTitle'), t('componentsCommon.followLoginRequiredMsg'));
      return;
    }

    // Toggle OPTIMISTE : l'état bascule tout de suite (plus de spinner pendant
    // l'aller-retour serveur), rollback exact si l'API échoue. Snapshot avant
    // setState pour ne pas dépendre d'un closure stale.
    const wasFollowing = isFollowing;
    const nextFollowing = !wasFollowing;
    toggleInFlightRef.current = true;

    setIsFollowing(nextFollowing);
    if (showFollowerCount) {
      setFollowersCount(prev => (nextFollowing ? prev + 1 : Math.max(0, prev - 1)));
    }
    // Haptique au pic visuel, uniquement à l'abonnement (rien au retrait d'un
    // état — cf. conventions utils/haptics).
    if (nextFollowing) haptics.light();
    onFollowChange?.(nextFollowing);

    try {
      if (wasFollowing) {
        await usersAPI.unfollowUser(userId);
      } else {
        await usersAPI.followUser(userId, preferences);
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling user follow:', error);
      // Rollback
      setIsFollowing(wasFollowing);
      if (showFollowerCount) {
        setFollowersCount(prev => (nextFollowing ? Math.max(0, prev - 1) : prev + 1));
      }
      onFollowChange?.(wasFollowing);
      toastError(t('componentsCommon.followGenericError'));
    } finally {
      toggleInFlightRef.current = false;
    }
  };

  // Les préférences de suivi n'arrivent qu'avec `/is_following/` : si ce
  // fetch a été sauté au montage (état fourni par l'appelant), on les charge
  // à l'ouverture de la modale.
  const openPreferences = () => {
    setShowPreferences(true);
    if (!prefsLoadedRef.current && hasValidUserId && user) {
      loadFollowStatus();
    }
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    try {
      await usersAPI.updateUserFollowPreferences(userId, preferences);
      setShowPreferences(false);
    } catch (error) {
      if (__DEV__) console.error('Error updating user follow preferences:', error);
      toastError(t('componentsCommon.followPrefsError'));
    } finally {
      setIsLoading(false);
    }
  };

  const selectNotificationLevel = () => {
    showAlert(
      t('componentsCommon.followNotifLevelTitle'),
      t('componentsCommon.followNotifLevelMsg'),
      [
        {
          text: t('componentsCommon.followNotifAll'),
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'all' })),
        },
        {
          text: t('componentsCommon.followNotifImportant'),
          onPress: () => setPreferences(p => ({ ...p, notification_preference: 'important' })),
        },
        {
          text: t('componentsCommon.followNotifNone'),
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
        return t('componentsCommon.followNotifAllLabel');
      case 'important':
        return t('componentsCommon.followNotifImportantLabel');
      case 'none':
        return t('componentsCommon.followNotifNoneLabel');
      default:
        return t('componentsCommon.followNotifImportantLabel');
    }
  };

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <TouchableOpacity
        onPress={handleToggleFollow}
        activeOpacity={TOUCH_OPACITY}
        style={[
          styles.iconButton,
          { backgroundColor: colors.gray100 },
          isFollowing && [styles.iconButtonActive, { backgroundColor: colors.primaryBg }],
        ]}
      >
        <Ionicons
          name={isFollowing ? 'person' : 'person-add-outline'}
          size={22}
          color={isFollowing ? colors.primary : colors.gray600}
        />
      </TouchableOpacity>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={handleToggleFollow}
        activeOpacity={TOUCH_OPACITY}
        style={[
          styles.compactButton,
          { backgroundColor: colors.gray100 },
          isFollowing && [styles.compactButtonActive, { backgroundColor: colors.primaryBg }],
        ]}
      >
        <Ionicons
          name={isFollowing ? 'person' : 'person-add-outline'}
          size={16}
          color={isFollowing ? colors.primary : colors.gray600}
        />
        <Text style={[styles.compactText, { color: colors.gray700 }, isFollowing && [styles.compactTextActive, { color: colors.primary }]]}>
          {isFollowing ? t('componentsCommon.followFollowing') : t('componentsCommon.followFollow')}
        </Text>
      </TouchableOpacity>
    );
  }

  // Default variant (full button with preferences)
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={handleToggleFollow}
          activeOpacity={TOUCH_OPACITY}
          style={[
            styles.mainButton,
            isFollowing
              ? [styles.mainButtonFollowing, { backgroundColor: colors.primaryBg, borderColor: colors.primaryLight }]
              : [styles.mainButtonDefault, { backgroundColor: colors.primary }],
          ]}
        >
          {/* Toggle optimiste : l'icône bascule immédiatement, sans spinner. */}
          <Ionicons
            name={isFollowing ? 'checkmark-circle' : 'person-add-outline'}
            size={18}
            color={isFollowing ? colors.primary : Colors.white}
          />
          <Text
            style={[
              styles.mainButtonText,
              isFollowing && [styles.mainButtonTextFollowing, { color: colors.primary }],
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {isFollowing ? t('componentsCommon.followSubscribed') : t('componentsCommon.followFollow')}
          </Text>
          {showFollowerCount && followersCount > 0 && (
            <View
              style={[
                styles.badge,
                isFollowing && [styles.badgeFollowing, { backgroundColor: colors.primaryBg }],
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isFollowing && [styles.badgeTextFollowing, { color: colors.primary }],
                ]}
                numberOfLines={1}
              >
                {formatCompactNumber(followersCount, { fallbackZero: true })}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {isFollowing && (
          <TouchableOpacity
            onPress={openPreferences}
            activeOpacity={TOUCH_OPACITY}
            style={[styles.preferencesButton, { backgroundColor: colors.gray100 }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.gray600} />
          </TouchableOpacity>
        )}
      </View>

      {/* Preferences Modal — éditorial avec EditorialCanvas + WatermarkNumeral */}
      <Modal
        visible={showPreferences}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreferences(false)}
      >
        <EditorialCanvas edges={['top']}>
          <WatermarkNumeral>NOTIF</WatermarkNumeral>
          <View style={{ flex: 1, zIndex: 1 }}>
            <EditorialHeader
              eyebrow={t('componentsCommon.followPrefsTitleEyebrow')}
              title={t('componentsCommon.followPrefsTitle')}
              back
              onBack={() => setShowPreferences(false)}
            />

            <View style={styles.modalContent}>
              {/* Section : niveau de notifications */}
              <View style={styles.modalSection}>
                <View style={styles.editorialSectionHead}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('componentsCommon.followPrefsFrequencyEyebrow')}</Text>
                  <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                    {t('componentsCommon.followPrefsFrequencyTitle')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.levelSelector, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                  onPress={selectNotificationLevel}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.levelLabel, { color: colors.gray500 }]}>{t('componentsCommon.followPrefsSelected')}</Text>
                    <Text style={[styles.levelText, { color: colors.gray900 }]}>{getNotificationLabel()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                </TouchableOpacity>
              </View>

              {/* Section : canaux */}
              <View style={styles.modalSection}>
                <View style={styles.editorialSectionHead}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('componentsCommon.followPrefsChannelsEyebrow')}</Text>
                  <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                    {t('componentsCommon.followPrefsChannelsTitle')}
                  </Text>
                </View>
                <View style={[styles.switchCard, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <View style={styles.switchRowEditorial}>
                    <View style={[styles.switchIcon, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                      <Ionicons name="mail-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.switchBody}>
                      <Text style={[styles.switchTitle, { color: colors.gray900 }]}>{t('componentsCommon.followPrefsEmail')}</Text>
                      <Text style={[styles.switchSubtitle, { color: colors.gray500 }]}>{t('componentsCommon.followPrefsEmailSubtitle')}</Text>
                    </View>
                    <Switch
                      value={preferences.notify_email}
                      onValueChange={(value) => setPreferences(p => ({ ...p, notify_email: value }))}
                      trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                      thumbColor={preferences.notify_email ? colors.primary : colors.gray400}
                    />
                  </View>
                  <View style={[styles.switchSeparator, { backgroundColor: colors.border }]} />
                  <View style={styles.switchRowEditorial}>
                    <View style={[styles.switchIcon, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                      <Ionicons name="notifications-outline" size={16} color={colors.accent} />
                    </View>
                    <View style={styles.switchBody}>
                      <Text style={[styles.switchTitle, { color: colors.gray900 }]}>{t('componentsCommon.followPrefsPush')}</Text>
                      <Text style={[styles.switchSubtitle, { color: colors.gray500 }]}>{t('componentsCommon.followPrefsPushSubtitle')}</Text>
                    </View>
                    <Switch
                      value={preferences.notify_push}
                      onValueChange={(value) => setPreferences(p => ({ ...p, notify_push: value }))}
                      trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                      thumbColor={preferences.notify_push ? colors.primary : colors.gray400}
                    />
                  </View>
                </View>
              </View>

              {/* Section : événements */}
              <View style={styles.modalSection}>
                <View style={styles.editorialSectionHead}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{t('componentsCommon.followPrefsTriggersEyebrow')}</Text>
                  <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                    {t('componentsCommon.followPrefsTriggersTitle')}
                  </Text>
                </View>
                <View style={[styles.switchCard, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <View style={styles.switchRowEditorial}>
                    <View style={[styles.switchIcon, { backgroundColor: colors.card, borderColor: '#A855F7' }]}>
                      <Ionicons name="calendar-outline" size={16} color="#A855F7" />
                    </View>
                    <View style={styles.switchBody}>
                      <Text style={[styles.switchTitle, { color: colors.gray900 }]}>{t('componentsCommon.followPrefsNewEvents')}</Text>
                      <Text style={[styles.switchSubtitle, { color: colors.gray500 }]}>
                        {t('componentsCommon.followPrefsNewEventsSubtitle')}
                      </Text>
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
            </View>

            {/* Sticky bottom CTA — Enregistrer (style éditorial pill).
                paddingBottom dynamique : Spacing.md + insets.bottom pour
                clear la nav bar Android et le home indicator iOS. */}
            <View
              style={[
                styles.stickyBottom,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.xs,
                },
              ]}
            >
              <TouchableOpacity
                onPress={handleUpdatePreferences}
                disabled={isLoading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('componentsCommon.followPrefsSaveA11y')}
                style={[
                  styles.savePill,
                  { backgroundColor: colors.primary },
                  isLoading && { opacity: 0.6 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.savePillText}>{t('componentsCommon.followPrefsSave')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </EditorialCanvas>
      </Modal>
    </View>
  );
}

const FollowUserButton = memo(FollowUserButtonImpl);
export default FollowUserButton;

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
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
    overflow: 'hidden',
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
    flexShrink: 1,
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
  // Sticky bottom : barre fixe en bas avec le bouton Enregistrer.
  // paddingBottom est appliqué inline (insets.bottom) pour respecter la safe area.
  stickyBottom: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  savePillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },

  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalSection: {
    marginBottom: Spacing.xl,
  },
  editorialSectionHead: {
    gap: 4,
    marginBottom: Spacing.md,
  },

  // Sélecteur niveau (eyebrow + valeur + chevron)
  levelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  levelLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  levelText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },

  // Card éditoriale qui contient les switches d'une section
  switchCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  switchRowEditorial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  switchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  switchBody: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },
  switchSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    lineHeight: 14,
  },
  switchSeparator: {
    height: 1,
    marginHorizontal: -Spacing.md,
  },
});
