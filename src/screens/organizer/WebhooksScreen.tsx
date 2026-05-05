// ============================================
// WebhooksScreen — endpoints HTTP push d'un organisateur
// ============================================
//
// Liste les WebhookEndpoint (un par URL externe) avec :
//   - URL + types d'events souscrits
//   - toggle is_active
//   - bouton "Tester" pour envoyer un payload de test
//   - bouton supprimer
//
// Modal de création : URL + secret + sélection multi-checkbox des event_types.
// Le secret n'est affiché qu'à la création (write-only côté backend).

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { webhooksAPI } from '../../api';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Webhook {
  id: string;
  url: string;
  event_types: string[];
  is_active: boolean;
  deliveries_count?: number;
  created_at?: string;
}

// Aligné avec WebhookEndpoint.EVENT_TYPE_CHOICES côté backend.
const EVENT_TYPES: { key: string; label: string }[] = [
  { key: 'registration.created', label: 'Nouvelle inscription' },
  { key: 'registration.cancelled', label: 'Inscription annulée' },
  { key: 'payment.completed', label: 'Paiement complété' },
  { key: 'payment.failed', label: 'Paiement échoué' },
  { key: 'event.updated', label: 'Événement modifié' },
  { key: 'event.cancelled', label: 'Événement annulé' },
  { key: 'ticket.purchased', label: 'Billet acheté' },
  { key: 'ticket.transferred', label: 'Billet transféré' },
  { key: 'checkin.completed', label: 'Check-in effectué' },
];

function generateSecret(): string {
  // Suffisant pour un secret HMAC : 32 chars base32-like.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return out;
}

