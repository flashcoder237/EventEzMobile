# UX Audit — Items différés

Source : [UX_AUDIT_PARCOURS_INVITE.md](./UX_AUDIT_PARCOURS_INVITE.md)
Mise à jour : 2026-04-29 (post-phase-16)

> ✅ **Phase 6** (commit 04a97d3) : tutoiement sweep golden-path, NetInfo banner 2G/3G, confettis adaptive Android, mute toggle PaymentSuccess, saisie directe quantité (long-press), sticky chips Discover, lazy-load EventDetails sections.
>
> ✅ **Guest checkout** (commits mobile 8afd095 + backend 1d2b9ab) : end-to-end "Continuer en invité" pour events gratuits.
>
> ✅ **Phase 7** : compteur tentative polling, bouton "Inviter un ami", flow "Demander un groupe" sur quantity > 10, tutoiement sweep MyPayments/Refund/Failed, skeleton léger Discover.
>
> ✅ **Phase 8** (icônes payment fournies par utilisateur + backend) : recent_registrants avatars sur EventDetails (opt-out via User.show_in_attendees), Registration.reference_code exposé sur PaymentSuccess (format EZ-XXXXXXXXXX), discount validate accepte subtotal et retourne applied_amount (plus de "(estimation)").
>
> ✅ **Phase 9** (commits mobile 4562783 + backend 395effd) : refund transparency banner + RefundsListScreen tracking + auto-refund signal sur Event.cancelled.
>
> ✅ **Phase 10** (commit 4562783) : check-in offline queue (useCheckinQueue) + saisie manuelle de référence + auto-dismiss modal en mode auto.
>
> ✅ **Phase 11** (commit a836c2b) : moderator reasons templates (8 chips) + tri SLA + badge URGENT > 24h.
>
> ✅ **Phase 12** (commit a836c2b) : organizer confirmations avant suppression bannière + tutoiement wizard.
>
> ✅ **Phase 13** (commits mobile 26ebf02 + backend ece04a6) : "Demander modifications" 3e action de modération end-to-end (status changes_requested + moderator_notes + reset au re-submit + notification + UI moderator avec modal dédié + UI organizer avec card jaune).
>
> ✅ **Phase 14** (commit 26ebf02) : validation par étape visible avec border rouge + texte d'erreur sur les champs invalidés (Step1: title + description, Step2: locationCity + onlineUrl).
>
> ✅ **Phase 15** (commit 26ebf02) : messaging edit time limit 15 min + useMutedConversations hook + menu 4 options (Mute/Archive/Delete/Cancel) sur long-press.
>
> ✅ **Phase 16** (commit 26ebf02) : useNamedDrafts hook (storage indexé par UUID, saveAsNamed/loadById/deleteById/drafts[] meta).

---

## 🎨 Assets manquants

### ~~Vraies icônes de paiement officielles~~ ✅ Livré (assets fournis par l'utilisateur)
- `wave.png`, `M-pesa-logo.png`, `airtel.png`, `PayPal_Logo.png` ajoutés dans `assets/payments/`.

### ~~Vrais avatars « Qui y va ? » sur EventDetails~~ ✅ Livré (phase 8)
- Backend : `User.show_in_attendees` (default True, opt-out), `EventDetailSerializer.recent_registrants` (5 derniers inscrits opt-in, champs minimums : id + first_name + profile_picture). Migration `0013_user_show_in_attendees`.
- Frontend : EventDetailsScreen affiche les 4 premiers avatars (réels ou initiale colorée), et le compteur "X et N autres y vont". Fallback compteur seul si la liste est vide.

---

## 🏗 Refactors architecturaux

### ~~Lazy-loading des sections EventDetails~~ ✅ Livré (phase 6)
- Seuil scroll 600px, `runOnJS(setHeavyRevealed)` pour révéler Reviews/Sponsors/Agenda/Location, placeholder pour réserver l'espace. Note : la version actuelle ne défère que le rendu, pas les fetches dans `useEventDetails`. Une vraie déferalisation des fetches serait un suivi (refactor du hook).

