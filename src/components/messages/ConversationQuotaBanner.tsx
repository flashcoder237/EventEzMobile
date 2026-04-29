/**
 * ConversationQuotaBanner (mobile) — version React Native du composant web.
 *
 * Affiche en haut d'une conversation `group` ou `event` :
 *   - Une barre de quota cumulée (vert / orange / rouge).
 *   - L'échéance de suppression (event uniquement).
 *   - Un encart rouge "lecture seule" + bouton sauvegarder en évidence.
 *   - Un bouton "Sauvegarder" toujours dispo.
 *
 * Pour les conversations `direct` → le composant rend `null`.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messagesAPI } from '../../api';
import { downloadConversationBackup, getLastExportAt } from '../../lib/utils/conversationExport';
import { formatBytes } from '../../constants/messaging';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';

export interface QuotaState {
  conversation_type: 'direct' | 'group' | 'event';
  total_bytes: number;
  max_bytes: number | null;
  percentage: number | null;
  is_read_only: boolean;
  read_only_at: string | null;
  auto_delete_at: string | null;
  days_until_delete: number | null;
  days_until_readonly: number | null;
  event_id: number | null;
  // Permissions d'écriture (renvoyés par /quota/ depuis 2026-04-29)
  posting_mode?: 'all' | 'organizer_only' | 'admins_only';
  is_muted?: boolean;
  is_organizer?: boolean;
  can_post?: boolean;
}

interface Props {
  conversationId: number | string;
  conversationType?: 'direct' | 'group' | 'event';
  onQuotaUpdate?: (state: QuotaState) => void;
}

function formatRelativeFr(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diffMs = Date.now() - t;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ === 1) return 'hier';
  if (diffJ < 7) return `il y a ${diffJ} jours`;
  if (diffJ < 30) return `il y a ${Math.floor(diffJ / 7)} semaines`;
  return `il y a ${Math.floor(diffJ / 30)} mois`;
}

export default function ConversationQuotaBanner({
  conversationId,
  conversationType,
  onQuotaUpdate,
}: Props) {
  const { colors } = useTheme();
  const { showSuccess, showError } = useAlert();
  const [state, setState] = useState<QuotaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getLastExportAt(conversationId);
      if (!cancelled) setLastExportAt(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const isDirect = conversationType === 'direct';

  useEffect(() => {
    if (isDirect) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await messagesAPI.getConversationQuota(conversationId);
        if (!cancelled) {
          setState(res.data);
          onQuotaUpdate?.(res.data);
        }
      } catch (err) {
        if (!cancelled && __DEV__) {
          console.warn('[ConversationQuotaBanner] fetch failed', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await downloadConversationBackup(conversationId);
      showSuccess(
        'Sauvegarde locale',
        `${data.conversation.message_count} messages enregistrés sur votre appareil.`,
      );
      const v = await getLastExportAt(conversationId);
      setLastExportAt(v);
    } catch (err: any) {
      showError(
        'Erreur',
        err?.response?.data?.detail || 'Impossible de sauvegarder la conversation.',
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading || isDirect) return null;
  if (!state) return null;
  if (state.conversation_type === 'direct') return null;

  const pct = state.percentage ?? 0;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#10b981';
  const barTrack = pct >= 90 ? '#fee2e2' : pct >= 70 ? '#fed7aa' : colors.gray100 || '#f3f4f6';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <View style={[styles.container, { backgroundColor: colors.surface || '#fafafa', borderBottomColor: colors.gray200 }]}>
      {/* Bandeau read-only — priorité visuelle */}
      {state.is_read_only && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={18} color="#b91c1c" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.readOnlyTitle}>Lecture seule — sauvegardez maintenant</Text>
            <Text style={styles.readOnlyText}>
              Cette discussion sera supprimée
              {state.auto_delete_at ? ` le ${formatDate(state.auto_delete_at)}` : ' bientôt'}
              {state.days_until_delete != null && state.days_until_delete >= 0
                ? ` (dans ${state.days_until_delete} jour${state.days_until_delete > 1 ? 's' : ''})`
                : ''}
              . Plus aucun nouveau message ne peut être envoyé.
            </Text>
          </View>
          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={({ pressed }) => [
              styles.actionButtonPrimary,
              { opacity: pressed || exporting ? 0.7 : 1 },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={14} color="#fff" />
            )}
            <Text style={styles.actionButtonPrimaryText}>Sauvegarder</Text>
          </Pressable>
        </View>
      )}

      {/* Barre de quota + meta */}
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 6 }}>
          {state.max_bytes != null && (
            <>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.gray500 }]}>
                  {formatBytes(state.total_bytes)} / {formatBytes(state.max_bytes)}
                </Text>
                {pct >= 70 && (
                  <Text style={[styles.barPct, { color: pct >= 90 ? '#dc2626' : '#ea580c' }]}>
                    {pct.toFixed(0)} %
                  </Text>
                )}
              </View>
              <View style={[styles.barTrack, { backgroundColor: barTrack }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.min(100, pct)}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
            </>
          )}

          {state.auto_delete_at && !state.is_read_only && state.days_until_delete != null && (
            <View style={styles.metaPill}>
              <Ionicons name="calendar-outline" size={11} color="#7c3aed" />
              <Text style={styles.metaPillText}>
                Suppression dans {state.days_until_delete} jour{state.days_until_delete > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {lastExportAt && (
            <View style={[styles.metaPill, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
              <Ionicons name="download-outline" size={11} color="#059669" />
              <Text style={[styles.metaPillText, { color: '#065f46' }]}>
                Sauvegardé {formatRelativeFr(lastExportAt)}
              </Text>
            </View>
          )}
        </View>

        {!state.is_read_only && (
          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={({ pressed }) => [
              styles.actionButtonSecondary,
              { opacity: pressed || exporting ? 0.7 : 1, borderColor: colors.gray200 },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="download-outline" size={14} color={colors.text} />
            )}
            <Text style={[styles.actionButtonSecondaryText, { color: colors.text }]}>Sauvegarder</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  readOnlyBanner: {
    backgroundColor: '#fee2e2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  readOnlyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 2,
  },
  readOnlyText: {
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barLabel: {
    fontSize: 11,
  },
  barPct: {
    fontSize: 11,
    fontWeight: '700',
  },
  barTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  metaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaPillText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonPrimaryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonSecondaryText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
