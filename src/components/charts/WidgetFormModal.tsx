// ============================================
// WidgetFormModal — création / édition d'un DashboardWidget
// ============================================
//
// Garde le formulaire le plus simple possible :
//   - Titre (obligatoire)
//   - Type de widget (radio : number / chart / list)
//   - Si chart : sous-type (line / bar / pie / area)
//   - Source de données (chips)
//
// Position et dimensions ne sont pas exposés au mobile : on laisse le backend
// défaut (0/0 et 1×1) ; le DashboardDetailsScreen empile simplement les
// widgets en colonne. Pour customiser le layout, l'organizer passe par le web.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { analyticsAPI } from '../../api';
import type {
  DashboardWidget,
  WidgetType,
  ChartType,
  WidgetDataSource,
} from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

interface Props {
  visible: boolean;
  /** Si présent : mode édition, on pré-remplit le form. */
  widget?: DashboardWidget | null;
  onClose: () => void;
  /** Appelé après création/update réussi avec le widget retourné. */
  onSuccess: (w: DashboardWidget) => void;
}

const WIDGET_TYPES: { key: WidgetType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'number', label: 'Indicateur', icon: 'stats-chart-outline' },
  { key: 'chart', label: 'Graphique', icon: 'analytics-outline' },
  { key: 'list', label: 'Liste', icon: 'list-outline' },
  { key: 'table', label: 'Tableau', icon: 'grid-outline' },
];

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: 'line', label: 'Ligne' },
  { key: 'bar', label: 'Barres' },
  { key: 'pie', label: 'Camembert' },
  { key: 'area', label: 'Aire' },
];

const DATA_SOURCES: { key: WidgetDataSource; label: string; goesWith: WidgetType[] }[] = [
  { key: 'event_count', label: "Nb d'événements", goesWith: ['number'] },
  { key: 'registration_count', label: "Nb d'inscriptions", goesWith: ['number'] },
  { key: 'revenue', label: 'Revenus totaux', goesWith: ['number'] },
  { key: 'user_count', label: "Nb d'utilisateurs", goesWith: ['number'] },
  { key: 'revenue_trends', label: 'Tendance revenus', goesWith: ['chart'] },
  { key: 'registration_trends', label: 'Tendance inscriptions', goesWith: ['chart'] },
  { key: 'event_types', label: "Répartition types d'event", goesWith: ['chart', 'list', 'table'] },
  { key: 'payment_methods', label: 'Méthodes de paiement', goesWith: ['chart', 'list', 'table'] },
  { key: 'geographical', label: 'Répartition géographique', goesWith: ['chart', 'list', 'table'] },
];

export default function WidgetFormModal({ visible, widget, onClose, onSuccess }: Props) {
  const { colors, isDark } = useTheme();
  const { showError } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const isEditing = !!widget;

  const [title, setTitle] = useState('');
  const [widgetType, setWidgetType] = useState<WidgetType>('number');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dataSource, setDataSource] = useState<WidgetDataSource>('event_count');
  const [submitting, setSubmitting] = useState(false);

  // Réinit le form chaque fois que le modal s'ouvre.
  useEffect(() => {
    if (!visible) return;
    if (widget) {
      setTitle(widget.title);
      setWidgetType(widget.widget_type);
      setChartType((widget.chart_type as ChartType) || 'bar');
      setDataSource(widget.data_source);
    } else {
      setTitle('');
      setWidgetType('number');
      setChartType('bar');
      setDataSource('event_count');
    }
  }, [visible, widget]);

  // Quand on change de widget_type, on s'assure que la data_source actuelle
  // est toujours compatible — sinon on bascule sur la première dispo.
  useEffect(() => {
    const current = DATA_SOURCES.find(d => d.key === dataSource);
    if (!current || !current.goesWith.includes(widgetType)) {
      const fallback = DATA_SOURCES.find(d => d.goesWith.includes(widgetType));
      if (fallback) setDataSource(fallback.key);
    }
  }, [widgetType, dataSource]);

  const filteredSources = DATA_SOURCES.filter(d => d.goesWith.includes(widgetType));

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      showError('Titre requis', 'Donne un titre au widget.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        title: trimmed,
        widget_type: widgetType,
        chart_type: widgetType === 'chart' ? chartType : null,
        data_source: dataSource,
      };
      let res;
      if (isEditing && widget) {
        res = await analyticsAPI.updateWidget(widget.id, payload);
      } else {
        res = await analyticsAPI.createWidget(payload);
      }
      onSuccess(res.data);
    } catch (error: any) {
      showError('Erreur', error?.response?.data?.detail || (isEditing ? 'Modification refusée.' : 'Création refusée.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !submitting && onClose()}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{isEditing ? 'MODIFIER' : 'NOUVEAU'}</Text>
            <Text style={[styles.title, { color: colors.text }]}>Widget</Text>

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>Titre *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex : Revenus du mois"
              placeholderTextColor={colors.gray400}
              editable={!submitting}
              maxLength={120}
            />

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>Type de widget</Text>
            <View style={styles.typeGrid}>
              {WIDGET_TYPES.map(t => {
                const active = t.key === widgetType;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: active ? colors.primary : (isDark ? colors.gray100 : colors.gray50),
                        borderColor: active ? colors.primary : hairline,
                      },
                    ]}
                    onPress={() => !submitting && setWidgetType(t.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={t.icon} size={18} color={active ? '#fff' : colors.gray600} />
                    <Text style={[styles.typeLabel, { color: active ? '#fff' : colors.gray700 }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {widgetType === 'chart' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>Sous-type de graphique</Text>
                <View style={styles.chips}>
                  {CHART_TYPES.map(c => {
                    const active = c.key === chartType;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors.primary : (isDark ? colors.gray100 : colors.gray50),
                            borderColor: active ? colors.primary : hairline,
                          },
                        ]}
                        onPress={() => !submitting && setChartType(c.key)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.chipText, { color: active ? '#fff' : colors.gray700 }]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>Source de données</Text>
            <View style={styles.chips}>
              {filteredSources.map(d => {
                const active = d.key === dataSource;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : (isDark ? colors.gray100 : colors.gray50),
                        borderColor: active ? colors.primary : hairline,
                      },
                    ]}
                    onPress={() => !submitting && setDataSource(d.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, { color: active ? '#fff' : colors.gray700 }]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.gray100 }]}
                onPress={() => !submitting && onClose()}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: colors.gray700 }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
                onPress={submit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={[styles.btnText, { color: Colors.white }]}>
                    {isEditing ? 'Enregistrer' : 'Créer le widget'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeCard: {
    minWidth: 100,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  typeLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
