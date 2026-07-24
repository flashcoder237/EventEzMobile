/**
 * WeddingRsvpScreen
 *
 * Cible du deep link `eventez://invitations/accept/{token}` (et de l'App Link
 * https://eventez.online/invitations/accept/{token}).
 *
 * Affiche l'invitation (titre, date, lieu, inviteur) et permet à l'invité de
 * confirmer sa présence — avec RSVP structuré (nombre d'accompagnants, régime,
 * mot aux mariés) — ou de décliner. Endpoint public : aucune connexion requise.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { weddingsAPI } from '../../api';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import {
  BorderRadius,
  FontFamily,
  FontSizes,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'WeddingRsvp'>;

type Phase = 'loading' | 'form' | 'done' | 'notfound' | 'already';

export default function WeddingRsvpScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { token } = route.params;
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const [phase, setPhase] = useState<Phase>('loading');
  const [info, setInfo] = useState<any>(null);
  const [attending, setAttending] = useState<boolean | null>(null);
  const [partySize, setPartySize] = useState('0');
  const [dietary, setDietary] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acceptedFinal, setAcceptedFinal] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await weddingsAPI.invitationByToken(token);
      const data = res.data;
      setInfo(data);
      if (data?.status && data.status !== 'pending') {
        setPhase('already');
      } else {
        setPhase('form');
      }
    } catch {
      setPhase('notfound');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (attending === null) return;
    setSubmitting(true);
    try {
      if (attending) {
        await weddingsAPI.respondByToken(token, 'accept', {
          party_size: Math.max(0, parseInt(partySize, 10) || 0),
          dietary_requirements: dietary,
          rsvp_note: note,
        });
      } else {
        await weddingsAPI.respondByToken(token, 'decline');
      }
      setAcceptedFinal(attending);
      setPhase('done');
    } catch {
      // erreur silencieuse : on laisse l'utilisateur réessayer
    } finally {
      setSubmitting(false);
    }
  };

  const ev = info?.event && typeof info.event === 'object' ? info.event : null;
  const eventTitle = info?.event_title || ev?.title || '';
  const inviterName = info?.inviter_name || '';
  const bcp47 = i18n.language === 'en' ? 'en-US' : 'fr-FR';
  const eventDate = ev?.start_date
    ? new Date(ev.start_date).toLocaleDateString(bcp47, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const eventPlace = [ev?.location_name, ev?.location_city].filter(Boolean).join(', ');

  if (phase === 'loading') {
    return (
      <EditorialCanvas edges={['top']}>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>RSVP</WatermarkNumeral>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={[styles.heartBadge, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('wedding.rsvpTitle', { defaultValue: 'Confirmez votre présence' })}</Text>
          {!!eventTitle && (
            <Text style={[styles.eventTitle, { color: colors.text }]}>{eventTitle}</Text>
          )}
          {!!inviterName && (
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {t('wedding.invitedBy', { name: inviterName, defaultValue: `Invité par ${inviterName}` })}
            </Text>
          )}
          {!!eventDate && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.primary} />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{eventDate}</Text>
            </View>
          )}
          {!!eventPlace && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color={colors.primary} />
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{eventPlace}</Text>
            </View>
          )}
        </View>

        {phase === 'notfound' && (
          <Text style={[styles.centerMsg, { color: colors.textSecondary }]}>
            {t('wedding.notFound', { defaultValue: 'Invitation introuvable ou expirée.' })}
          </Text>
        )}

        {phase === 'already' && (
          <Text style={[styles.centerMsg, { color: colors.textSecondary }]}>
            {t('wedding.alreadyResponded', { defaultValue: 'Vous avez déjà répondu à cette invitation.' })}
          </Text>
        )}

        {phase === 'done' && (
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
            <Text style={[styles.centerMsg, { color: colors.text }]}>
              {acceptedFinal
                ? t('wedding.thanksAccepted', { defaultValue: 'Merci ! Votre présence est confirmée.' })
                : t('wedding.thanksDeclined', { defaultValue: 'Merci de nous avoir prévenus.' })}
            </Text>
            <TouchableOpacity
              activeOpacity={TOUCH_OPACITY}
              onPress={() => navigation.navigate('Main' as never)}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                {t('common.backHome', { defaultValue: "Retour à l'accueil" })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'form' && (
          <View style={styles.form}>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                activeOpacity={TOUCH_OPACITY}
                onPress={() => setAttending(true)}
                style={[
                  styles.choice,
                  {
                    borderColor: attending === true ? colors.success : colors.border,
                    backgroundColor: attending === true ? colors.success + '14' : colors.card,
                  },
                ]}
              >
                <Ionicons name="checkmark" size={18} color={attending === true ? colors.success : colors.textSecondary} />
                <Text style={[styles.choiceText, { color: colors.text }]}>
                  {t('wedding.willAttend', { defaultValue: 'Je serai présent(e)' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={TOUCH_OPACITY}
                onPress={() => setAttending(false)}
                style={[
                  styles.choice,
                  {
                    borderColor: attending === false ? colors.error : colors.border,
                    backgroundColor: attending === false ? colors.error + '14' : colors.card,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={attending === false ? colors.error : colors.textSecondary} />
                <Text style={[styles.choiceText, { color: colors.text }]}>
                  {t('wedding.wontAttend', { defaultValue: 'Je ne pourrai pas venir' })}
                </Text>
              </TouchableOpacity>
            </View>

            {attending === true && (
              <View style={styles.fields}>
                <Text style={[styles.label, { color: colors.text }]}>
                  {t('wedding.partySize', { defaultValue: "Nombre d'accompagnants" })}
                </Text>
                <TextInput
                  value={partySize}
                  onChangeText={setPartySize}
                  keyboardType="number-pad"
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                />
                <Text style={[styles.label, { color: colors.text }]}>
                  {t('wedding.dietary', { defaultValue: 'Régime alimentaire / allergies' })}
                </Text>
                <TextInput
                  value={dietary}
                  onChangeText={setDietary}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                />
                <Text style={[styles.label, { color: colors.text }]}>
                  {t('wedding.note', { defaultValue: 'Un mot pour les mariés' })}
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={TOUCH_OPACITY}
              onPress={submit}
              disabled={attending === null || submitting}
              style={[
                styles.submit,
                { backgroundColor: colors.primary, opacity: attending === null || submitting ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.submitText}>
                {submitting
                  ? t('common.loading', { defaultValue: 'Chargement…' })
                  : t('wedding.submit', { defaultValue: 'Envoyer ma réponse' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  heartBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontFamily: FontFamily.bold, fontSize: FontSizes.xl, textAlign: 'center' },
  eventTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.lg, marginTop: 4, textAlign: 'center' },
  muted: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 4, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  meta: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  centerMsg: { fontFamily: FontFamily.regular, fontSize: FontSizes.md, textAlign: 'center', marginVertical: Spacing.lg },
  doneBox: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  link: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, marginTop: Spacing.sm },
  form: { gap: Spacing.md },
  choiceRow: { flexDirection: 'row', gap: Spacing.sm },
  choice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  choiceText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  fields: { gap: Spacing.xs },
  label: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.md,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  submit: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  submitText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, color: '#FFFFFF' },
});
