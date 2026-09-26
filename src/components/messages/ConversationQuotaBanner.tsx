/**
 * ConversationQuotaBanner (mobile) — version React Native du composant web.
 *
 * Affichage PROGRESSIF en haut d'une conversation `group` ou `event` : le
 * bandeau reste silencieux tant qu'il n'y a rien à faire, et se dévoile par
 * paliers à l'approche d'une limite.
 *
 *   < 70 % et > 7 jours   → rien (cas nominal)
 *   ≥ 70 %                → barre de quota seule
 *   ≤ 7 jours             → échéance de suppression + bouton "Sauvegarder"
 *   lecture seule         → encart ambre seul (la jauge est masquée : la
 *                           conversation est gelée, le quota n'informe plus)
 *
 * Il était auparavant permanent : jauge à 0 %, compte à rebours décrémentant
 * chaque jour et bouton "Sauvegarder" affichés en continu. Bruyant et
 * anxiogène, pour une information non actionnable 95 % du temps.
 *
 * Pour les conversations `direct` → le composant rend `null`.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { messagesAPI } from '../../api';
import { downloadConversationBackup, getLastExportAt } from '../../lib/utils/conversationExport';
import { formatBytes } from '../../constants/messaging';
import { FontFamily } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

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

function formatRelativeFr(iso: string, t: (k: string, opts?: any) => string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('componentsMessages.relativeNow');
  if (diffMin < 60) return t('componentsMessages.relativeMin', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('componentsMessages.relativeHour', { count: diffH });
  const diffJ = Math.floor(diffH / 24);
  if (diffJ === 1) return t('componentsMessages.relativeYesterday');
  if (diffJ < 7) return t('componentsMessages.relativeDays', { count: diffJ });
  if (diffJ < 30) return t('componentsMessages.relativeWeeks', { count: Math.floor(diffJ / 7) });
  return t('componentsMessages.relativeMonths', { count: Math.floor(diffJ / 30) });
}

/** Seuil de quota (%) a partir duquel la jauge devient visible. */
export const QUOTA_VISIBLE_PCT = 70;
/** Nombre de jours avant suppression a partir duquel on previent. */
export const DEADLINE_VISIBLE_DAYS = 7;

/**
 * Que faut-il afficher, compte tenu de l'etat du quota ?
 *
 * Extrait du composant pour etre testable : c'est la regle qui evite que le
 * bandeau squatte l'ecran en permanence.
 */
export function computeBannerVisibility(input: {
  percentage: number | null;
  daysUntilDelete: number | null;
  autoDeleteAt: string | null;
  maxBytes: number | null;
  isReadOnly: boolean;
}): {
  visible: boolean;
  showBar: boolean;
  showDeadline: boolean;
  showSaveButton: boolean;
} {
  const pct = input.percentage ?? 0;
  const days = input.daysUntilDelete;

  const quotaNear = pct >= QUOTA_VISIBLE_PCT;
  const deadlineNear = days != null && days >= 0 && days <= DEADLINE_VISIBLE_DAYS;

  // Lecture seule : la conversation est bloquee, on le dit quoi qu'il arrive.
  const visible = input.isReadOnly || quotaNear || deadlineNear;

  return {
    visible,
    // En lecture seule, la jauge ne sert plus a rien : la conversation est
    // gelee, plus personne n'y ecrira. Afficher « 0 o / 500 Mo » sous un
    // bandeau d'archivage ajoute du bruit sans informer.
    showBar: input.maxBytes != null && quotaNear && !input.isReadOnly,
    showDeadline: input.autoDeleteAt != null && !input.isReadOnly && deadlineNear,
    showSaveButton: !input.isReadOnly && (quotaNear || deadlineNear),
  };
}

/**
 * Le bandeau porte-t-il une information ACTIONNABLE ?
 *
 * Sert a forcer l'ouverture de la zone de tete, qui est repliee par defaut :
 * replier un avertissement reviendrait a le masquer. Aligne sur les memes
 * seuils que `computeBannerVisibility` — les deux doivent bouger ensemble.
 */
export function bannerNeedsAttention(input: {
  percentage: number | null;
  daysUntilDelete: number | null;
  isReadOnly: boolean;
  isMuted?: boolean;
}): boolean {
  const pct = input.percentage ?? 0;
  const days = input.daysUntilDelete;
  return (
    input.isReadOnly
    || !!input.isMuted
    || (days != null && days >= 0 && days <= DEADLINE_VISIBLE_DAYS)
    || pct >= QUOTA_VISIBLE_PCT
  );
}

