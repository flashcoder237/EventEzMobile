# AUDIT FONCTIONNEL COMPLET — EventEzMobile

**Date** : 2026-05-04
**Périmètre** : `EventEzMobile/` — application React Native / Expo
**Méthode** : revue de code exhaustive (118 écrans, 38 hooks, 18 modules API), confrontation aux endpoints DRF du backend.

---

## 0. Résumé exécutif

L'application est mature et couvre la quasi-totalité des fonctionnalités du backend.
La stack est moderne (Expo SDK 54, React 19, RN 0.81, TypeScript strict, Reanimated 4).
Le design system est cohérent (style éditorial unifié, dark mode complet, illustrations animées).

### Forces
- Couverture fonctionnelle large (8 rôles : guest, user, organizer, moderator, admin, scanner, volunteer, shareholder).
- Architecture claire : séparation API barrel / hooks / contexts / screens.
- Système de cache 2-niveaux (mémoire + AsyncStorage) avec stale-while-revalidate.
- File offline pour check-in scanner + envoi messages.
- Browse-first auth (parcours public sans login) + `RoleGuard` qui protège les 10 écrans admin (User Mgmt, Audit, Subscriptions, Platform Settings, et les 5 Treasury) avec une UI éditoriale et illustration `AccessDenied`.
- **Sentry intégré** : `@sentry/react-native@~7.4.0` + wrapper tolérant `src/services/crashReporting.ts` (lazy-load, no-op si module natif absent en Expo Go), init via `initCrashReporting()` dans `App.tsx`.
- 43 tests Maestro end-to-end + tests unitaires Jest.
- TypeScript strict, typecheck passe sans erreur (`npx tsc --noEmit` exit 0).

