// ============================================
// TemplatePicker — bootstrap rapide d'un event depuis un template prédéfini
// ============================================
//
// Affiche un bouton-trigger éditorial qui ouvre un modal de sélection avec
// recherche live. Au choix, on hydrate le form via le callback `onApply` en
// passant les champs pertinents (event_type, location_type, duration,
// description skeleton, suggested tickets/form fields, tags). Le user peut
// toujours tout modifier ensuite — c'est juste un raccourci de saisie.
//
// Avant : ScrollView horizontal de cards (s'étalait hors-écran et obligeait
// au scroll horizontal). Maintenant : un seul bouton, et la sélection se
// fait dans un modal plein-écran avec recherche.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { eventTemplatesAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import SearchableSelectModal from '../common/SearchableSelectModal';

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

const resolveIcon = (icon?: string): keyof typeof Ionicons.glyphMap =>
  (icon && ICON_MAP[icon]) || 'sparkles-outline';

const useFormatTemplateMeta = () => {
  const { t } = useTranslation();
  return (tpl: EventTemplate): string => {
    const parts: string[] = [];
    parts.push(tpl.event_type === 'inscription' ? t('componentsOrganizer.templatePicker.metaInscription') : t('componentsOrganizer.templatePicker.metaBilletterie'));
    if (tpl.duration_hours != null) {
      parts.push(`~${Number(tpl.duration_hours).toFixed(1).replace('.0', '')}h`);
    }
    if (tpl.location_type === 'online') parts.push(t('componentsOrganizer.templatePicker.metaOnline'));
    else if (tpl.location_type === 'hybrid') parts.push(t('componentsOrganizer.templatePicker.metaHybrid'));
    else if (tpl.location_type === 'in_person') parts.push(t('componentsOrganizer.templatePicker.metaInPerson'));
    return parts.join(' · ');
  };
};

export default function TemplatePicker({ onApply }: Props) {
  const { t } = useTranslation();
  const formatTemplateMeta = useFormatTemplateMeta();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,17,16,0.08)';
  const [templates, setTemplates] = useState<EventTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // On garde une trace du dernier template appliqué pour l'afficher dans le
  // trigger. Ce n'est qu'indicatif — si l'user modifie ensuite des champs,
  // l'étiquette du trigger reste mais ça n'a pas d'incidence sur le form.
  const [appliedId, setAppliedId] = useState<string | null>(null);

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

  const applied = appliedId ? templates.find(t => t.id === appliedId) : null;

  const handleSelect = (t: EventTemplate) => {
    setAppliedId(t.id);
    onApply(t);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('componentsOrganizer.templatePicker.eyebrow')}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{t('componentsOrganizer.templatePicker.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.gray500 }]}>
        {t('componentsOrganizer.templatePicker.subtitle')}
      </Text>

      {/* Trigger button — affiche le template appliqué OU un placeholder.
          On garde toujours un état actif pour permettre à l'user de changer. */}
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        style={[
          styles.trigger,
          { backgroundColor: colors.card, borderColor: hairline },
        ]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={
          applied
            ? t('componentsOrganizer.templatePicker.a11yApplied', { name: applied.name })
            : t('componentsOrganizer.templatePicker.a11yChoose')
        }
      >
        {applied ? (
          <>
            <View style={[styles.iconWell, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name={resolveIcon(applied.icon)} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.triggerLabel, { color: colors.text }]} numberOfLines={1}>
                {applied.name}
              </Text>
              <Text style={[styles.triggerMeta, { color: colors.gray500 }]} numberOfLines={1}>
                {formatTemplateMeta(applied)}
              </Text>
            </View>
            <View style={[styles.appliedPill, { backgroundColor: `${colors.success}14` }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.appliedPillText, { color: colors.success }]}>{t('componentsOrganizer.templatePicker.applied')}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.iconWell, { backgroundColor: `${colors.accent}14` }]}>
              <Ionicons name="sparkles-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.triggerLabel, { color: colors.text }]} numberOfLines={1}>
                {t('componentsOrganizer.templatePicker.browseTemplates')}
              </Text>
              <Text style={[styles.triggerMeta, { color: colors.gray500 }]} numberOfLines={1}>
                {t('componentsOrganizer.templatePicker.templatesAvailable', { count: templates.length })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </>
        )}
      </TouchableOpacity>

      <SearchableSelectModal<EventTemplate>
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow={t('componentsOrganizer.templatePicker.eyebrow')}
        title={t('componentsOrganizer.templatePicker.modalTitle')}
        searchPlaceholder={t('componentsOrganizer.templatePicker.searchPlaceholder')}
        items={templates}
        getKey={tpl => tpl.id}
        getLabel={tpl => tpl.name}
        getDescription={tpl => formatTemplateMeta(tpl)}
        getIcon={tpl => resolveIcon(tpl.icon)}
        selectedKey={appliedId}
        onSelect={handleSelect}
        emptyText={t('componentsOrganizer.templatePicker.emptyText')}
      />
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  triggerMeta: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 1,
  },
  appliedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  appliedPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