export default function ConversationQuotaBanner({
  conversationId,
  conversationType,
  onQuotaUpdate,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useAlert();
  // Locale d'affichage des dates dérivée de la langue courante (pas fr-FR figé).
  const dateLocale = (i18n.language || 'fr').split('-')[0] === 'en' ? 'en-US' : 'fr-FR';
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
      } catch (err: any) {
        if (!cancelled) {
          // FAIL-CLOSED sur 403 : le quota est refusé quand l'accès à la conv est
          // perdu côté serveur (retiré du groupe, conv passée read-only). Sans
          // ça, `state` restait null → le banner ET le gating read-only
          // disparaissaient → l'input redevenait actif alors que la conv est
          // verrouillée (message optimiste qui part puis échoue = bulle rouge
          // inexpliquée). On pose un état read-only synthétique. Les autres
          // erreurs (réseau, 5xx) ne verrouillent pas : la conv peut être OK.
          const status = err?.response?.status;
          if (status === 403) {
            const synthetic: QuotaState = {
              conversation_type: conversationType || 'group',
              total_bytes: 0, max_bytes: null, percentage: null,
              is_read_only: true, read_only_at: null,
              auto_delete_at: null, days_until_delete: null, days_until_readonly: null,
              event_id: null, can_post: false,
            };
            setState(synthetic);
            onQuotaUpdate?.(synthetic);
          } else if (__DEV__) {
            console.warn('[ConversationQuotaBanner] fetch failed', err);
          }
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
        t('componentsMessages.quotaSaving'),
        t('componentsMessages.quotaSavingMsg', { count: data.conversation.message_count }),
      );
      const v = await getLastExportAt(conversationId);
      setLastExportAt(v);
    } catch (err: any) {
      showError(
        t('common.error'),
        getApiErrorMessage(err, t, { fallbackKey: 'componentsMessages.quotaSaveError' }).message,
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading || isDirect) return null;
  if (!state) return null;
  if (state.conversation_type === 'direct') return null;

  const pct = state.percentage ?? 0;

  // Regle d'affichage progressif (voir computeBannerVisibility ci-dessus).
  const { visible, showBar, showDeadline, showSaveButton } = computeBannerVisibility({
    percentage: state.percentage,
    daysUntilDelete: state.days_until_delete,
    autoDeleteAt: state.auto_delete_at,
    maxBytes: state.max_bytes,
    isReadOnly: state.is_read_only,
  });
  if (!visible) return null;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#10b981';
  const barTrack = pct >= 90 ? '#fee2e2' : pct >= 70 ? '#fed7aa' : colors.gray100 || '#f3f4f6';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <View style={[styles.container, { backgroundColor: colors.surface || '#fafafa', borderBottomColor: colors.gray200 }]}>
      {/* Bandeau read-only — priorité visuelle */}
      {state.is_read_only && (
        <View style={styles.readOnlyBanner}>
          <Ionicons name="lock-closed" size={18} color="#92400e" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.readOnlyTitle}>{t('componentsMessages.quotaReadOnlyTitle')}</Text>
            <Text style={styles.readOnlyText}>
              {state.auto_delete_at
                ? t('componentsMessages.quotaReadOnlyTextScheduled', { date: formatDate(state.auto_delete_at) })
                : t('componentsMessages.quotaReadOnlyTextSoon')}
              {state.days_until_delete != null && state.days_until_delete >= 0
                ? t('componentsMessages.quotaReadOnlyDays', { count: state.days_until_delete })
                : ''}
              {t('componentsMessages.quotaReadOnlyEnd')}
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
            <Text style={styles.actionButtonPrimaryText}>{t('componentsMessages.quotaSaveBtn')}</Text>
          </Pressable>
        </View>
      )}

      {/* Barre de quota + meta */}
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 6 }}>
          {showBar && (
            <>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barLabel, { color: colors.gray500 }]}>
                  {formatBytes(state.total_bytes)} / {formatBytes(state.max_bytes ?? 0)}
                </Text>
                {pct >= QUOTA_VISIBLE_PCT && (
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

          {showDeadline && (
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: isDark ? colors.gray100 : '#fff',
                  borderColor: isDark ? colors.border : '#e5e7eb',
                },
              ]}
            >
              <Ionicons name="calendar-outline" size={11} color={isDark ? '#a78bfa' : '#7c3aed'} />
              <Text style={[styles.metaPillText, { color: colors.text }]}>
                {t('componentsMessages.quotaDeleteIn', { count: state.days_until_delete })}
              </Text>
            </View>
          )}

          {lastExportAt && (
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
                  borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#a7f3d0',
                },
              ]}
            >
              <Ionicons name="download-outline" size={11} color={isDark ? '#34d399' : '#059669'} />
              <Text style={[styles.metaPillText, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
                {t('componentsMessages.quotaSavedRelative', { relative: formatRelativeFr(lastExportAt, t) })}
              </Text>
            </View>
          )}
        </View>

        {showSaveButton && (
          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={({ pressed }) => [
              styles.actionButtonSecondary,
              {
                opacity: pressed || exporting ? 0.7 : 1,
                backgroundColor: isDark ? colors.gray100 : '#fff',
                borderColor: isDark ? colors.border : colors.gray200,
              },
            ]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="download-outline" size={14} color={colors.text} />
            )}
            <Text style={[styles.actionButtonSecondaryText, { color: colors.text }]}>{t('componentsMessages.quotaSaveBtn')}</Text>
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
    // Ambre, pas rouge : une conversation archivee n'est pas une ERREUR, c'est
    // un etat de fin de vie normal. Le rouge sature dramatisait un evenement
    // attendu, et banalisait la couleur reservee aux vraies erreurs.
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  readOnlyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#78350f',
    marginBottom: 2,
  },
  readOnlyText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#92400e',
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
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  barPct: {
    fontFamily: FontFamily.bold,
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
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    fontWeight: '500',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#b45309',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonPrimaryText: {
    fontFamily: FontFamily.bold,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonSecondaryText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    fontWeight: '500',
  },
});
