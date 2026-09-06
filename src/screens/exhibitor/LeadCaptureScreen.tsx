/**
 * Capture de contacts sur un stand (lead retrieval).
 *
 * C'EST LA RAISON D'ÊTRE DU STAND. Un exposant paie pour repartir avec
 * des contacts qualifiés ; sans cet écran le module n'existait qu'en API,
 * donc pour personne.
 *
 * LE CONSENTEMENT EST AFFICHÉ, PAS CONTOURNÉ
 * ------------------------------------------
 * Scanner un badge transmet le nom, l'e-mail et le téléphone d'une
 * personne à une entreprise. Quand le visiteur ne l'a pas accepté, le
 * backend refuse (code `consent_required`) et on l'explique clairement
 * plutôt que d'échouer en silence : l'exposant peut alors demander
 * verbalement au visiteur d'activer son accord.
 *
 * Usage debout, une main, dans le bruit : gros boutons, retour haptique
 * et sonore, et la qualification chaud/tiède/froid en un seul geste juste
 * après le scan — c'est le seul moment où l'exposant se souvient de la
 * conversation.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { exhibitorsAPI } from '../../api/exhibitors';
import { haptics } from '../../utils/haptics';
import { Spacing, BorderRadius, FontFamily, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'LeadCapture'>;

type Rating = 'hot' | 'warm' | 'cold';

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company: string;
  rating?: Rating | '';
}

/** Résultat du dernier scan : trois issues bien distinctes, jamais un
 *  échec muet. */
type ScanOutcome =
  | { kind: 'captured'; lead: Lead; isNew: boolean }
  | { kind: 'no_consent' }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

// Un scan ne doit pas se déclencher deux fois quand la caméra relit le
// même code pendant que la requête est en vol.
const RESCAN_COOLDOWN_MS = 2500;

const RATINGS: Array<{ id: Rating; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'hot', icon: 'flame' },
  { id: 'warm', icon: 'partly-sunny' },
  { id: 'cold', icon: 'snow' },
];

