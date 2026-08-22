/**
 * TeamManagementScreen
 *
 * Vue organisateur : gere l'equipe d'un event specifique.
 * - Liste des membres (par statut : pending / accepted / autres)
 * - Bouton "Inviter un membre" → modal avec email/phone + role selector
 * - Action revoke / resend sur chaque ligne
 *
 * Cf. apps/event_team backend pour la semantique des roles et permissions.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { eventTeamAPI, EventStaffMember, EventStaffRole } from '../../api';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSizes,
  Shadows,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { getTeamInvitationUrl } from '../../constants/urls';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'TeamManagement'>;

interface RoleCatalogEntry {
  value: EventStaffRole;
  label: string;
  permissions: string[];
}

const ROLE_ICONS: Record<EventStaffRole, keyof typeof MaterialCommunityIcons.glyphMap> = {
  co_organizer: 'crown-outline',
  moderator: 'shield-account-outline',
  scanner: 'qrcode-scan',
  analyst: 'chart-line',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  accepted: { bg: '#D1FAE5', text: '#047857' },
  declined: { bg: '#FEE2E2', text: '#991B1B' },
  revoked: { bg: '#E5E7EB', text: '#374151' },
  expired: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function TeamManagementScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, eventTitle } = route.params;
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { toastSuccess, showError, showConfirm } = useFeedback();

  const [members, setMembers] = useState<EventStaffMember[]>([]);
  const [rolesCatalog, setRolesCatalog] = useState<RoleCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<EventStaffRole>('scanner');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, catalogRes] = await Promise.all([
        eventTeamAPI.list({ event: eventId }),
        eventTeamAPI.getRolesCatalog(),
      ]);
      const membersData = membersRes.data?.results || membersRes.data || [];
      setMembers(membersData);
      setRolesCatalog(catalogRes.data || []);
    } catch (err) {
      if (__DEV__) console.error('Erreur chargement equipe:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleInvite = async () => {
    if (!inviteEmail && !invitePhone) {
      showError(
        t('common.error'),
        t('teamManagement.emailOrPhoneRequired', {
          defaultValue: 'Email ou téléphone obligatoire.',
        }),
      );
      return;
    }
    setInviteSubmitting(true);
    try {
      await eventTeamAPI.invite({
        event: eventId,
        role: inviteRole,
        invited_email: inviteEmail.trim() || undefined,
        invited_phone: invitePhone.trim() || undefined,
        invitation_message: inviteMessage.trim() || undefined,
      });
      toastSuccess(
        t('teamManagement.inviteSentSuccess', {
          defaultValue: 'Invitation envoyée.',
        }),
      );
      setInviteOpen(false);
      setInviteEmail('');
      setInvitePhone('');
      setInviteMessage('');
      setInviteRole('scanner');
      fetchData();
    } catch (err: any) {
      const { message } = getApiErrorMessage(err, t, {
        fallbackKey: 'teamManagement.inviteSentError',
      });
      showError(t('common.error'), message);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevoke = (member: EventStaffMember) => {
    const target = member.user?.full_name || member.user?.email || member.invited_email || member.invited_phone || '?';
    showConfirm(
      t('teamManagement.revokeTitle', { defaultValue: 'Révoquer l\'accès' }),
      t('teamManagement.revokeConfirm', {
        defaultValue: 'Révoquer l\'accès de {{target}} ?',
        target,
      }),
      async () => {
        setActionLoading(member.id);
        try {
          await eventTeamAPI.revoke(member.id);
          fetchData();
        } catch (err: any) {
          const { message } = getApiErrorMessage(err, t, {
            fallbackKey: 'errors.generic',
          });
          showError(t('common.error'), message);
        } finally {
          setActionLoading(null);
        }
      },
      undefined,
      { confirmText: t('teamManagement.revokeTitle', { defaultValue: 'Révoquer' }), destructive: true },
    );
  };

  const handleResend = async (member: EventStaffMember) => {
    setActionLoading(member.id);
    try {
      await eventTeamAPI.resend(member.id);
      toastSuccess(
        t('teamManagement.resendSuccess', { defaultValue: 'Invitation renvoyée.' }),
      );
      fetchData();
    } catch (err: any) {
      const { message } = getApiErrorMessage(err, t, {
        fallbackKey: 'errors.generic',
      });
      showError(t('common.error'), message);
    } finally {
      setActionLoading(null);
    }
  };

  const sections = useMemo(() => {
    const pending = members.filter((m) => m.invitation_status === 'pending');
    const accepted = members.filter((m) => m.invitation_status === 'accepted');
    const others = members.filter(
      (m) => !['pending', 'accepted'].includes(m.invitation_status),
    );
    return { pending, accepted, others };
  }, [members]);

  const renderMember = ({ item }: { item: EventStaffMember }) => {
    const target =
      item.user?.full_name || item.user?.email || item.invited_email || item.invited_phone || '?';
    const statusColor = STATUS_COLORS[item.invitation_status] || STATUS_COLORS.pending;
    const isProcessing = actionLoading === item.id;
    const canResend = item.invitation_status === 'pending';
    const canRevoke = ['pending', 'accepted'].includes(item.invitation_status);

    return (
      <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
        <View style={styles.memberHeader}>
          <View style={[styles.roleIconCircle, { backgroundColor: `${colors.primary}15` }]}>
            <MaterialCommunityIcons
              name={ROLE_ICONS[item.role]}
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, { color: colors.gray900 }]} numberOfLines={1}>
              {target}
            </Text>
            <Text style={[styles.memberRole, { color: colors.gray500 }]}>
              {item.role_display}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
              {item.status_display}
            </Text>
          </View>
        </View>

        {item.invitation_message ? (
          <Text style={[styles.memberMessage, { color: colors.gray600 }]} numberOfLines={2}>
            « {item.invitation_message} »
          </Text>
        ) : null}

        {(canResend || canRevoke) && (
          <View style={styles.memberActions}>
            {/* Bouton Partager : visible sur les invitations pending. Le user
                copie/envoie le lien public (WhatsApp, SMS) → ouvre la page web
                qui propose "Ouvrir dans l'app" via deep link. */}
            {canResend && (item.invitation_url || item.invitation_token) && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
                onPress={async () => {
                  const url =
                    item.invitation_url ||
                    (item.invitation_token ? getTeamInvitationUrl(item.invitation_token) : null);
                  if (!url) return;
                  try {
                    await Share.share({
                      message: t('teamManagement.shareInvitationMessage', {
                        defaultValue: 'Vous etes invite a rejoindre l\'equipe de {{event}} : {{url}}',
                        event: item.event_title,
                        url,
                      }),
                      url,
                    });
                  } catch {
                    /* user cancelled */
                  }
                }}
                disabled={isProcessing}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="share-outline" size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  {t('teamManagement.shareInvitation', { defaultValue: 'Partager' })}
                </Text>
              </TouchableOpacity>
            )}
            {canResend && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}
                onPress={() => handleResend(item)}
                disabled={isProcessing}
                activeOpacity={TOUCH_OPACITY}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.gray700} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.gray700} />
                    <Text style={[styles.actionButtonText, { color: colors.gray700 }]}>
                      {t('teamManagement.resend', { defaultValue: 'Renvoyer' })}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canRevoke && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
                onPress={() => handleRevoke(item)}
                disabled={isProcessing}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name="trash-outline" size={16} color="#991B1B" />
                <Text style={[styles.actionButtonText, { color: '#991B1B' }]}>
                  {t('teamManagement.revoke', { defaultValue: 'Revoquer' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSection = (title: string, items: EventStaffMember[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray500 }]}>
          {title} · {items.length}
        </Text>
        {items.map((m) => (
          <View key={m.id}>{renderMember({ item: m })}</View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>EQUIPE</WatermarkNumeral>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>EQUIPE</WatermarkNumeral>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.headerBack, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={TOUCH_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray900} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>
            {t('teamManagement.eyebrow', { defaultValue: 'EQUIPE' })}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]} numberOfLines={1}>
            {eventTitle || t('teamManagement.title', { defaultValue: 'Membres' })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteCta, { backgroundColor: colors.primary }]}
          onPress={() => setInviteOpen(true)}
          activeOpacity={TOUCH_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={t('teamManagement.inviteCta', { defaultValue: 'Inviter un membre' })}
        >
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing['3xl'], ...centeredContent(CARD_MAX) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {members.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
            <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.gray400} />
            <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>
              {t('teamManagement.emptyTitle', { defaultValue: 'Aucun membre dans votre equipe' })}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.gray500 }]}>
              {t('teamManagement.emptyBody', {
                defaultValue: 'Invitez des collaborateurs pour scanner les billets ou moderer le chat.',
              })}
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              onPress={() => setInviteOpen(true)}
              activeOpacity={TOUCH_OPACITY}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>
                {t('teamManagement.inviteCta', { defaultValue: 'Inviter un membre' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSection(
              t('teamManagement.sectionPending', { defaultValue: 'En attente' }),
              sections.pending,
            )}
            {renderSection(
              t('teamManagement.sectionAccepted', { defaultValue: 'Membres actifs' }),
              sections.accepted,
            )}
            {renderSection(
              t('teamManagement.sectionOthers', { defaultValue: 'Historique' }),
              sections.others,
            )}
          </>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={inviteOpen} animationType="slide" transparent onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
              <Text style={[styles.modalTitle, { color: colors.gray900 }]}>
                {t('teamManagement.inviteTitle', { defaultValue: 'Inviter un membre' })}
              </Text>
              <TouchableOpacity
                onPress={() => setInviteOpen(false)}
                activeOpacity={TOUCH_OPACITY}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
              <Text style={[styles.fieldLabel, { color: colors.gray700 }]}>
                {t('teamManagement.inviteRole', { defaultValue: 'Role' })}
              </Text>
              <View style={styles.rolePicker}>
                {rolesCatalog.map((r) => {
                  const selected = inviteRole === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setInviteRole(r.value)}
                      activeOpacity={TOUCH_OPACITY}
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: selected ? `${colors.primary}15` : colors.gray50,
                          borderColor: selected ? colors.primary : colors.gray200,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={ROLE_ICONS[r.value]}
                        size={18}
                        color={selected ? colors.primary : colors.gray600}
                      />
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: selected ? colors.primary : colors.gray700 },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Permissions debloquees pour le role choisi */}
              {(() => {
                const r = rolesCatalog.find((x) => x.value === inviteRole);
                if (!r || r.permissions.length === 0) return null;
                return (
                  <View style={[styles.permissionsBox, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
                    <Text style={[styles.permissionsTitle, { color: colors.gray700 }]}>
                      {t('teamManagement.permissionsTitle', {
                        defaultValue: 'Ce role peut :',
                      })}
                    </Text>
                    {r.permissions.map((p) => (
                      <View key={p} style={styles.permissionRow}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={[styles.permissionText, { color: colors.gray700 }]}>
                          {translatePermission(p, t)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              <Text style={[styles.fieldLabel, { color: colors.gray700, marginTop: Spacing.lg }]}>
                {t('teamManagement.inviteEmail', { defaultValue: 'Email (recommande)' })}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@exemple.com"
                placeholderTextColor={colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors.gray700, marginTop: Spacing.md }]}>
                {t('teamManagement.invitePhone', { defaultValue: 'Telephone (optionnel)' })}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                value={invitePhone}
                onChangeText={setInvitePhone}
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor={colors.gray400}
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, { color: colors.gray700, marginTop: Spacing.md }]}>
                {t('teamManagement.inviteMessage', { defaultValue: 'Message personnel (optionnel)' })}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.gray900 }]}
                value={inviteMessage}
                onChangeText={setInviteMessage}
                placeholder={t('teamManagement.inviteMessagePlaceholder', {
                  defaultValue: 'Bonjour, je serais ravi de vous avoir dans mon equipe...',
                }) as string}
                placeholderTextColor={colors.gray400}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary, opacity: inviteSubmitting ? 0.6 : 1 }]}
                onPress={handleInvite}
                disabled={inviteSubmitting}
                activeOpacity={TOUCH_OPACITY}
              >
                {inviteSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {t('teamManagement.inviteSend', { defaultValue: 'Envoyer l\'invitation' })}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </EditorialCanvas>
  );
}

function translatePermission(perm: string, t: (k: string, opts?: any) => string): string {
  const labels: Record<string, string> = {
    scan_tickets: 'Scanner les billets',
    moderate_chat: 'Moderer le chat de l\'event',
    view_analytics: 'Voir les analytics',
    view_registrations: 'Voir la liste des inscrits',
    edit_event: 'Editer l\'evenement',
    manage_team: 'Inviter d\'autres membres d\'equipe',
  };
  return t(`teamManagement.perm_${perm}`, { defaultValue: labels[perm] || perm });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
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
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
  },
  inviteCta: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  memberCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  roleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
  },
  memberRole: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  memberMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  memberActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  emptyCtaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
  },
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rolePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  roleChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  permissionsBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  permissionsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    marginBottom: 4,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permissionText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  submitButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
  },
});
