# UX Audit — Items différés

Source : [UX_AUDIT_PARCOURS_INVITE.md](./UX_AUDIT_PARCOURS_INVITE.md)
Mise à jour : 2026-04-29 (post-phase-7)

Les items ci-dessous ont été **identifiés et différés** car ils nécessitent plus que du polish local : assets externes, refactor architectural, ou décisions produit/backend. Chacun est tracé pour ne pas être perdu.

> ✅ **Phase 6** (commit 04a97d3) : tutoiement sweep golden-path, NetInfo banner 2G/3G, confettis adaptive Android, mute toggle PaymentSuccess, saisie directe quantité (long-press), sticky chips Discover, lazy-load EventDetails sections.
>
> ✅ **Guest checkout** (commits mobile 8afd095 + backend 1d2b9ab) : end-to-end "Continuer en invité" pour events gratuits.
>
> ✅ **Phase 7** : compteur tentative polling, bouton "Inviter un ami", flow "Demander un groupe" sur quantity > 10, tutoiement sweep MyPayments/Refund/Failed, skeleton léger Discover.
>
> Les items ci-dessous sont ceux qui restent vraiment — tous nécessitent assets, backend, ou décisions produit que je ne peux pas trancher seul.

---

## 🎨 Assets manquants

### Vraies icônes de paiement officielles
- **Quoi** : remplacer `bank.png` (fallback générique) utilisé pour Wave, M-Pesa, Airtel Money, PayPal dans `src/screens/payment/PaymentScreen.tsx` (lignes ~63-72).
- **Pourquoi** : impression visuelle pauvre. Les utilisateurs reconnaissent leurs apps via leurs logos officiels.
- **Effort** : 1h dev + sourcing assets. Logos disponibles dans les press kits officiels (Wave Senegal, Safaricom, Airtel Africa, PayPal Brand Center).
- **Risque** : nul. Drop-in replacement dans `assets/payments/`.

### Vrais avatars « Qui y va ? » sur EventDetails
- **Quoi** : afficher 3-5 avatars réels d'inscrits au lieu du compteur seul (`event.registration_count`).
- **Pourquoi** : preuve sociale forte = effet réseau. Eventbrite/Meetup le font.
- **Effort** : moyen. Backend doit exposer `event.recent_registrants[]` (3-5 derniers, opt-in via privacy setting). Frontend = 1h.
- **Risque** : RGPD. Les utilisateurs doivent opt-in à apparaître publiquement comme inscrits.

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

### Vraie ref de commande à la confirmation
- **Quoi** : afficher le `registration.id` ou un `order_number` formaté lisible dès la création de l'inscription, dans le récap de `TicketPurchaseScreen`.
- **État actuel** : "EN COURS" comme placeholder honnête.
- **Effort** : trivial frontend, mais nécessite que le backend retourne un human-readable order ref (ex. `EZ-2026-04-A8K9X3`).

### Discount confirmé sans estimation
- **Quoi** : retirer la nuance "Montant final confirmé à la finalisation" si le backend valide le discount avec le montant exact.
- **État actuel** : message présent, l'estimation côté front est précise mais le label rappelle qu'elle peut bouger.
- **Effort** : nul si le backend confirme, sinon backend doit verrouiller le discount au moment de la validation.

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
