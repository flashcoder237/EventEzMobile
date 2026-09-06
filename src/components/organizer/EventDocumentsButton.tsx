/**
 * Documents imprimables d'un événement (organisateur) — badges, attestations,
 * feuille d'émargement.
 *
 * POURQUOI : ces trois générateurs PDF existaient côté serveur et étaient
 * accessibles depuis le web, mais AUCUN écran mobile ne les appelait. Or
 * l'organisateur qui prépare son accueil est justement celui qui a son
 * téléphone en main, pas son ordinateur.
 *
 * On réutilise `useExport` plutôt qu'un téléchargement maison : il gère déjà
 * l'authentification, le rafraîchissement du jeton, l'écriture en cache et le
 * partage natif. Un second chemin de téléchargement divergerait au premier
 * changement d'API.
 *
 * `buildExportUrl` ajoute toujours `export_format=pdf` — ces endpoints
 * l'ignorent (ils ne produisent que du PDF), c'est sans effet.
 */

import { useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useExport } from '../../hooks/useExport';
import { FontFamily, FontSizes, Spacing, BorderRadius, TOUCH_OPACITY } from '../../constants/theme';

interface DocumentOption {
  key: string;
  endpoint: string;
  labelKey: string;
  hintKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DOCUMENTS: DocumentOption[] = [
  {
    key: 'badges',
    endpoint: '/registrations/badges/',
    labelKey: 'organizer.documents.badges',
    hintKey: 'organizer.documents.badgesHint',
    icon: 'id-card-outline',
  },
  {
    key: 'attendance',
    endpoint: '/registrations/attendance-sheet/',
    labelKey: 'organizer.documents.attendanceSheet',
    hintKey: 'organizer.documents.attendanceSheetHint',
    icon: 'list-outline',
  },
  {
    key: 'certificates',
    endpoint: '/registrations/certificates/',
    labelKey: 'organizer.documents.certificates',
    hintKey: 'organizer.documents.certificatesHint',
    icon: 'ribbon-outline',
  },
];

export default function EventDocumentsButton({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle?: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { exportData, loading } = useExport();
  const [open, setOpen] = useState(false);

  const handleSelect = async (doc: DocumentOption) => {
    setOpen(false);
    const name = (eventTitle || 'event').slice(0, 40);
    await exportData(doc.endpoint, 'pdf', `${doc.key}-${name}`, { event_id: eventId });
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { borderColor: colors.gray200, backgroundColor: colors.card }]}
        onPress={() => setOpen(true)}
        disabled={loading}
        activeOpacity={TOUCH_OPACITY}
        accessibilityRole="button"
        accessibilityLabel={t('organizer.documents.a11y')}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="print-outline" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.gray900 }]}>
              {t('organizer.documents.title')}
            </Text>

            {DOCUMENTS.map((doc) => (
              <TouchableOpacity
                key={doc.key}
                style={[styles.row, { borderBottomColor: colors.gray100 }]}
                onPress={() => handleSelect(doc)}
                activeOpacity={TOUCH_OPACITY}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.gray100 }]}>
                  <Ionicons name={doc.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: colors.gray900 }]}>{t(doc.labelKey)}</Text>
                  {/* L'indication compte autant que le libellé : « attestation »
                      et « émargement » se ressemblent, mais l'une exige un
                      check-in et l'autre se prépare avant l'événement. */}
                  <Text style={[styles.rowHint, { color: colors.gray500 }]}>{t(doc.hintKey)}</Text>
                </View>
                <Ionicons name="download-outline" size={18} color={colors.gray400} />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sheetTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
  },
  rowHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
