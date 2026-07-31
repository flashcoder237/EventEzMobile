// ============================================
// BoothPlanEditorScreen — éditeur visuel de plan (drag tactile)
// ============================================
//
// Atterrissage depuis BoothManagement → « Plan visuel ». Vrai canvas de
// placement au doigt : chaque zone-stand est déplaçable (drag), le plan entier
// se déplace/zoome (pan + pinch). Aligne sur une grille au relâchement.
//
// Stack technique (déjà dans le projet, pas de nouvelle dépendance) :
//   - react-native-gesture-handler (Pan/Pinch, reconnaissance en natif)
//   - react-native-reanimated (worklets UI thread, 60 fps)
//   - react-native-svg (rendu des zones)
//
// Persiste les positions dans FloorPlanArea (x/y/w/h) via floorPlansAPI. Le web
// et le mobile éditent donc le MÊME plan.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { floorPlansAPI, exhibitorsAPI } from '../../api';
import type { RootStackParamList } from '../../types';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'BoothPlanEditor'>;

interface Area {
  id: string;
  name: string;
  area_type: string;
  x: number; y: number; width: number; height: number;
  color: string;
  dirty?: boolean;
}

const GRID = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID;

const AREA_COLORS: Record<string, string> = {
  booth: '#4F46E5', stage: '#A855F7', entrance: '#10B981', exit: '#EF4444',
  food: '#F59E0B', restroom: '#64748B', vip: '#EC4899', parking: '#84CC16',
  seating: '#0EA5E9', other: '#94A3B8',
};

