// ============================================
// useWidgetData — résout un data_source en données réelles
// ============================================
//
// Le backend stocke un widget avec un `data_source` (event_count, revenue,
// registration_trends…) et il est de la responsabilité du client de fetcher
// l'analytics correspondante. Ce hook centralise la table de routage pour
// éviter de dupliquer la logique dans chaque renderer.
//
// Le résultat est volontairement TRÈS générique :
//   - `value` : le nombre principal (utile pour widget_type='number')
//   - `series` : un tableau {label, value} (utile pour bar/line/pie)
//   - `rows` : un tableau d'objets génériques (utile pour table/list)
//
// Si une data source ne mappe pas naturellement à une de ces formes, on remplit
// au mieux et le renderer affichera un placeholder.

import { useEffect, useState } from 'react';
import { analyticsAPI } from '../api';
import type { WidgetDataSource } from '../types';

export interface WidgetData {
  loading: boolean;
  error: string | null;
  /** Valeur principale pour les widgets 'number'. */
  value: number | null;
  /** Série {label, value} pour bar/line/pie/area. */
  series: Array<{ label: string; value: number }>;
  /** Lignes pour table/list. */
  rows: any[];
  /** Pour la cosmétique : suffixe d'unité (ex: "FCFA"). */
  unit?: string;
}

const empty: WidgetData = {
  loading: true,
  error: null,
  value: null,
  series: [],
  rows: [],
};

export function useWidgetData(dataSource: WidgetDataSource | null | undefined, refreshKey: number = 0): WidgetData {
  const [state, setState] = useState<WidgetData>(empty);

  useEffect(() => {
    if (!dataSource) {
      setState({ ...empty, loading: false });
      return;
    }
    let cancelled = false;
    setState(empty);

    const finalize = (next: Partial<WidgetData>) => {
      if (cancelled) return;
      setState({ ...empty, loading: false, ...next });
    };

    const fail = (err: any) => {
      if (cancelled) return;
      const detail = err?.response?.data?.detail || 'Données indisponibles.';
      setState({ ...empty, loading: false, error: String(detail) });
    };

    (async () => {
      try {
        switch (dataSource) {
          case 'event_count': {
            const res = await analyticsAPI.getEventAnalytics();
            const d = res.data || {};
            finalize({
              value: Number(d.summary?.total_events ?? d.total_events ?? d.total ?? 0),
            });
            return;
          }
          case 'registration_count': {
            const res = await analyticsAPI.getRegistrationAnalytics();
            const d = res.data || {};
            finalize({
              value: Number(
                d.summary?.total_registrations ?? d.total_registrations ?? d.total ?? 0,
              ),
            });
            return;
          }
          case 'revenue': {
            const res = await analyticsAPI.getRevenueAnalytics();
            const d = res.data || {};
            finalize({
              value: Number(d.summary?.total_revenue ?? d.total_revenue ?? 0),
              unit: d.currency || undefined,
            });
            return;
          }
          case 'user_count': {
            const res = await analyticsAPI.getUserAnalytics();
            const d = res.data || {};
            finalize({
              value: Number(d.summary?.total_users ?? d.total_users ?? d.total ?? 0),
            });
            return;
          }
          case 'revenue_trends': {
            const res = await analyticsAPI.getRevenueAnalytics();
            const d = res.data || {};
            const timeline: any[] = d.timeline || d.trend || [];
            finalize({
              series: timeline.map((p: any) => ({
                label: String(p.label ?? p.date ?? p.period ?? ''),
                value: Number(p.amount ?? p.value ?? p.revenue ?? 0),
              })),
              unit: d.currency,
            });
            return;
          }
          case 'registration_trends': {
            const res = await analyticsAPI.getRegistrationAnalytics();
            const d = res.data || {};
            const timeline: any[] = d.timeline || d.trend || [];
            finalize({
              series: timeline.map((p: any) => ({
                label: String(p.label ?? p.date ?? p.period ?? ''),
                value: Number(p.count ?? p.value ?? 0),
              })),
            });
            return;
          }
          case 'event_types': {
            const res = await analyticsAPI.getEventAnalytics();
            const d = res.data || {};
            const byType: any[] = d.by_type || d.types_distribution || [];
            finalize({
              series: byType.map((p: any) => ({
                label: String(p.label ?? p.type ?? p.event_type ?? ''),
                value: Number(p.count ?? p.value ?? 0),
              })),
              rows: byType,
            });
            return;
          }
          case 'payment_methods': {
            // Pas d'endpoint dédié — on regarde dans dashboard_summary.
            const res = await analyticsAPI.getDashboardSummary();
            const d = res.data || {};
            const methods: any[] = d.payment_methods || d.payment_breakdown || [];
            finalize({
              series: methods.map((p: any) => ({
                label: String(p.label ?? p.method ?? p.payment_method ?? ''),
                value: Number(p.count ?? p.value ?? 0),
              })),
              rows: methods,
            });
            return;
          }
          case 'geographical': {
            const res = await analyticsAPI.getEventAnalytics();
            const d = res.data || {};
            const cities: any[] = d.by_city || d.geographical || [];
            finalize({
              series: cities.map((p: any) => ({
                label: String(p.label ?? p.city ?? p.location_city ?? ''),
                value: Number(p.count ?? p.value ?? 0),
              })),
              rows: cities,
            });
            return;
          }
          case 'custom_query':
          default: {
            // Pas de fetcher défini — on renvoie loading=false pour que le
            // renderer affiche un placeholder "Source non supportée".
            finalize({ error: 'Source de données non supportée sur mobile.' });
            return;
          }
        }
      } catch (err) {
        fail(err);
      }
    })();

    return () => { cancelled = true; };
  }, [dataSource, refreshKey]);

  return state;
}
