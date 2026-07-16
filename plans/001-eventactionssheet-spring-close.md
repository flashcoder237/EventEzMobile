# 001 — Fermer EventActionsSheet en spring (symétrie + interruptibilité)

- **Status**: DONE
- **Commit**: e076341
- **Severity**: HIGH
- **Category**: Interruptibilité (§4) + Easing de sortie (§2)
- **Estimated scope**: 1 fichier, ~4 lignes

## Problem

Le bottom-sheet `EventActionsSheet` **ouvre en ressort** mais **ferme en timing fixe avec `Easing.in`** (une courbe qui démarre lentement — exactement le mauvais moment, l'utilisateur regarde le départ). Le composant a pourtant du **drag-to-dismiss** : une fermeture gestuelle doit se comporter en ressort (reprend la vélocité, interruptible), pas en animation scriptée à durée fixe. La technique est asymétrique et la sortie « traîne ».

```tsx
// src/components/organizer/EventActionsSheet.tsx:90-100 — actuel
useEffect(() => {
  if (visible) {
    translateY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
    backdropOpacity.value = withTiming(1, { duration: 220 });
  } else {
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 220,
      easing: Easing.in(Easing.cubic),   // ← ease-in sur une sortie gestuelle
    });
    backdropOpacity.value = withTiming(0, { duration: 180 });
  }
}, [visible, translateY, backdropOpacity]);
```

Règle AUDIT.md §2 : entrée **et** sortie → `ease-out`, jamais `ease-in` sur de l'UI. §4 : le mouvement gestuel/réversible doit utiliser des ressorts (ils portent la vélocité à l'interruption).

## Target

Fermer en `withSpring` **sans dépassement** (le sheet ne doit pas rebondir en quittant l'écran), même famille de ressort que l'ouverture :

```tsx
// target — src/components/organizer/EventActionsSheet.tsx
useEffect(() => {
  if (visible) {
    translateY.value = withSpring(0, { damping: 22, stiffness: 240, mass: 0.6 });
    backdropOpacity.value = withTiming(1, { duration: 220 });
  } else {
    translateY.value = withSpring(SCREEN_HEIGHT, { damping: 30, stiffness: 300, mass: 0.6 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
  }
}, [visible, translateY, backdropOpacity]);
```

`damping: 30` (près du critique) = descente franche vers le bas de l'écran sans oscillation. `Easing` n'est plus importé pour ce bloc — le retirer de l'import **seulement s'il n'est plus utilisé ailleurs dans le fichier** (vérifier).

## Repo conventions to follow

- Les ressorts partagés vivent dans `src/constants/theme.ts` → `SpringPresets` (`gentle/snappy/bouncy/slow/micro`). Le fichier utilise ici des configs inline `{ damping, stiffness, mass }` — rester cohérent avec l'inline déjà présent à la ligne 92 (ouverture).
- Exemplar d'une fermeture au ressort déjà correcte dans CE fichier : le snap-back du drag, `onEnd` → `translateY.value = withSpring(0, { damping: 22, stiffness: 240 })` (ligne ~130).
- `withSpring` est déjà importé de `react-native-reanimated` dans ce fichier — ne rien ajouter.

## Steps

1. Dans `src/components/organizer/EventActionsSheet.tsx`, dans le `useEffect([visible, …])`, remplacer le bloc `else` : la ligne `translateY.value = withTiming(SCREEN_HEIGHT, { duration: 220, easing: Easing.in(Easing.cubic) });` devient `translateY.value = withSpring(SCREEN_HEIGHT, { damping: 30, stiffness: 300, mass: 0.6 });`. Laisser la ligne `backdropOpacity.value = withTiming(0, { duration: 180 });` inchangée.
2. Vérifier si `Easing` est encore utilisé ailleurs dans le fichier (`grep Easing src/components/organizer/EventActionsSheet.tsx`). Si plus aucune occurrence, retirer `Easing` de la liste d'import `react-native-reanimated`. Sinon, ne pas toucher l'import.
3. (Optionnel — handoff de vélocité, plus fidèle) Dans le `dragGesture.onEnd`, quand on ferme (`e.translationY > 100 || e.velocityY > 600`), au lieu d'appeler seulement `runOnJS(handleClose)()`, lancer d'abord l'anim avec la vélocité du geste : `translateY.value = withSpring(SCREEN_HEIGHT, { damping: 30, stiffness: 300, mass: 0.6, velocity: e.velocityY });` puis `runOnJS(onClose)()`. Ne faire cette étape que si elle ne provoque pas de double-animation (le `useEffect` se déclenchera aussi quand `visible` passe à false — dans ce cas garder UNIQUEMENT le `runOnJS(handleClose)()` et laisser le `useEffect` gérer, l'étape 1 suffit). En cas de doute, s'arrêter à l'étape 2.

## Boundaries

- Ne PAS toucher au geste d'ouverture (ligne 92) ni au backdrop timing.
- Ne PAS modifier le JSX / la structure du `Modal`.
- Ne PAS introduire de dépendance.
- Ne PAS toucher aux autres bottom-sheets/modales du repo.
- Si le code trouvé diffère de l'extrait (dérive depuis le commit `e076341`), STOP et signaler.

## Verification

- **Mécanique** : `cd EventEzMobile && npx tsc --noEmit` → 0 erreur sur `EventActionsSheet.tsx`.
- **Feel check** (device/émulateur) : ouvrir le sheet d'actions d'un event, puis :
  - Le fermer via le bouton/backdrop → il **glisse vers le bas de façon franche, sans traîner au départ ni rebondir** en bas.
  - Le tirer vers le bas à mi-course puis relâcher juste avant le seuil → il **revient** en douceur (snap-back ressort, déjà en place).
  - Le tirer franchement vers le bas et relâcher → il **part avec l'élan du doigt** (pas de « coupure » entre le drag et l'animation).
  - Spammer ouvrir/fermer → aucune animation qui « redémarre de zéro » brutalement.
- **Done when** : la fermeture n'utilise plus `Easing.in` ni `withTiming` sur `translateY`, et le mouvement de sortie démarre immédiatement (ease-out/ressort).
