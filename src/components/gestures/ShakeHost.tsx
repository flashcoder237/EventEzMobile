/**
 * Hôte global de la secousse (monté une fois dans App.tsx).
 *
 * Un seul pont capteurs pour toute l'app, aiguillé par `resolveShake` :
 *  1. G1 — une action réversible de moins de 10 s → feuille « Annuler … ? »
 *     (jamais d'annulation directe) ; haptique « avertissement » à
 *     l'ouverture, « succès » à l'annulation ;
 *  2. le geste de l'écran affiché (`useShakeAction`) ;
 *  3. G2 — hors production uniquement (`EXPO_PUBLIC_SHAKE_TO_REPORT=1`) :
 *     signaler un problème avec une capture (jamais sur billet, paiement ou
 *     conversation).
 *
 * Le capteur ne tourne que s'il y a quelque chose à faire, et le réglage
 * « Gestes de mouvement » le coupe entièrement (cf. usePhonePosture).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { captureRef, captureScreen } from 'react-native-view-shot';
import Constants from 'expo-constants';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';
import { SpringSheet } from '../ui/motion/SpringSheet';
import { usePhonePosture } from '../ui/motion/usePhonePosture';
import { haptics } from '../../utils/haptics';
import { navigationRef } from '../../navigation/navigationRef';
import { undoStack, UndoEntry } from '../../lib/gestures/undoStack';
import {
  isReportExcludedRoute,
  isShakeReportEnabled,
  resolveShake,
  shakeRouter,
} from '../../lib/gestures/shakeRouter';
import { base64ToBytes } from '../../lib/gestures/base64';
import { captureFeedback } from '../../services/crashReporting';

const ACCENT = '#4F46E5';

function useStoreFlag(subscribe: (l: () => void) => () => void, read: () => boolean): boolean {
  const [value, setValue] = useState(read);
  useEffect(() => {
    setValue(read());
    return subscribe(() => setValue(read()));
  }, [subscribe, read]);
  return value;
}

const readUndo = () => undoStack.hasPending();
const readScreen = () => shakeRouter.hasScreenHandler();

export default function ShakeHost() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const reportEnabled = isShakeReportEnabled();
  const undoPending = useStoreFlag(undoStack.subscribe, readUndo);
  const screenHandler = useStoreFlag(shakeRouter.subscribe, readScreen);

  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [undoFailed, setUndoFailed] = useState(false);

  const [report, setReport] = useState<{ shot: string | null; route: string } | null>(null);
  const [blurred, setBlurred] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | 'ok' | 'off'>(null);
  const previewRef = useRef<View>(null);
  const busy = useRef(false);

  const onShake = useCallback(async () => {
    if (busy.current || undoEntry || report) return;
    const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name ?? '' : '';
    const target = resolveShake({
      undoPending: undoStack.hasPending(),
      hasScreenHandler: shakeRouter.hasScreenHandler(),
      reportEnabled,
      routeExcludedFromReport: isReportExcludedRoute(route),
    });
    if (target === 'undo') {
      const entry = undoStack.peek();
      if (!entry) return;
      haptics.warning();
      setUndoFailed(false);
      setUndoEntry(entry);
    } else if (target === 'screen') {
      shakeRouter.top()?.();
    } else if (target === 'report') {
      busy.current = true;
      let shot: string | null = null;
      try {
        // Capture AVANT d'ouvrir la feuille : on veut l'écran tel que vu.
        shot = await captureScreen({ format: 'jpg', quality: 0.6, result: 'base64' });
      } catch {
        shot = null;
      }
      busy.current = false;
      haptics.light();
      setBlurred(false);
      setNote('');
      setSent(null);
      setReport({ shot, route });
    }
  }, [report, reportEnabled, undoEntry]);

  const { sensorElement } = usePhonePosture(
    { shake: onShake },
    { enabled: undoPending || screenHandler || reportEnabled },
  );

  const confirmUndo = useCallback(async () => {
    if (!undoEntry || undoBusy) return;
    setUndoBusy(true);
    try {
      undoStack.drop(undoEntry.key);
      await undoEntry.undo();
      haptics.success();
      setUndoEntry(null);
    } catch {
      haptics.error();
      setUndoFailed(true);
    } finally {
      setUndoBusy(false);
    }
  }, [undoBusy, undoEntry]);

  const sendReport = useCallback(async () => {
    if (!report || sending) return;
    setSending(true);
    let data: string | null = report.shot;
    if (report.shot && blurred && previewRef.current) {
      try {
        data = await captureRef(previewRef, { format: 'jpg', quality: 0.7, result: 'base64' });
      } catch {
        data = null; // jamais l'image nette si le flou a échoué
      }
    }
    const version = Constants.expoConfig?.version ?? '';
    const build = String(
      Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber ?? '',
    );
    const ok = captureFeedback({
      message: note.trim() || t('gestures.report.noNote'),
      tags: { route: report.route || 'unknown', app_version: version, app_build: build, source: 'shake' },
      attachment: data ? { filename: 'screenshot.jpg', data: base64ToBytes(data), contentType: 'image/jpeg' } : null,
    });
    setSending(false);
    setSent(ok ? 'ok' : 'off');
    if (ok) haptics.success();
  }, [blurred, note, report, sending, t]);

  return (
    <>
      {sensorElement}

      <SpringSheet
        visible={!!undoEntry}
        onClose={() => setUndoEntry(null)}
        backgroundColor={colors.card}
        accessibilityLabel={t('gestures.undo.title')}
      >
        <View style={styles.body}>
          <View style={[styles.iconWrap, { backgroundColor: `${ACCENT}1A` }]}>
            <Ionicons name="arrow-undo-outline" size={24} color={ACCENT} />
          </View>
          <Text style={[styles.title, { color: colors.gray900 }]}>{t('gestures.undo.title')}</Text>
          <Text style={[styles.text, { color: colors.gray600 }]}>{undoEntry?.label}</Text>
          {undoFailed && (
            <Text style={[styles.text, { color: '#DC2626' }]}>{t('gestures.undo.failed')}</Text>
          )}
          <Pressable
            onPress={confirmUndo}
            disabled={undoBusy}
            style={[styles.primary, { backgroundColor: ACCENT }]}
            accessibilityRole="button"
          >
            {undoBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>{t('gestures.undo.confirm')}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setUndoEntry(null)} style={styles.secondary} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: colors.gray700 }]}>{t('gestures.undo.keep')}</Text>
          </Pressable>
        </View>
      </SpringSheet>

      {reportEnabled && (
        <SpringSheet
          visible={!!report}
          onClose={() => setReport(null)}
          backgroundColor={colors.card}
          keyboardAware
          accessibilityLabel={t('gestures.report.title')}
        >
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.gray900 }]}>{t('gestures.report.title')}</Text>
            <Text style={[styles.text, { color: colors.gray600 }]}>{t('gestures.report.subtitle')}</Text>
            {report?.shot ? (
              <View style={styles.previewRow}>
                <View ref={previewRef} collapsable={false} style={styles.preview}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${report.shot}` }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    blurRadius={blurred ? 18 : 0}
                    accessibilityIgnoresInvertColors
                  />
                </View>
                <Pressable
                  onPress={() => setBlurred((b) => !b)}
                  style={[styles.chip, { borderColor: blurred ? ACCENT : colors.gray300 }]}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: blurred }}
                >
                  <Ionicons name={blurred ? 'eye-off-outline' : 'eye-outline'} size={16} color={blurred ? ACCENT : colors.gray700} />
                  <Text style={[styles.chipText, { color: blurred ? ACCENT : colors.gray700 }]}>
                    {t('gestures.report.blur')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.text, { color: colors.gray500 }]}>{t('gestures.report.noShot')}</Text>
            )}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('gestures.report.placeholder')}
              placeholderTextColor={colors.gray400}
              multiline
              style={[styles.input, { color: colors.gray900, borderColor: colors.gray200 }]}
            />
            {sent === 'ok' && <Text style={[styles.text, { color: '#059669' }]}>{t('gestures.report.sent')}</Text>}
            {sent === 'off' && <Text style={[styles.text, { color: '#DC2626' }]}>{t('gestures.report.unavailable')}</Text>}
            {sent === 'ok' ? (
              <Pressable onPress={() => setReport(null)} style={[styles.primary, { backgroundColor: ACCENT }]} accessibilityRole="button">
                <Text style={styles.primaryText}>{t('common.close')}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={sendReport}
                disabled={sending}
                style={[styles.primary, { backgroundColor: ACCENT }]}
                accessibilityRole="button"
              >
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{t('gestures.report.send')}</Text>}
              </Pressable>
            )}
          </View>
        </SpringSheet>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 18, textAlign: 'center' },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  primary: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: 16 },
  secondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: FontFamily.medium, fontSize: 15 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  preview: { width: 96, height: 170, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 36 },
  chipText: { fontFamily: FontFamily.medium, fontSize: 14 },
  input: { minHeight: 90, borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: FontFamily.regular, fontSize: 15, textAlignVertical: 'top' },
});