// ── Une zone déplaçable (drag individuel + snap) ─────────────────────────────
function DraggableArea({
  area, selected, onSelect, onMove, canvasScale,
}: {
  area: Area;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  canvasScale: SharedValue<number>;
}) {
  const tx = useSharedValue(area.x);
  const ty = useSharedValue(area.y);
  const start = useSharedValue({ x: area.x, y: area.y });

  // Resync si la position change hors drag (ex: reset).
  useEffect(() => { tx.value = area.x; ty.value = area.y; }, [area.x, area.y]);

  const pan = Gesture.Pan()
    .onStart(() => {
      start.value = { x: tx.value, y: ty.value };
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      // Diviser par le zoom du canvas pour un déplacement 1:1 à l'écran.
      tx.value = start.value.x + e.translationX / canvasScale.value;
      ty.value = start.value.y + e.translationY / canvasScale.value;
    })
    .onEnd(() => {
      const nx = Math.max(0, Math.round(tx.value / GRID) * GRID);
      const ny = Math.max(0, Math.round(ty.value / GRID) * GRID);
      tx.value = nx;
      ty.value = ny;
      runOnJS(onMove)(nx, ny);
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: tx.value,
    top: ty.value,
    width: area.width,
    height: area.height,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <Svg width={area.width} height={area.height}>
          <Rect
            x={0} y={0} width={area.width} height={area.height} rx={4}
            fill={area.color} fillOpacity={0.85}
            stroke={selected ? '#111827' : area.color}
            strokeWidth={selected ? 2 : 1}
          />
          <SvgText
            x={area.width / 2} y={area.height / 2 + 4}
            fill="#FFFFFF" fontSize={12} textAnchor="middle"
          >
            {area.name || area.area_type}
          </SvgText>
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

export default function BoothPlanEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { floorPlanId, eventId } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [areas, setAreas] = useState<Area[]>([]);
  const [plan, setPlan] = useState<{ width: number; height: number }>({ width: 1000, height: 600 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Première catégorie disponible : requise pour créer un vrai Booth (réservable)
  // lié à la zone ajoutée. Sans catégorie, on invite à en créer une d'abord.
  const [firstCategoryId, setFirstCategoryId] = useState<string | null>(null);

  // Transform du canvas (pan + zoom).
  const scale = useSharedValue(0.5);
  const savedScale = useSharedValue(0.5);
  const panX = useSharedValue(20);
  const panY = useSharedValue(20);
  const savedPanX = useSharedValue(20);
  const savedPanY = useSharedValue(20);

  const fetchData = useCallback(async () => {
    try {
      const [planRes, areasRes, catRes] = await Promise.all([
        floorPlansAPI.getById(floorPlanId),
        floorPlansAPI.getAreas({ floor_plan: floorPlanId }),
        exhibitorsAPI.getCategories({ event: eventId }),
      ]);
      const p = planRes.data;
      setPlan({ width: p?.width || 1000, height: p?.height || 600 });
      const raw = areasRes.data?.results || areasRes.data || [];
      setAreas(raw.map((a: any) => ({
        id: a.id,
        name: a.name || '',
        area_type: a.area_type || 'other',
        x: a.x, y: a.y, width: a.width, height: a.height,
        color: a.color || AREA_COLORS[a.area_type] || AREA_COLORS.other,
      })));
      const cats = catRes.data?.results || catRes.data || [];
      setFirstCategoryId(cats.length > 0 ? cats[0].id : null);
    } catch {
      showError(t('common.error'), t('organizer.boothPlan.loadError', { defaultValue: 'Impossible de charger le plan.' }));
    } finally {
      setLoading(false);
    }
  }, [floorPlanId, eventId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const moveArea = useCallback((id: string, x: number, y: number) => {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, x, y, dirty: true } : a)));
  }, []);

  // Ajoute un VRAI stand : crée un Booth réservable (via la 1re catégorie) +
  // sa zone sur le plan, et les LIE (Booth.floor_plan_area). Cohérent avec le
  // web — un stand du plan correspond à un stand réel, pas à une déco.
  // Décalage en cascade pour ne pas empiler les zones (sinon seule la dernière
  // est attrapable au drag).
  const addBooth = useCallback(async () => {
    if (!firstCategoryId) {
      showError('', t('organizer.boothPlan.noCategory', {
        defaultValue: 'Créez d\'abord une catégorie de stand (onglet Stands).',
      }));
      return;
    }
    try {
      const n = areas.length;
      const bx = snap(120 + (n % 6) * 120);
      const by = snap(120 + Math.floor(n / 6) * 100);
      const code = `S${areas.filter((a) => a.area_type === 'booth').length + 1}`;
      // 1. Zone sur le plan.
      const areaRes = await floorPlansAPI.createArea({
        floor_plan: floorPlanId,
        name: code, area_type: 'booth',
        x: bx, y: by, width: 100, height: 80,
        color: AREA_COLORS.booth, is_clickable: true,
      });
      const a = areaRes.data;
      // 2. Stand réservable lié à la zone.
      try {
        await exhibitorsAPI.createBooth({
          event: eventId, code, category: firstCategoryId,
          status: 'available',
        }).then((r) => exhibitorsAPI.updateBooth(r.data.id, { floor_plan_area: a.id }));
      } catch {
        // La zone existe déjà ; on ne bloque pas le placement si le Booth échoue
        // (ex: code déjà pris). L'organisateur pourra corriger côté Stands.
      }
      setAreas((prev) => [...prev, {
        id: a.id, name: a.name, area_type: 'booth',
        x: a.x, y: a.y, width: a.width, height: a.height, color: a.color,
      }]);
      setSelectedId(a.id);
    } catch {
      showError(t('common.error'), t('organizer.boothPlan.addError', { defaultValue: 'Ajout impossible.' }));
    }
  }, [areas, floorPlanId, eventId, firstCategoryId, t]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      for (const a of areas) {
        if (a.dirty) {
          await floorPlansAPI.updateArea(a.id, { x: Math.round(a.x), y: Math.round(a.y) });
        }
      }
      setAreas((prev) => prev.map((a) => ({ ...a, dirty: false })));
      showSuccess(t('organizer.boothPlan.saved', { defaultValue: 'Plan enregistré' }), '');
    } catch {
      showError(t('common.error'), t('organizer.boothPlan.saveError', { defaultValue: 'Échec de l\'enregistrement.' }));
    } finally {
      setSaving(false);
    }
  }, [areas, t]);

  // Pan (2 doigts implicite via composition) + Pinch du canvas.
  const panGesture = Gesture.Pan()
    .minPointers(2)
    .onStart(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    })
    .onUpdate((e) => {
      panX.value = savedPanX.value + e.translationX;
      panY.value = savedPanY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = Math.min(2, Math.max(0.25, savedScale.value * e.scale));
    });

  const canvasGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  // Grille (statique, dessinée une fois).
  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= plan.width; x += GRID) {
    gridLines.push(<Line key={`gx${x}`} x1={x} y1={0} x2={x} y2={plan.height} stroke="#E5E7EB" strokeWidth={0.5} />);
  }
  for (let y = 0; y <= plan.height; y += GRID) {
    gridLines.push(<Line key={`gy${y}`} x1={0} y1={y} x2={plan.width} y2={y} stroke="#E5E7EB" strokeWidth={0.5} />);
  }

  const dirtyCount = areas.filter((a) => a.dirty).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }]} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('organizer.boothPlan.eyebrow', { defaultValue: 'PLAN' })}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('organizer.boothPlan.title', { defaultValue: 'Plan visuel' })}</Text>
        </View>
        <TouchableOpacity onPress={addBooth} style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }]} accessibilityRole="button" accessibilityLabel="Ajouter un stand">
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Aide */}
      <Text style={[styles.hint, { color: colors.gray500 }]}>
        {t('organizer.boothPlan.hint', { defaultValue: 'Glissez un stand pour le placer. 2 doigts pour déplacer/zoomer le plan.' })}
      </Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <View style={[styles.canvasWrap, { borderColor: hairline }]}>
          <GestureDetector gesture={canvasGesture}>
            <Animated.View style={styles.canvasViewport}>
              <Animated.View style={[styles.canvas, canvasStyle, { width: plan.width, height: plan.height }]}>
                {/* Fond + grille */}
                <Svg width={plan.width} height={plan.height} style={StyleSheet.absoluteFill}>
                  <Rect x={0} y={0} width={plan.width} height={plan.height} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={1} />
                  {gridLines}
                </Svg>
                {/* Zones déplaçables */}
                {areas.map((a) => (
                  <DraggableArea
                    key={a.id}
                    area={a}
                    selected={selectedId === a.id}
                    onSelect={() => setSelectedId(a.id)}
                    onMove={(x, y) => moveArea(a.id, x, y)}
                    canvasScale={scale}
                  />
                ))}
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {/* Barre du bas : sauvegarde */}
      <View style={[styles.footer, { borderTopColor: hairline, backgroundColor: colors.background }]}>
        <Text style={[styles.dirtyText, { color: colors.gray500 }]}>
          {dirtyCount > 0
            ? t('organizer.boothPlan.unsaved', { count: dirtyCount, defaultValue: `${dirtyCount} modification(s)` })
            : t('organizer.boothPlan.upToDate', { defaultValue: 'À jour' })}
        </Text>
        <TouchableOpacity
          onPress={save}
          disabled={saving || dirtyCount === 0}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || dirtyCount === 0 ? 0.5 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
            <>
              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
              <Text style={styles.saveText}>{t('organizer.boothPlan.save', { defaultValue: 'Enregistrer' })}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  iconDisc: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
  title: { fontFamily: FontFamily.bold, fontSize: FontSizes.xl },
  hint: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  canvasWrap: { flex: 1, marginHorizontal: Spacing.lg, borderWidth: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  canvasViewport: { flex: 1 },
  canvas: { position: 'absolute', top: 0, left: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1 },
  dirtyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, color: '#FFFFFF' },
});
