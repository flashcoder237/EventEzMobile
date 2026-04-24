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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { invitationsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Emails, AnimatedIllustration } from '../../components/illustrations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Invitation {
  id: string;
  event_title?: string;
  event_name?: string;
  event?: string;
  inviter_name?: string;
  invitee_name?: string;
  invitee_email?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  message?: string;
  created_at: string;
}

export default function InvitationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'En attente', color: colors.warning, bg: `${colors.warning}15` },
    accepted: { label: 'Acceptée', color: colors.success, bg: `${colors.success}15` },
    declined: { label: 'Refusée', color: colors.error, bg: `${colors.error}15` },
    cancelled: { label: 'Annulée', color: colors.gray500, bg: `${colors.gray500}15` },
    expired: { label: 'Expirée', color: colors.gray500, bg: `${colors.gray500}15` },
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        invitationsAPI.getMyInvitations(),
        invitationsAPI.getAll({ type: 'sent' }),
      ]);
      setReceived(receivedRes.data.results || receivedRes.data || []);
      setSent(sentRes.data.results || sentRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await invitationsAPI.accept(id);
      Alert.alert('Succès', 'Invitation acceptée !');
      fetchData();
    } catch (error) {
      if (__DEV__) console.error('Erreur accept invitation:', error);
      Alert.alert('Erreur', 'Impossible d\'accepter l\'invitation.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string) => {
    Alert.alert(
      'Refuser l\'invitation',
      'Êtes-vous sûr de vouloir refuser cette invitation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(id);
            try {
              await invitationsAPI.decline(id);
              Alert.alert('Succès', 'Invitation refusée.');
              fetchData();
            } catch (error) {
              if (__DEV__) console.error('Erreur decline invitation:', error);
              Alert.alert('Erreur', 'Impossible de refuser l\'invitation.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderInvitationCard = ({ item }: { item: Invitation }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isReceived = activeTab === 'received';
    const isPending = item.status === 'pending';
    const isProcessing = actionLoading === item.id;

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons
              name={isReceived ? 'mail' : 'send'}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
              {item.event_title || item.event_name || 'Événement'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
              {isReceived
                ? `De : ${item.inviter_name || 'Organisateur'}`
                : `À : ${item.invitee_name || item.invitee_email || 'Invité'}`
              }
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {item.message ? (
          <Text style={[styles.messageText, { color: colors.gray500 }]} numberOfLines={2}>
            “{item.message}”
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.gray500} />
            <Text style={[styles.dateText, { color: colors.gray500 }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          {isReceived && isPending && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` },
                ]}
                onPress={() => handleDecline(item.id)}
                disabled={isProcessing}
                activeOpacity={0.75}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="close" size={14} color={colors.error} />
                    <Text style={[styles.declineText, { color: colors.error }]}>Refuser</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => handleAccept(item.id)}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    <Text style={styles.acceptText}>Accepter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const currentData = activeTab === 'received' ? received : sent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>MES INVITATIONS</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Invitations</Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabs,
          { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline },
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && [styles.activeTab, { backgroundColor: colors.card }, Shadows.sm]]}
          onPress={() => setActiveTab('received')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="mail-outline"
            size={14}
            color={activeTab === 'received' ? colors.text : colors.gray500}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'received' ? colors.text : colors.gray500 },
            ]}
          >
            Reçues ({received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && [styles.activeTab, { backgroundColor: colors.card }, Shadows.sm]]}
          onPress={() => setActiveTab('sent')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send-outline"
            size={14}
            color={activeTab === 'sent' ? colors.text : colors.gray500}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'sent' ? colors.text : colors.gray500 },
            ]}
          >
            Envoyées ({sent.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={currentData}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AnimatedIllustration entry="fadeIn" idle="float">
              <Emails color={colors.primary} size={140} />
            </AnimatedIllustration>
            <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>
              {activeTab === 'received' ? 'BOÎTE DE RÉCEPTION' : 'ENVOIS'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {activeTab === 'received' ? 'Aucune invitation reçue' : 'Aucune invitation envoyée'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.gray500 }]}>
              {activeTab === 'received'
                ? 'Les invitations que vous recevrez apparaîtront ici.'
                : 'Les invitations que vous envoyez apparaîtront ici.'
              }
            </Text>
          </View>
        }
        renderItem={renderInvitationCard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  activeTab: {},
  tabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  cardHeaderInfo: { flex: 1, marginRight: Spacing.sm },
  eventName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.md,
  },
  cardSubtitle: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  messageText: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: { fontSize: FontSizes.xs },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  declineText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  acceptText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.xs,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    marginTop: 2,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