### Faiblesses majeures
1. **Code mort** : `HomeScreen` (530 l.), `ExploreScreen` (1552 l.) et `AuthNavigator.tsx` ne sont plus référencés depuis le redesign Discover + le pattern browse-first auth, mais traînent dans le repo (~2080 LOC inutiles, vérifié : aucun import externe).
2. **Aucune librairie de chart** — les graphes sont des bar charts maison sans axe Y, sans tooltip, sans animation.
3. **3 composants KPI différents** au lieu d'un partagé (`KPICard` shared dans `components/charts`, `KPICardE` inline AnalyticsDashboard, `StatCard` inline EventAnalytics).
4. **Accents français manquants** sporadiquement dans les alertes/labels (corrigés pour les écrans d'export, mais le pattern existe ailleurs).
5. **`MessagesScreen` non joignable depuis les tabs principales** — accessible uniquement via le bouton "Messages" du `DiscoverScreen` ou `Profile`. Pas de tab dédiée → discovery faible.
6. **`i18next` configuré mais 0 utilisation** — `src/i18n/index.ts` initialise FR+EN via `expo-localization`, mais aucun fichier n'appelle `useTranslation()`. Toute l'UI reste en français hardcodé.
7. **Debounce inconsistant** : présent dans `RegistrationSearchBar` (300ms), `MessagesScreen` et `EventSearchScreen` (inline `setTimeout`), mais pas de hook partagé `useDebounce` et absent sur d'autres surfaces (filtres Discover, autocomplete category).

---

## 1. Architecture & Stack

### Tech
| Couche | Choix | Version |
|---|---|---|
| Runtime | Expo | SDK 54 (managed) |
| RN | React Native | 0.81.5 |
| UI | React | 19.1.0 |
| Lang | TypeScript | 5.9 |
| Animations | react-native-reanimated | 4.1.1 (worklets 0.5.1) |
| Nav | React Navigation | 7.x (native-stack + bottom-tabs) |
| HTTP | axios | 1.13.4 |
| Cache local | AsyncStorage + Map mémoire | maison (`CacheService`, `useQuery`) |
| WebSocket | natif | maison (`useMessagingWebSocket`) |
| Storage sécurisé | expo-secure-store | 15.0.8 (JWT) |
| Push | expo-notifications | 0.32.16 |
| Maps | react-native-maps | 1.20.1 |
| Camera | expo-camera | 17.0.10 (QR scanner) |
| File system | expo-file-system (legacy + new) | 19.0.21 |
| OAuth | @react-native-google-signin + expo-apple-auth | 11.0 / 8.0 |
| Charts | **AUCUNE** | — graphes maison via `LinearGradient` |
| i18n | i18next + react-i18next | 25.8 / 16.5 |

### Organisation des dossiers
```
src/
├── api/         (18 modules + index barrel)
├── components/  (charts, common, ui, illustrations, events, messages, payment, etc.)
├── contexts/    (Auth, Theme, Alert, Connection, Notification, Status)
├── hooks/       (38 hooks)
├── lib/         (utils, services, i18n)
├── navigation/  (Root, Main tabs, AuthGuard)
├── screens/     (12 domaines × N écrans)
└── types/       (index.ts central)
```

**Verdict** : architecture solide, pas de god-file, séparation claire api/UI.

---

## 2. Navigation

### Stack (Root)
55+ écrans enregistrés, regroupés par domaine.
Pattern **browse-first auth** : la stack rend toujours `Main` + tous les écrans publics ; les écrans Auth sont des modals invocables depuis n'importe où via `navigation.navigate('Login')`.

### Tabs (Main)
4 onglets, dock flottant avec gradient + shimmer + haptics :
- **Discover** (`DiscoverScreen`) — page d'accueil, fusion Home+Explore.
- **Saved** (`FollowingEventsScreen`) — gardé par `AuthGuardScreen` si non connecté.
- **MyTickets** — idem.
- **Profile** — idem.

Le tour onboarding (`useTour` + `MAIN_TABS_TOUR_STEPS`) se déclenche au premier mount auth (key persistée dans AsyncStorage).

### Issues
- ⚠️ `HomeScreen.tsx` et `ExploreScreen.tsx` existent encore mais ne sont importés nulle part → code mort (≈2080 lignes).
- ⚠️ `AuthNavigator.tsx` toujours présent mais inutilisé (auth est maintenant en modals dans le RootStack).
- ⚠️ Pas de tab "Messages" : seul accès via icône dans header Discover/Profile, peu visible.
- ✅ Deep linking propre pour `verify-email/{token}` (universal link).

---

## 3. Authentification

### Méthodes supportées
1. **Email + mot de passe** (`LoginScreen`, `RegisterScreen`, `RegisterOrganizerScreen`).
2. **Google OAuth** (`@react-native-google-signin`) — `useSocialAuth.ts`.
3. **Apple Sign-In** (iOS) — `expo-apple-authentication`.
4. **Téléphone OTP** (Twilio + Redis backend, HMAC, format E.164 via `phonenumbers`).
5. **Email OTP** (token via deep link).
6. **Reset password** (token email).

### Flow JWT
- Access token : 15 min, refresh : 7 jours (cohérent backend).
- `ensureFreshAccessToken()` dans `api/instance.ts` rafraîchit avant échéance.
- Retry automatique sur 401 dans `useExport` et le client axios.
- `expo-secure-store` pour le stockage des tokens (chiffré).

### Browse-first
- `useAuthGuard().requireAuth(callback)` wrappe les actions protégées (favoris, achat, message).
- Si non auth → modal Login s'ouvre.
- `AuthGuardScreen` affiche un blocage doux (illustration + CTA) sur les tabs gated.

### Issues
- ⚠️ `LoginScreen` et `RegisterScreen` sont longs (>700 lignes). Pas de séparation des sous-formulaires.
- ⚠️ Pas de support biométrique pour ré-ouverture rapide (FaceID / Empreinte) après timeout JWT.
- ✅ Phone-only users reçoivent un email placeholder `phone_XXXX@eventez.placeholder`, `phone_verified=true`.
- ✅ Logout efface `CacheService.clearMemory()` mais conserve AsyncStorage (intentionnel pour le prochain login).

---

## 4. Discovery & Browse

### `DiscoverScreen.tsx` (2323 l.)
- Feed mixte : événements près de moi, tendances, nouveautés, par catégorie.
- Toggle entre mode "feed" et "search" sur la même surface (pas de navigation).
- Filtres rapides (chips horizontaux), sortBy, prix/distance/date.
- Header transparent qui se solidifie au scroll.
- `EventCard` éditorial : date orange + bookmark + price tile.

### `EventSearchScreen.tsx`
- Recherche full-text, history persistée (`useSearchHistory`).
- Suggestions : récents + populaires.

### `MapScreen.tsx`
- `react-native-maps` (Google Maps Android, Apple Maps iOS).
- Markers groupés (cluster maison).
- Bottom-sheet draggable avec liste des events visibles.

### Issues
- ⚠️ `DiscoverScreen` est très lourd (2300 lignes) — refactoring possible en sous-composants dédiés (HeroSection, CategoryRow, NearbySection).
- ⚠️ Pas de skeleton dédié pour le mode "search empty" (juste skeleton du feed normal).
- ⚠️ L'API search appelle `/events/?search=` à chaque keystroke — pas de debounce visible.
- ✅ LQIP progressive images (placeholder data-URI 20px) sur tous les EventCard via `expo-image`.
- ✅ Cache 2 min sur le feed, refresh auto si > 2 min.

---

## 5. Event Detail & Sessions

### `EventDetailsScreen.tsx` (2122 l.)
Page unique scrollable (l'ancien design à 12 onglets a été abandonné, 2026-02-24).
Sections : banner parallax, dates, lieu, description, agenda, speakers, sponsors, FAQ, "Bon à savoir", "Qui y va".
CTA sticky en bas (élevé avec shadow).

### `SessionDetailsScreen.tsx`, `SpeakerDetailsScreen.tsx`
Drill-down depuis l'agenda. Inscription/désinscription session via `sessionsAPI.register`.

### `OrganizerProfileScreen.tsx`
Profil de l'organisateur avec ses événements, follow/unfollow, contact.

### `LiveEventScreen.tsx`
Mode "événement en cours" avec timer, agenda actif, polls, Q&A.

### Issues
- ⚠️ Le bouton "Suivre" appelle `requireAuth` mais redirige vers Login — pas de feedback "tu as été suivi" différé après login.
- ⚠️ La galerie d'images n'a pas de `react-native-image-viewing` zoom (alors que la lib est installée).
- ✅ "Add to calendar" propose Google Calendar + iCal (.ics) avec fallback local si l'API échoue.
- ✅ Partage natif avec deeplink `eventez://events/{id}`.

---

## 6. Tickets & Registrations

### Côté User
- **`TicketPurchaseScreen`** : sélection types de billets, codes promo, formulaire custom dynamique.
- **`MyTicketsScreen`** (1912 l.) : liste paginée avec filtres (à venir, passés, archivés), recherche, **export** (✅ corrigé).
- **`QRCodeScreen`** : QR plein écran avec brillance max, partage du QR comme image.
- **`RegistrationDetailsScreen`** : détail d'une inscription, billets associés, ticket-level check-in status.
- **`PendingTransfersScreen`** : transferts reçus à accepter/refuser.
- **`OfflineTicketsScreen`** : billets stockés localement pour utilisation hors-réseau.
- **`TransferTicketModal`** : formulaire d'envoi de billet à un autre user.

### Côté Organizer
- **`EventRegistrationsScreen`** : liste des inscrits avec **filtres + recherche + bulk actions** (approve/reject/check-in/email) + **export multi-format** (✅ corrigé).
- **`QRScannerScreen`** : scanner caméra avec queue offline (`useCheckinQueue`).

### Hooks dédiés
- `useOfflineTickets.ts` : sync billets en local, validation offline.
- `useCheckinQueue.ts` : check-ins offline avec replay automatique au retour réseau.

### Issues
- ✅ Stock soft-reservation : pas d'écart attendu vs backend.
- ⚠️ Pas de notification push à l'organisateur quand un billet est transféré (à confirmer côté backend).
- ⚠️ `OfflineTicketsScreen` ne remonte pas clairement la fraîcheur du sync ("Dernier sync : il y a 2h").

---

## 7. Payments & Refunds

### `PaymentScreen.tsx` (2346 l.)
- Sélection méthode : NotchPay (MTN, Orange Money, Wave, M-Pesa, Airtel, cartes XAF/XOF) ou Stripe (cartes EUR/USD/GBP, PayPal).
- Dispatch automatique par devise via `initialize_payment` côté backend.
- Pour les deux gateways : redirection `WebBrowser` (Stripe Checkout URL ou NotchPay payment page).
- `usePaymentVerification` poll le statut toutes les 3s avec timeout 10 min.
- `useSavedPaymentMethods` mémorise les téléphones MTN/Orange utilisés.
- `FXIndicator` affiche un taux de change indicatif au payeur (purement informatif, pas contractuel).

### Idempotency
- Idempotency key générée localement et envoyée au backend (header `Idempotency-Key`).
- ✅ Implémentation correcte : `getOrCreateIdempotencyKey(registrationId)` dans `lib/utils/paymentIdempotency` — clé persistée par registration, supprimée après succès via `clearIdempotencyKey`.

### Refunds
- **`RefundRequestScreen`** : formulaire de demande avec raison.
- **`RefundsListScreen`** : historique avec statut (requested/processing/approved/rejected/completed).
- **`MyPaymentsScreen`** : tous les paiements de l'user.

### Issues
- ⚠️ Pas de mode "split payment" (plusieurs cartes pour un même achat).
- ⚠️ `PaymentScreen` est gigantesque (2346 lignes) — splittable en sub-screens par méthode.
- ✅ Bonne gestion des deeplinks de retour (`eventez://payment/success`).
- ✅ Currency lock : `Payment.currency = Event.currency`, jamais de FX côté plateforme.

---

## 8. Wallet & Payouts (organizer)

### `WalletScreen.tsx` (2533 l.)
4 onglets :
- **Aperçu** : solde net, soldes disponible/pending, KPIs.
- **Transactions** : ledger paginé + **bouton export** (✅ ajouté).
- **Retraits** : historique + statuts.
- **En attente** : earnings non encore disponibles.

### Demande de retrait
- Sélection méthode dynamique selon `wallet.country` (`payoutsAPI.getAvailableMethods`).
- Validation côté client : `amount >= minimum_payout`, `amount <= available_balance`.
- Mise à jour des coordonnées bancaires/Mobile Money inline.

### Issues
- ⚠️ `WalletScreen` est lourd (2533 l.) — 4 onglets pourraient être 4 sous-screens en stack.
- ⚠️ Pas d'historique des modifications de coordonnées bancaires (audit trail mobile).
- ⚠️ Pas de PDF "relevé mensuel" générable depuis le mobile.
- ✅ Annulation de retrait pending re-crédite le solde immédiatement (cohérent backend).

---

## 9. Messaging

### Architecture
- **REST** pour CRUD + historique (`messagesAPI`, `/conversations/`, `/messages/`).
- **WebSocket** Django Channels : `ws://.../ws/messages/{conversation_id}/`.
- Hook `useMessagingWebSocket.ts` : reconnect automatique, queue offline (`useOfflineQueue`).
- Events : `message.new`, `message.edited`, `message.deleted`, `typing.indicator`, `message.read`, `reaction.add`, `presence.changed`.

### `MessagesScreen.tsx`
Liste des conversations (1-1, groupes, événement), unread badges, swipe to archive/mute, recherche.

### `ConversationScreen.tsx` (2127 l.)
- FlatList inversée (perf : index+1 = visuel au-dessus pour message grouping).
- Edit/delete soft (placeholder "Ce message a été supprimé").
- Système de réactions (emoji picker), reply-to, pièces jointes (image, doc, vocal via `expo-audio`).
- Drag & drop upload sur web (n/a mobile).
- Quota banner pour les conversations stockées long terme + export JSON manifest.

### Issues
- ⚠️ Pas d'indicateur de "qualité réseau" pendant l'enregistrement vocal (le user ne sait pas si le upload va passer).
- ⚠️ Recherche dans une conversation = appel REST `/messages/search/` à chaque keystroke (pas de debounce visible).
- ✅ Gestion presence (online/offline) via WebSocket bien implémentée.
- ✅ `ConversationQuotaBanner` propose backup local automatique.

---

## 10. Notifications

### `NotificationsScreen.tsx`
- 4 catégories : événements, paiements, social, système.
- Mark all as read, swipe-delete, deep link vers la cible.
- Cache 1 min via `useQuery`.

### Push
- `expo-notifications` configuré.
- Token enregistré côté backend via `notificationsAPI.registerPushToken`.
- ⚠️ **Pas vu de gestion explicite de la permission push refusée** (l'utilisateur doit aller dans Settings OS).

### `useUnreadCounts` (NotificationContext)
Compte total notifs + transferts pending + invitations → badge tab Profile.

### Issues
- ⚠️ Pas de catégories silencieuses configurables côté mobile (alors que le backend supporte les preferences par canal).
- ✅ Isolation par user : la clé cache inclut l'userId, pas de fuite cross-account.

---

## 11. Profile & Settings

### `ProfileScreen.tsx`
Hub utilisateur : avatar, nom, role, navigation vers tous les sub-écrans (events, tickets, wallet si organizer, settings, etc.).

### Sub-écrans
- **`EditProfileScreen`** : nom, avatar, bio, téléphone, langue.
- **`SettingsScreen`** : thème (light/dark/system), notifications, langue, confidentialité, sécurité.
- **`PrivacyScreen`** : RGPD (export données, suppression compte), bloqués, visibilité profil.
- **`BlockedUsersScreen`** : liste avec unblock.
- **`HelpScreen`** : FAQ, support, à propos.
- **`TermsScreen`** + **`PrivacyScreen`** : pages légales (peuvent ouvrir webview).
- **`BecomeOrganizerScreen`** : upgrade vers compte organisateur.
- **`VerificationScreen`** : KYC (upload pièce d'identité).
- **`GamificationScreen`** : badges, XP, niveau, classement.

### Issues
- ⚠️ Beaucoup de "mini écrans" qui pourraient être des bottom sheets pour réduire les transitions.
- ⚠️ Pas de raccourci "scanner mon billet" depuis le profil (juste depuis MyTickets).
- ✅ Suppression compte demande mot de passe + raison (RGPD-compliant).

---

## 12. Organizer Tools

### `EventCreateScreen.tsx` / `EventEdit`
Formulaire multi-step :
1. Infos de base (titre, type, catégorie, date, lieu).
2. Description + médias (banner + galerie).
3. Tickets ou formulaire custom.
4. Agenda (tracks, speakers, sessions).
5. Settings avancés (visibilité, capacité max, codes promo, waitlist).
6. AI Assist intégré : génération titre/description/SEO/pricing.

Hooks dédiés : `useEventForm`, `useEventFormCollections`, `useEventFormImages`, `useEventFormSubmit`, `useEventFormValidation`, `useEventFormAI`, `useEventDraft`, `useNamedDrafts`.

### `DraftsListScreen.tsx`
- Brouillons locaux (AsyncStorage) + brouillons serveur (`event-templates`).
- Resume from draft, suppression.

### `MyEventsScreen.tsx`
Liste paginée avec filtres status (draft/submitted/validated/published/completed/cancelled).
Actions par event : voir, modifier, dupliquer, publier, annuler.

### `DiscountManagementScreen` + `DiscountFormScreen`
CRUD codes promo : type (% ou montant fixe), validité, usage max, applicable à quels ticket types.

### `EventSessionsLinkScreen.tsx`
Lier les types de billets à des sessions précises (all-access vs sélection).

### `VolunteerScreen.tsx`
Recrutement bénévoles : roles, applications, tasks.

### `QRScannerScreen.tsx`
Scanner caméra plein écran, beep + haptic + animation succès, queue offline.

### Issues
- ⚠️ Pas de prévisualisation "comme un user le verra" depuis l'écran de création.
- ⚠️ AI Assist : pas de cancel button quand la génération streaming est en cours (juste attendre).
- ✅ Drafts persistent même si l'app crash (AsyncStorage avec key versionning).

---

## 13. Analytics & Charts

### `AnalyticsDashboardScreen.tsx` (organizer)
- Hero card revenus avec watermark devise.
- 4 KPI cards (Revenus, Inscrits, Events, Présence) avec trend %.
- 2 bar charts (Inscriptions, Revenus) — désormais adaptatifs à la période (✅ corrigé).
- Range chips : 7j / 30j / 90j / 1an.
- Quick links vers Reports, MyEvents.
- **Export dashboard** ✅ ajouté.

### `EventAnalyticsScreen.tsx`
Stats par event individuel : vues, inscriptions, conversion, revenus, capacité utilisée, insights textuels.

### `ReportsScreen.tsx`
Liste des rapports + bouton "Générer" + **export multi-format** (✅ corrigé).

### Composants charts
- `KPICard` (utilisé dans Treasury) — partagé.
- ⚠️ `KPICardE` inline AnalyticsDashboard — duplication.
- ⚠️ `StatCard` inline EventAnalytics — duplication.

### Issues
- 🔴 Pas de librairie de chart : juste des bar charts maison sans axe Y, sans tooltip, sans animation, max 7-12 barres. Pour un produit "événementiel data-driven", c'est limite.
- ⚠️ 3 composants KPI à consolider en 1.
- ⚠️ Pas de comparaison période-à-période ("+12% vs mois dernier") — la trend% existe mais sans contexte visuel.

### Recommandation
Installer `react-native-gifted-charts` ou `victory-native` (les deux supportent dark mode + tooltip + animation native).

---

## 14. Admin Tools

### `AdminDashboardScreen.tsx`
Hub admin : KPIs plateforme, raccourcis vers User Mgmt, Treasury, Audit, Subscriptions, Settings.

### `UserManagementScreen.tsx`
Liste users, filtres role, recherche, **export** (✅ ajouté), édition via `UserEditScreen`.

### `UserEditScreen.tsx`
Modifier role, statut, vérification d'un user (admin only).

### `SubscriptionManagementScreen.tsx`
Plans + abonnements actifs, suspension, prolongation.

### `AuditLogsScreen.tsx`
Logs avec filtres severity (info/warning/error/critical) + stats summary + **export** (✅ ajouté).

### `PlatformSettingsScreen.tsx`
Site settings : commission rates, fee config, payout approval mode, maintenance flags.

### Issues
- ⚠️ Pas de bulk actions (suspendre 10 users d'un coup).
- ⚠️ Pas de filtre date sur les audit logs (juste severity).
- ⚠️ Edit role d'un user ne demande pas de "raison" pour l'audit log custom.

---

## 15. Treasury (Admin)

### `TreasuryOverviewScreen.tsx`
Solde net plateforme, KPIs (commissions, paie, dépenses, dividendes), 5 dernières transactions, menu vers sub-écrans.

### `TreasuryStaffScreen.tsx`
Personnel + paie (StaffMember, StaffPayment).

### `TreasuryExpensesScreen.tsx`
Dépenses opérationnelles + récurrentes.

### `TreasuryShareholdersScreen.tsx`
Actionnaires + distributions de dividendes.

### `TreasuryReportsScreen.tsx`
Compte de résultat (P&L) + ratios financiers (marge, expense ratio, payroll/revenue).

### Issues
- ⚠️ Pas de bouton export sur les écrans Treasury (le backend pourrait l'exposer mais ne le fait pas non plus).
- ⚠️ Pas de graphe d'évolution sur les revenus/dépenses dans le temps.
- ✅ KPI cards partagées (`KPICard` réel, pas inline).

---

## 16. Moderation

### `ModerationScreen.tsx`
File des events soumis + flags signalés + validations.
Actions : valider, rejeter avec raison, demander modifications.

### Issues
- ⚠️ Pas de raccourci pour "voir l'event en preview" depuis la modération (forcément ouvrir EventDetails).
- ⚠️ Pas de filtres par catégorie d'event.

---

## 17. Status & Maintenance

### `StatusScreen.tsx`
Status système plateforme + incidents en cours + historique.

### `IncidentDetailsScreen.tsx`
Détails d'un incident : timeline, services impactés, updates.

### `MaintenanceScreen.tsx`
Plein écran modal affiché si le backend signale `maintenance_mode=true`.

### Issues
- ⚠️ Pas de notification push pour les incidents critiques (à confirmer).
- ✅ Bonne intégration via `StatusContext`.

---

## 18. Cross-cutting concerns

### Theme (light/dark/system)
- `ThemeContext.tsx` avec persistance AsyncStorage.
- `useTheme()` retourne `{ colors, isDark, mode, setMode, toggleTheme, shadows, gradients }`.
- 109 fichiers utilisent `useTheme()`. Couverture quasi-totale.
- `DarkColors.white` reste `#FFFFFF` — règle stricte : ne jamais utiliser `colors.white` pour les fonds, utiliser `colors.card` ou `colors.background`.

### Cache & offline
- **`CacheService.ts`** : 2 niveaux Map mémoire + AsyncStorage.
- **`useQuery.ts`** : SWR pattern (stale immédiat + revalidate background).
- TTLs : notifs=1min, conversations=30s, following=2min, dashboard=2min.
- Clés incluent `userId` pour isolation cross-comptes.
- `CacheService.clearMemory()` au logout (AsyncStorage conservé pour relogin).

### Network resilience
- `useNetworkSpeed.ts` : détection 2G/3G/4G/wifi via NetInfo.
- `ConnectionContext.tsx` : online/offline status global.
- `useOfflineQueue.ts` : queue messages avec callback `onMessageFailed`.
- `useCheckinQueue.ts` : queue check-ins avec retry au retour réseau.
- Axios timeout : 30s, 3 tentatives.

### i18n
- `i18next` + `react-i18next` installés et configurés dans `src/i18n/index.ts` avec dictionnaires FR (`locales/fr.json`) + EN (`locales/en.json`), détection langue OS via `expo-localization`.
- 🔴 **0 fichier source n'appelle `useTranslation()`** — l'init s'exécute mais aucune string n'est traduite. Toute l'UI reste en français hardcodé. État : "branche en place mais débranchée".

### Error handling
- `ErrorBoundary.tsx` global wrappe l'app.
- `AlertContext` (`showAlert`, `showSuccess`, `showError`) — pattern consistant.
- `react-hot-toast` mobile équivalent intégré.

### Accessibilité
- `useReducedMotion()` désactive les animations si l'OS le demande.
- `useTabletLayout()` pour 4 écrans (Discover, MyTickets, Following, MyEvents).
- `accessibilityLabel` + `accessibilityRole` sur les composants interactifs (Badge, Input, EventCard, FollowEventButton, etc.).
- ⚠️ Pas tous les écrans ne respectent les standards (manque sur certains TouchableOpacity sans label).

### Performance
- `freezeOnBlur: true` sur les stacks → écrans en arrière-plan ne re-render pas.
- `lazy: true` sur les tabs.
- `react-native-reanimated` 4 + worklets pour les animations.
- LQIP progressive images (placeholder data-URI 20px).
- `expo-image` avec `cachePolicy="memory-disk"` + transition 300ms.
- Skeleton loaders sur la majorité des écrans.

### Sécurité
- JWT via `expo-secure-store` (chiffrement OS-level).
- HTTPS forcé en prod (`API_BASE_URL`).
- Idempotency keys pour les paiements (`getOrCreateIdempotencyKey`).
- `RoleGuard` côté mobile : double-couche de sécurité (en plus du backend) qui empêche un user non-admin de voir les écrans admin même s'il devine la route. Vérifie `user.role` + `is_staff` + `is_superuser`.
- ⚠️ Pas de **certificate pinning** (attaque MITM possible sur réseaux non-trust).
- ⚠️ Pas de **biométrique** pour ré-auth (FaceID / TouchID / Empreinte) — `expo-local-authentication` non installé.

---

## 19. Tests

### Maestro E2E (`.maestro/`)
**43 scénarios** couvrant : auth, discover, event details, ticket purchase, profile, dashboard, messages, organizer flow (create, analytics, registrations, wallet, scanner, discounts, edit, reports, volunteers), admin (dashboard, users, treasury, moderation, audit, subscriptions), gamification, offline tickets.

**Verdict** : couverture E2E excellente, scripts groupés par persona dans `package.json`.

### Jest unit tests (`src/hooks/__tests__/`)
- `formatters` (62 tests)
- `CacheService`
- `useCurrencyConversion` (regression "≈ 0 EUR" historique)
- 81 tests mobiles selon mémoire.

### Issues
- ⚠️ Pas de tests sur les écrans (snapshot ou interaction) — uniquement hooks/utils.
- ⚠️ Pas de coverage report dans le repo.
- ⚠️ Aucun test sur `useExport`, `useOfflineQueue`, `useMessagingWebSocket` (hooks complexes).

---

## 20. Code Quality

### Issues bloquantes
*(Aucune — typecheck passe, pas de bug bloquant identifié à date d'audit.)*

### Issues moyennes
1. ⚠️ **Code mort** : `HomeScreen.tsx` (530 l.) + `ExploreScreen.tsx` (1552 l.) + `AuthNavigator.tsx` non référencés (vérifié : 0 import externe). À supprimer (~2080 LOC).
2. ⚠️ **Composants KPI dupliqués** : `KPICard` shared / `KPICardE` inline / `StatCard` inline → consolider.
3. ⚠️ **Écrans god-file** : 6 écrans > 1900 lignes (DiscoverScreen 2323, EventDetailsScreen 2122, MyTicketsScreen 1912, ConversationScreen 2127, WalletScreen 2533, PaymentScreen 2346). Refactoring recommandé.
4. ⚠️ **i18next configuré mais 0 utilisation** : `useTranslation()` jamais appelé → infrastructure en place pour rien.
5. ⚠️ **Debounce inconsistant** : présent dans 3 search bars mais pas centralisé en `useDebounce`, absent sur les filtres Discover et l'autocomplete.
6. ⚠️ **Pas de chart library** → graphes maison limités à 7-12 barres.

### Issues mineures
7. **Accents français** : pattern incohérent (corrigé pour les exports, mais des `Succes`, `enregistre`, `validee` traînent ailleurs). Recommandation : eslint rule custom ou pass automatisé.
8. **Pas de certificate pinning** ni biométrique.
9. **`fetchUpload` redéfini à plusieurs endroits** : centraliser dans `api/instance.ts`.

---

## 21. Recommandations prioritisées

### P0 — Bloquant
*(Aucun item bloquant identifié à la date d'audit. Typecheck propre.)*

### P1 — Haute (semaine 1)
1. Supprimer le code mort (`HomeScreen.tsx`, `ExploreScreen.tsx`, `AuthNavigator.tsx`) → −2080 LOC.
2. Installer `react-native-gifted-charts` (ou `victory-native`) et migrer les 2 bar charts d'`AnalyticsDashboardScreen`.
3. Consolider les 3 composants KPI en un seul `<KPICard>` paramétré dans `components/charts/`.
4. Créer un hook `useDebounce(value, delay)` partagé et l'appliquer sur DiscoverScreen filters + autocomplete.
5. Pass complet sur les accents français (regex `\b(succes|approuvee|enregistre|reglages|validee|annule|telecharge|preferee|achete|envoye|recu|gere)\b` à corriger).

### P2 — Moyenne (mois 1)
6. Splitter les god-screens (`PaymentScreen`, `WalletScreen`, `DiscoverScreen`) en sous-composants.
7. **Brancher `i18next` réellement** : extraire les strings (>500 occurrences attendues), wrap avec `useTranslation()`. Le dictionnaire est déjà là, c'est juste à câbler.
8. Ajouter Tab "Messages" dans le dock + badge unread.
9. Tests Jest sur `useExport`, `useOfflineQueue`, `useMessagingWebSocket`.
10. Bouton export sur les écrans Treasury + amélioration audit logs (filtre date, raison).

### P3 — Basse (qualité de vie)
11. Auth biométrique (FaceID/TouchID) pour ré-ouverture rapide via `expo-local-authentication`.
12. Certificate pinning HTTPS (lib `react-native-cert-pinner` ou natif).
13. Indicateur de fraîcheur (`Synchronisé il y a 2h`) sur les écrans offline.
14. Comparaison période-à-période sur Analytics ("+12% vs mois dernier").
15. Mode "preview event comme un user" depuis EventCreate.
16. Bulk actions admin (suspendre N users).

---

## 22. Mapping endpoints backend → mobile

### ✅ Couvert intégralement
- Auth (login/register/google/apple/phone/reset)
- Events (CRUD + actions + iCal + recurrence + form-fields + nearby/map)
- Registrations (CRUD + bulk approve/reject + check-in + transfers)
- Tickets (types, purchases, transfers, discounts)
- Payments + Refunds + Invoices + Subscriptions
- Wallet + Payouts + Commissions
- Sessions (tracks, speakers, registrations, resources)
- Messages + Conversations + WebSocket + Reports
- Notifications + Templates
- Feedbacks + Flags + Validations
- Analytics (dashboard, event, revenue, registrations, predict_attendance)
- Audit (logs + statistics)
- Treasury (overview, staff, expenses, shareholders, dividends, reports)
- Social (follows, blocks, invitations, referrals, gamification)
- Content (newsletters, sponsors, live, CFP, virtual rooms, recordings)
- Misc (waitlist, seating, floor-plans, volunteers, currencies, comparison, AI assist, UTM)
- Status (incidents, maintenance)

### Exports backend NON exposés sur mobile (avant correctifs)
- ❌ ~~`/payments/export/`~~ — référencé dans `paymentsAPI` (commentaire), pas de bouton dans l'UI.
- ✅ `/wallet/transactions/export/` → ajouté dans WalletScreen.
- ✅ `/audit/logs/export/` → ajouté dans AuditLogsScreen.
- ❌ `/ticket-purchases/export/` — référencé dans `registrationsAPI` (commentaire), pas exposé.
- ✅ `/users/export/` → ajouté dans UserManagementScreen.
- ✅ `/analytics/export/` → ajouté dans AnalyticsDashboardScreen.

### Endpoints backend non couverts ou douteux
- `/conversations/{id}/export/` → couvert via `conversationExport.ts` utility.
- Aucun autre endpoint critique n'est manquant.

---

## 23. Conclusion

L'app est **production-ready** pour la couverture fonctionnelle. Les points faibles sont principalement :
- Du code mort à nettoyer (~2K LOC).
- Une dette de design system (3 KPI cards, pas de chart lib).
- Une i18n configurée mais débranchée (toutes les `<Text>` sont en français hardcodé).
- Une accessibilité partielle.
- Pas de cert pinning ni biométrique (Sentry est en place et opérationnel).

Aucun de ces points n'empêche de shipper. Le typecheck est propre, le `RoleGuard` est en place sur les écrans admin, le crash reporting fonctionne. La priorité immédiate est le **nettoyage du code mort** et la **consolidation des KPI cards**.

Le reste se traite en sprint qualité dédié de 2-3 semaines.

---

**Auteur** : audit automatisé via Claude Code
**Référence des correctifs déjà appliqués** : voir cette session — exports manquants ajoutés, accents corrigés, `useExport` amélioré, bar charts adaptés au timeRange, `ChartWrapper` mort supprimé.
