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
  Shadows,
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
  const { colors } = useTheme();
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
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' }, Shadows.sm]}
              onPress={() => onApply(t)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Utiliser le modèle ${t.name}`}
            >
              <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name={iconName} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {t.name}
              </Text>
              {t.duration_hours != null && (
                <Text style={[styles.cardMeta, { color: colors.gray500 }]} numberOfLines={1}>
                  ~{Number(t.duration_hours).toFixed(1).replace('.0', '')}h · {t.event_type === 'inscription' ? 'Inscription' : 'Billetterie'}
                </Text>
              )}
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
    width: 160,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 6,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.sm,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  cardMeta: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    marginTop: 2,
  },
});