export default function WebhooksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Modal de création
  const [createOpen, setCreateOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newSelectedTypes, setNewSelectedTypes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await webhooksAPI.getAll();
      const data: Webhook[] = res.data?.results || res.data || [];
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError('Erreur', error?.response?.data?.detail || 'Impossible de charger les webhooks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWebhooks();
  };

  const openCreate = () => {
    setNewUrl('');
    setNewSecret(generateSecret());
    setNewSelectedTypes(['registration.created', 'payment.completed']);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
  };

  const toggleType = (key: string) => {
    setNewSelectedTypes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key],
    );
  };

  const submitCreate = async () => {
    const url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      showError('URL invalide', "L'URL doit commencer par http:// ou https://");
      return;
    }
    if (newSelectedTypes.length === 0) {
      showError('Aucun événement', 'Sélectionne au moins un type d\'événement à pousser.');
      return;
    }
    setCreating(true);
    try {
      const res = await webhooksAPI.create({
        url,
        secret: newSecret,
        event_types: newSelectedTypes,
        is_active: true,
      });
      const newHook = res.data;
      if (newHook?.id) {
        setWebhooks(prev => [newHook, ...prev]);
      } else {
        await fetchWebhooks();
      }
      showSuccess('Webhook créé', 'Le secret a été enregistré côté backend (non récupérable ensuite).');
      setCreateOpen(false);
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.response?.data?.url?.[0];
      showError('Erreur', detail || 'Impossible de créer le webhook.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (hook: Webhook) => {
    if (actionId) return;
    setActionId(hook.id);
    setWebhooks(prev => prev.map(h => h.id === hook.id ? { ...h, is_active: !h.is_active } : h));
    try {
      await webhooksAPI.toggleActive(hook.id);
    } catch (error: any) {
      setWebhooks(prev => prev.map(h => h.id === hook.id ? { ...h, is_active: hook.is_active } : h));
      showError('Erreur', error?.response?.data?.detail || 'Impossible de changer l\'état.');
    } finally {
      setActionId(null);
    }
  };

  const handleTest = async (hook: Webhook) => {
    if (actionId) return;
    setActionId(hook.id);
    try {
      await webhooksAPI.test(hook.id);
      showSuccess('Test envoyé', 'Vérifie ton endpoint pour confirmer la réception.');
    } catch (error: any) {
      showError('Erreur', error?.response?.data?.detail || 'Test du webhook échoué.');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = (hook: Webhook) => {
    showConfirm(
      'Supprimer le webhook ?',
      `${hook.url}\n\nCette action est irréversible.`,
      async () => {
        try {
          await webhooksAPI.delete(hook.id);
          setWebhooks(prev => prev.filter(h => h.id !== hook.id));
          showSuccess('Webhook supprimé', '');
        } catch (error: any) {
          showError('Erreur', error?.response?.data?.detail || 'Suppression impossible.');
        }
      },
    );
  };

  const renderItem = ({ item }: { item: Webhook }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconWell, { backgroundColor: item.is_active ? '#10B98115' : `${colors.gray400}15` }]}>
          <Ionicons name="git-network-outline" size={18} color={item.is_active ? '#10B981' : colors.gray400} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.url, { color: colors.text }]} numberOfLines={1}>
            {item.url}
          </Text>
          <Text style={[styles.subline, { color: colors.gray500 }]} numberOfLines={1}>
            {item.event_types.length} type{item.event_types.length > 1 ? 's' : ''} · {item.deliveries_count ?? 0} livraison{(item.deliveries_count ?? 0) > 1 ? 's' : ''}
          </Text>
        </View>
        <Switch
          value={item.is_active}
          onValueChange={() => handleToggle(item)}
          disabled={actionId === item.id}
          trackColor={{ false: colors.gray300, true: `${colors.primary}80` }}
          thumbColor={item.is_active ? colors.primary : colors.gray100}
        />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
          onPress={() => handleTest(item)}
          disabled={actionId === item.id}
          activeOpacity={0.7}
        >
          <Ionicons name="paper-plane-outline" size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Tester</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}
          onPress={() => handleDelete(item)}
          disabled={actionId === item.id}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>INTÉGRATIONS</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Webhooks</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={openCreate}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Nouveau webhook"
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={webhooks}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, webhooks.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="git-network-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun webhook</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                Pousse tes events EventEz vers Zapier, Make, ou ton propre back-office en temps réel.
              </Text>
            </View>
          }
        />
      )}

      {/* === CREATE MODAL === */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={closeCreate}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalEyebrow, { color: colors.accent }]}>NOUVEAU WEBHOOK</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Endpoint HTTP</Text>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>URL de destination</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="https://hooks.zapier.com/..."
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!creating}
              />

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>Secret (HMAC)</Text>
              <View style={styles.secretRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text, flex: 1 }]}
                  value={newSecret}
                  onChangeText={setNewSecret}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!creating}
                />
                <TouchableOpacity
                  style={[styles.regenBtn, { backgroundColor: `${colors.primary}15` }]}
                  onPress={() => setNewSecret(generateSecret())}
                  disabled={creating}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.helpText, { color: colors.gray500 }]}>
                Ce secret signe les payloads (header X-EventEz-Signature). Il ne sera plus visible après création.
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>Événements à pousser</Text>
              <View style={styles.typesGrid}>
                {EVENT_TYPES.map(t => {
                  const active = newSelectedTypes.includes(t.key);
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active ? colors.primary : (isDark ? colors.gray100 : colors.gray50),
                          borderColor: active ? colors.primary : hairline,
                        },
                      ]}
                      onPress={() => !creating && toggleType(t.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.typeChipText, { color: active ? '#fff' : colors.gray700 }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.gray100 }]}
                  onPress={closeCreate}
                  disabled={creating}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: colors.gray700 }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }, creating && { opacity: 0.6 }]}
                  onPress={submitCreate}
                  disabled={creating}
                  activeOpacity={0.85}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: Colors.white }]}>Créer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerEyebrow: {
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  url: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    letterSpacing: -0.1,
  },
  subline: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionText: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs, letterSpacing: 0.2 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
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
  fieldLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  secretRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  regenBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 4,
    lineHeight: 16,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
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
    letterSpacing: 0.4,
  },
});
