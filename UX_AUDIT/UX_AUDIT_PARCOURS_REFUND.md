# Audit UX — Parcours Remboursement (Mobile)

**Date** : 2026-04-29
**Auditeur** : Claude (lecture de code)
**Profil simulé** : Participant qui ne peut plus assister à l'event 48h avant. Veut récupérer son argent. État émotionnel : déçu, légèrement frustré.
**Parcours** : `RefundRequestScreen` (sélection raison + montant + soumission)
**Méthodologie** : Lecture du code source, simulation parcours utilisateur en état émotionnel négatif.

## ✅ Statut d'implémentation

- ✅ **Phase 9** (commits mobile 4562783 + backend 395effd) : 
  - Bandeau de transparence en haut de RefundRequestScreen (délais 3-5j ouvrés, frais service non-remboursables, suivi par email).
  - Confirmation explicite avant soumission ("Cette demande ne pourra pas être annulée").
  - Nouveau `RefundsListScreen` `/refunds` avec status pills (EN ATTENTE / EN COURS / REMBOURSÉ / REFUSÉ), montant, raison, note de rejet, ref de transaction. Wired into RootNavigator.
  - Backend signal sur `Event.cancelled` : crée automatiquement les Refund pour TOUS les paiements completed (idempotent, skip si refund non-rejected existe), avec note `[AUTO]` pour distinguer.
  - Toast post-soumission redirige vers le tracking au lieu d'un goBack muet.
- 🔁 Pas livré : "Contacter l'organisateur" depuis le refund (peut-être négocier un report avant refund), mention CGV cliquable, pré-check côté frontend (event terminé > 30j non-éligible), refund partial avec tooltip explicatif.

---

## ÉTAPE UNIQUE — RefundRequestScreen

### 🖱 ACTION EFFECTUÉE
J'ouvre la demande de refund depuis MyPayments → tap sur un paiement → bouton "Demander remboursement". Je vois mes infos paiement, sélectionne une raison parmi 5, ajoute des détails optionnels, choisis remboursement total ou partiel, soumets.

### 👁 CE QUE JE VOIS
- Toile éditoriale, filigrane "BACK".
- Header tile : retour + titre "Demande de remboursement" + sous-titre.
- Carte récap paiement : montant, événement associé, méthode de paiement, date.
- Section "Raison" : 5 cards à sélection radio :
  1. **CAUSE 01 — Événement annulé** : "L'événement a été annulé par l'organisateur"
  2. **CAUSE 02 — Impossible d'y assister** : "Je ne peux plus assister à l'événement"
  3. **CAUSE 03 — Paiement en double** : "J'ai payé deux fois par erreur"
  4. **CAUSE 04 — Mauvais événement** : "Je me suis trompé d'événement"
  5. **CAUSE 05 — Autre raison** : "Une autre raison non listée ci-dessus"
- Champ textarea "Détails supplémentaires" (optionnel).
- Switch "Remboursement partiel" → si activé, champ montant éditable (max = montant du paiement).
- Bouton CTA "Soumettre la demande" en bas.
- À la soumission réussie : toast "Ta demande de remboursement a été soumise" puis `goBack()`.

### 🧠 CE QUE JE COMPRENDS
- Le flow est **simple et structuré** : 5 raisons couvrent les cas types.
- Le montant pré-rempli avec le total = bonne UX pour 95% des cas (refund total).
- Le partial refund est caché derrière un switch — bonne idée, ça évite de surcharger.
- À la soumission, on revient en arrière sans aucune indication de **suivi** : "et maintenant, qu'est-ce qui se passe ?".

### 😊 RESSENTI UTILISATEUR
**Soulagement modeste** : "OK je peux demander, c'est carré".
**Anxiété sur le timing** : aucune indication "Tu seras remboursé sous X jours". État émotionnel négatif, le silence inquiète.
**Frustration potentielle** : 5 raisons fixes. Si ma situation est nuancée (event partiellement annulé, qualité décevante post-event), aucune ne colle.
**Doute sur l'éligibilité** : "Est-ce que j'ai le droit ? L'event est dans 48h, est-ce que c'est trop tard ?". Aucune information sur les conditions de remboursement.
**Perte de contexte** : `goBack()` après soumission = on revient sur MyPayments sans indicateur "Demande en cours". Aucun suivi visible.

### ⚠ PROBLÈMES DÉTECTÉS

