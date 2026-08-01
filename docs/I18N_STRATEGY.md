# Stratégie i18n — traductions d'interface

## Le principe

- **fr / en** sont **bundlés** dans l'app (`src/i18n/locales/`, fallback offline).
- **Toute autre langue** est téléchargée **à la demande** (OTA) depuis le repo
  public `eventez-i18n` (servi par GitHub Pages), puis mise en cache disque
  (`src/i18n/translations.ts`). → le binaire de l'app **ne grossit jamais**,
  quel que soit le nombre de langues publiées.
- Génération **100 % gratuite** via **Argos Translate** (offline, sans clé/carte).

## Pourquoi PAS `--all` (180 langues d'un coup)

Argos télécharge un **modèle ~100 Mo par langue** sur le runner GitHub.
Tout traduire d'un coup → job de plusieurs heures, cache CI qui déborde (limite
10 Go), échecs à répétition. **Ingérable.**

## La solution : traduction PAR VAGUES DE PRIORITÉ

`scripts/i18n_priority.py` classe les langues cibles par nombre de locuteurs
(après en/fr), en **6 vagues** de ~9 langues :

| Vague | Thème | Langues |
|---|---|---|
| 1 | Top mondial | es zh hi ar pt ru de ja it |
| 2 | Grands marchés | ko tr vi id pl uk nl th fa |
| 3 | **Afrique** (marché EventEz) | sw ha yo am zu so ig sn ny |
| 4 | Asie du Sud/SE | bn ta te ur ms ml mr gu pa |
| 5 | Europe | el cs sv da fi no hu ro sk |
| 6 | Longue traîne | he bg hr sr sl lt lv et ca |

> Seules les langues réellement couvertes par un modèle Argos sont générées ;
> les autres sont ignorées (l'app retombe sur l'anglais via `fallbackLng`).

## Comment lancer une vague

**Manuellement** (recommandé) — onglet GitHub *Actions* → *Générer les
traductions (i18n)* → *Run workflow* :
- `wave` = numéro de vague (1..6)
- `only_missing` = true (défaut) → préserve les corrections humaines

**En CLI local** (si Argos installé) :
```bash
python scripts/translate_locales.py --wave 1 --only-missing --out i18n-out
python scripts/translate_locales.py --langs sw,ha --only-missing   # langues précises
```

**Automatique** : un push modifiant `en.json` régénère **uniquement la vague 1**
en `--only-missing` (les textes prioritaires suivent les nouvelles clés). Les
vagues 2-6 restent manuelles.

## Qualité — machine d'abord, humain là où ça compte

- Argos = qualité **machine** (moyenne). Assumé pour la longue traîne.
- `--only-missing` : les corrections humaines dans `eventez-i18n/{lang}.json` ne
  sont **jamais écrasées** par une régénération.
- Variables `{{var}}`, `$t(...)` et balises `<b>` sont **protégées** (jamais
  traduites) puis restaurées.

## Prérequis (une fois)

- Secret `I18N_TOKEN` dans le repo mobile (Settings → Secrets → Actions) =
  fine-grained PAT avec **Contents: Read & Write** sur `eventez-i18n`.
  ⚠️ Les fine-grained PAT **expirent** (90j par défaut) → à régénérer quand le
  workflow échoue sur `Bad credentials`.
- `EXPO_PUBLIC_TRANSLATIONS_URL` pointant sur le GitHub Pages du repo i18n.

## TODO (améliorations non bloquantes)

- **Picker Settings** : filtrer les langues proposées par ce qui est
  RÉELLEMENT traduit (lire `manifest.json` du repo i18n) au lieu des 180 langues
  ISO. Aujourd'hui `/api/languages/` renvoie tout l'ISO 639-1 — c'est correct
  pour la **langue de rédaction d'un event**, mais le picker d'**interface**
  devrait se limiter aux langues générées. Option : badge « bêta » sur les
  langues machine.
- **Relecture communautaire** : ouvrir des PR sur `eventez-i18n` pour que des
  utilisateurs corrigent leur langue (qualité humaine, coût zéro).
