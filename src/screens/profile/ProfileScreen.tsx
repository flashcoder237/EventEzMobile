import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnreadCounts } from '../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { FadeInView, ScaleOnMount } from '../../components/ui/Animations';
import QRCodeDisplay from '../../components/common/QRCodeDisplay';
import VerificationBanner from '../../components/auth/VerificationBanner';
import {
  MenuItem,
  ProfileSuggestionBanner,
  DashboardHeroCard,
} from '../../components/profile';
import { eventsAPI, feedbacksAPI, registrationsAPI, walletAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { useTour, getMainTabsTourSteps } from '../../components/tour';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, isLoading: authLoading } = useAuth();
  const tour = useTour();
  const { showAlert, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { unreadNotificationCount, unreadMessageCount, pendingInvitationCount, pendingTransferCount } = useUnreadCounts();
  const [showMyQR, setShowMyQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    tickets: 0,
    favorites: 0,
    reviews: 0,
  });
  const [wallet, setWallet] = useState<{ bank_name?: string; mobile_money_number?: string } | null>(null);

  const isOrganizer = user?.role === 'organizer';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchStats();
    if (isOrganizer) fetchWallet();
  }, [isOrganizer]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), isOrganizer ? fetchWallet() : Promise.resolve()]);
    setRefreshing(false);
  }, [isOrganizer]);

  const fetchWallet = async () => {
    try {
      const res = await walletAPI.getMyWallet();
      setWallet({
        bank_name: res.data?.bank_name,
        mobile_money_number: res.data?.mobile_money_number,
      });
    } catch (error) {
      if (__DEV__) console.warn('Wallet fetch failed:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch all stats in parallel
      const [registrationsRes, followingRes, feedbacksRes] = await Promise.all([
        registrationsAPI.getMyRegistrations().catch(() => ({ data: { count: 0 } })),
        eventsAPI.getFollowingEvents().catch(() => ({ data: { count: 0 } })),
        feedbacksAPI.getFeedbacks({ user: 'me', page_size: 1 }).catch(() => ({ data: { count: 0 } })),
      ]);

      // Extraire le count depuis reponse paginee {count, results} ou tableau direct [...]
      const extractCount = (res: any) => {
        const d = res.data;
        if (d?.count !== undefined) return d.count;
        if (Array.isArray(d?.results)) return d.results.length;
        if (Array.isArray(d)) return d.length;
        return 0;
      };

      const registrationsCount = extractCount(registrationsRes);
      const followingCount = extractCount(followingRes);
      const feedbacksCount = extractCount(feedbacksRes);

      setStats({
        tickets: registrationsCount,
        favorites: followingCount,
        reviews: feedbacksCount,
      });
    } catch (error) {
      if (__DEV__) console.error('Error fetching stats:', error);
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) {
      return `${first}${last}`.toUpperCase();
    }
    return (user.email?.[0] || '?').toUpperCase();
  };

  const handleLogout = () => {
    showConfirm(
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmDetail'),
      logout
    );
  };

  const softBorder = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        <VerificationBanner />

        {/* Editorial top row — utilities */}
        <View style={styles.editorialTopRow}>
          <Text style={[styles.editorialKicker, { color: colors.gray500 }]}>
            {t('profile.memberSinceShort', { year: user?.date_joined ? new Date(user.date_joined).getFullYear() : '2024' })}
          </Text>
          <View style={styles.editorialTopActions}>
            <TouchableOpacity
              style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.sm]}
              onPress={() => setShowMyQR(true)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.showQRCode')}
            >
              <Ionicons name="qr-code-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: softBorder }, Shadows.sm]}
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.settingsAccessibility')}
            >
              <Ionicons name="settings-outline" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Editorial Hero — oversized italic name + square avatar */}
        <FadeInView delay={100} translateY={16}>
          <TouchableOpacity
            style={styles.heroRow}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('profile.editProfileAccessibility')}
          >
            <View style={styles.heroNameCol}>
              <Text style={[styles.heroName, { color: colors.gray900 }]} numberOfLines={1}>
                {user?.first_name || user?.last_name || t('profile.guestPlaceholder')}
                {(user?.first_name || user?.last_name) ? '.' : ''}
              </Text>
              <Text style={[styles.heroEmail, { color: colors.gray500 }]} numberOfLines={1}>
                {user?.email}
              </Text>
              {isOrganizer && (
                <View style={[styles.proLimeBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={[styles.proLimeBadgeText, { color: colors.primary }]}>{t('profile.labelOrganizer')}</Text>
                </View>
              )}
            </View>

            <View style={styles.avatarSquareWrap}>
              {user?.profile_picture || user?.image ? (
                <Image
                  source={user.profile_picture || user.image}
                  style={styles.avatarSquare}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={300}
                />
              ) : (
                <View style={[styles.avatarSquare, styles.avatarSquarePlaceholder]}>
                  <Text style={styles.avatarSquareText}>{getInitials()}</Text>
                </View>
              )}
              {user?.is_verified ? (
                <View style={[styles.verifiedTag, { backgroundColor: colors.primary }]}>
                  <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                  <Text style={styles.verifiedTagText}>{t('profile.labelVerified')}</Text>
                </View>
              ) : (
                <View style={[styles.verifiedTag, { backgroundColor: colors.accent }]}>
                  <Ionicons name="time-outline" size={10} color="#FFFFFF" />
                  <Text style={styles.verifiedTagText}>{t('profile.labelPending')}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </FadeInView>

        {/* Chips identite (role, ville) */}
        <FadeInView delay={150} translateY={12}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
          >
            <View style={[styles.chipFilled, { backgroundColor: colors.primary }]}>
              <Text style={styles.chipFilledText}>
                {isOrganizer ? t('profile.labelOrganizer') : t('profile.labelFan')}
              </Text>
            </View>
            <View style={[styles.chipOutline, { backgroundColor: colors.card, borderColor: softBorder }]}>
              <Text style={[styles.chipOutlineText, { color: colors.text }]}>
                {user?.role === 'admin' ? t('profile.labelAdmin') : user?.role === 'moderator' ? t('profile.labelModerator') : t('profile.labelMember')}
              </Text>
            </View>
            {user?.city ? (
              <View style={[styles.chipOutline, { backgroundColor: colors.card, borderColor: softBorder, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                <Ionicons name="location-outline" size={12} color={colors.text} />
                <Text style={[styles.chipOutlineText, { color: colors.text }]}>{user.city.toUpperCase()}</Text>
              </View>
            ) : null}
          </ScrollView>
        </FadeInView>

        {/* Banner "Pour vous" — suggestions context-aware (cache si rien a faire) */}
        <FadeInView delay={200} translateY={12}>
          <ProfileSuggestionBanner user={user} wallet={wallet} isOrganizer={isOrganizer} />
        </FadeInView>

        {/* Hero Tableau de bord — point d'entree #1 du profil */}
        <FadeInView delay={250} translateY={12}>
          <DashboardHeroCard stats={stats} />
        </FadeInView>

        {/* Become Organizer CTA - Only for regular users */}
        {!isOrganizer && !isModerator && (
          <TouchableOpacity
            style={[styles.becomeOrganizerCard, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '30' }]}
            onPress={() => navigation.navigate('BecomeOrganizer')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('profile.becomeOrganizerCard')}
          >
            <View style={styles.becomeOrganizerIcon}>
              <Ionicons name="megaphone" size={28} color={Colors.white} />
            </View>
            <View style={styles.becomeOrganizerText}>
              <Text style={[styles.becomeOrganizerTitle, { color: colors.gray900 }]}>{t('profile.becomeOrganizerCard')}</Text>
              <Text style={[styles.becomeOrganizerSubtitle, { color: colors.gray600 }]}>
                {t('profile.becomeOrganizerCardSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.secondary} />
          </TouchableOpacity>
        )}

        {/* Moderator Section */}
        {isModerator && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>{t('profile.moderatorSection')}</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
              <MenuItem
                icon="shield-checkmark-outline"
                title={t('profile.moderationQueue')}
                subtitle={t('profile.moderationQueueSubtitle')}
                onPress={() => navigation.navigate('Moderation')}
                isLast
              />
            </View>
          </View>
        )}

        {/* Organizer Section */}
        {isOrganizer && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>{t('profile.organizerSection')}</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
              <MenuItem
                icon="add-circle-outline"
                title={t('profile.createEventMenu')}
                onPress={() => navigation.navigate('EventCreate')}
              />
              <MenuItem
                icon="calendar-outline"
                title={t('profile.myEventsMenu')}
                onPress={() => navigation.navigate('MyEvents')}
              />
              <MenuItem
                icon="wallet-outline"
                title={t('profile.myWalletMenu')}
                onPress={() => navigation.navigate('Wallet')}
                alert={
                  wallet && !wallet.bank_name?.trim() && !wallet.mobile_money_number?.trim()
                    ? { type: 'warning', label: t('profile.withdrawalMethodWarning') }
                    : undefined
                }
              />
              <MenuItem
                icon="analytics-outline"
                title={t('profile.analyticsMenu')}
                subtitle={t('profile.analyticsSubtitle')}
                onPress={() => navigation.navigate('AnalyticsDashboard')}
              />
              <MenuItem
                icon="git-network-outline"
                title={t('profile.webhooksMenu')}
                subtitle={t('profile.webhooksSubtitle')}
                onPress={() => navigation.navigate('Webhooks')}
              />
              <MenuItem
                icon="mail-outline"
                title={t('profile.newslettersMenu')}
                subtitle={t('profile.newslettersSubtitle')}
                onPress={() => navigation.navigate('Newsletters')}
              />
              <MenuItem
                icon="grid-outline"
                title={t('profile.dashboardsMenu')}
                subtitle={t('profile.dashboardsSubtitle')}
                onPress={() => navigation.navigate('Dashboards')}
              />
              <MenuItem
                icon={user?.is_verified ? "checkmark-circle" : "shield-outline"}
                title={t('profile.verificationMenu')}
                subtitle={user?.is_verified ? t('profile.verifiedSubtitle') : undefined}
                alert={
                  !user?.is_verified
                    ? { type: 'warning', label: t('profile.actionRequired') }
                    : undefined
                }
                onPress={() => navigation.navigate('Verification')}
                isLast
              />
            </View>
          </View>
        )}

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>{t('profile.myAccountSection')}</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="person-outline"
              title={t('profile.editProfileMenu')}
              alert={
                !user?.profile_picture && !(user as any)?.image
                  ? { type: 'info', label: t('profile.addProfilePicture') }
                  : undefined
              }
              onPress={() => navigation.navigate('EditProfile')}
            />
            {!isOrganizer && (
              <MenuItem
                icon={user?.is_verified ? 'checkmark-circle' : 'shield-outline'}
                title={t('profile.verificationMenu')}
                subtitle={user?.is_verified ? t('profile.verifiedSubtitle') : undefined}
                alert={
                  !user?.is_verified
                    ? { type: 'warning', label: t('profile.actionRequired') }
                    : undefined
                }
                onPress={() => navigation.navigate('Verification')}
              />
            )}
            <MenuItem
              icon="card-outline"
              title={t('profile.myPaymentsMenu')}
              subtitle={t('profile.myPaymentsSubtitle')}
              onPress={() => navigation.navigate('MyPayments')}
            />
            <MenuItem
              icon="notifications-outline"
              title={t('profile.notificationsMenu')}
              badge={unreadNotificationCount}
              onPress={() => navigation.navigate('Notifications')}
            />
            <MenuItem
              icon="chatbubbles-outline"
              title={t('profile.messagesMenu')}
              badge={unreadMessageCount}
              onPress={() => navigation.navigate('Messages')}
            />
            <MenuItem
              icon="scan-outline"
              title={t('profile.scanQRMenu')}
              subtitle={t('profile.scanQRSubtitle')}
              onPress={() => navigation.navigate('Scan')}
            />
            <MenuItem
              icon="mail-outline"
              title={t('profile.invitationsMenu')}
              badge={pendingInvitationCount}
              onPress={() => navigation.navigate('Invitations')}
              isLast
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>{t('profile.preferencesSection')}</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="heart-outline"
              title={t('profile.favoritesMenu')}
              onPress={() => navigation.navigate('Main', { screen: 'Saved' } as any)}
            />
            <MenuItem
              icon="people-outline"
              title={t('profile.followedOrganizersMenu')}
              onPress={() => navigation.navigate('FollowingUsers')}
            />
            <MenuItem
              icon="trophy-outline"
              title={t('profile.badgesPointsMenu')}
              onPress={() => navigation.navigate('Gamification')}
            />
            <MenuItem
              icon="gift-outline"
              title={t('profile.referralMenu')}
              onPress={() => navigation.navigate('Referrals')}
            />
            <MenuItem
              icon="language-outline"
              title={t('profile.languageMenu')}
              subtitle={t('profile.languageFrench')}
              onPress={() => navigation.navigate('Settings')}
              isLast
            />
          </View>
        </View>

        {/* Administration Section (admin only) */}
        {isAdmin && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>{t('profile.adminSection')}</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
              <MenuItem
                icon="speedometer-outline"
                title={t('profile.adminDashboardMenu')}
                subtitle={t('profile.adminDashboardSubtitle')}
                onPress={() => navigation.navigate('AdminDashboard')}
              />
              <MenuItem
                icon="people-outline"
                title={t('profile.userManagementMenu')}
                subtitle={t('profile.userManagementSubtitle')}
                onPress={() => navigation.navigate('UserManagement')}
              />
              <MenuItem
                icon="diamond-outline"
                title={t('profile.subscriptionsMenu')}
                subtitle={t('profile.subscriptionsSubtitle')}
                onPress={() => navigation.navigate('SubscriptionManagement')}
              />
              <MenuItem
                icon="shield-outline"
                title={t('profile.auditLogsMenu')}
                subtitle={t('profile.auditLogsSubtitle')}
                onPress={() => navigation.navigate('AuditLogs')}
              />
              <MenuItem
                icon="settings-outline"
                title={t('profile.platformSettingsMenu')}
                onPress={() => navigation.navigate('PlatformSettings')}
              />
              <MenuItem
                icon="cash-outline"
                title={t('profile.treasuryMenu')}
                subtitle={t('profile.treasurySubtitle')}
                onPress={() => navigation.navigate('TreasuryOverview')}
                isLast
              />
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>{t('profile.supportSection')}</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="help-circle-outline"
              title={t('profile.helpCenterMenu')}
              onPress={() => navigation.navigate('Help')}
            />
            <MenuItem
              icon="compass-outline"
              title={t('profile.tutorialMenu')}
              subtitle={t('profile.tutorialSubtitle')}
              onPress={() => {
                tour.start(getMainTabsTourSteps(t), { force: true });
              }}
            />
            <MenuItem
              icon="pulse-outline"
              title={t('profile.systemStatusMenu')}
              subtitle={t('profile.systemStatusSubtitle')}
              onPress={() => navigation.navigate('SystemStatus')}
            />
            <MenuItem
              icon="document-text-outline"
              title={t('profile.termsMenu')}
              onPress={() => navigation.navigate('Terms')}
              isLast
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.menuSection}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="log-out-outline"
              title={authLoading ? t('profile.logoutInProgress') : t('profile.logoutLabel')}
              onPress={handleLogout}
              showArrow={false}
              danger
              loading={authLoading}
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.version, { color: colors.gray400 }]}>{t('profile.appVersion')}</Text>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* My QR Code Modal */}
      {user && (
        <QRCodeDisplay
          visible={showMyQR}
          onClose={() => setShowMyQR(false)}
          data={`EVENTEZ-USER-${user.id}`}
          title={t('profile.myQRTitle')}
          subtitle="Faites scanner ce code pour partager votre profil"
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Editorial top row
  editorialTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  editorialKicker: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  editorialTopActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  heroNameCol: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  heroName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.3,
  },
  heroEmail: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    marginTop: 8,
  },
  avatarSquareWrap: {
    position: 'relative',
    width: 92,
    height: 92,
  },
  avatarSquare: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarSquarePlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSquareText: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  verifiedTag: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedTagText: {
    fontFamily: FontFamily.bold,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  proLimeBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  proLimeBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
  },

  // Stat strip — soft card with gray dividers
  statStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
  },
  statNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.9,
  },
  statEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // Chip strip
  chipStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  chipFilled: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipFilledText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  chipOutline: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipOutlineText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  becomeOrganizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  becomeOrganizerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  becomeOrganizerText: {
    flex: 1,
  },
  becomeOrganizerTitle: {
    ...TextStyles.bodyBold,
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  becomeOrganizerSubtitle: {
    ...TextStyles.small,
    marginTop: 2,
  },
  menuSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  menuSectionTitle: {
    ...TextStyles.eyebrow,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  menuCard: {
    borderRadius: BorderRadius['3xl'],
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  menuBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: FontFamily.bold,
    lineHeight: 14,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.medium,
  },
  menuSubtitle: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  version: {
    ...TextStyles.small,
    textAlign: 'center',
    color: Colors.gray400,
    marginTop: Spacing['2xl'],
  },
});
