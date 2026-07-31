// ============================================
// NewslettersScreen — gestion des newsletters d'un organizer
// ============================================
//
// Liste les newsletters créées + actions :
//   - Créer (subject + content)
//   - Envoyer maintenant (send_now) sur les drafts
//   - Voir le statut (draft / scheduled / sent / failed)
//   - Supprimer
//
// Le contenu est du HTML — l'éditeur mobile reste basique (TextInput
// multiline). Pour du HTML riche, l'organizer passera par le web.

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { newslettersAPI } from '../../api';
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

type NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

interface Newsletter {
  id: string;
  subject: string;
  content: string;
  status: NewsletterStatus;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

const STATUS_BG_FG: Record<NewsletterStatus, { bg: string; fg: string }> = {
  draft: { bg: '#F3F4F615', fg: '#6B7280' },
  scheduled: { bg: '#3B82F615', fg: '#1D4ED8' },
  sending: { bg: '#F59E0B15', fg: '#B45309' },
  sent: { bg: '#10B98115', fg: '#059669' },
  failed: { bg: '#EF444415', fg: '#B91C1C' },
};

export default function NewslettersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const STATUS_LABELS: Record<NewsletterStatus, string> = {
    draft: t('organizer.newsletters.statusDraft'),
    scheduled: t('organizer.newsletters.statusScheduled'),
    sending: t('organizer.newsletters.statusSending'),
    sent: t('organizer.newsletters.statusSent'),
    failed: t('organizer.newsletters.statusFailed'),
  };
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [items, setItems] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubject, setCreateSubject] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await newslettersAPI.getAll();
      const data: Newsletter[] = res.data?.results || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.newsletters.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const submitCreate = async () => {
    const subject = createSubject.trim();
    const content = createContent.trim();
    if (!subject) {
      showError(t('organizer.newsletters.subjectRequiredTitle'), t('organizer.newsletters.subjectRequiredMessage'));
      return;
    }
    if (!content) {
      showError(t('organizer.newsletters.contentRequiredTitle'), t('organizer.newsletters.contentRequiredMessage'));
      return;
    }
    setCreating(true);
    try {
      const res = await newslettersAPI.create({ subject, content });
      const created = res.data;
      if (created?.id) {
        setItems(prev => [created, ...prev]);
      } else {
        await fetchData();
      }
      showSuccess(t('organizer.newsletters.createSuccessTitle'), t('organizer.newsletters.createSuccessMessage'));
      setCreateOpen(false);
      setCreateSubject('');
      setCreateContent('');
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.newsletters.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleSendNow = (item: Newsletter) => {
    if (item.status !== 'draft') {
      showError(t('organizer.newsletters.notSendableTitle'), t('organizer.newsletters.notSendableMessage'));
      return;
    }
    showConfirm(
      t('organizer.newsletters.sendNowTitle'),
      t('organizer.newsletters.sendNowMessage', { subject: item.subject }),
      async () => {
        setActionId(item.id);
        // Optimistic flip vers "sending"
        setItems(prev => prev.map(n => n.id === item.id ? { ...n, status: 'sending' } : n));
        try {
          await newslettersAPI.sendNow(item.id);
          // Re-fetch pour récupérer le statut backend final (sent / scheduled selon stratégie).
          await fetchData();
          showSuccess(t('organizer.newsletters.sendTriggeredTitle'), t('organizer.newsletters.sendTriggeredMessage'));
        } catch (error: any) {
          setItems(prev => prev.map(n => n.id === item.id ? { ...n, status: 'draft' } : n));
          showError(t('common.error'), error?.response?.data?.detail || t('organizer.newsletters.sendError'));
        } finally {
          setActionId(null);
        }
      },
    );
  };

  const handleDelete = (item: Newsletter) => {
    showConfirm(
      t('organizer.newsletters.deleteTitle'),
      t('organizer.newsletters.deleteMessage', { subject: item.subject }),
      async () => {
        try {
          await newslettersAPI.delete(item.id);
          setItems(prev => prev.filter(n => n.id !== item.id));
          showSuccess(t('organizer.newsletters.deletedTitle'), '');
        } catch (error: any) {
          showError(t('common.error'), error?.response?.data?.detail || t('organizer.newsletters.deleteError'));
        }
      },
    );
  };

  const renderItem = ({ item }: { item: Newsletter }) => {
    const colorConfig = STATUS_BG_FG[item.status] || STATUS_BG_FG.draft;
    const label = STATUS_LABELS[item.status] || STATUS_LABELS.draft;
    const isProcessing = actionId === item.id;
    const canSend = item.status === 'draft';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardTop}>
          <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.subject, { color: colors.text }]} numberOfLines={2}>
              {item.subject}
            </Text>
            <Text style={[styles.preview, { color: colors.gray500 }]} numberOfLines={2}>
              {(item.content || '').replace(/<[^>]*>/g, '').slice(0, 120)}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: colorConfig.bg }]}>
            <Text style={[styles.statusText, { color: colorConfig.fg }]}>{label}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {canSend && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
              onPress={() => handleSendNow(item)}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={14} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>{t('organizer.newsletters.send')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}
            onPress={() => handleDelete(item)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('organizer.newsletters.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.newsletters.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.newsletters.newA11y')}
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
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, items.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.newsletters.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('organizer.newsletters.emptyText')}
              </Text>
            </View>
          }
        />
      )}

      {/* === CREATE MODAL === */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => !creating && setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('organizer.newsletters.modalEyebrow')}</Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.newsletters.modalTitle')}</Text>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.newsletters.subjectField')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                value={createSubject}
                onChangeText={setCreateSubject}
                placeholder={t('organizer.newsletters.subjectPlaceholder')}
                placeholderTextColor={colors.gray400}
                editable={!creating}
                maxLength={255}
              />

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.newsletters.contentField')}</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text },
                ]}
                value={createContent}
                onChangeText={setCreateContent}
                placeholder={t('organizer.newsletters.contentPlaceholder')}
                placeholderTextColor={colors.gray400}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                editable={!creating}
              />
              <Text style={[styles.helpText, { color: colors.gray500 }]}>
                {t('organizer.newsletters.helpText')}
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.gray100 }]}
                  onPress={() => !creating && setCreateOpen(false)}
                  disabled={creating}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
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
                    <Text style={[styles.modalBtnText, { color: Colors.white }]}>{t('organizer.newsletters.createDraft')}</Text>
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
    alignItems: 'flex-start',
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
  subject: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  preview: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 4,
    lineHeight: 17,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
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
    maxWidth: 480,
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
  textArea: {
    minHeight: 180,
  },
  helpText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 4,
    lineHeight: 16,
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
