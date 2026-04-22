import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { FadeInView, ScaleOnMount } from '../../components/ui/Animations';
import QRCodeDisplay from '../../components/common/QRCodeDisplay';
import VerificationBanner from '../../components/auth/VerificationBanner';
import { eventsAPI, feedbacksAPI, registrationsAPI } from '../../api';
import { RootStackParamList } from '../../types';
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

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
  badge?: number;
  loading?: boolean;
}

const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, danger, badge, loading }: MenuItemProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.gray100 }]}
      onPress={loading ? undefined : onPress}
      activeOpacity={loading ? 1 : 0.6}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title} - ${subtitle}` : title}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.gray50 }, danger && { backgroundColor: colors.errorBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={danger ? colors.error : colors.gray700} />
        ) : (
          <Ionicons
            name={icon}
            size={20}
            color={danger ? colors.error : colors.gray700}
          />
        )}
        {badge != null && badge > 0 && (
          <View style={[styles.menuBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, { color: colors.gray900 }, danger && { color: colors.error }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: colors.gray500 }]}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.gray300} />
      ) : showArrow ? (
        <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
      ) : null}
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { colors, isDark, gradients } = useTheme();
  const { unreadNotificationCount, unreadMessageCount, pendingInvitationCount, pendingTransferCount } = useNotifications();
  const [showMyQR, setShowMyQR] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    tickets: 0,
    favorites: 0,
    reviews: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

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
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      logout
    );
  };

  const isOrganizer = user?.role === 'organizer';
  const isModerator = user?.role === 'moderator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

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

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerEyebrow, { color: colors.gray400 }]}>Ton compte</Text>
            <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Profil</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.gray50 }]}
              onPress={() => setShowMyQR(true)}
              accessibilityRole="button"
              accessibilityLabel="Afficher mon QR code"
            >
              <Ionicons name="qr-code-outline" size={22} color={colors.gray700} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.gray50 }]}
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Parametres"
            >
              <Ionicons name="settings-outline" size={24} color={colors.gray700} />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Card with gradient behind avatar */}
        <FadeInView delay={100} translateY={16}>
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.card }, Shadows.cardViolet]}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Modifier le profil"
        >
          <View style={styles.userCardLeft}>
            {user?.profile_picture || user?.image ? (
              <View>
                <LinearGradient
                  colors={[...gradients.brand] as [string, string]}
                  style={styles.avatarGradientRing}
                />
                <Image
                  source={user.profile_picture || user.image}
                  style={[styles.avatar, { borderColor: colors.surface }]}
                  cachePolicy="disk"
                  transition={200}
                />
              </View>
            ) : (
              <View>
                <LinearGradient
                  colors={[...gradients.brand] as [string, string]}
                  style={styles.avatarGradientRing}
                />
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.gray200, borderColor: colors.surface }]}>
                  <Text style={[styles.avatarText, { color: colors.gray600 }]}>{getInitials()}</Text>
                </View>
              </View>
            )}
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: colors.gray900 }]} numberOfLines={1}>
                  {user?.first_name || ''} {user?.last_name || ''}
                  {!user?.first_name && !user?.last_name && 'Utilisateur'}
                </Text>
                {isOrganizer && (
                  <View style={styles.proLimeBadge}>
                    <Text style={styles.proLimeBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.userEmail, { color: colors.gray500 }]}>{user?.email}</Text>
              {user?.is_verified ? (
                <View style={[styles.verificationBadge, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[styles.verificationText, { color: colors.success }]}>Vérifié</Text>
                </View>
              ) : (
                <View style={[styles.verificationBadge, { backgroundColor: colors.warningBg }]}>
                  <Ionicons name="time-outline" size={12} color={colors.warning} />
                  <Text style={[styles.verificationText, { color: colors.warning }]}>Non vérifié</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
        </TouchableOpacity>
        </FadeInView>

        {/* Stats — 3 individual cards */}
        <FadeInView delay={200} translateY={16}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.cardViolet]}>
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.tickets}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>Réservations</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.cardViolet]}>
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.favorites}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>Favoris</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.cardViolet]}>
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.reviews}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>Avis</Text>
          </View>
        </View>
        </FadeInView>

        {/* Become Organizer CTA - Only for regular users */}
        {!isOrganizer && !isModerator && (
          <TouchableOpacity
            style={[styles.becomeOrganizerCard, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '30' }]}
            onPress={() => navigation.navigate('BecomeOrganizer')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Devenir Organisateur"
          >
            <View style={styles.becomeOrganizerIcon}>
              <Ionicons name="megaphone" size={28} color={Colors.white} />
            </View>
            <View style={styles.becomeOrganizerText}>
              <Text style={styles.becomeOrganizerTitle}>Devenir Organisateur</Text>
              <Text style={styles.becomeOrganizerSubtitle}>
                Créez et gérez vos propres événements
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.secondary} />
          </TouchableOpacity>
        )}

        {/* Moderator Section */}
        {isModerator && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>Modération</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
              <MenuItem
                icon="shield-checkmark-outline"
                title="File de modération"
                subtitle="Valider les événements"
                onPress={() => navigation.navigate('Moderation')}
              />
            </View>
          </View>
        )}

        {/* Organizer Section */}
        {isOrganizer && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>Organisateur</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
              <MenuItem
                icon="add-circle-outline"
                title="Créer un événement"
                onPress={() => navigation.navigate('EventCreate')}
              />
              <MenuItem
                icon="calendar-outline"
                title="Mes événements"
                onPress={() => navigation.navigate('MyEvents')}
              />
              <MenuItem
                icon="wallet-outline"
                title="Mon portefeuille"
                onPress={() => navigation.navigate('Wallet')}
              />
              <MenuItem
                icon="analytics-outline"
                title="Analytics"
                subtitle="Statistiques et rapports"
                onPress={() => navigation.navigate('AnalyticsDashboard')}
              />
              <MenuItem
                icon={user?.is_verified ? "checkmark-circle" : "shield-outline"}
                title="Vérification du compte"
                subtitle={user?.is_verified ? "Compte vérifié" : "Vérifier votre identité"}
                onPress={() => navigation.navigate('Verification')}
              />
            </View>
          </View>
        )}

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>Compte</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="person-outline"
              title="Modifier le profil"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <MenuItem
              icon="card-outline"
              title="Mes paiements"
              subtitle="Historique et remboursements"
              onPress={() => navigation.navigate('MyPayments')}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              badge={unreadNotificationCount}
              onPress={() => navigation.navigate('Notifications')}
            />
            <MenuItem
              icon="chatbubbles-outline"
              title="Messages"
              badge={unreadMessageCount}
              onPress={() => navigation.navigate('Messages')}
            />
            <MenuItem
              icon="scan-outline"
              title="Scanner un QR"
              subtitle="Transfert ou profil"
              onPress={() => navigation.navigate('Scan')}
            />
            <MenuItem
              icon="mail-outline"
              title="Invitations"
              badge={pendingInvitationCount}
              onPress={() => navigation.navigate('Invitations')}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>Préférences</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="heart-outline"
              title="Événements favoris"
              onPress={() => navigation.navigate('Main', { screen: 'Saved' } as any)}
            />
            <MenuItem
              icon="grid-outline"
              title="Tableau de bord"
              onPress={() => navigation.navigate('UserDashboard')}
            />
            <MenuItem
              icon="trophy-outline"
              title="Badges & Points"
              onPress={() => navigation.navigate('Gamification')}
            />
            <MenuItem
              icon="gift-outline"
              title="Parrainage"
              onPress={() => navigation.navigate('Referrals')}
            />
            <MenuItem
              icon="language-outline"
              title="Langue"
              subtitle="Français"
              onPress={() => navigation.navigate('Settings')}
            />
          </View>
        </View>

        {/* Administration Section (admin only) */}
        {isAdmin && (
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>Administration</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
              <MenuItem
                icon="speedometer-outline"
                title="Dashboard admin"
                subtitle="Vue d'ensemble plateforme"
                onPress={() => navigation.navigate('AdminDashboard')}
              />
              <MenuItem
                icon="people-outline"
                title="Utilisateurs"
                subtitle="Gestion des comptes"
                onPress={() => navigation.navigate('UserManagement')}
              />
              <MenuItem
                icon="diamond-outline"
                title="Abonnements"
                subtitle="Plans et tarifs"
                onPress={() => navigation.navigate('SubscriptionManagement')}
              />
              <MenuItem
                icon="shield-outline"
                title="Logs d'audit"
                subtitle="Journalisation"
                onPress={() => navigation.navigate('AuditLogs')}
              />
              <MenuItem
                icon="settings-outline"
                title="Parametres plateforme"
                onPress={() => navigation.navigate('PlatformSettings')}
              />
              <MenuItem
                icon="cash-outline"
                title="Tresorerie"
                subtitle="Finances et paie"
                onPress={() => navigation.navigate('TreasuryOverview')}
              />
            </View>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.accent }]}>Support</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="help-circle-outline"
              title="Centre d'aide"
              onPress={() => navigation.navigate('Help')}
            />
            <MenuItem
              icon="document-text-outline"
              title="Conditions d'utilisation"
              onPress={() => navigation.navigate('Terms')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.menuSection}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.gray100 }]}>
            <MenuItem
              icon="log-out-outline"
              title={authLoading ? 'Déconnexion en cours...' : 'Déconnexion'}
              onPress={handleLogout}
              showArrow={false}
              danger
              loading={authLoading}
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.version, { color: colors.gray400 }]}>EventEz v1.0.0</Text>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* My QR Code Modal */}
      {user && (
        <QRCodeDisplay
          visible={showMyQR}
          onClose={() => setShowMyQR(false)}
          data={`EVENTEZ-USER-${user.id}`}
          title="Mon QR Code"
          subtitle="Faites scanner ce code pour partager votre profil"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    ...TextStyles.h2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: BorderRadius['4xl'],
    ...Shadows.glass,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarGradientRing: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    top: -3,
    left: -3,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    ...Shadows.sm,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...Shadows.sm,
  },
  avatarText: {
    ...TextStyles.h3,
    color: Colors.gray600,
  },
  userInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    ...TextStyles.h3,
    flexShrink: 1,
  },
  userEmail: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
  },
  // PRO lime badge (AIDesigner editorial)
  proLimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#BEFF5A',
    borderRadius: BorderRadius.full,
    shadowColor: '#BEFF5A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  proLimeBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#0F172A',
    letterSpacing: 1,
  },
  organizerBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  organizerBadgeText: {
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
    color: Colors.white,
  },
  verificationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  verificationText: {
    ...TextStyles.caption,
    fontFamily: FontFamily.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: BorderRadius['3xl'],
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    ...Shadows.xs,
  },
  statValue: {
    ...TextStyles.h2,
  },
  statLabel: {
    ...TextStyles.small,
    color: Colors.gray500,
    marginTop: 2,
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
    ...Shadows.xs,
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
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    lineHeight: 14,
  },
  menuIconDanger: {
    backgroundColor: Colors.errorLight,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    ...TextStyles.bodyBold,
    fontFamily: FontFamily.medium,
  },
  menuTitleDanger: {
    color: Colors.error,
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
