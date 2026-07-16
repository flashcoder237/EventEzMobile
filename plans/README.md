# Plans d'amélioration du mouvement — EventEzMobile

Audit `improve-animations` (règles AUDIT.md d'Emil Kowalski, traduites en React Native/reanimated).
Commit de référence : `e076341`. Chaque plan est auto-suffisant (chemins, extraits, valeurs exactes)
et exécutable par n'importe quel agent. **Aucun ne modifie de dépendance.**

| # | Plan | Sévérité | Catégorie | Statut |
|---|------|----------|-----------|--------|
| 001 | [Fermer EventActionsSheet en spring](001-eventactionssheet-spring-close.md) | HIGH | Interruptibilité + easing | ✅ DONE |
| 002 | [Reduced-motion dans les animations partagées + boucles](002-reduced-motion-shared-animations.md) | HIGH | Accessibilité | ✅ DONE |
| 003 | [Easing de sortie du toast (ease-in → ease-out)](003-inapptoast-exit-easing.md) | MEDIUM | Easing de sortie | ✅ DONE |

## Ordre d'exécution recommandé

1. **002** (accessibilité) — plus fort levier, touche les composants **partagés** (bénéficie à tout l'app). Fais la Phase 1 (core, `Animations.tsx`) d'abord, la Phase 2 (vues) ensuite.
2. **001** (bottom-sheet) — indépendant, isolé à un fichier.
3. **003** (toast) — indépendant, isolé à un fichier.

## Dépendances

- Aucune dépendance entre les plans : 001, 002, 003 touchent des fichiers disjoints et peuvent être exécutés dans n'importe quel ordre / en parallèle.
- 002 et 003 partagent le **pattern** `useReducedMotion` (même hook, même exemplar `FadeInView`) — faire 002 en premier donne un exemplar de plus à imiter pour l'option a11y de 003.

## Lot 2 — appliqué (findings #4–#7)

| # | Finding | Correctif | Statut |
|---|---------|-----------|--------|
| 004 | BarChart anime `height:%` (layout/frame) | `transform: scaleY` + `transformOrigin: '50% 100%'` (pousse du sol) | ✅ DONE |
| 005 | LiveOpsScreen boucle `Animated` legacy sans a11y | garde `useReducedMotion` (indicateur statique en reduced-motion) | ✅ DONE |
| 006 | AnimatedSplash : fade-out `Easing.in` + barre `width:%` | fade-out `Easing.out` + barre en `scaleX` (`transformOrigin: '0% 50%'`) | ✅ DONE |
| 007 | Springs tapés à la main | preset `SpringPresets.sheet` ajouté + tokenisé sur la fermeture du sheet (zéro changement de feel) | ✅ DONE (partiel) |

Note #007 : consolidation **large** de tous les springs inline de l'app **volontairement non faite** (churn élevé, risque de micro-changements de feel pour un gain cosmétique). Seul le nouveau ressort du sheet a été tokenisé. À faire au cas par cas si besoin.

## Feel-checks lot 2 (device)

- **Graphiques** (analytics/reports) : les barres **poussent du bas** vers le haut (pas depuis le centre), animation fluide.
- **Splash** au lancement : la barre de progression se **remplit de la gauche**, et l'app **s'efface en douceur** (ease-out) à la fin.
- **LiveOps** (organisateur, event en direct) : en reduced-motion, l'indicateur « live » **ne clignote plus**.

## Vérification commune

Après chaque plan : `cd EventEzMobile && npx tsc --noEmit` (0 erreur), puis le **feel check** listé dans le plan (device/émulateur — le ressenti ne se juge pas depuis le code seul).
