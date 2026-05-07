// ============================================
// TemplatePicker — bootstrap rapide d'un event depuis un template prédéfini
// ============================================
//
// Affiche une liste horizontale de templates (Concert / Conférence / Atelier
// etc.) renvoyés par /event-templates/. Au tap, on hydrate le form via le
// callback `onApply` en passant les champs pertinents (event_type, location_type,
// duration, description skeleton, suggested tickets/form fields, tags). Le user
// peut toujours tout modifier ensuite — c'est juste un raccourci de saisie.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { eventTemplatesAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

// Sous-ensemble des champs du backend EventTemplate qui nous intéressent au mobile.
export interface EventTemplate {
  id: string;
  name: string;
  icon?: string;
  gradient?: string;
  event_type?: 'billetterie' | 'inscription';
  location_type?: 'in_person' | 'online' | 'hybrid';
  duration_hours?: number | string;
  description_skeleton?: string;
  tags?: string[];
  suggested_tickets?: Array<{ name: string; price?: number; description?: string }>;
  suggested_form_fields?: Array<{ label: string; type?: string; required?: boolean }>;
  category?: number | null;
}

interface Props {
  onApply: (template: EventTemplate) => void;
}

// Ionicon ≃ template.icon (Lucide name côté backend). On mappe les valeurs
// les plus communes ; sinon fallback générique.
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  Calendar: 'calendar-outline',
  Music: 'musical-notes-outline',
  Mic: 'mic-outline',
  Users: 'people-outline',
  Briefcase: 'briefcase-outline',
  GraduationCap: 'school-outline',
  Trophy: 'trophy-outline',
  Heart: 'heart-outline',
  Camera: 'camera-outline',
  Film: 'film-outline',
  Coffee: 'cafe-outline',
  Star: 'star-outline',
  Globe: 'globe-outline',
};

export default function TemplatePicker({ onApply }: Props) {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.07)';
  const [templates, setTemplates] = useState<EventTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await eventTemplatesAPI.getAll({ is_active: true });
        const data: EventTemplate[] = res.data?.results || res.data || [];
        if (!cancelled) setTemplates(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Section silencieuse si aucun template — mieux que d'afficher un vide.
  if (!templates || templates.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>RACCOURCIS</Text>
      <Text style={[styles.title, { color: colors.text }]}>Démarrer depuis un modèle</Text>
      <Text style={[styles.subtitle, { color: colors.gray500 }]}>
        Pré-remplit type, durée, billets suggérés. Tu peux tout modifier ensuite.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {templates.map(t => {
          const iconName = (t.icon && ICON_MAP[t.icon]) || 'sparkles-outline';
          const typeLabel = t.event_type === 'inscription' ? 'Inscription' : 'Billetterie';
          const locationLabel = t.location_type === 'online'
            ? 'En ligne'
            : t.location_type === 'hybrid'
              ? 'Hybride'
              : 'Présentiel';
          const durationLabel = t.duration_hours != null
            ? `${Number(t.duration_hours).toFixed(1).replace('.0', '')}h`
            : null;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }]}
              onPress={() => onApply(t)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Utiliser le modèle ${t.name}`}
            >
              {/* En-tête : icône large + pill type en haut à droite */}
              <View style={styles.cardTop}>
                <View style={[styles.iconWell, { backgroundColor: `${colors.primary}14` }]}>
                  <Ionicons name={iconName} size={22} color={colors.primary} />
                </View>
                <View style={[styles.typePill, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}30` }]}>
                  <Text style={[styles.typePillText, { color: colors.accent }]}>{typeLabel}</Text>
                </View>
              </View>

              {/* Titre éditorial */}
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {t.name}
              </Text>

              {/* Meta row : durée · format */}
              <View style={styles.metaRow}>
                {durationLabel && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.gray500} />
                    <Text style={[styles.metaText, { color: colors.gray600 }]}>{durationLabel}</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Ionicons
                    name={t.location_type === 'online' ? 'videocam-outline' : t.location_type === 'hybrid' ? 'globe-outline' : 'location-outline'}
                    size={12}
                    color={colors.gray500}
                  />
                  <Text style={[styles.metaText, { color: colors.gray600 }]}>{locationLabel}</Text>
                </View>
              </View>

              {/* Tags suggérés (max 2) — donne un aperçu du contenu pré-rempli */}
              {t.tags && t.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {t.tags.slice(0, 2).map((tag, i) => (
                    <View key={i} style={[styles.tagChip, { backgroundColor: colors.gray100 }]}>
                      <Text style={[styles.tagText, { color: colors.gray700 }]} numberOfLines={1}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* CTA discret en pied de carte */}
              <View style={[styles.applyHint, { borderTopColor: hairline }]}>
                <Text style={[styles.applyText, { color: colors.primary }]}>Utiliser ce modèle</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  loadingRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.sm,
    lineHeight: 17,
  },
  list: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  card: {
    width: 200,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  typePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.3,
    lineHeight: 19,
    minHeight: 38, // 2 lignes pour aligner les hauteurs entre cards
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: -0.1,
  },
  applyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginTop: 2,
    borderTopWidth: 1,
  },
  applyText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