export default function LeadCaptureScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const eventId = route.params?.eventId;
  const eventTitle = route.params?.eventTitle;

  const [permission, requestPermission] = useCameraPermissions();
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [scanning, setScanning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const hairline = isDark ? colors.gray800 : colors.gray200;

  const loadCount = useCallback(async () => {
    try {
      const response = await exhibitorsAPI.getMyLeads({ event: eventId });
      setCount(Number(response.data?.count ?? 0));
    } catch {
      // Le compteur est un confort : son échec ne doit pas bloquer le scan.
    }
  }, [eventId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  /** Annonce vocale : sur un stand, l'exposant ne regarde pas l'écran en
   *  permanence, et un utilisateur de lecteur d'écran n'a aucun autre
   *  retour que celui-ci. */
  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const submitScan = useCallback(async (code: string) => {
    if (!code || busy) return;

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.code === code && now - last.at < RESCAN_COOLDOWN_MS) return;
    lastScanRef.current = { code, at: now };

    setBusy(true);
    setScanning(false);
    try {
      const response = await exhibitorsAPI.scanLead({ event: eventId, code });
      const lead = response.data as Lead;
      const isNew = response.status === 201;
      setOutcome({ kind: 'captured', lead, isNew });
      setNotes('');
      haptics.success();
      announce(t('leadCapture.a11yCaptured', {
        name: lead.full_name,
        defaultValue: `Contact enregistré : ${lead.full_name}`,
      }));
      loadCount();
    } catch (error: any) {
      const status = error?.response?.status;
      const code2 = error?.response?.data?.code;
      if (status === 403 && code2 === 'consent_required') {
        setOutcome({ kind: 'no_consent' });
        haptics.warning();
        announce(t('leadCapture.a11yNoConsent', {
          defaultValue: "Ce visiteur n'a pas accepté d'être contacté.",
        }));
      } else if (status === 404) {
        setOutcome({ kind: 'not_found' });
        haptics.error();
        announce(t('leadCapture.a11yNotFound', {
          defaultValue: 'Badge non reconnu.',
        }));
      } else {
        const resolved = getApiErrorMessage(error, t, {
          fallbackKey: 'leadCapture.errorTitle',
        });
        setOutcome({ kind: 'error', message: resolved.message });
        haptics.error();
      }
    } finally {
      setBusy(false);
    }
  }, [busy, eventId, loadCount, announce, t]);

  /** Qualification et notes : envoyées par un rescan du même code, que le
   *  backend traite en mise à jour (jamais en doublon). */
  const qualify = useCallback(async (lead: Lead, rating?: Rating) => {
    setBusy(true);
    try {
      const payload: any = { event: eventId, lead: lead.id };
      if (rating) payload.rating = rating;
      if (notes.trim()) payload.notes = notes.trim();
      await exhibitorsAPI.qualifyLead(payload);
      haptics.light();
    } catch {
      // La fiche est déjà enregistrée : une qualification qui échoue ne
      // doit jamais donner l'impression d'avoir perdu le contact.
    } finally {
      setBusy(false);
      resume();
    }
  }, [eventId, notes]);

  const resume = useCallback(() => {
    setOutcome(null);
    setNotes('');
    setScanning(true);
  }, []);

  // ── Permission caméra ──────────────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[centeredContent(CARD_MAX), styles.permissionBox]}>
          <Ionicons name="camera-outline" size={44} color={colors.gray500} />
          <Text
            style={[styles.permissionTitle, { color: colors.text }]}
            allowFontScaling
            maxFontSizeMultiplier={1.6}
          >
            {t('leadCapture.permissionTitle', {
              defaultValue: 'Autoriser la caméra',
            })}
          </Text>
          <Text
            style={[styles.permissionBody, { color: colors.gray500 }]}
            allowFontScaling
            maxFontSizeMultiplier={1.6}
          >
            {t('leadCapture.permissionBody', {
              defaultValue:
                'La caméra sert uniquement à lire le QR du badge des visiteurs qui ont accepté d’être contactés.',
            })}
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.cta, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText} allowFontScaling maxFontSizeMultiplier={1.4}>
              {t('leadCapture.permissionCta', { defaultValue: 'Activer la caméra' })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* En-tête */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Retour' })}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.4}
          >
            {t('leadCapture.title', { defaultValue: 'Capturer un contact' })}
          </Text>
          {!!eventTitle && (
            <Text
              style={[styles.headerSub, { color: colors.gray500 }]}
              numberOfLines={1}
              allowFontScaling
              maxFontSizeMultiplier={1.4}
            >
              {eventTitle}
            </Text>
          )}
        </View>
        {/* Le compteur mène à la liste : c'est le raccourci naturel vers le
            livrable quand on veut vérifier ce qu'on a déjà capturé. */}
        {count !== null && (
          <TouchableOpacity
            onPress={() => navigation.navigate('MyLeads', { eventId, eventTitle })}
            style={[styles.counter, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={t('leadCapture.a11yCount', {
              count,
              defaultValue: `${count} contacts enregistrés`,
            })}
            hitSlop={10}
          >
            <Text style={styles.counterText} allowFontScaling maxFontSizeMultiplier={1.3}>
              {count}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caméra */}
      <View style={styles.cameraWrap}>
        {scanning && !outcome ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => submitScan(String(data || '').trim())}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.gray900 }]} />
        )}
        <View style={styles.reticle} pointerEvents="none" />
        {busy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      {/* Résultat */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[centeredContent(CARD_MAX), styles.sheetInner]}
        keyboardShouldPersistTaps="handled"
      >
        {outcome === null && (
          <View accessibilityLiveRegion="polite">
            <Text
              style={[styles.hint, { color: colors.gray500 }]}
              allowFontScaling
              maxFontSizeMultiplier={1.6}
            >
              {t('leadCapture.hint', {
                defaultValue: 'Visez le QR du badge du visiteur.',
              })}
            </Text>
            <TouchableOpacity
              onPress={() => setManualOpen((open) => !open)}
              style={styles.manualToggle}
              accessibilityRole="button"
            >
              <Ionicons name="keypad-outline" size={18} color={colors.primary} />
              <Text
                style={[styles.manualToggleText, { color: colors.primary }]}
                allowFontScaling
                maxFontSizeMultiplier={1.4}
              >
                {t('leadCapture.manualEntry', {
                  defaultValue: 'Saisir la référence à la main',
                })}
              </Text>
            </TouchableOpacity>
            {manualOpen && (
              <View style={styles.manualRow}>
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  autoCapitalize="characters"
                  placeholder={t('leadCapture.manualPlaceholder', {
                    defaultValue: 'Référence du badge',
                  })}
                  placeholderTextColor={colors.gray500}
                  style={[styles.manualInput, {
                    color: colors.text, borderColor: hairline,
                    backgroundColor: colors.card,
                  }]}
                  allowFontScaling
                  maxFontSizeMultiplier={1.4}
                  accessibilityLabel={t('leadCapture.manualPlaceholder', {
                    defaultValue: 'Référence du badge',
                  })}
                />
                <TouchableOpacity
                  onPress={() => submitScan(manualCode.trim())}
                  disabled={!manualCode.trim() || busy}
                  style={[styles.manualBtn, {
                    backgroundColor: manualCode.trim() ? colors.primary : colors.gray300,
                  }]}
                  accessibilityRole="button"
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {outcome?.kind === 'captured' && (
          <View accessibilityLiveRegion="polite">
            <View style={styles.resultHead}>
              <Ionicons name="checkmark-circle" size={26} color={colors.success} />
              <Text
                style={[styles.resultName, { color: colors.text }]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {outcome.lead.full_name || t('leadCapture.unnamed', {
                  defaultValue: 'Contact enregistré',
                })}
              </Text>
            </View>
            {!!outcome.lead.company && (
              <Text
                style={[styles.resultCompany, { color: colors.gray500 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {outcome.lead.company}
              </Text>
            )}
            {!outcome.isNew && (
              <Text
                style={[styles.resultNote, { color: colors.gray500 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {t('leadCapture.alreadyKnown', {
                  defaultValue: 'Déjà rencontré — fiche mise à jour.',
                })}
              </Text>
            )}

            <Text
              style={[styles.sectionLabel, { color: colors.text }]}
              allowFontScaling
              maxFontSizeMultiplier={1.5}
            >
              {t('leadCapture.qualify', { defaultValue: 'Qualifier ce contact' })}
            </Text>
            <View style={styles.ratingRow}>
              {RATINGS.map((rating) => (
                <TouchableOpacity
                  key={rating.id}
                  onPress={() => qualify(outcome.lead, rating.id)}
                  disabled={busy}
                  style={[styles.ratingBtn, { borderColor: hairline, backgroundColor: colors.card }]}
                  accessibilityRole="button"
                  accessibilityLabel={t(`leadCapture.rating_${rating.id}`, {
                    defaultValue: rating.id,
                  })}
                >
                  <Ionicons name={rating.icon} size={22} color={colors.primary} />
                  <Text
                    style={[styles.ratingText, { color: colors.text }]}
                    allowFontScaling
                    maxFontSizeMultiplier={1.3}
                  >
                    {t(`leadCapture.rating_${rating.id}`, { defaultValue: rating.id })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={t('leadCapture.notesPlaceholder', {
                defaultValue: 'Ce dont vous avez parlé (facultatif)',
              })}
              placeholderTextColor={colors.gray500}
              style={[styles.notes, {
                color: colors.text, borderColor: hairline, backgroundColor: colors.card,
              }]}
              allowFontScaling
              maxFontSizeMultiplier={1.4}
              accessibilityLabel={t('leadCapture.notesPlaceholder', {
                defaultValue: 'Ce dont vous avez parlé (facultatif)',
              })}
            />

            <TouchableOpacity
              onPress={() => qualify(outcome.lead)}
              disabled={busy}
              style={[styles.cta, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText} allowFontScaling maxFontSizeMultiplier={1.4}>
                {t('leadCapture.next', { defaultValue: 'Contact suivant' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {outcome?.kind === 'no_consent' && (
          <View accessibilityLiveRegion="assertive">
            <View style={styles.resultHead}>
              <Ionicons name="hand-left" size={26} color={colors.warning} />
              <Text
                style={[styles.resultName, { color: colors.text }]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {t('leadCapture.noConsentTitle', {
                  defaultValue: "Ce visiteur n'a pas accepté",
                })}
              </Text>
            </View>
            {/* On explique la sortie de secours plutôt que de laisser
                l'exposant devant un refus sec : c'est la différence entre
                un contact perdu et un contact obtenu proprement. */}
            <Text
              style={[styles.resultNote, { color: colors.gray500 }]}
              allowFontScaling
              maxFontSizeMultiplier={1.6}
            >
              {t('leadCapture.noConsentBody', {
                defaultValue:
                  "Demandez-lui d'ouvrir l'application EventEz, d'aller sur l'événement puis « Qui est là », et d'autoriser les exposants à enregistrer ses coordonnées. Vous pourrez ensuite rescanner.",
              })}
            </Text>
            <TouchableOpacity
              onPress={resume}
              style={[styles.cta, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText} allowFontScaling maxFontSizeMultiplier={1.4}>
                {t('leadCapture.retry', { defaultValue: 'Scanner à nouveau' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(outcome?.kind === 'not_found' || outcome?.kind === 'error') && (
          <View accessibilityLiveRegion="assertive">
            <View style={styles.resultHead}>
              <Ionicons name="alert-circle" size={26} color={colors.error} />
              <Text
                style={[styles.resultName, { color: colors.text }]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {outcome.kind === 'not_found'
                  ? t('leadCapture.notFoundTitle', { defaultValue: 'Badge non reconnu' })
                  : t('leadCapture.errorTitle', { defaultValue: 'Scan impossible' })}
              </Text>
            </View>
            <Text
              style={[styles.resultNote, { color: colors.gray500 }]}
              allowFontScaling
              maxFontSizeMultiplier={1.6}
            >
              {outcome.kind === 'not_found'
                ? t('leadCapture.notFoundBody', {
                    defaultValue:
                      "Ce badge n'appartient pas à cet événement. Vérifiez la référence imprimée sous le QR.",
                  })
                : outcome.message}
            </Text>
            <TouchableOpacity
              onPress={resume}
              style={[styles.cta, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText} allowFontScaling maxFontSizeMultiplier={1.4}>
                {t('leadCapture.retry', { defaultValue: 'Scanner à nouveau' })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissionBox: { alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  permissionTitle: { fontFamily: FontFamily.bold, fontSize: 20, textAlign: 'center' },
  permissionBody: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  // 48 : cible tactile confortable sur un stand, une main occupée.
  headerBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17 },
  headerSub: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 1 },
  counter: {
    minWidth: 44, height: 32, borderRadius: BorderRadius.full,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm,
  },
  counterText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 15 },

  cameraWrap: { height: 300, backgroundColor: '#000', overflow: 'hidden' },
  reticle: {
    position: 'absolute', top: 50, left: '18%', right: '18%', bottom: 50,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', borderRadius: BorderRadius.lg,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  sheet: { flex: 1 },
  sheetInner: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
  hint: { fontFamily: FontFamily.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  manualToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, minHeight: 48, marginTop: Spacing.sm,
  },
  manualToggleText: { fontFamily: FontFamily.medium, fontSize: 15 },
  manualRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  manualInput: {
    flex: 1, minHeight: 48, borderWidth: 1, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, fontFamily: FontFamily.regular, fontSize: 16,
  },
  manualBtn: {
    width: 48, height: 48, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
  },

  resultHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resultName: { flex: 1, fontFamily: FontFamily.bold, fontSize: 19 },
  resultCompany: { fontFamily: FontFamily.regular, fontSize: 15, marginTop: 2 },
  resultNote: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21, marginTop: Spacing.xs },

  sectionLabel: { fontFamily: FontFamily.bold, fontSize: 15, marginTop: Spacing.md },
  ratingRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  ratingBtn: {
    flex: 1, minHeight: 72, borderWidth: 1, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm,
  },
  ratingText: { fontFamily: FontFamily.medium, fontSize: 13 },

  notes: {
    minHeight: 84, borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md,
    fontFamily: FontFamily.regular, fontSize: 15, marginTop: Spacing.md,
    textAlignVertical: 'top',
  },

  cta: {
    minHeight: 52, borderRadius: BorderRadius.lg, alignItems: 'center',
    justifyContent: 'center', marginTop: Spacing.md, paddingHorizontal: Spacing.lg,
  },
  ctaText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 16 },
});
