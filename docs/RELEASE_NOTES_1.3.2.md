# Notes de version — EventEz 1.3.2

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Correctif par-dessus 1.3.1.** Cycle centré sur la visioconférence : le
> rôle « modérateur » n'est plus attribué par erreur à tous les participants,
> et l'attente avant l'ouverture du direct par l'organisateur est explicite.

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Visioconférence : seul l'organisateur est modérateur — les participants ne reçoivent plus ce rôle par erreur.
• Un message clair indique que le direct n'a pas encore démarré tant que l'organisateur n'a pas ouvert la salle.
• Corrections de stabilité et d'affichage.

---

## 🇬🇧 English

What's new in this version:

• Video calls: only the organizer is a moderator — attendees are no longer given that role by mistake.
• A clear message now tells you the live hasn't started until the organizer opens the room.
• Stability and display fixes.

---

### Notes internes (ne PAS coller dans le store)

Cycle de correction visio faisant suite au signalement « tous les connectés
deviennent modérateurs » et « écran blanc » sur mobile.

---

**Visioconférence — rôle modérateur (#16297)**
- Cause racine : bug Jitsi/Jicofo connu (#16297) — le premier arrivant est
  repromu modérateur dès qu'un modérateur (l'organisateur) le rejoint, en
  ignorant le rôle porté par le token. Le token de l'inscrit portait pourtant
  bien `moderator: false`.
- Correctifs serveur (hors app, sur l'hôte Jitsi) : module `token_affiliation`
  réparé et rechargé, `enableUserRolesBasedOnToken: true` ajouté à `config.js`,
  `enable-auto-owner: false` confirmé côté Jicofo, `disable_cascading_set = false`
  posé sur le composant conférence (ré-application de l'affiliation en cascade).
- Garde-fou applicatif « organisateur d'abord » (backend + mobile) : un inscrit
  ne peut rejoindre une salle Jitsi que si l'organisateur a déjà ouvert la salle.
  C'est le seul ordre d'arrivée qui ne déclenche pas #16297. Tolérance
  déconnexion/reconnexion de l'organisateur (une salle déjà ouverte le reste).
  Les plateformes externes (Zoom/Teams/lien) ne sont pas concernées.
- UX : l'inscrit qui tente de rejoindre avant l'organisateur voit un message
  d'attente (« Le direct n'a pas encore démarré »), pas une erreur d'accès —
  depuis la bannière « En direct », « Mes billets » et le détail de l'événement.

---

### Avant publication

- [ ] Relire le texte store : trois lignes lisibles, pas la liste interne.
- [ ] Vérifier que `app.json` et `package.json` sont bien en 1.3.2
      (`versionCode` / `buildNumber` auto-incrémentés par EAS).
- [ ] Lancer les tests mobile + backend et vérifier la parité FR/EN.
- [ ] Déployer le backend (garde-fou host-first) AVANT de diffuser le build.
