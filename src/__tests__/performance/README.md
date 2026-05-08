# Performance Tests

Tests Jest qui mesurent `performance.now()` avant/apres `render()` pour
detecter les **regressions** sur les screens et composants lourds.

## Important : ce sont des tests de regression, pas de mesure absolue

Les perfs Jest (jsdom + mocks) ne refletent **PAS** le runtime mobile reel.
L'objectif est :

1. **Detecter les regressions** : si le mount passe de 50ms a 500ms suite a
   un refacto, le test casse -> alerte equipe
2. **Documenter le baseline** : `console.log` dans chaque test capture
   l'ordre de grandeur actuel, visible avec `--verbose`

## Lancer les tests

```bash
# Tous les tests perf
npx jest src/__tests__/performance

# Un seul fichier, mode verbose pour voir les logs
npx jest src/__tests__/performance/EventDetailsScreen.perf.test.tsx --verbose
```

## Seuils

Volontairement **larges** pour eviter le flake en CI :

| Type                       | Seuil mount | Seuil batch (x10/x50) |
|----------------------------|-------------|------------------------|
| Screen leger               | 800 ms      | 3000 ms (x10)          |
| Screen lourd               | 1500 ms     | 5000 ms (x10)          |
| Composant carte (EventCard)| -           | 1500 ms (x50)          |
| Composant message          | -           | 2000 ms (x50)          |

## Que faire si un test casse

1. Verifier si la difference est due a un mock manquant ou a un vrai
   probleme de perf
2. Si vrai regression : identifier le commit fautif (`git bisect` sur le
   test)
3. Si flaky en CI : ne pas hesiter a augmenter le seuil de 50% (perf en
   sandbox CI != perf en local) — l'objectif reste de detecter les +10x,
   pas les +20%

## Regressions a investiguer

(Vide pour l'instant — sera rempli au fil des runs si quelque chose
saute aux yeux)
