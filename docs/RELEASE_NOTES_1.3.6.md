# Notes de version — EventEz 1.3.6

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Version par-dessus 1.3.5** (passée à 1.3.6 le 2026-10-04). Le détail
> technique du round 3 et des retours testeur du 2026-10-03 est dans
> `RELEASE_NOTES_1.3.5.md` (notes internes). **Si la 1.3.5 n'a jamais été
> publiée sur les stores**, fusionner son texte store avec celui-ci.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Plus stable : correction d'une fermeture inattendue en faisant défiler certaines fenêtres (choix de la langue…), d'écrans qui restaient figés et de l'accueil qui ne se chargeait qu'après actualisation.
• Notifications : un appui ouvre désormais toujours le bon écran, avec des sons dédiés aux moments importants.
• Billets : titre et date toujours visibles hors ligne, ajout à l'agenda, reçus repensés et vérifiables par QR code.
• Plus de petites attentions : gestes, rituels et messages adaptés à votre événement.
• Listes plus rapides (abonnements, connexions, participants) et nombreuses améliorations.

---

## 🇬🇧 English

What's new in this version:

• More stable: fixed an unexpected close when scrolling some panels (language picker…), screens that could freeze, and a home feed that only loaded after a refresh.
• Notifications: tapping one now always opens the right screen, with dedicated sounds for key moments.
• Tickets: title and date always shown offline, add to calendar, redesigned receipts you can verify with a QR code.
• More thoughtful touches: gestures, rituals and messages tailored to your event.
• Faster lists (following, connections, attendees) and many improvements.

---

### Notes internes (ne PAS coller dans le store)

#### Crash des feuilles (SpringSheet) — cause réelle trouvée le 2026-10-04
- Log appareil : `ReferenceError: Property 'DECELERATION' doesn't exist`.
- `sheetPhysics.projectRelease` (worklet, exécuté au lâcher d'une feuille sur
  le thread UI) avait `deceleration = DECELERATION` en **valeur par défaut**.
  Le plugin worklets ne capture pas les identifiants des paramètres par
  défaut → constante absente du runtime UI → crash natif = l'app se ferme.
  Touche TOUTES les `SpringSheet` (langue, catégories, filtres…).
- Fix : paramètre optionnel + littéral `0.998` dans le corps du worklet.
  Scan du code : aucun autre worklet avec valeur par défaut.
- Le correctif du chantier A (geste stabilisé, plus d'écriture de valeur
  animée pendant le rendu) reste utile mais n'était pas la cause.
- RÈGLE : dans un worklet, jamais de constante de module en valeur par défaut
  de paramètre ; la lire dans le corps (ou un littéral).

#### Feuilles + clavier (2026-10-04)
- Toucher la recherche du sélecteur de langue : la feuille montait au-dessus
  du clavier SANS rétrécir (hauteur fixe 88 %) → en-tête et champ de
  recherche hors de l'écran. `SpringSheet` plafonne désormais sa hauteur à
  l'espace libre au-dessus du clavier (`maxHeight` appliqué APRÈS le `style`
  de l'appelant, donc aussi sur une `height` fixe). Vaut pour toutes les
  feuilles avec champ (langue, pays, catégories…).

#### Événement à code d'accès (2026-10-04)
- **« Oups » après un code valide** : `useTour` + `useFocusEffect` étaient
  déclarés APRÈS les retours anticipés (porte code / invitation / 404) de
  `EventDetailsScreen` → nombre de hooks différent entre la porte et la fiche
  → « Rendered more hooks » → ErrorBoundary. Hooks remontés avant les gates ;
  invalidation du cache attendue avant `replace`.
- **Clavier sur le champ du code** : porte enveloppée dans un
  `KeyboardAwareScrollView` ; « Valider » du clavier soumet le code.
- **Édition : code « codé bizarrement », impossible à retirer** : le backend
  renvoyait le HASH à l'organisateur, rechargé dans le champ. `access_code` est
  désormais write-only (backend), le champ d'édition reste vide avec « Un code
  est actif · Retirer le code » ; vide = conserver, retrait = `access_code=''`.
  Même correction côté web (le web aurait sinon effacé le code à chaque
  sauvegarde en envoyant `null`).
- Backend : `/tracks/` et `/speakers/` (+ leads, invitations, caisse)
  acceptent `?event=<slug>` (500 « n'est pas un UUID valide » en prod).

#### Contenu repris de la 1.3.5
- Round 3 (sens, posture, gestes, mots et rituels), lot natif (widgets, Live
  Activities — iOS désactivé par défaut), retours testeur A→G du 2026-10-03 :
  voir `RELEASE_NOTES_1.3.5.md`.

---

### Avant publication

- [ ] **Build store requis** (pas d'OTA). Dépendance native depuis 1.3.5 :
      `expo-calendar` + modules locaux du lot natif.
- [ ] Backend déployé AVANT (migrations accounts 0032, registrations 0022,
      user_messages 0023 ; `cover_video_embed` sur le détail ; reçus ;
      `RECEIPT_ISSUER_*`, `SITE_URL` HTTPS).
- [ ] Web déployé (page `/embed/youtube.html` mise à jour).
- [ ] Tests appareil prioritaires :
  1. Choix de la langue : défiler vite, lâcher, tirer pour fermer → pas de fermeture de l'app. Toucher la recherche → en-tête + champ restent visibles au-dessus du clavier. Idem feuilles catégories / filtres.
  2. Accueil à froid sans actualiser.
  3. Appui sur des notifications (rappel, annulation, paiement) app fermée.
  4. Billets hors ligne : titre + date.
- [ ] Relire le texte store FR/EN ci-dessus (EN DERNIER).
