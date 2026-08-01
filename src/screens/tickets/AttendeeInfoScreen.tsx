import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { attendeeFormsAPI } from '../../api/attendees';
import DynamicFormFields from '../../components/forms/DynamicFormFields';
import { FontFamily, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface AttendeeSlot {
  id: string;
  index: number;
  status: string;
  is_complete: boolean;
  delegate_email: string | null;
  data?: Record<string, any>;
}
interface FieldSchema { label: string; field_type: string; required: boolean; options?: string }

type ParamList = { AttendeeInfo: { registrationId: string } };

/**
 * Écran « Complétez vos N participants » (moment B, après paiement).
 * Cible du deep link eventez://registrations/{id}/attendees (fallback MoMo).
 * Réutilise DynamicFormFields (renderer de champs custom existant).
 */
export default function AttendeeInfoScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showError } = useAlert();
  const route = useRoute<RouteProp<ParamList, 'AttendeeInfo'>>();
  const { registrationId } = route.params;

  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [attendees, setAttendees] = useState<AttendeeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<AttendeeSlot | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [delegatingId, setDelegatingId] = useState<string | null>(null);
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateBusy, setDelegateBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await attendeeFormsAPI.getAttendees(registrationId);
      setFields(res.data.form_fields || []);
      setAttendees(res.data.attendees || []);
      setPending(false);
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.code === 'payment_pending') {
        setPending(true);
      } else {
        showError(t('attendeeForm.errorTitle'), t('attendeeForm.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [registrationId, showError, t]);

  useEffect(() => { load(); }, [load]);

  // Poll tant que le paiement n'est pas confirmé (retour MoMo incertain).
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [pending, load]);

  const total = attendees.length;
  const done = attendees.filter((a) => a.is_complete).length;

  const openEditor = (a: AttendeeSlot) => {
    setDraft({ ...(a.data || {}) });
    setEditing(a);
  };

  const delegate = async (attendeeId: string) => {
    if (delegateBusy || !delegateEmail.trim()) return;
    setDelegateBusy(true);
    try {
      await attendeeFormsAPI.delegate(attendeeId, delegateEmail.trim());
      setDelegatingId(null);
      setDelegateEmail('');
      await load();
    } catch {
      showError(t('attendeeForm.errorTitle'), t('attendeeForm.delegateError'));
    } finally {
      setDelegateBusy(false);
    }
  };

  const save = async () => {
    if (!editing || saving) return;
    const missing = fields.find((f) => f.required && !String(draft[f.label] ?? '').trim());
    if (missing) {
      showError(t('attendeeForm.errorTitle'), t('attendeeForm.fillRequired'));
      return;
    }
    setSaving(true);
    try {
      await attendeeFormsAPI.patchAttendee(editing.id, draft);
      setEditing(null);
      await load();
    } catch {
      showError(t('attendeeForm.errorTitle'), t('attendeeForm.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (pending) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: Spacing.lg }}>
          {t('attendeeForm.paymentPending')}
        </Text>
      </SafeAreaView>
    );
  }

  if (editing) {
    const normalized = fields.map((f, i) => ({
      id: i, label: f.label, field_type: f.field_type as any,
      required: f.required, options: f.options, order: i, step: 1,
    }));
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={[styles.h2, { color: colors.text }]}>
            {t('attendeeForm.participantN', { n: editing.index + 1 })}
          </Text>
          <DynamicFormFields
            formFields={normalized as any}
            formData={draft}
            onFieldChange={(label, value) => setDraft((p) => ({ ...p, [label]: value }))}
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setEditing(null)} style={styles.secondaryBtn}>
              <Text style={{ color: colors.textSecondary }}>{t('attendeeForm.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              disabled={saving}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.5 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>
                {saving ? t('attendeeForm.saving') : t('attendeeForm.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={[styles.h2, { color: colors.text }]}>{t('attendeeForm.title')}</Text>
          <Text style={{ color: colors.textSecondary, fontFamily: FontFamily.semiBold }}>
            {t('attendeeForm.progress', { done, total })}
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.gray100 }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${total ? (done / total) * 100 : 0}%` }]} />
        </View>
        <Text style={{ color: colors.textSecondary, marginBottom: Spacing.md }}>
          {t('attendeeForm.subtitle')}
        </Text>

        {attendees.map((a) => (
          <View key={a.id} style={[styles.card, { borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t('attendeeForm.participantN', { n: a.index + 1 })}
                </Text>
                <Text style={styles.cardStatus}>
                  {a.is_complete ? (
                    <Text style={{ color: '#059669' }}>✓ {t('attendeeForm.completed')}</Text>
                  ) : a.delegate_email ? (
                    <Text style={{ color: '#D97706' }}>✉ {t('attendeeForm.delegatedTo', { email: a.delegate_email })}</Text>
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>● {t('attendeeForm.toFill')}</Text>
                  )}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                {!a.is_complete && (
                  <TouchableOpacity onPress={() => { setDelegatingId(delegatingId === a.id ? null : a.id); setDelegateEmail(a.delegate_email || ''); }}>
                    <Text style={{ color: '#D97706', fontFamily: FontFamily.semiBold }}>
                      {t('attendeeForm.delegate')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEditor(a)}>
                  <Text style={{ color: colors.primary, fontFamily: FontFamily.semiBold }}>
                    {a.is_complete ? t('attendeeForm.edit') : t('attendeeForm.fill')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {delegatingId === a.id && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm }}>
                <TextInput
                  value={delegateEmail}
                  onChangeText={setDelegateEmail}
                  placeholder={t('attendeeForm.delegateEmailPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    flex: 1, borderWidth: 1, borderColor: colors.border,
                    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm, color: colors.text,
                  }}
                />
                <TouchableOpacity
                  onPress={() => delegate(a.id)}
                  disabled={delegateBusy || !delegateEmail.trim()}
                  style={{
                    backgroundColor: '#D97706', paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
                    opacity: delegateBusy || !delegateEmail.trim() ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: FontFamily.semiBold }}>
                    {t('attendeeForm.delegateSend')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  h2: { fontFamily: FontFamily.bold, fontSize: FontSizes.lg, marginBottom: Spacing.md },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm,
  },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  cardStatus: { fontSize: FontSizes.sm, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },
  secondaryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  primaryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  primaryBtnText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold },
});
