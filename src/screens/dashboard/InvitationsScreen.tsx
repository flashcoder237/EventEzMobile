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
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: Colors.warning, bg: Colors.warningLight },
  accepted: { label: 'Acceptee', color: Colors.success, bg: Colors.successLight },
  declined: { label: 'Refusee', color: Colors.error, bg: Colors.errorLight },
  cancelled: { label: 'Annulee', color: Colors.textLight, bg: Colors.gray100 },
  expired: { label: 'Expiree', color: Colors.textLight, bg: Colors.gray100 },
};

export default function InvitationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      Alert.alert('Succes', 'Invitation acceptee !');
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
      'Etes-vous sur de vouloir refuser cette invitation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(id);
            try {
              await invitationsAPI.decline(id);
              Alert.alert('Succes', 'Invitation refusee.');
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
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primaryBg }]}>
            <Ionicons
              name={isReceived ? 'mail' : 'send'}
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.eventName, { color: colors.text }]} numberOfLines={1}>
              {item.event_title || item.event_name || 'Evenement'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {isReceived
                ? `De: ${item.inviter_name || 'Organisateur'}`
                : `A: ${item.invitee_name || item.invitee_email || 'Invite'}`
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
          <Text style={[styles.messageText, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={[styles.dateText, { color: colors.textLight }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.textLight} />{' '}
            {formatDate(item.created_at)}
          </Text>

          {isReceived && isPending && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton, { backgroundColor: colors.errorLight }]}
                onPress={() => handleDecline(item.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="close" size={16} color={colors.error} />
                    <Text style={[styles.declineText, { color: colors.error }]}>Refuser</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAccept(item.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const currentData = activeTab === 'received' ? received : sent;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Invitations</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons
            name="mail-outline"
            size={16}
            color={activeTab === 'received' ? colors.primary : colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'received' && [styles.activeTabText, { color: colors.primary }]]}>
            Recues ({received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('sent')}
        >
          <Ionicons
            name="send-outline"
            size={16}
            color={activeTab === 'sent' ? colors.primary : colors.textLight}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'sent' && [styles.activeTabText, { color: colors.primary }]]}>
            Envoyees ({sent.length})
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
              <Emails color={colors.primary} size={150} />
            </AnimatedIllustration>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              {activeTab === 'received' ? 'Aucune invitation recue' : 'Aucune invitation envoyee'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              {activeTab === 'received'
                ? 'Les invitations que vous recevrez apparaitront ici.'
                : 'Les invitations que vous envoyez apparaitront ici.'
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.md },
  tab: { flex: 1, flexDirection: 'row', paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  activeTab: { backgroundColor: Colors.white, ...Shadows.md },
  tabText: { fontSize: FontSizes.sm, color: Colors.textLight, fontWeight: '600' },
  activeTabText: { color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  cardHeaderInfo: { flex: 1, marginRight: Spacing.sm },
  eventName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  cardSubtitle: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  messageText: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: FontSizes.xs, color: Colors.textLight },
  actionButtons: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.lg, gap: 4 },
  declineButton: { backgroundColor: Colors.errorLight },
  acceptButton: { backgroundColor: Colors.primary },
  declineText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.error },
  acceptText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.white },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textLight, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, color: Colors.textLight, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
