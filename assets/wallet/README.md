# Badges officiels Wallet

Ce dossier reçoit les **badges officiels** Apple & Google, à télécharger depuis leurs
pages de marque (ce sont des artworks déposés : ils doivent être utilisés **tels
quels**, sans être redessinés). `AddToWalletButton` les affiche automatiquement dès
qu'ils sont présents ; sinon il retombe sur un bouton stylé générique (fonctionnel,
mais **non conforme pour publication store**).

## Fichiers attendus (PNG @1x/@2x/@3x, fond transparent)

| Fichier | Source officielle |
|---|---|
| `add-to-apple-wallet-fr.png` (+ `@2x`, `@3x`) | Apple — « Add to Apple Wallet » Guidelines, version FR |
| `add-to-apple-wallet-en.png` (+ `@2x`, `@3x`) | idem, version EN |
| `save-to-google-wallet-fr.png` (+ `@2x`, `@3x`) | Google Wallet — Brand guidelines, bouton FR |
| `save-to-google-wallet-en.png` (+ `@2x`, `@3x`) | idem, version EN |

### Où les récupérer

- **Apple** : Human Interface Guidelines → « Wallet » → *Add to Apple Wallet buttons*.
  Apple fournit les boutons localisés (dont français) en PNG/SVG. Respecter la zone de
  protection et ne pas altérer les couleurs.
- **Google** : *Google Wallet API → Brand guidelines → Wallet button assets*. Boutons
  « Enregistrer dans Google Wallet » localisés, en plusieurs densités.

### Contraintes de conformité (résumé)

- Ne **jamais** recréer ni modifier le logo / la typographie du badge.
- Respecter la **hauteur minimale** et la **zone de protection** (padding autour).
- Utiliser la **variante localisée** correspondant à la langue de l'app.
- Le badge doit être **cliquable en entier** et ne pas être masqué.

Tant que ces fichiers ne sont pas déposés, aucune régression : le bouton générique
reste affiché et fonctionnel.
