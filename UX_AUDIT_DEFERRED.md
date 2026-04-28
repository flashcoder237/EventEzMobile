# UX Audit — Items différés

Source : [UX_AUDIT_PARCOURS_INVITE.md](./UX_AUDIT_PARCOURS_INVITE.md)
Mise à jour : 2026-04-28 (post-phase-6)

Les items ci-dessous ont été **identifiés et différés** car ils nécessitent plus que du polish local : assets externes, refactor architectural, ou décisions produit/backend. Chacun est tracé pour ne pas être perdu.

> ✅ **Phase 6 (commit 04a97d3) a livré** : tutoiement sweep, NetInfo banner 2G/3G, confettis adaptive Android, mute toggle PaymentSuccess, saisie directe quantité (long-press), sticky chips Discover, lazy-load EventDetails sections.
> Les items ci-dessous sont ceux qui restent vraiment.

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

### "Continuer en invité" sur events gratuits
- **Quoi** : bouton secondaire sur LoginScreen quand le `returnScreen === 'TicketPurchase'` ET que l'event est gratuit. Crée un compte light auto avec email + prénom.
- **Pourquoi** : conversion énorme sur les events gratuits (workshops, free meetups).
- **Effort** : moyen. Frontend = 2h. Backend = endpoint `register-light` avec compte non-vérifié.
- **Risque** : duplications de comptes si l'utilisateur revient avec un mot de passe ensuite.

### ~~Mute toggle / silent mode pour les sons~~ ✅ Livré (phase 6)
- Mini-toggle "Son / Muet" en haut à droite de PaymentSuccess.

### Bouton "Inviter un ami" sur PaymentSuccess
- **Quoi** : moment haute valeur émotionnelle pour de la viralité. Partage avec deep-link `/events/[id]?ref=user_xxx`.
- **Effort** : 1-2h (deep linking + tracking ref).
- **Risque** : confidentialité — vérifier qu'on ne leak pas d'info sensible dans le ref.

---

## 📊 Items "nice-to-have"

- ~~Confettis dégradés sur Android < 10 (perf sur vieux devices)~~ ✅ Livré (phase 6 — cap à 60 particules sur API < 30)
- Compteur "Tentative N/36" pendant le polling (en plus de la progress bar récemment ajoutée). Nécessite d'exposer les compteurs internes du hook `usePaymentVerification`.
- Limite quantity > 10 : flow "Demander un groupe" qui ouvre un message à l'organisateur (l'alerte explicite est en place ; reste à câbler le deep-link Messages).
- ~~Saisie directe de quantité (long-press → modal)~~ ✅ Livré (phase 6)
- ~~Voix unique tutoiement~~ ✅ Largement livré (phase 6) sur PaymentScreen + PaymentSuccess + TicketPurchase + LoginScreen. Les écrans hors golden-path (MyPayments, RefundRequest, PaymentFailed) restent à passer.

---

*Ces items peuvent être priorisés en backlog produit. Pas urgents, pas bloquants.*
