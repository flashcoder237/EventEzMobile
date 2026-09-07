# Notes de version — EventEz 1.3.1

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

> ℹ️ **Correctif par-dessus 1.3.0.** Regroupe les livraisons faites après la
> préparation de 1.3.0 : consolidation de la visioconférence, corrections de
> messagerie et divers ajustements de fiabilité. Le détail complet des
> nouveautés de fond (messagerie offline, module mariage, guichet, documents
> imprimables, salons) reste dans `RELEASE_NOTES_1.3.0.md`.

---

## Texte promotionnel (App Store — accroche marketing, ≤170 car., modifiable sans build)

**🇫🇷** Trouvez, réservez et vivez vos événements — ou créez les vôtres. Billetterie, inscriptions et paiements, en ligne comme sur place.

**🇬🇧** Find, book and experience events — or create your own. Ticketing, registrations and payments, online and on-site.

---

## 🇫🇷 Français

Nouveautés de cette version :

• Visioconférence plus fiable : elle reste active quand vous naviguez dans l'app, et un bandeau « En direct » vous ramène à l'événement en cours.
• Messagerie : affichage des messages, photos et avatars de groupe corrigé.
• L'événement affiche désormais jusqu'à quand il dure, et la fenêtre de vente des billets est de nouveau visible.
• Nombreuses corrections de stabilité et d'affichage.

---

## 🇬🇧 English

What's new in this version:

• More reliable video calls: they stay active while you browse the app, and a "Live" banner brings you back to the ongoing event.
• Messaging: fixed message display, photos and group avatars.
• Events now show how long they run, and the ticket sales window is visible again.
• Many stability and display fixes.

---

### Notes internes (ne PAS coller dans le store)

Contenu réel du build 1.3.1 : les 18 commits livrés après le bump 1.3.0
(commit `2ba2a26`). 1.3.0 n'ayant jamais été publiée, ce cycle finalise en
réalité la première version diffusée aux utilisateurs.

---

**Visioconférence — consolidation**
- Visio PERSISTANTE : l'appel est rendu en overlay racine et survit à la
  navigation (avant, changer d'écran coupait l'appel). Réductible en bulle.
- Écran blanc Jitsi corrigé : permissions caméra/micro demandées avant
  d'ouvrir la WebView, loader d'attente, WebRTC débloqué côté Android.
- « Rejoindre » depuis le détail de l'événement passe par le même flux
  persistant que l'onglet visio (plus de coupure au changement d'écran).
- Bannière « En direct » globale : filet de secours qui ramène vers un
  événement en cours, avec badge et bouton depuis « Mes billets ».
- Bouton « Rejoindre » masqué quand la visio est terminée (l'organisateur
  garde l'accès pour le débrief) — sur le détail comme dans les salles ;
  auparavant le bouton restait actif et menait à une erreur.

**Messagerie — corrections**
- Le dernier mot d'un message n'est plus rogné à l'affichage (la bulle ne se
  redimensionnait pas correctement ; le message était pourtant complet).
- Avatar d'une conversation de groupe d'événement : affiche l'image de
  l'événement au lieu de la photo d'un participant.
- Photo envoyée : elle s'affiche immédiatement au lieu d'un cadre blanc jusqu'au
  redémarrage de l'app (même correction pour documents et audio).
- Filet de robustesse supplémentaire sur la saisie (dernière frappe prise en
  compte à l'envoi).

**Événements & billets**
- L'événement indique jusqu'à quand il dure (deux informations étaient fausses
  faute de connaître l'heure de fin).
- La fenêtre de vente des billets, invisible dans l'onglet billets, est de
  nouveau affichée.
- La limite de quantité à l'achat n'est plus un « 10 » codé en dur.
- Le paiement gère proprement le refus « événement complet ».
- « Mon inscription » ne s'affiche plus par erreur pour l'organisateur d'un
  événement (filtre utilisateur manquant).

**Mariage**
- Le bouton « Liste de cadeaux / Cagnotte » et les actions de gestion mariage
  ne s'affichent que pour un événement de type mariage.

**Divers**
- Réponses rapides : on ne peut plus envoyer une amorce vide, et une amorce en
  cours ne bloque plus l'envoi.
- YouTube : plus aucun cookie de pistage envoyé depuis le mobile.

---

### Avant publication

- [ ] Relire le texte store : une poignée de lignes lisibles, pas la liste
      interne ci-dessus.
- [ ] Vérifier que `app.json` et `package.json` sont bien en 1.3.1
      (`versionCode` / `buildNumber` auto-incrémentés par EAS).
- [ ] Lancer les tests mobile + backend et vérifier la parité FR/EN.
