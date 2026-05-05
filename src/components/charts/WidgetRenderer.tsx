// ============================================
// WidgetRenderer — rend un DashboardWidget selon son type
// ============================================
//
// Pivote sur widget_type → composant approprié :
//   - 'number' → KPICard avec value
//   - 'chart' + chart_type='line' / 'area' → TrendLineChart
//   - 'chart' + chart_type='bar' → BarChart (défaut chart)
//   - 'chart' + chart_type='pie' / 'doughnut' → liste avec barres horizontales
//     (vraie pie chart non disponible dans nos libs sans ajout de dep)
//   - 'list' / 'table' → liste compacte avec label + valeur
//   - 'map' → placeholder "non supporté" — demanderait un overlay carte
//     dédié, hors scope du builder mobile
//
// Récupère ses données via useWidgetData. Si error → carte d'erreur. Si
// loading → placeholder. Si série/valeur vide → "Pas encore de données".

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useWidgetData } from '../../hooks/useWidgetData';
import type { DashboardWidget } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import KPICard from './KPICard';
import BarChart from './BarChart';
import TrendLineChart from './TrendLineChart';

interface Props {
  widget: DashboardWidget;
  /** Increment ce nombre pour forcer un refresh (par exemple sur pull-to-refresh
   *  global ou changement de range temporel). */
  refreshKey?: number;
  /** Callback long-press : utile en mode édition pour ouvrir le menu Modifier/Supprimer. */
  onLongPress?: () => void;
}

const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

function formatBigNumber(n: number, unit?: string): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M${unit ? ` ${unit}` : ''}`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K${unit ? ` ${unit}` : ''}`;
  return `${n.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

export default function WidgetRenderer({ widget, refreshKey = 0, onLongPress }: Props) {
  const { colors, isDark } = useTheme();
  const data = useWidgetData(widget.data_source, refreshKey);
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  // Loading state — carte placeholder uniforme indépendamment du type.
  if (data.loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.loadingBody}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingLabel, { color: colors.gray500 }]}>{widget.title}</Text>
        </View>
      </View>
    );
  }

  // Error state — laisse l'organizer comprendre que ce widget ne peut pas
  // rendre les données plutôt que d'afficher 0.
  if (data.error) {
    return (
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        onTouchEnd={onLongPress}
      >
        <Text style={[styles.title, { color: colors.text }]}>{widget.title}</Text>
        <View style={styles.errorBody}>
          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>{data.error}</Text>
        </View>
      </View>
    );
  }

  // === number ===
  if (widget.widget_type === 'number') {
    return (
      <KPICard
        title={widget.title}
        value={formatBigNumber(data.value ?? 0, data.unit)}
        icon="stats-chart-outline"
        color={colors.primary}
        style={{ flex: 1 }}
      />
    );
  }

  // === chart line / area ===
  if (widget.widget_type === 'chart' && (widget.chart_type === 'line' || widget.chart_type === 'area')) {
    if (!data.series || data.series.length === 0) {
      return <EmptyCard title={widget.title} hint="Pas encore de données pour cette période." />;
    }
    return (
      <TrendLineChart
        title={widget.title}
        labels={data.series.map(s => s.label)}
        values={data.series.map(s => s.value)}
        unitSuffix={data.unit}
      />
    );
  }

  // === chart bar (default chart) ===
  if (widget.widget_type === 'chart' && (widget.chart_type === 'bar' || !widget.chart_type)) {
    if (!data.series || data.series.length === 0) {
      return <EmptyCard title={widget.title} hint="Pas encore de données." />;
    }
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.title, { color: colors.text }]}>{widget.title}</Text>
        <View style={{ marginTop: Spacing.sm }}>
          <BarChart
            data={data.series.map(s => ({ label: s.label, value: s.value }))}
            gradientColors={[colors.primary, colors.primaryDark || colors.primary]}
            height={150}
          />
        </View>
      </View>
    );
  }

  // === chart pie / doughnut → liste avec barres horizontales pondérées ===
  if (widget.widget_type === 'chart' && (widget.chart_type === 'pie' || widget.chart_type === 'doughnut')) {
    const total = data.series.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0 || data.series.length === 0) {
      return <EmptyCard title={widget.title} hint="Pas encore de données." />;
    }
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.title, { color: colors.text }]}>{widget.title}</Text>
        <View style={{ marginTop: Spacing.sm, gap: 6 }}>
          {data.series.slice(0, 7).map((s, idx) => {
            const pct = (s.value / total) * 100;
            const color = PIE_COLORS[idx % PIE_COLORS.length];
            return (
              <View key={`${s.label}-${idx}`} style={styles.pieRow}>
                <View style={[styles.pieDot, { backgroundColor: color }]} />
                <Text style={[styles.pieLabel, { color: colors.text }]} numberOfLines={1}>
                  {s.label || '—'}
                </Text>
                <View style={[styles.pieBarTrack, { backgroundColor: isDark ? colors.gray100 : colors.gray100 }]}>
                  <View style={[styles.pieBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.piePct, { color: colors.gray500 }]}>{pct.toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // === list / table ===
  if (widget.widget_type === 'list' || widget.widget_type === 'table') {
    const rows = data.rows.length > 0 ? data.rows : data.series;
    if (!rows || rows.length === 0) {
      return <EmptyCard title={widget.title} hint="Aucune ligne." />;
    }
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.title, { color: colors.text }]}>{widget.title}</Text>
        <View style={{ marginTop: Spacing.sm }}>
          {rows.slice(0, 10).map((r: any, idx: number) => {
            const label = r.label || r.name || r.title || r.event_type || r.method || '—';
            const value = r.value ?? r.count ?? r.total ?? r.amount;
            return (
              <View
                key={idx}
                style={[
                  styles.listRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: hairline },
                ]}
              >
                <Text style={[styles.listLabel, { color: colors.text }]} numberOfLines={1}>
                  {label}
                </Text>
                {value != null && (
                  <Text style={[styles.listValue, { color: colors.gray700 }]}>
                    {Number.isFinite(Number(value)) ? Number(value).toLocaleString() : String(value)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // === map (non supporté) ===
  if (widget.widget_type === 'map') {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.title, { color: colors.text }]}>{widget.title}</Text>
        <View style={styles.errorBody}>
          <Ionicons name="map-outline" size={20} color={colors.gray400} />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>
            Carte non disponible sur mobile. Consulte ce widget sur le web.
          </Text>
        </View>
      </View>
    );
  }

  return <EmptyCard title={widget.title} hint="Type de widget non supporté." />;
}

function EmptyCard({ title, hint }: { title: string; hint: string }) {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.hintText, { color: colors.gray500 }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  loadingBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  errorBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    lineHeight: 17,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
  },
  hintText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 6,
  },

  // pie/doughnut as horizontal bars
  pieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pieLabel: {
    width: 88,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  pieBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  pieBarFill: {
    height: '100%',
  },
  piePct: {
    width: 36,
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.xs,
    textAlign: 'right',
  },

  // list
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  listLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
  listValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
  },
});
