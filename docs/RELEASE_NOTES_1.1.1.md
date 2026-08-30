# Notes de version — EventEz 1.1.1

Texte « Nouveautés de cette version » pour l'App Store / Play Store.
Ton : sobre / professionnel. À coller tel quel dans le champ dédié, par langue.

---

## 🇫🇷 Français

Améliorations de cette version :

• Les liens EventEz ouvrent désormais directement l'application (billets, invitations, événements).
• Affichage du Live corrigé (questions et sondages).
• Corrections de bugs et améliorations de performance.

---

## 🇬🇧 English

What's new in this version:

• EventEz links now open directly in the app (tickets, invitations, events).
• Fixed the live event view (questions and polls).
• Bug fixes and performance improvements.

---

### Notes internes (ne PAS coller dans le store)

Contenu réel du build 1.1.1 :
- Suppression de la fonctionnalité d'icônes alternatives (les activity-alias
  désactivaient MainActivity et cassaient les universal links Android).
- Chemins deeplink `/dashboard/*` + réécriture vers les écrans mobiles.
- Bypass de l'onboarding quand l'app est ouverte via un deeplink.
- Écran Live : correction du badge de votes (NaN) et de la barre de saisie
  qui chevauchait la barre de navigation système.
- Version affichée rendue dynamique dans le profil.

iOS n'était pas touché par le bug des icônes (spécifique Android) mais bénéficie
des chemins deeplink élargis et du routing à jour.
