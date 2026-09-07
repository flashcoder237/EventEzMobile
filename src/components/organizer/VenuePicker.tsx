/**
 * Sélecteur de lieu enregistré (création d'événement, mobile).
 *
 * POURQUOI : un prestataire qui accueille 30 événements par an ressaisissait
 * son adresse 30 fois — sur un téléphone, c'est encore plus pénible que sur un
 * ordinateur.
 *
 * Le lieu ALIMENTE les champs, il ne les verrouille pas : l'organisateur reste
 * libre de préciser « Salle B » juste après. Même parti-pris que côté serveur,
 * où le lieu n'écrase jamais une saisie existante.
 *
 * Ne s'affiche PAS si aucun lieu n'est enregistré : un sélecteur vide
 * alourdirait un formulaire déjà long sans rien apporter.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { venuesAPI } from '../../api/misc';
import { BorderRadius, FontFamily, FontSizes, Spacing, TOUCH_OPACITY } from '../../constants/theme';

interface Venue {
  id: string;
  name: string;
  address?: string;
  city_label?: string;
  capacity?: number;
}

export default function VenuePicker({
  onSelect,
}: {
  onSelect: (venue: Venue) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    venuesAPI
      .getAll()
      .then((res: any) => {
        const rows = res.data?.results ?? res.data ?? [];
        setVenues(Array.isArray(rows) ? rows : []);
      })
      // Silencieux : le sélecteur est un raccourci, son absence ne doit pas
      // empêcher de créer un événement.
      .catch(() => setVenues([]));
  }, []);

  if (venues.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.primaryBg, borderColor: `${colors.primary}33` }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={TOUCH_OPACITY}
        accessibilityRole="button"
      >
        <Ionicons name="business-outline" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.gray900 }]}>
          {t('componentsOrganizer.venuePicker.label', { defaultValue: 'Utiliser un lieu enregistré' })}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.gray500}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.list}>
          {venues.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={[styles.row, { borderBottomColor: colors.gray100 }]}
              onPress={() => {
                onSelect(venue);
                setExpanded(false);
              }}
              activeOpacity={TOUCH_OPACITY}
            >
              <View style={styles.rowText}>
                <Text style={[styles.rowName, { color: colors.gray900 }]}>{venue.name}</Text>
                {(venue.city_label || venue.capacity) ? (
                  <Text style={[styles.rowMeta, { color: colors.gray500 }]}>
                    {[venue.city_label, venue.capacity ? `${venue.capacity} places` : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          ))}

          <Text style={[styles.hint, { color: colors.gray500 }]}>
            {t('componentsOrganizer.venuePicker.hint', {
              defaultValue: 'Les champs se remplissent automatiquement. Vous pouvez les ajuster ensuite.',
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  list: { marginTop: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  rowText: { flex: 1 },
  rowName: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  rowMeta: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  hint: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: Spacing.sm },
});
