/**
 * TeamInvitationAcceptScreen
 *
 * Cible du deep link `eventez://team-invitation/{token}` (et son App Link
 * https://eventez.online/team-invitation/{token}).
 *
 * Affiche les details de l'invitation a un user (nom event, organizer, role,
 * permissions debloquees, message personnel) et lui permet d'accepter ou de
 * decliner.
 *
 * Cas particuliers :
 *   - Si user pas connecte → bouton "Se connecter pour accepter" qui pousse
 *     l'ecran Login en preservant le deep link en navigation state pour qu'on
 *     revienne ici apres signin.
 *   - Si invitation expiree / revoquee / deja traitee → message dedie + retour.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { eventTeamAPI, EventStaffInvitationLookup, EventStaffRole } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import {
  BorderRadius,
  FontFamily,
  FontSizes,
  Shadows,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'TeamInvitation'>;

const ROLE_ICONS: Record<EventStaffRole, keyof typeof MaterialCommunityIcons.glyphMap> = {
  co_organizer: 'crown-outline',
  moderator: 'shield-account-outline',
  scanner: 'qrcode-scan',
  analyst: 'chart-line',
};

export default function TeamInvitationAcceptScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { token } = route.params;
  const { user, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [invitation, setInvitation] = useState<EventStaffInvitationLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);

  const fetchInvitation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventTeamAPI.lookupByToken(token);
      setInvitation(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setError(
          t('teamInvitation.notFound', {
            defaultValue: 'Cette invitation n\'existe plus ou a ete supprimee.',
          }),
        );
      } else {
        setError(
          t('teamInvitation.loadError', {
            defaultValue: 'Impossible de charger l\'invitation.',
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  const handleAccept = async () => {
    if (!invitation || !isAuthenticated) return;
    setActionLoading('accept');
    try {
      await eventTeamAPI.accept(invitation.id);
      Alert.alert(
        t('common.success'),
        t('teamInvitation.acceptedTitle', {
          defaultValue: 'Bienvenue dans l\'equipe !',
        }),
        [
          {
            text: 'OK',
            onPress: () => {
              // Retour au dashboard ou vers MyTeamEvents pour voir la liste
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main' as any);
              }
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        t('common.error'),
        err?.response?.data?.detail ||
          t('teamInvitation.acceptError', {
            defaultValue: 'Impossible d\'accepter l\'invitation.',
          }),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = () => {
    if (!invitation) return;
    Alert.alert(
      t('teamInvitation.declineConfirmTitle', { defaultValue: 'Refuser l\'invitation ?' }),
      t('teamInvitation.declineConfirmBody', {
        defaultValue: 'Vous ne pourrez pas la recuperer. L\'organisateur sera notifie.',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('teamInvitation.decline', { defaultValue: 'Refuser' }),
          style: 'destructive',
          onPress: async () => {
            setActionLoading('decline');
            try {
              await eventTeamAPI.decline(invitation.id);
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Main' as any);
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.response?.data?.detail || 'Erreur');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </EditorialCanvas>
    );
  }

  if (error || !invitation) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>OOPS</WatermarkNumeral>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.gray900 }]}>
            {t('teamInvitation.errorTitle', { defaultValue: 'Invitation introuvable' })}
          </Text>
          <Text style={[styles.errorBody, { color: colors.gray600 }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Main' as any);
            }}
            activeOpacity={TOUCH_OPACITY}
          >
            <Text style={styles.primaryButtonText}>{t('common.back', { defaultValue: 'Retour' })}</Text>
          </TouchableOpacity>
        </View>
      </EditorialCanvas>
    );
  }

  const event = invitation.event;
  const isPending = invitation.invitation_status === 'pending' && !invitation.is_expired;
  const isExpired = invitation.is_expired || invitation.invitation_status === 'expired';
  const isAlreadyHandled = ['accepted', 'declined', 'revoked'].includes(invitation.invitation_status);

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>EQUIPE</WatermarkNumeral>

      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.headerBack, { backgroundColor: colors.gray50 }]}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Main' as any);
          }}
          activeOpacity={TOUCH_OPACITY}
        >
          <Ionicons name="close" size={22} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
          {t('teamInvitation.eyebrow', { defaultValue: 'INVITATION' })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing['3xl'] }}>
        {/* Event banner */}
        {event.banner_url ? (
          <Image
            source={{ uri: event.banner_url }}
            style={styles.banner}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: `${colors.primary}10` }]}>
            <MaterialCommunityIcons name="calendar-star" size={48} color={colors.primary} />
          </View>
        )}

        <Text style={[styles.eventTitle, { color: colors.gray900 }]}>{event.title}</Text>
        <Text style={[styles.organizerName, { color: colors.gray600 }]}>
          {t('teamInvitation.invitedBy', {
            defaultValue: 'Invitation de {{organizer}}',
            organizer: invitation.invited_by?.full_name || invitation.invited_by?.email || event.organizer_name,
          })}
        </Text>

        {/* Role card */}
        <View style={[styles.roleCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
          <View style={[styles.roleIconCircle, { backgroundColor: `${colors.primary}15` }]}>
            <MaterialCommunityIcons
              name={ROLE_ICONS[invitation.role]}
              size={32}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.roleEyebrow, { color: colors.primary }]}>
            {t('teamInvitation.roleEyebrow', { defaultValue: 'VOUS SEREZ' })}
          </Text>
          <Text style={[styles.roleTitle, { color: colors.gray900 }]}>
            {invitation.role_display}
          </Text>
        </View>

        {/* Personal message */}
        {invitation.invitation_message ? (
          <View style={[styles.messageCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
            <Text style={[styles.messageText, { color: colors.gray700 }]}>
              « {invitation.invitation_message} »
            </Text>
          </View>
        ) : null}

        {/* Permissions */}
        <View style={styles.permissionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>
            {t('teamInvitation.permissionsTitle', { defaultValue: 'CE QUE VOUS POURREZ FAIRE' })}
          </Text>
          {invitation.permissions.map((p) => (
            <View key={p} style={[styles.permissionRow, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.permissionText, { color: colors.gray800 }]}>
                {translatePermission(p, t)}
              </Text>
            </View>
          ))}
        </View>

        {/* Status messages */}
        {isExpired && (
          <View style={[styles.statusBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Ionicons name="time-outline" size={20} color="#991B1B" />
            <Text style={[styles.statusBannerText, { color: '#991B1B' }]}>
              {t('teamInvitation.expired', {
                defaultValue: 'Cette invitation a expire. Demandez a l\'organisateur de la renvoyer.',
              })}
            </Text>
          </View>
        )}
        {isAlreadyHandled && (
          <View style={[styles.statusBanner, { backgroundColor: '#E5E7EB', borderColor: '#D1D5DB' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#374151" />
            <Text style={[styles.statusBannerText, { color: '#374151' }]}>
              {t('teamInvitation.alreadyHandled', {
                defaultValue: 'Cette invitation a deja ete traitee ({{status}}).',
                status: invitation.status_display,
              })}
            </Text>
          </View>
        )}

        {/* CTAs */}
        {!isAuthenticated && isPending && (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={[styles.signinHint, { color: colors.gray600 }]}>
              {t('teamInvitation.signinHint', {
                defaultValue: 'Connectez-vous pour accepter cette invitation.',
              })}
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Login', undefined as any)}
              activeOpacity={TOUCH_OPACITY}
            >
              <Text style={styles.primaryButtonText}>
                {t('common.signIn', { defaultValue: 'Se connecter' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isAuthenticated && isPending && invitation.can_accept && (
          <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleAccept}
              disabled={actionLoading !== null}
              activeOpacity={TOUCH_OPACITY}
            >
              {actionLoading === 'accept' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {t('teamInvitation.accept', { defaultValue: 'Accepter l\'invitation' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.gray200 }]}
              onPress={handleDecline}
              disabled={actionLoading !== null}
              activeOpacity={TOUCH_OPACITY}
            >
              {actionLoading === 'decline' ? (
                <ActivityIndicator size="small" color={colors.gray700} />
              ) : (
                <Text style={[styles.secondaryButtonText, { color: colors.gray700 }]}>
                  {t('teamInvitation.decline', { defaultValue: 'Refuser' })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </EditorialCanvas>
  );
}

function translatePermission(perm: string, t: (k: string, opts?: any) => string): string {
  const labels: Record<string, string> = {
    scan_tickets: 'Scanner les billets a l\'entree',
    moderate_chat: 'Moderer le chat de l\'event (mute, supprimer messages)',
    view_analytics: 'Voir les statistiques de l\'event',
    view_registrations: 'Voir la liste des inscrits',
    edit_event: 'Editer les informations de l\'event',
    manage_team: 'Inviter d\'autres membres d\'equipe',
  };
  return t(`teamInvitation.perm_${perm}`, { defaultValue: labels[perm] || perm });
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    textAlign: 'center',
  },
  errorBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  banner: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  eventTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  organizerName: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    marginBottom: Spacing.lg,
  },
  roleCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  roleIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleEyebrow: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
  },
  roleTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
  },
  messageCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.lg,
    alignItems: 'flex-start',
  },
  messageText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  permissionsSection: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  permissionText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  statusBannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  signinHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  primaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
  },
});