1. **Aucune indication des conditions de remboursement** : combien de temps avant l'event peut-on demander ? 100% remboursable ou frais retenus ? Le participant doit deviner.
2. **Aucune indication du délai de traitement** : après soumission, combien de temps avant la réponse ? Avant de voir l'argent revenir ?
3. **Pas de suivi de la demande** : aucun screen "Mes demandes de refund" visible. Une fois soumis, l'utilisateur perd la visibilité.
4. **Aucune communication avec l'organisateur** : la demande va vers qui ? Backend ? Organizer ? Si l'organizer décide, comment lui poser une question avant ?
5. **Raison "Événement annulé"** : devrait être **automatique**. Si l'event est cancel par l'organizer, le refund devrait être déclenché par le backend, pas demandé manuellement par chaque participant.
6. **Pas de confirmation avant soumission** : tap "Soumettre" → c'est parti. Pour une action financière, un `showConfirm` "Tu es sûr ? Cette demande ne pourra pas être annulée." serait plus rassurant.
7. **Switch "remboursement partiel" sans contexte** : pourquoi je voudrais un partiel ? Aucune explication. La plupart des utilisateurs ne taperont pas dessus.
8. **Pas de validation côté event status** : si l'event est terminé depuis 30 jours, est-ce que le refund est encore possible ? Backend doit décider, mais le frontend pourrait pré-bloquer.
9. **`fullReason` concatène raison + détails** (ligne 120-122) : `"Mauvais événement: J'ai cliqué sur le mauvais event"`. Format pas terrible côté admin/organizer (mélange français + structure).
10. **Pas de mention RGPD/légal** : sur un refund, on parle d'argent. Pas de "Conformément à nos CGV, tu as droit à un refund jusqu'à X jours avant l'event...".
11. **Vouvoiement résiduel** sur les descriptions : "L'événement a été annulé par l'organisateur" est neutre, OK. Mais "Je ne peux plus assister à l'événement" est à la première personne — choix curieux.
12. **Validation côté frontend uniquement** : `amount > payment.amount` est checké au frontend, mais on doit faire confiance au backend pour les cas extrêmes (refund déjà fait, event passé, etc.).

### 💡 SUGGESTIONS D'AMÉLIORATION

1. **Bandeau "Conditions de remboursement"** au top : "💡 Tu peux demander un remboursement jusqu'à 24h avant l'événement. Les frais de service ne sont pas remboursables."
2. **Délai de traitement annoncé** sous le bouton : "Délai de traitement : 3-5 jours ouvrés. Tu seras notifié par email."
3. **Écran "Mes demandes de remboursement"** dans MyPayments avec statut visible : En attente / Approuvée / Rejetée / Versée.
4. **Refund automatique sur event annulé** : si `event.status === 'cancelled'`, le backend déclenche le refund de TOUTES les inscriptions sans demande manuelle. Les participants reçoivent juste une notif.
5. **Supprimer l'option "Événement annulé"** de la liste (ou la pré-sélectionner si l'event est déjà cancel) → débloquer un workflow plus malin.
6. **`showConfirm` avant soumission** : "Confirmer la demande ? Cette action est définitive." avec bouton "Confirmer" rouge.
7. **Tooltip ou explication sous "remboursement partiel"** : "Tu peux demander un montant inférieur si tu veux soutenir l'événement (ex. 50% à l'organisateur, 50% remboursé)."
8. **Pré-check côté frontend** : si `event.start_date` < now ou `event.end_date` < now - 30 jours, afficher "Demande non éligible : event terminé depuis trop longtemps".
9. **Format de raison structuré** : envoyer `{ reason_code: 'cannot_attend', reason_label: 'Impossible d'assister', additional_details: 'Mon vol a été annulé' }` au lieu de la string concaténée.
10. **Section "CGV" cliquable** : "📄 Conditions de remboursement complètes" → modal avec les CGV.
11. **Tutoiement des descriptions** : "Tu ne peux plus y assister", "Tu as payé deux fois", etc. — premier-personne narrative est OK mais confusion.
12. **Bouton "Contacter l'organisateur"** : option avant de soumettre, pour résoudre à l'amiable. Peut éviter le refund si l'organizer accepte un report sur un autre event.

---

# 🏁 RAPPORT FINAL — Parcours remboursement

## Note globale UX : **5.5 / 10**

Le screen **fait son travail mécanique** (collecter raison + montant + soumettre) mais **rate complètement le contexte émotionnel** d'un parcours refund : aucune transparence sur les conditions, aucun délai annoncé, aucun suivi post-soumission, aucune voie d'escalade vers l'organizer. L'utilisateur sort plus anxieux qu'avant. Pour un produit qui veut bâtir de la confiance, le parcours refund est un moment-clé qui mérite **plus d'investissement**.

## 🟢 3 POINTS FORTS

1. **Raisons pré-définies** — abaisse la barrière, le participant sait quoi cliquer.
2. **Refund partiel possible** — flexibilité rare dans l'industrie.
3. **Pré-remplissage du montant** — couvre le cas par défaut sans friction.

## 🔴 3 POINTS FAIBLES PRIORITAIRES

1. **Aucune transparence sur les conditions et délais** — l'utilisateur soumet à l'aveugle, anxiété assurée.
2. **Aucun suivi de la demande** — `goBack()` après soumission = boîte noire totale.
3. **Pas d'auto-refund sur event annulé** — chaque participant doit faire la démarche manuellement, perte de temps massive et expérience dégradée pour TOUT le monde.

## 🎯 RECOMMANDATION GÉNÉRALE

Le refund est **le moment où la confiance produit se gagne ou se perd**. La couche fonctionnelle existe ; ce qui manque, c'est la **couche de transparence et de communication**. 1-2 jours pour ajouter (a) un bandeau conditions, (b) un délai annoncé, (c) un screen de suivi, (d) une option "contacter l'organisateur" — et le parcours passe de "froid et anxiogène" à "carré et rassurant". L'auto-refund sur event cancel est un chantier backend à part mais à priorité haute.

