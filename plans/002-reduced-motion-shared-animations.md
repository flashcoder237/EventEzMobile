# 002 — Respecter reduced-motion dans les animations partagées + boucles

- **Status**: DONE
- **Commit**: e076341
- **Severity**: HIGH
- **Category**: Accessibilité (§6)
- **Estimated scope**: 1 fichier core (`Animations.tsx`, 4 composants) + ~8 fichiers en phase 2 (même pattern)

## Problem

L'app a un hook `useReducedMotion()` (`src/hooks/useReducedMotion.ts`) mais il n'est câblé que dans ~6 fichiers. Plusieurs composants **partagés** et des boucles infinies bougent/oscillent **sans le respecter** — un utilisateur ayant activé « Réduire les animations » (iOS/Android) subit quand même translations et pulsations infinies. AUDIT.md §6 : reduced-motion = moins/plus doux, on **garde l'opacité/couleur** mais on **retire les déplacements** ; une boucle infinie doit s'arrêter.

Cas confirmés dans `src/components/ui/Animations.tsx` :

```tsx
// :297 SectionEntrance — translateY 24→0, AUCUNE garde
// :335 SlideIn        — translateX 40→0, AUCUNE garde
// :145 ScaleOnMount   — scale 0.8→1 + opacity, AUCUNE garde
// :180 PulsingBadge   — withRepeat(...) INFINI, AUCUNE garde → pulse à vie même en reduced-motion
```

Exemplar **déjà correct** dans le même fichier (à imiter) : `FadeInView` (:42) et `StaggeredItem` (:89) — `const reducedMotion = useReducedMotion();`, valeur initiale figée à l'état final, `if (reducedMotion) return;` dans le `useEffect`, et rendu d'un `<View>` statique.

## Target

Chaque composant animé partagé applique le pattern de `FadeInView` : pas de mouvement quand `reducedMotion` est vrai (opacité conservée). Les boucles ne démarrent pas.

```tsx
// target — SectionEntrance
export function SectionEntrance({ children, delay = 0, style }: SectionEntranceProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [24, 0]) }],
  }));
  if (reducedMotion) return <View style={style}>{children}</View>;
  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// target — SlideIn : idem, progress init `reducedMotion ? 1 : 0`, `if (reducedMotion) return;`
// dans le useEffect, et `if (reducedMotion) return <View style={style}>{children}</View>;`

// target — ScaleOnMount
export function ScaleOnMount({ children, delay = 0, style }: ScaleOnMountProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.8);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withDelay(delay, withSpring(1, SpringPresets.bouncy));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  if (reducedMotion) return <View style={style}>{children}</View>;
  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

// target — PulsingBadge : ne PAS démarrer la boucle en reduced-motion
export function PulsingBadge({ children, active = true, style }: PulsingBadgeProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active && !reducedMotion) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(scale);
  }, [active, reducedMotion]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
```

## Repo conventions to follow

- Hook : `import { useReducedMotion } from '../../hooks/useReducedMotion';` (déjà importé dans `Animations.tsx`).
- Pattern canonique = `FadeInView`/`StaggeredItem` dans le même fichier.
- Pour une **boucle** (`withRepeat`), la règle est : ne la lancer que `if (!reducedMotion)`, sinon poser la shared value à sa valeur de repos, et garder le `cancelAnimation` de cleanup.

## Steps

**Phase 1 — core (obligatoire), `src/components/ui/Animations.tsx` :**
1. `SectionEntrance` — ajouter `const reducedMotion = useReducedMotion();`, initialiser `useSharedValue(reducedMotion ? 1 : 0)`, ajouter `if (reducedMotion) return;` en tête du `useEffect`, et retourner `<View style={style}>{children}</View>` quand `reducedMotion`.
2. `SlideIn` — même transformation (progress `reducedMotion ? 1 : 0`).
3. `ScaleOnMount` — `scale` init `reducedMotion ? 1 : 0.8`, `opacity` init `reducedMotion ? 1 : 0`, garde dans le `useEffect`, rendu statique.
4. `PulsingBadge` — voir target : condition `active && !reducedMotion`, dépendance `[active, reducedMotion]`.

**Phase 2 — boucles/mouvements dans les vues (appliquer le MÊME pattern, un fichier à la fois) :**
Pour chacun, câbler `useReducedMotion()` et ne pas démarrer le mouvement/boucle si vrai (garder l'opacité) :
- `src/components/messages/TypingIndicator.tsx` (boucle rebond des points)
- `src/components/ui/Skeleton.tsx` (shimmer — passer à statique en reduced-motion)
- `src/components/common/ConnectionStatusBar.tsx` (pulsation opacité)
- `src/components/messages/InputToolbar.tsx` (pulse d'enregistrement — API `Animated` legacy : `if (isRecording && !reducedMotion) { Animated.loop(...).start() }`)
- `src/screens/dashboard/FollowingEventsScreen.tsx`, `src/screens/dashboard/MyTicketsScreen.tsx`, `src/screens/payment/PaymentSuccessScreen.tsx`, `src/screens/auth/OnboardingScreen.tsx` (boucles décoratives)

## Boundaries

- Ne PAS changer les durées, courbes, valeurs de translation/scale existantes — on ajoute **uniquement** la garde reduced-motion.
- Ne PAS retirer les animations pour les utilisateurs sans reduced-motion.
- Ne PAS toucher aux fichiers de test (`__tests__`), ni à `TourOverlay`/`AnimatedSplash`/`MainTabNavigator` (traités ailleurs / one-shot rares — hors scope de ce plan).
- Ne PAS introduire de dépendance.
- Si un composant diffère de l'extrait (dérive depuis `e076341`), STOP et signaler.

## Verification

- **Mécanique** : `cd EventEzMobile && npx tsc --noEmit` → 0 erreur. Les tests snapshot existants (`GradientButton.snap`, etc.) ne doivent pas régresser.
- **Feel check** : activer « Réduire les animations » (iOS : Réglages ▸ Accessibilité ▸ Mouvement ; Android : Accessibilité ▸ Supprimer les animations), puis :
  - Ouvrir un écran utilisant `SectionEntrance`/`SlideIn`/`ScaleOnMount` → le contenu **apparaît sans glisser ni zoomer** (pas de translation), il est simplement là.
  - Un badge de notification (`PulsingBadge`) → **ne pulse plus**.
  - Écran de messages → l'indicateur de frappe et le shimmer **ne bouclent plus** (ou sont statiques).
  - Désactiver reduced-motion → toutes les animations reviennent normalement.
- **Done when** : plus aucun des composants listés ne démarre de translation/boucle quand `useReducedMotion()` renvoie true ; l'opacité/état final reste correct.