### ~~Sticky chips de catégorie sur Discover au scroll~~ ✅ Livré (phase 6)
- compactHeader passe en deux niveaux (search + chips horizontaux).

### ~~Détection 2G/3G avec NetInfo~~ ✅ Livré (phase 6)
- Hook `useNetworkSpeed` + bandeaux sur Discover et Payment.

### Skeleton léger pour DiscoverScreen
- **Quoi** : `DiscoverScreenSkeleton` charge sûrement tous les sub-skeletons (hero, nearby, incoming, categories, free). Profiler et ne charger que les 2 premières sections.
- **Effort** : 30 min profiling + adjustments.

---

## 🔌 Backend / API requis

### ~~Vraie ref de commande à la confirmation~~ ✅ Livré (phase 8)
- `Registration.reference_code` (10 caractères alphanumériques) existait déjà côté backend, propagé à PaymentSuccess via les params route. Affiché en `EZ-XXXXXXXXXX`, sélectionnable pour copie.
- TicketPurchaseScreen garde "EN COURS" dans le récap (la ref n'existe pas encore à ce stade) — la vraie ref apparaît seulement sur PaymentSuccess.

### ~~Discount confirmé sans estimation~~ ✅ Livré (phase 8)
- Backend : `validate_code` accepte un `subtotal` optionnel et retourne `applied_amount` + `final_total` calculés exactement. Pas de réservation/lock du discount à ce stade — la même formule est ré-appliquée à la création de la registration.
- Frontend : `validateDiscount()` passe le subtotal, `getDiscountAmount()` privilégie `_serverAppliedAmount`. La mention "Montant final confirmé à la finalisation" est retirée. Affichage : `−10% · −1 500 XAF`.

---

## 🗣 Décisions produit en attente

### ~~"Continuer en invité" sur events gratuits~~ ✅ Livré (commits mobile 8afd095 + backend 1d2b9ab)
- LoginScreen propose un bouton secondaire quand `eventIsFree=true`, modal email+prénom, backend `POST /api/auth/guest-register/` + `POST /api/auth/upgrade-guest/`. Migration `0012_user_is_guest`. Permission `IsNotGuest` pour bloquer les guests sur les actions sensibles. Upgrade prompt sur PaymentSuccess.

### ~~Mute toggle / silent mode pour les sons~~ ✅ Livré (phase 6)
- Mini-toggle "Son / Muet" en haut à droite de PaymentSuccess.

### ~~Bouton "Inviter un ami" sur PaymentSuccess~~ ✅ Livré (phase 7)
- Bouton outline corail sous "Ajouter au calendrier" qui ouvre `Share.share()` avec un deep-link vers l'event. Le `?ref=u<id>` est tronqué à 12 caractères et n'expose ni email ni paymentId.

---

## 📊 Items "nice-to-have"

- ~~Confettis dégradés sur Android < 10~~ ✅ Livré (phase 6)
- ~~Compteur "Tentative N/36" pendant le polling~~ ✅ Livré (phase 7) — `usePaymentVerification` expose `currentAttempt` et `maxAttempts`, affichés dans la progress bar.
- ~~Limite quantity > 10 : flow "Demander un groupe"~~ ✅ Livré (phase 7) — l'alerte propose maintenant un bouton "Contacter l'organisateur" qui navigue vers `Conversation` avec l'organizer pré-sélectionné.
- ~~Saisie directe de quantité (long-press → modal)~~ ✅ Livré (phase 6)
- ~~Voix unique tutoiement~~ ✅ Complet (phases 6 + 7). MyPayments, RefundRequest, PaymentFailed passés en phase 7.
- ~~Skeleton léger pour DiscoverScreen~~ ✅ Livré (phase 7) — squelette réduit au search + 1 hero + 1 teaser horizontal.

---

*Ces items peuvent être priorisés en backlog produit. Pas urgents, pas bloquants.*
