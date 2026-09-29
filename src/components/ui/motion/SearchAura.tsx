/**
 * SearchAura — l'aura du champ de recherche Discover (catalogue A1).
 *
 * Invisible au repos. Une comète indigo → violet → corail fait UN tour
 * (900 ms, token « celebrate ») :
 *   - la première fois de la session que le flux est affiché (après `delayMs`),
 *   - au retour dans l'app après plus de 10 min (`wake`).
 *
 * Au toucher (`flash()`, à appeler depuis onPress) : vibration « sélection »
 * SEULEMENT. Le toucher ouvre l'écran de recherche : une comète jouée sous la
 * transition de navigation était perdue (et faisait trois retours pour un
 * seul geste). La continuité, c'est l'anneau déjà allumé à l'arrivée sur
 * l'écran de recherche.
 *
 * `children` peut être une fonction `(lit, flash) => node` : `lit` est vrai
 * pendant le balayage (pour passer la loupe en dégradé, A3).
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { haptics } from '../../../utils/haptics';
import { GradientBorder, SWEEP_DURATION_MS } from './GradientBorder';
import { moments, useAppWake } from './useMotionGate';

const SWEEP_MS = SWEEP_DURATION_MS;

export interface SearchAuraProps {
  children: React.ReactNode | ((lit: boolean, flash: () => void) => React.ReactNode);
  radius: number;
  /** Clé « une fois par session » du balayage d'accueil. Absent = pas d'accueil. */
  onceKey?: string;
  delayMs?: number;
  /** Balayage au retour dans l'app après 10 min. */
  wake?: boolean;
  width?: number;
  backgroundColor?: string;
  baseBorderColor?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}

function SearchAuraComponent({
  children,
  radius,
  onceKey,
  delayMs = 2500,
  wake = true,
  width = 1.5,
  backgroundColor,
  baseBorderColor,
  style,
  innerStyle,
}: SearchAuraProps) {
  const [trigger, setTrigger] = useState<number | undefined>(undefined);
  const [lit, setLit] = useState(false);
  const litTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeCount = useAppWake();

  const play = useCallback((id: string) => {
    if (!moments.claim(id, SWEEP_MS)) return;
    setTrigger((t) => (t ?? 0) + 1);
    setLit(true);
    if (litTimer.current) clearTimeout(litTimer.current);
    litTimer.current = setTimeout(() => setLit(false), SWEEP_MS);
  }, []);

  // Accueil : une fois par session (la clé est consommée au moment de jouer,
  // pas au montage — robuste au double montage du mode strict).
  useEffect(() => {
    if (!onceKey) return;
    const id = setTimeout(() => {
      if (moments.once(onceKey)) play(onceKey);
    }, delayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wake && wakeCount > 0) play(`${onceKey ?? 'search-aura'}:wake`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeCount]);

  useEffect(() => () => {
    if (litTimer.current) clearTimeout(litTimer.current);
  }, []);

  const flash = useCallback(() => {
    haptics.selection();
  }, []);

  return (
    <GradientBorder
      mode="idle"
      trigger={trigger}
      radius={radius}
      width={width}
      backgroundColor={backgroundColor}
      baseBorderColor={baseBorderColor}
      style={style}
      innerStyle={innerStyle}
    >
      {typeof children === 'function' ? children(lit, flash) : children}
    </GradientBorder>
  );
}

export const SearchAura = memo(SearchAuraComponent);
export default SearchAura;
