# 003 — Corriger l'easing de sortie du toast (ease-in → ease-out)

- **Status**: DONE
- **Commit**: e076341
- **Severity**: MEDIUM
- **Category**: Easing de sortie (§2) + Accessibilité (§6, optionnel)
- **Estimated scope**: 1 fichier, ~2 lignes (core) + ~6 lignes (option reduced-motion)

## Problem

`InAppToast` **entre** correctement en `ease-out`, mais **sort en `Easing.in(Easing.cubic)`** — une courbe qui démarre lentement puis accélère. Le toast est vu souvent ; sa disparition « hésite » avant de filer. Règle AUDIT.md §2 : entrée **et** sortie → `ease-out`. L'entrée du composant lui-même utilise déjà `Easing.out(Easing.cubic)` — la sortie doit être symétrique.

```tsx
// src/components/common/InAppToast.tsx:86 — actuel (sortie)
translateY.value = withTiming(-200, { duration: dur, easing: Easing.in(Easing.cubic) });

// src/components/common/InAppToast.tsx:89 — entrée (déjà correcte, à imiter)
translateY.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) });
```

## Target

Sortie en `ease-out`, identique à l'entrée :

```tsx
// target — :86
translateY.value = withTiming(-200, { duration: dur, easing: Easing.out(Easing.cubic) });
```

**Option accessibilité (§6)** — sous reduced-motion, ne pas faire glisser le toast (‑200) : le faire apparaître/disparaître en **opacité seule**, sans translation.

```tsx
// target optionnel — en tête du composant
const reducedMotion = useReducedMotion();
// entrée (useEffect) :
translateY.value = reducedMotion ? 0 : withTiming(0, { duration: SLIDE_DURATION, easing: Easing.out(Easing.cubic) });
// sortie (dismiss) :
translateY.value = reducedMotion ? -200 : withTiming(-200, { duration: dur, easing: Easing.out(Easing.cubic) });
// (l'opacité reste animée dans les deux cas — c'est le feedback qu'on garde)
```

## Repo conventions to follow

- Courbe d'easing du repo pour entrées/sorties : `Easing.out(Easing.cubic)` (utilisée dans `FadeInView`, `SectionEntrance`, et l'entrée de ce toast). NE PAS inventer une nouvelle courbe.
- Hook a11y : `import { useReducedMotion } from '../../hooks/useReducedMotion';` (voir `FadeInView` dans `src/components/ui/Animations.tsx` pour l'usage).
- `Easing` est déjà importé de `react-native-reanimated` dans ce fichier.

## Steps

1. Dans `src/components/common/InAppToast.tsx`, à la ligne du `dismiss` (~:86), remplacer `easing: Easing.in(Easing.cubic)` par `easing: Easing.out(Easing.cubic)`. Ne rien changer d'autre à cette ligne (garder `withTiming(-200, { duration: dur, … })` et le callback `runOnJS(onDismiss)` sur l'opacité).
2. **(Option a11y, recommandée)** Ajouter `const reducedMotion = useReducedMotion();` dans le composant, puis conditionner les deux affectations de `translateY` (entrée + sortie) comme dans le bloc « target optionnel ». Laisser les affectations d'`opacity` inchangées (le fondu reste, c'est le feedback à conserver sous reduced-motion).

## Boundaries

- Ne PAS modifier `SLIDE_DURATION`, `DEFAULT_DURATION`, la logique d'auto-dismiss, ni les haptics.
- Ne PAS toucher à l'animation d'opacité (elle est déjà correcte).
- Ne PAS toucher aux autres composants (le même « ease-in sur sortie » existe dans `AnimatedSplash` et `EventActionsSheet` — hors scope ; le sheet est traité par le plan 001).
- Ne PAS introduire de dépendance.
- Si le code diffère de l'extrait (dérive depuis `e076341`), STOP et signaler.

## Verification

- **Mécanique** : `cd EventEzMobile && npx tsc --noEmit` → 0 erreur sur `InAppToast.tsx`.
- **Feel check** : déclencher un toast in-app (ex. réception d'un message / notif), puis :
  - À la disparition, le toast **part immédiatement puis décélère** vers le haut (ease-out) — il ne « traîne » plus au démarrage.
  - Entrée et sortie ont la **même sensation** de courbe (symétriques).
  - (Si option a11y) activer « Réduire les animations » → le toast **apparaît/disparaît en fondu, sans glisser**.
- **Done when** : plus aucun `Easing.in` dans `InAppToast.tsx`.
