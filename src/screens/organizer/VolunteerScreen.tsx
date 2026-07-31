import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Share,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { volunteersAPI } from '../../api';
import { getVolunteerSignupUrl } from '../../constants/urls';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { FontSizes, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { useTheme } from '../../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VolunteerRouteProp = RouteProp<RootStackParamList, 'Volunteers'>;

interface VolunteerRole {
  id: string;
  title: string;
  description?: string;
  event_name?: string;
  event_title?: string;
  capacity: number;
  filled_count?: number;
  applications_count?: number;
  requirements?: string;
  is_active?: boolean;
}

interface VolunteerApplication {
  id: string;
  role_title?: string;
  role_name?: string;
  role?: string;
  applicant_name?: string;
  applicant_email?: string;
  motivation?: string;
  availability?: string;
  experience?: string;
  // 'accepted' = nouveau status backend (model). 'approved' = legacy (compat).
  status: 'pending' | 'approved' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
}

export default function VolunteerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VolunteerRouteProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const eventId = route.params?.eventId;
  // Vue organisateur = l'utilisateur GÈRE réellement cet event. Le flag `manage`
  // est posé par l'appelant : MyEvents (toujours), ou EventDetails uniquement si
  // l'utilisateur est le propriétaire/admin de l'event. On ne se base PLUS sur
  // le rôle global (`user.role === 'organizer'`) : sinon n'importe quel
  // organisateur voyait les contrôles de gestion sur l'event d'autrui, et si le
  // rôle n'était pas peuplé tout le monde tombait sur la vue bénévole.
  const isOrganizerView = !!eventId && route.params?.manage === true;

  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  // Candidatures recues sur les events que je gere (vue organizer uniquement).
  // Vide tant que l'onglet 'received' n'est pas active OU si je ne suis pas
  // organisateur d'au moins un event.
  const [receivedApps, setReceivedApps] = useState<VolunteerApplication[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Nouveau tab 'received' visible seulement en mode organizer (eventId + role).
  const [activeTab, setActiveTab] = useState<'roles' | 'applications' | 'received' | 'tasks'>('roles');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal de création de rôle (organizer seulement)
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createRequirements, setCreateRequirements] = useState('');
  const [createCapacity, setCreateCapacity] = useState('5');
  const [createLoading, setCreateLoading] = useState(false);

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateRequirements('');
    setCreateCapacity('5');
  };

  const closeCreate = () => {
    if (createLoading) return;
    setCreateOpen(false);
    resetCreateForm();
  };

  const submitCreateRole = async () => {
    if (!eventId) return;
    const title = createTitle.trim();
    const cap = parseInt(createCapacity, 10);
    if (!title) {
      Alert.alert(t('organizer.volunteer.titleRequiredTitle'), t('organizer.volunteer.titleRequiredMessage'));
      return;
    }
    if (!Number.isFinite(cap) || cap < 1) {
      Alert.alert(t('organizer.volunteer.capacityInvalidTitle'), t('organizer.volunteer.capacityInvalidMessage'));
      return;
    }
    setCreateLoading(true);
    try {
      const res = await volunteersAPI.createRole({
        event: eventId,
        title,
        description: createDescription.trim() || undefined,
        requirements: createRequirements.trim() || undefined,
        quantity_needed: cap,
      });
      const created = res.data;
      // Insertion optimistic en tête de liste pour feedback immédiat.
      if (created?.id) {
        setRoles(prev => [created, ...prev]);
      } else {
        await fetchData();
      }
      Alert.alert(t('organizer.volunteer.roleCreatedTitle'), t('organizer.volunteer.roleCreatedMessage'));
      setCreateOpen(false);
      resetCreateForm();
    } catch (error: any) {
      const detail = error?.response?.data?.detail || t('organizer.volunteer.createRoleError');
      Alert.alert(t('common.error'), detail);
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const params = eventId ? { event: eventId } : undefined;
      // En mode organizer on charge aussi les candidatures recues sur cet event.
      // Backend filtre deja sur "events que je gere", donc 403 silencieux si
      // l'utilisateur n'est en realite pas organizer (defense en profondeur).
      const receivedPromise = isOrganizerView && eventId
        ? volunteersAPI.getReceivedApplications({ event: eventId }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] } as any);
      const [rolesRes, appsRes, receivedRes, tasksRes] = await Promise.all([
        volunteersAPI.getRoles(params),
        volunteersAPI.getMyApplications(),
        receivedPromise,
        // my_tasks ne renvoie que celles assignées au user courant — utile
        // uniquement si l'utilisateur a au moins une candidature acceptée.
        volunteersAPI.getMyTasks().catch(() => ({ data: [] })),
      ]);
      setRoles(rolesRes.data.results || rolesRes.data || []);
      setApplications(appsRes.data.results || appsRes.data || []);
      setReceivedApps(receivedRes.data?.results || receivedRes.data || []);
      setTasks(tasksRes.data?.results || tasksRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur volunteers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [eventId]);

  const handleApply = (role: VolunteerRole) => {
    Alert.alert(
      t('organizer.volunteer.applyTitle'),
      t('organizer.volunteer.applyMessage', { title: role.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('organizer.volunteer.apply'),
          onPress: async () => {
            setActionLoading(role.id);
            try {
              await volunteersAPI.apply({ role: role.id });
              Alert.alert(t('common.success'), t('organizer.volunteer.applySuccess'));
              fetchData();
            } catch (error: any) {
              if (__DEV__) console.error('Erreur apply volunteer:', error);
              const message = error?.response?.data?.detail || t('organizer.volunteer.applyError');
              Alert.alert(t('common.error'), message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCompleteTask = (taskId: string) => {
    Alert.alert(
      t('organizer.volunteer.completeTaskTitle'),
      t('organizer.volunteer.completeTaskMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('organizer.volunteer.complete'),
          onPress: async () => {
            setActionLoading(taskId);
            // Optimistic : on flip le status local pour éviter d'attendre.
            setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: 'completed' } : task));
            try {
              await volunteersAPI.completeTask(taskId);
            } catch (error: any) {
              setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: task.status === 'completed' ? 'in_progress' : task.status } : task));
              Alert.alert(t('common.error'), error?.response?.data?.detail || t('organizer.volunteer.completeError'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // Organizer accepte une candidature recue
  const handleAcceptApplication = (application: VolunteerApplication) => {
    Alert.alert(
      t('organizer.volunteer.acceptTitle', { defaultValue: 'Accepter la candidature' }),
      t('organizer.volunteer.acceptMessage', {
        defaultValue: 'Confirmer l\'acceptation de cette candidature ? Le benevole sera notifie.',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('organizer.volunteer.accept', { defaultValue: 'Accepter' }),
          onPress: async () => {
            setActionLoading(application.id);
            try {
              await volunteersAPI.acceptApplication(application.id);
              setReceivedApps((prev) =>
                prev.map((a) =>
                  a.id === application.id ? { ...a, status: 'accepted' } : a,
                ),
              );
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

  // Organizer rejette une candidature recue (avec raison optionnelle)
  const handleRejectApplication = (application: VolunteerApplication) => {
    Alert.alert(
      t('organizer.volunteer.rejectTitle', { defaultValue: 'Refuser la candidature' }),
      t('organizer.volunteer.rejectMessage', {
        defaultValue: 'Confirmer le refus ? Le benevole sera notifie.',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('organizer.volunteer.reject', { defaultValue: 'Refuser' }),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(application.id);
            try {
              await volunteersAPI.rejectApplication(application.id);
              setReceivedApps((prev) =>
                prev.map((a) =>
                  a.id === application.id ? { ...a, status: 'rejected' } : a,
                ),
              );
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

  const handleWithdraw = (applicationId: string) => {
    Alert.alert(
      t('organizer.volunteer.withdrawTitle'),
      t('organizer.volunteer.withdrawMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('organizer.volunteer.withdraw'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(applicationId);
            try {
              await volunteersAPI.withdrawApplication(applicationId);
              Alert.alert(t('common.success'), t('organizer.volunteer.withdrawSuccess'));
              fetchData();
            } catch (error) {
              if (__DEV__) console.error('Erreur withdraw:', error);
              Alert.alert(t('common.error'), t('organizer.volunteer.withdrawError'));
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderRoleCard = ({ item }: { item: VolunteerRole }) => {
    const filled = item.filled_count || 0;
    const capacity = item.capacity || 0;
    const fillPercentage = capacity > 0 ? Math.min((filled / capacity) * 100, 100) : 0;
    const isFull = filled >= capacity && capacity > 0;
    const isProcessing = actionLoading === item.id;
    const hasApplied = applications.some(
      (a) => a.role === item.id && (a.status === 'pending' || a.status === 'approved')
    );

    return (
      <View style={[styles.roleCard, { backgroundColor: colors.card }]}>
        <View style={styles.roleHeader}>
          <View style={[styles.roleIconContainer, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="hand-right-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            {(item.event_title || item.event_name) && (
              <Text style={[styles.roleEvent, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.event_title || item.event_name}
              </Text>
            )}
          </View>
        </View>

        {item.description ? (
          <Text style={[styles.roleDescription, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {item.requirements ? (
          <View style={[styles.requirementsRow, { backgroundColor: colors.gray50 }]}>
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.requirementsText, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.requirements}
            </Text>
          </View>
        ) : null}

        {/* Capacity Bar */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityLabelRow}>
            <Text style={[styles.capacityLabel, { color: colors.textLight }]}>{t('organizer.volunteer.places')}</Text>
            <Text style={[styles.capacityValue, { color: colors.text }]}>
              {filled}/{capacity}
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.gray100 }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${fillPercentage}%`, backgroundColor: colors.primary },
                isFull && { backgroundColor: colors.error },
              ]}
            />
          </View>
        </View>

        {/* Action */}
        {hasApplied ? (
          <View style={[styles.appliedBadge, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.appliedText, { color: colors.success }]}>{t('organizer.volunteer.applied')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary }, (isFull || !item.is_active) && { backgroundColor: colors.gray300 }]}
            onPress={() => handleApply(item)}
            disabled={isFull || isProcessing || !item.is_active}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={[styles.applyButtonText, { color: '#fff' }]}>
                  {isFull ? t('organizer.volunteer.full') : t('organizer.volunteer.apply')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTaskCard = ({ item }: { item: any }) => {
    const isProcessing = actionLoading === item.id;
    const status = item.status as 'todo' | 'in_progress' | 'completed' | 'cancelled';
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';
    const priority = item.priority as 'low' | 'medium' | 'high' | 'urgent';
    const priorityColor = priority === 'urgent' ? '#EF4444'
      : priority === 'high' ? '#F59E0B'
      : priority === 'medium' ? '#3B82F6'
      : colors.textLight;
    const priorityLabel = priority === 'urgent' ? t('organizer.volunteer.priorityUrgent')
      : priority === 'high' ? t('organizer.volunteer.priorityHigh')
      : priority === 'medium' ? t('organizer.volunteer.priorityMedium')
      : t('organizer.volunteer.priorityLow');

    return (
      <View style={[styles.applicationCard, { backgroundColor: colors.card }, isCompleted && { opacity: 0.7 }]}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicationInfo}>
            <Text
              style={[
                styles.applicationRole,
                { color: colors.text },
                isCompleted && { textDecorationLine: 'line-through' },
              ]}
              numberOfLines={2}
            >
              {item.title || t('organizer.volunteer.fallbackTask')}
            </Text>
            {item.event_title && (
              <Text style={[styles.applicationApplicant, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.event_title}
              </Text>
            )}
          </View>
          {priority && (
            <View style={[styles.statusBadge, { backgroundColor: `${priorityColor}15` }]}>
              <Text style={[styles.statusText, { color: priorityColor }]}>{priorityLabel}</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text style={[styles.motivationText, { color: colors.textSecondary, fontStyle: 'normal' }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.applicationFooter}>
          <Text style={[styles.applicationDate, { color: colors.textLight }]}>
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : isCancelled ? 'close-circle-outline' : 'time-outline'}
              size={12}
              color={isCompleted ? colors.success : colors.textLight}
            />{' '}
            {isCompleted ? t('organizer.volunteer.taskCompleted') : isCancelled ? t('organizer.volunteer.taskCancelled') : status === 'in_progress' ? t('organizer.volunteer.taskInProgress') : t('organizer.volunteer.taskTodo')}
            {item.due_date ? ` · ${formatDate(item.due_date)}` : ''}
          </Text>

          {!isCompleted && !isCancelled && (
            <TouchableOpacity
              style={[styles.withdrawButton, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30`, borderWidth: 1 }]}
              onPress={() => handleCompleteTask(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                  <Text style={[styles.withdrawText, { color: colors.success }]}>{t('organizer.volunteer.complete')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderApplicationCard = ({ item }: { item: VolunteerApplication }) => {
    const statusColors: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: t('organizer.volunteer.statusPending'), color: colors.warning, bg: colors.warningLight },
      approved: { label: t('organizer.volunteer.statusApproved'), color: colors.success, bg: colors.successLight },
      rejected: { label: t('organizer.volunteer.statusRejected'), color: colors.error, bg: colors.errorLight },
      withdrawn: { label: t('organizer.volunteer.statusWithdrawn'), color: colors.textLight, bg: colors.gray100 },
    };
    const statusConfig = statusColors[item.status] || statusColors.pending;
    const isPending = item.status === 'pending';
    const isProcessing = actionLoading === item.id;

    return (
      <View style={[styles.applicationCard, { backgroundColor: colors.card }]}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicationInfo}>
            <Text style={[styles.applicationRole, { color: colors.text }]} numberOfLines={1}>
              {item.role_title || item.role_name || t('organizer.volunteer.fallbackRole')}
            </Text>
            {item.applicant_name && (
              <Text style={[styles.applicationApplicant, { color: colors.textSecondary }]}>
                {item.applicant_name}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {item.motivation ? (
          <Text style={[styles.motivationText, { color: colors.textSecondary }]} numberOfLines={2}>
            "{item.motivation}"
          </Text>
        ) : null}

        <View style={styles.applicationFooter}>
          <Text style={[styles.applicationDate, { color: colors.textLight }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.textLight} />{' '}
            {formatDate(item.created_at)}
          </Text>

          {isPending && (
            <TouchableOpacity
              style={[styles.withdrawButton, { backgroundColor: colors.errorLight }]}
              onPress={() => handleWithdraw(item.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                  <Text style={[styles.withdrawText, { color: colors.error }]}>{t('organizer.volunteer.withdraw')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Candidature reçue (vue organizer). Refactorée pour utiliser le StyleSheet +
  // les couleurs du thème + l'i18n, comme les autres cartes (avant : styles
  // inline avec couleurs et libellés en dur → incohérent + non dark-mode).
  const renderReceivedCard = ({ item }: { item: VolunteerApplication }) => {
    const applicantName =
      item.applicant_name || item.applicant_email || t('organizer.volunteer.anonymous', { defaultValue: 'Anonyme' });
    const isProcessing = actionLoading === item.id;
    const canAct = item.status === 'pending';
    const statusColors: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: t('organizer.volunteer.statusPending'), color: colors.warning, bg: colors.warningLight },
      approved: { label: t('organizer.volunteer.statusApproved'), color: colors.success, bg: colors.successLight },
      accepted: { label: t('organizer.volunteer.statusApproved'), color: colors.success, bg: colors.successLight },
      rejected: { label: t('organizer.volunteer.statusRejected'), color: colors.error, bg: colors.errorLight },
      withdrawn: { label: t('organizer.volunteer.statusWithdrawn'), color: colors.textLight, bg: colors.gray100 },
    };
    const sc = statusColors[item.status] || statusColors.pending;

    return (
      <View style={[styles.applicationCard, { backgroundColor: colors.card }]}>
        <View style={styles.applicationHeader}>
          <View style={[styles.receivedAvatar, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.applicationInfo}>
            <Text style={[styles.applicationRole, { color: colors.text }]} numberOfLines={1}>{applicantName}</Text>
            {item.applicant_email ? (
              <Text style={[styles.applicationApplicant, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.applicant_email}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {(item.role_title || item.role_name) ? (
          <Text style={[styles.receivedRoleLine, { color: colors.textSecondary }]}>
            {t('organizer.volunteer.appliedFor', { defaultValue: 'Pour le rôle :' })}{' '}
            <Text style={{ color: colors.primary, fontFamily: FontFamily.semiBold }}>
              {item.role_title || item.role_name}
            </Text>
          </Text>
        ) : null}

        {item.motivation ? (
          <View style={styles.receivedField}>
            <Text style={[styles.receivedFieldLabel, { color: colors.textLight }]}>
              {t('organizer.volunteer.motivationLabel', { defaultValue: 'Motivation' })}
            </Text>
            <Text style={[styles.receivedFieldValue, { color: colors.textSecondary }]}>{item.motivation}</Text>
          </View>
        ) : null}
        {item.availability ? (
          <View style={styles.receivedField}>
            <Text style={[styles.receivedFieldLabel, { color: colors.textLight }]}>
              {t('organizer.volunteer.availabilityLabel', { defaultValue: 'Disponibilité' })}
            </Text>
            <Text style={[styles.receivedFieldValue, { color: colors.textSecondary }]}>{item.availability}</Text>
          </View>
        ) : null}
        {item.experience ? (
          <View style={styles.receivedField}>
            <Text style={[styles.receivedFieldLabel, { color: colors.textLight }]}>
              {t('organizer.volunteer.experienceLabel', { defaultValue: 'Expérience' })}
            </Text>
            <Text style={[styles.receivedFieldValue, { color: colors.textSecondary }]}>{item.experience}</Text>
          </View>
        ) : null}

        {canAct ? (
          <View style={styles.receivedActions}>
            <TouchableOpacity
              onPress={() => handleAcceptApplication(item)}
              disabled={isProcessing}
              style={[styles.receivedActionBtn, { backgroundColor: colors.successLight }]}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.receivedActionText, { color: colors.success }]}>
                    {t('organizer.volunteer.accept', { defaultValue: 'Accepter' })}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRejectApplication(item)}
              disabled={isProcessing}
              style={[styles.receivedActionBtn, { backgroundColor: colors.errorLight }]}
            >
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={[styles.receivedActionText, { color: colors.error }]}>
                {t('organizer.volunteer.reject', { defaultValue: 'Refuser' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>VOL</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <LoadingSpinner />
        </View>
      </EditorialCanvas>
    );
  }

  const currentData = activeTab === 'roles' ? roles : applications;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>VOL</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('organizer.volunteer.headerEyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.volunteer.headerTitle')}</Text>
        </View>
        {isOrganizerView ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Bouton Partager : copie un lien public vers la page volunteer
                de cet event (OpenGraph + deep link mobile). */}
            {eventId && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Share.share({
                      message: t('organizer.volunteer.shareMessage', {
                        defaultValue: 'Devenez benevole pour cet evenement : {{url}}',
                        url: getVolunteerSignupUrl(eventId),
                      }),
                      url: getVolunteerSignupUrl(eventId),
                    });
                  } catch {
                    // user cancelled
                  }
                }}
                style={[styles.backButton, { backgroundColor: `${colors.primary}15` }]}
                accessibilityRole="button"
                accessibilityLabel={t('organizer.volunteer.shareLinkA11y', {
                  defaultValue: 'Partager le lien d\'inscription benevole',
                })}
              >
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setCreateOpen(true)}
              style={[styles.backButton, { backgroundColor: `${colors.primary}15` }]}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.volunteer.createRoleA11y')}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roles' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('roles')}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={activeTab === 'roles' ? colors.primary : colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'roles' && { color: colors.primary }]}>
            {t('organizer.volunteer.tabRoles', { count: roles.length })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applications' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('applications')}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={activeTab === 'applications' ? colors.primary : colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'applications' && { color: colors.primary }]}>
            {t('organizer.volunteer.tabApplications', { count: applications.length })}
          </Text>
        </TouchableOpacity>
        {/* Tab "Recues" : organizer-only, candidatures sur mes events. Visible
            meme si vide pour signaler la fonction. Permet d'accept/reject. */}
        {isOrganizerView && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && [styles.activeTab, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('received')}
          >
            <Ionicons
              name="mail-unread-outline"
              size={16}
              color={activeTab === 'received' ? colors.primary : colors.textLight}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'received' && { color: colors.primary }]}>
              {t('organizer.volunteer.tabReceived', {
                defaultValue: 'Recues ({{count}})',
                count: receivedApps.length,
              })}
            </Text>
          </TouchableOpacity>
        )}
        {/* Tab Tâches : visible uniquement si l'utilisateur a des tâches assignées
            (il faut une candidature acceptée + un task assigné par l'organisateur).
            On évite de polluer la nav pour les volontaires qui n'ont rien à faire. */}
        {tasks.length > 0 && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tasks' && [styles.activeTab, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('tasks')}
          >
            <Ionicons
              name="checkbox-outline"
              size={16}
              color={activeTab === 'tasks' ? colors.primary : colors.textLight}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'tasks' && { color: colors.primary }]}>
              {t('organizer.volunteer.tabTasks', { count: tasks.length })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {activeTab === 'roles' && (
        <FlatList
          data={roles}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('organizer.volunteer.emptyRolesTitle')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                {t('organizer.volunteer.emptyRolesText')}
              </Text>
            </View>
          }
          renderItem={renderRoleCard}
        />
      )}
      {activeTab === 'applications' && (
        <FlatList
          data={applications}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('organizer.volunteer.emptyApplicationsTitle')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                {t('organizer.volunteer.emptyApplicationsText')}
              </Text>
            </View>
          }
          renderItem={renderApplicationCard}
        />
      )}
      {activeTab === 'received' && (
        <FlatList
          data={receivedApps}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                {t('organizer.volunteer.emptyReceivedTitle', {
                  defaultValue: 'Aucune candidature recue',
                })}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                {t('organizer.volunteer.emptyReceivedText', {
                  defaultValue: 'Les benevoles qui postuleront a vos roles apparaitront ici.',
                })}
              </Text>
            </View>
          }
          renderItem={renderReceivedCard}
        />
      )}
      {activeTab === 'tasks' && (
        <FlatList
          data={tasks}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkbox-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('organizer.volunteer.emptyTasksTitle')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                {t('organizer.volunteer.emptyTasksText')}
              </Text>
            </View>
          }
          renderItem={renderTaskCard}
        />
      )}
      </View>

      {/* === CREATE ROLE MODAL (organizer only) === */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCreate}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('organizer.volunteer.modalEyebrow')}</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.volunteer.modalTitle')}</Text>

              <Text style={[styles.modalLabel, { color: colors.textLight }]}>{t('organizer.volunteer.titleField')}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.gray50, color: colors.text }]}
                value={createTitle}
                onChangeText={setCreateTitle}
                placeholder={t('organizer.volunteer.titlePlaceholder')}
                placeholderTextColor={colors.textLight}
                editable={!createLoading}
                maxLength={120}
              />

              <Text style={[styles.modalLabel, { color: colors.textLight }]}>{t('organizer.volunteer.capacityField')}</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.gray50, color: colors.text }]}
                value={createCapacity}
                onChangeText={setCreateCapacity}
                placeholder="5"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                editable={!createLoading}
              />

              <Text style={[styles.modalLabel, { color: colors.textLight }]}>{t('organizer.volunteer.descriptionField')}</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.gray50, color: colors.text }]}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder={t('organizer.volunteer.descriptionPlaceholder')}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!createLoading}
                maxLength={500}
              />

              <Text style={[styles.modalLabel, { color: colors.textLight }]}>{t('organizer.volunteer.requirementsField')}</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { backgroundColor: colors.gray50, color: colors.text }]}
                value={createRequirements}
                onChangeText={setCreateRequirements}
                placeholder={t('organizer.volunteer.requirementsPlaceholder')}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!createLoading}
                maxLength={300}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.gray100 }]}
                  onPress={closeCreate}
                  disabled={createLoading}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }, createLoading && { opacity: 0.6 }]}
                  onPress={submitCreateRole}
                  disabled={createLoading}
                  activeOpacity={0.85}
                >
                  {createLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('organizer.volunteer.create')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontFamily: FontFamily.bold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontSize: FontSizes.lg, fontFamily: FontFamily.displayBold, letterSpacing: -0.3 },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.md },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  activeTab: { ...Shadows.md },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600' },
  activeTabText: {},
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, ...centeredContent(CARD_MAX) },
  // Role Card
  roleCard: { borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  roleIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: FontSizes.md, fontWeight: '700' },
  roleEvent: { fontSize: FontSizes.xs, marginTop: 2 },
  roleDescription: { fontSize: FontSizes.sm, lineHeight: 18, marginBottom: Spacing.sm },
  requirementsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md },
  requirementsText: { flex: 1, fontSize: FontSizes.xs, lineHeight: 16 },
  capacitySection: { marginBottom: Spacing.md },
  capacityLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  capacityLabel: { fontSize: FontSizes.xs },
  capacityValue: { fontSize: FontSizes.xs, fontWeight: '700' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressBarFull: {},
  appliedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
  appliedText: { fontSize: FontSizes.sm, fontWeight: '600' },
  applyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.lg },
  applyButtonDisabled: {},
  applyButtonText: { fontSize: FontSizes.sm, fontWeight: '700' },
  // Application Card
  applicationCard: { borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  applicationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  applicationInfo: { flex: 1, marginRight: Spacing.sm },
  applicationRole: { fontSize: FontSizes.md, fontWeight: '700' },
  applicationApplicant: { fontSize: FontSizes.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  motivationText: { fontSize: FontSizes.sm, fontStyle: 'italic', marginBottom: Spacing.sm, lineHeight: 18 },
  applicationFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  applicationDate: { fontSize: FontSizes.xs },
  withdrawButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.lg },
  withdrawText: { fontSize: FontSizes.xs, fontWeight: '600' },
  // Received application card (organizer)
  receivedAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  receivedRoleLine: { fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  receivedField: { marginTop: Spacing.xs + 2 },
  receivedFieldLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  receivedFieldValue: { fontSize: FontSizes.sm, lineHeight: 18 },
  receivedActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  receivedActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.full },
  receivedActionText: { fontSize: FontSizes.sm, fontWeight: '700' },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSizes.md, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl },
  // Create-role modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 0,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  modalTextArea: {
    minHeight: 70,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
