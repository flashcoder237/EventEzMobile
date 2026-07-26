import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { exhibitorsAPI } from '../../api/exhibitors';
import { eventsAPI } from '../../api/events';
import { Spacing, Shadows } from '../../constants/theme';

/**
 * Onglet « Vente déléguée » du BoothManagementScreen (côté HÔTE) :
 *  - active la vente déléguée + fixe la part hôte (bornée) + fee bearer défaut
 *  - liste les événements satellites en host_review à approuver / refuser
 */
export default function SalesDelegationTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  // Config
  const [configId, setConfigId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [sharePct, setSharePct] = useState('0');
  const [maxShare, setMaxShare] = useState('20');
  const [savingCfg, setSavingCfg] = useState(false);

  // Approbations
  const [satellites, setSatellites] = useState<any[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [cfgRes, satRes] = await Promise.all([
        exhibitorsAPI.getSalesConfig({ event: eventId }).catch(() => null),
        eventsAPI
          .getSatelliteEvents({ host_event: eventId, status: 'host_review' })
          .catch(() => null),
      ]);
      const cfg = (cfgRes?.data?.results || cfgRes?.data || [])[0] || null;
      if (cfg) {
        setConfigId(cfg.id);
        setEnabled(!!cfg.enabled);
        setSharePct(String(cfg.host_revenue_share_pct ?? '0'));
        setMaxShare(String(cfg.max_host_share_pct ?? '20'));
      }
      setSatellites(satRes?.data?.results || satRes?.data || []);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async () => {
    const pct = parseFloat(sharePct || '0');
    const cap = parseFloat(maxShare || '20');
    if (isNaN(pct) || pct < 0 || pct > cap) {
      showError(t('common.error', { defaultValue: 'Erreur' }),
        t('exhibitorSales.shareRange', { defaultValue: `La part doit être entre 0 et ${cap} %.`, max: cap }));
      return;
    }
    setSavingCfg(true);
    try {
      const payload = { enabled, host_revenue_share_pct: pct };
      if (configId) {
        await exhibitorsAPI.updateSalesConfig(configId, payload);
      } else {
        const res = await exhibitorsAPI.createSalesConfig({ event: eventId, ...payload });
        setConfigId(res.data?.id || null);
      }
      showSuccess(t('exhibitorSales.saved', { defaultValue: 'Configuration enregistrée.' }));
    } catch (e: any) {
      showError(t('common.error', { defaultValue: 'Erreur' }),
        e?.response?.data?.host_revenue_share_pct?.[0] ||
        t('exhibitorSales.saveError', { defaultValue: 'Impossible d\'enregistrer.' }));
    } finally {
      setSavingCfg(false);
    }
  };

  const approve = async (sat: any) => {
    setActionId(sat.id);
    try {
      await eventsAPI.hostApproveEvent(sat.id);
      showSuccess(t('exhibitorSales.approved', { defaultValue: 'Événement approuvé.' }));
      setSatellites((prev) => prev.filter((s) => s.id !== sat.id));
    } catch (e: any) {
      showError(t('common.error', { defaultValue: 'Erreur' }),
        e?.response?.data?.detail || t('exhibitorSales.actionError', { defaultValue: 'Action impossible.' }));
    } finally {
      setActionId(null);
    }
  };

  const reject = async (sat: any) => {
    // Refus rapide avec motif générique (le web permet un motif détaillé).
    setActionId(sat.id);
    try {
      await eventsAPI.hostRejectEvent(
        sat.id,
        t('exhibitorSales.defaultRejectReason', { defaultValue: 'Non retenu par l\'organisateur du salon.' }),
      );
      showSuccess(t('exhibitorSales.rejected', { defaultValue: 'Événement refusé.' }));
      setSatellites((prev) => prev.filter((s) => s.id !== sat.id));
    } catch (e: any) {
      showError(t('common.error', { defaultValue: 'Erreur' }),
        e?.response?.data?.detail || t('exhibitorSales.actionError', { defaultValue: 'Action impossible.' }));
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
      {/* File d'approbation */}
      {satellites.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t('exhibitorSales.toApprove', { defaultValue: 'Événements à approuver', count: satellites.length })} ({satellites.length})
          </Text>
          {satellites.map((sat) => (
            <View key={sat.id} style={[styles.satRow, { borderTopColor: hairline }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.satTitle, { color: colors.text }]} numberOfLines={1}>{sat.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => approve(sat)}
                disabled={actionId === sat.id}
                style={[styles.approveBtn, { backgroundColor: '#16A34A' }]}
              >
                {actionId === sat.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark" size={18} color="#fff" />}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => reject(sat)}
                disabled={actionId === sat.id}
                style={[styles.rejectBtn, { backgroundColor: `${colors.accent}15` }]}
              >
                <Ionicons name="close" size={18} color={colors.accent} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Config du salon */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {t('exhibitorSales.configTitle', { defaultValue: 'Vente déléguée' })}
        </Text>
        <Text style={[styles.intro, { color: colors.gray500 }]}>
          {t('exhibitorSales.configIntro', { defaultValue: 'Autorisez vos exposants confirmés à créer leur événement rattaché et à vendre leurs billets. Vous prélevez une part sur leurs ventes.' })}
        </Text>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('exhibitorSales.enable', { defaultValue: 'Activer sur ce salon' })}
          </Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.gray300, true: colors.primary }}
            thumbColor={isDark ? colors.card : '#FFFFFF'}
          />
        </View>

        <View style={[styles.fieldRow, !enabled && { opacity: 0.5 }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('exhibitorSales.share', { defaultValue: 'Votre part', max: maxShare })} (max {maxShare} %)
          </Text>
          <View style={styles.shareInputWrap}>
            <TextInput
              value={sharePct}
              onChangeText={setSharePct}
              editable={enabled}
              keyboardType="decimal-pad"
              style={[styles.shareInput, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
            />
            <Text style={[styles.pctSign, { color: colors.gray500 }]}>%</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={saveConfig}
          disabled={savingCfg}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          {savingCfg
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>{t('common.save', { defaultValue: 'Enregistrer' })}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { borderRadius: 18, borderWidth: 1, padding: Spacing.lg, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  intro: { fontSize: 12.5, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  fieldRow: { gap: 6, marginTop: 4 },
  label: { fontSize: 13.5, fontWeight: '600' },
  shareInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareInput: { width: 90, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  pctSign: { fontSize: 14 },
  saveBtn: { marginTop: 8, borderRadius: 14, alignItems: 'center', paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  satRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  satTitle: { fontSize: 14, fontWeight: '600' },
  approveBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
