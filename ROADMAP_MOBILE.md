# EventEz Mobile - Feuille de Route de Développement

> Plan détaillé pour le développement de l'application mobile EventEz
> Version: 1.0 | Date: Février 2026

---

## Vue d'Ensemble

### Objectif
Développer une application mobile React Native/Expo complète pour EventEz, offrant une expérience utilisateur fluide pour la découverte d'événements, l'achat de billets, et la gestion pour les organisateurs.

### Stack Technique
- **Framework**: Expo SDK 52+ / React Native 0.76+
- **Language**: TypeScript 5
- **Navigation**: React Navigation 7
- **State Management**: Context API + AsyncStorage
- **API Client**: Axios avec intercepteurs JWT
- **UI**: Composants personnalisés style Eventbrite
- **Maps**: react-native-maps + expo-location
- **Notifications**: expo-notifications
- **Scanner**: expo-camera (QR Code)

---

## PHASE 1 : FONDATIONS (Semaines 1-2)
### Priorité: CRITIQUE

#### 1.1 Architecture de Base ✅ (Fait)
- [x] Structure du projet Expo
- [x] Configuration TypeScript
- [x] Thème et constantes de design
- [x] Client API avec gestion JWT
- [x] Navigation (Tabs + Stacks)
- [x] Contexte d'authentification

#### 1.2 Authentification (À compléter)
- [x] Écran de connexion
- [x] Écran d'inscription
- [ ] Mot de passe oublié
- [ ] Réinitialisation du mot de passe
- [ ] Gestion du refresh token automatique
- [ ] Stockage sécurisé (expo-secure-store)
- [ ] Déconnexion propre

#### 1.3 Navigation de Base ✅ (Fait)
- [x] Tab Navigator (Accueil, Recherche, Billets, Favoris, Profil)
- [x] Stack Navigator pour les écrans modaux
- [x] Gestion des zones de sécurité (SafeAreaView)

---

## PHASE 2 : DÉCOUVERTE D'ÉVÉNEMENTS (Semaines 3-4)
### Priorité: HAUTE

#### 2.1 Page d'Accueil ✅ (Fait)
- [x] Header avec logo et notifications
- [x] Barre de recherche (navigation vers Explore)
- [x] Ligne de localisation
- [x] Carrousel de catégories
- [x] Section événements populaires
- [x] Section événements proches
- [x] Section "Ce week-end"
- [x] Section événements gratuits
- [ ] Pull-to-refresh amélioré
- [ ] Skeleton loaders

#### 2.2 Exploration & Recherche ✅ (Fait)
- [x] Barre de recherche
- [x] Filtres par catégorie (chips)
- [x] Toggle vue liste/carte
- [x] Liste des événements avec scroll
- [x] Carte interactive avec marqueurs
- [ ] Filtres avancés (modal)
  - [ ] Plage de dates
  - [ ] Plage de prix
  - [ ] Type (billetterie/inscription)
  - [ ] Distance
- [ ] Tri (date, popularité, prix)
- [ ] Pagination infinie

#### 2.3 Détails d'un Événement ✅ (Partiellement fait)
- [x] Header avec image bannière
- [x] Informations de base (titre, date, lieu)
- [x] Description
- [x] Carte de localisation
- [x] Profil de l'organisateur
- [x] Boutons d'action (S'inscrire, Partager)
- [ ] Galerie d'images (swiper)
- [ ] Section avis/notes
- [ ] Événements similaires
- [ ] Bouton "Suivre"
- [ ] Partage natif (Share API)

#### 2.4 Composants Événements ✅ (Fait)
- [x] EventCard (4 variantes: default, horizontal, compact, featured)
- [x] Style Eventbrite (clean, blanc, dates en évidence)
- [ ] Composant Catégorie
- [ ] Composant Organisateur

---

## PHASE 3 : INSCRIPTION & PAIEMENT (Semaines 5-7)
### Priorité: HAUTE

#### 3.1 Achat de Billets ✅ (Partiellement fait)
- [x] Écran de sélection des billets
- [x] Sélecteur de quantité
- [x] Récapitulatif de commande
- [x] Calcul du total
- [ ] Application de code promo
- [ ] Validation des stocks

#### 3.2 Formulaire d'Inscription (Type Inscription)
- [ ] Rendu dynamique des champs
- [ ] Types de champs supportés:
  - [ ] Texte
  - [ ] Email
  - [ ] Téléphone
  - [ ] Select/Dropdown
  - [ ] Checkbox
  - [ ] Date picker
  - [ ] Textarea
- [ ] Validation des champs
- [ ] Gestion des erreurs

#### 3.3 Paiement ✅ (Fait)
- [x] Sélection de la méthode de paiement
- [x] MTN Mobile Money
- [x] Orange Money
- [ ] Carte bancaire
- [ ] Virement bancaire
- [x] Écran de traitement (polling)
- [x] Écran de succès
- [x] Écran d'échec
- [ ] Retry automatique

#### 3.4 Confirmation
- [ ] Page de confirmation améliorée
- [ ] Affichage du QR Code
- [ ] Instructions claires
- [ ] Bouton "Voir mes billets"
- [ ] Animation de succès (confetti)

---

## PHASE 4 : MES BILLETS (Semaines 8-9)
### Priorité: HAUTE

#### 4.1 Liste des Billets
- [ ] Écran "Mes Billets" complet
- [ ] Onglets : À venir, Passés, Annulés
- [ ] Carte de billet visuelle
- [ ] Pull-to-refresh
- [ ] État vide (empty state)

#### 4.2 Détail du Billet ✅ (Fait)
- [x] Écran QR Code
- [x] Informations de l'événement
- [x] QR Code grand format
- [x] Détails du billet (type, quantité, statut)
- [x] Référence
- [x] Instructions
- [ ] Télécharger PDF
- [ ] Partager le billet
- [ ] Ajouter au calendrier

#### 4.3 Actions sur Billets
- [ ] Annuler un billet
- [ ] Demander un remboursement
- [ ] Transférer un billet

---

## PHASE 5 : PROFIL & PARAMÈTRES (Semaine 10)
### Priorité: MOYENNE

#### 5.1 Profil Utilisateur
- [ ] Écran de profil complet
- [ ] Photo de profil (upload)
- [ ] Informations personnelles
- [ ] Formulaire d'édition
- [ ] Statistiques utilisateur

#### 5.2 Paramètres
- [ ] Notifications (push, email, SMS)
- [ ] Langue
- [ ] Thème (clair/sombre)
- [ ] Changer le mot de passe
- [ ] Supprimer le compte
- [ ] Déconnexion

#### 5.3 Devenir Organisateur
- [ ] Formulaire d'upgrade
- [ ] Choix individuel/organisation
- [ ] Informations entreprise
- [ ] Validation

---

## PHASE 6 : MESSAGERIE (Semaines 11-12)
### Priorité: MOYENNE

#### 6.1 Liste des Conversations
- [ ] Écran des conversations
- [ ] Aperçu du dernier message
- [ ] Badge non lu
- [ ] Recherche
- [ ] Archiver/Supprimer

#### 6.2 Chat en Temps Réel
- [ ] Écran de conversation
- [ ] Envoi de messages
- [ ] WebSocket pour temps réel
- [ ] Indicateur "en train d'écrire"
- [ ] Accusés de lecture
- [ ] Scroll automatique

#### 6.3 Fonctionnalités Avancées
- [ ] Pièces jointes (images)
- [ ] Messages vocaux
- [ ] Réactions (emojis)
- [ ] Répondre à un message
- [ ] Bloquer un utilisateur

---

## PHASE 7 : NOTIFICATIONS (Semaine 13)
### Priorité: MOYENNE

#### 7.1 Centre de Notifications ✅ (Partiellement fait)
- [x] Écran des notifications (basique)
- [ ] Liste complète des notifications
- [ ] Types visuels (info, succès, warning, erreur)
- [ ] Marquer comme lu
- [ ] Marquer tout comme lu
- [ ] Supprimer

#### 7.2 Notifications Push
- [ ] Configuration expo-notifications
- [ ] Enregistrement du token push
- [ ] Réception des notifications
- [ ] Actions depuis la notification
- [ ] Badge sur l'icône de l'app

---

## PHASE 8 : SUIVI & FAVORIS (Semaine 14)
### Priorité: MOYENNE

#### 8.1 Suivre un Événement
- [ ] Bouton Suivre sur EventDetails
- [ ] Animation de feedback
- [ ] Préférences de notification

#### 8.2 Liste des Événements Suivis
- [ ] Écran "Mes Favoris" (Dashboard actuel)
- [ ] Liste des événements suivis
- [ ] Actions rapides
- [ ] Gérer les notifications

#### 8.3 Liste d'Attente
- [ ] Rejoindre une waitlist
- [ ] Voir ma position
- [ ] Notifications de disponibilité
- [ ] Quitter la waitlist

---

## PHASE 9 : ORGANISATEUR - TABLEAU DE BORD (Semaines 15-16)
### Priorité: MOYENNE

#### 9.1 Dashboard Organisateur ✅ (Partiellement fait)
- [x] Écran Dashboard basique
- [x] Solde disponible (wallet)
- [x] Stats rapides (billets, événements)
- [x] Accès rapide
- [ ] Graphiques des revenus
- [ ] Activités récentes
- [ ] Alertes et notifications

#### 9.2 Liste de Mes Événements
- [ ] Écran "Mes Événements"
- [ ] Filtres par statut
- [ ] Statistiques par événement
- [ ] Actions rapides
- [ ] Pagination

#### 9.3 Détails Événement (Organisateur)
- [ ] Statistiques détaillées
- [ ] Liste des inscrits
- [ ] Revenus générés
- [ ] Actions (modifier, annuler, dupliquer)

---

## PHASE 10 : ORGANISATEUR - CRÉATION D'ÉVÉNEMENT (Semaines 17-19)
### Priorité: BASSE (pour MVP mobile)

#### 10.1 Wizard de Création
- [ ] Étape 1 : Informations générales
  - [ ] Titre
  - [ ] Description (éditeur riche simplifié)
  - [ ] Catégorie (picker)
  - [ ] Tags
- [ ] Étape 2 : Lieu et horaires
  - [ ] Type (présentiel, en ligne, hybride)
  - [ ] Adresse (avec autocomplete)
  - [ ] Date de début/fin
  - [ ] Timezone
- [ ] Étape 3 : Type d'événement
  - [ ] Billetterie ou Inscription
- [ ] Étape 4 : Configuration
  - [ ] Si billetterie : types de billets
  - [ ] Si inscription : champs du formulaire
- [ ] Étape 5 : Médias
  - [ ] Bannière (image picker)
  - [ ] Galerie
- [ ] Étape 6 : Révision
  - [ ] Prévisualisation
  - [ ] Publier/Brouillon

#### 10.2 Modification d'Événement
- [ ] Même wizard pré-rempli
- [ ] Gestion des modifications en cours

---

## PHASE 11 : ORGANISATEUR - INSCRIPTIONS (Semaines 20-21)
### Priorité: BASSE (pour MVP mobile)

#### 11.1 Liste des Inscriptions
- [ ] Toutes les inscriptions
- [ ] Filtres (événement, statut)
- [ ] Recherche
- [ ] Actions en masse

#### 11.2 Détail d'une Inscription
- [ ] Informations participant
- [ ] Réponses formulaire
- [ ] Statut paiement
- [ ] QR Code

#### 11.3 Check-in
- [ ] Scanner QR Code (expo-camera)
- [ ] Vérification
- [ ] Confirmation visuelle
- [ ] Historique des scans

#### 11.4 Approbation
- [ ] Liste des en attente
- [ ] Approuver/Rejeter
- [ ] Motif de rejet

---

## PHASE 12 : ORGANISATEUR - WALLET (Semaine 22)
### Priorité: BASSE

#### 12.1 Portefeuille
- [ ] Écran Wallet complet
- [ ] Solde disponible
- [ ] Gains en attente
- [ ] Historique des transactions
- [ ] Graphique des revenus

#### 12.2 Retraits
- [ ] Demander un retrait
- [ ] Choisir méthode (Bank, MoMo, OM)
- [ ] Historique des retraits
- [ ] Coordonnées bancaires

---

## PHASE 13 : POLISH & OPTIMISATION (Semaines 23-24)
### Priorité: HAUTE

#### 13.1 Performance
- [ ] Optimisation des images
- [ ] Lazy loading
- [ ] Mise en cache (AsyncStorage)
- [ ] Réduction des re-renders
- [ ] Virtualisation des listes (FlashList)

#### 13.2 UX/UI
- [ ] Animations fluides (Reanimated)
- [ ] Transitions entre écrans
- [ ] Haptic feedback
- [ ] Skeleton loaders partout
- [ ] Empty states attrayants
- [ ] Error boundaries

#### 13.3 Accessibilité
- [ ] Labels accessibles
- [ ] Contraste suffisant
- [ ] Taille de texte adaptative
- [ ] Support lecteur d'écran

#### 13.4 Tests
- [ ] Tests unitaires (Jest)
- [ ] Tests de composants
- [ ] Tests E2E (Detox)
- [ ] Tests manuels sur appareils

---

## PHASE 14 : DÉPLOIEMENT (Semaine 25)
### Priorité: CRITIQUE

#### 14.1 Préparation
- [ ] Configuration EAS Build
- [ ] Icônes et splash screen
- [ ] Versioning
- [ ] Configuration des stores

#### 14.2 Android
- [ ] Build de production
- [ ] Tests sur appareils variés
- [ ] Soumission Google Play
- [ ] Réponse aux retours de review

#### 14.3 iOS
- [ ] Build de production
- [ ] Tests sur iPhone/iPad
- [ ] Soumission App Store
- [ ] Réponse aux retours de review

---

## Récapitulatif des Priorités

### MVP (Minimum Viable Product) - Semaines 1-14
Fonctionnalités essentielles pour un lancement :

1. ✅ Authentification (connexion, inscription)
2. ✅ Découverte d'événements (accueil, recherche, carte)
3. ✅ Détails d'événement
4. ✅ Achat de billets + Paiement mobile
5. ⏳ Mes billets avec QR Code
6. ⏳ Profil utilisateur
7. ⏳ Notifications push
8. ⏳ Favoris/Suivi

### Version 1.1 - Semaines 15-22
Fonctionnalités organisateur :

1. Dashboard organisateur
2. Liste de mes événements
3. Gestion des inscriptions
4. Check-in (scanner QR)
5. Wallet et retraits

### Version 1.2 - Semaines 23+
Fonctionnalités avancées :

1. Création d'événement mobile
2. Messagerie temps réel
3. Agenda/Sessions
4. Fonctionnalités sociales

---

## État Actuel du Développement

### Fait ✅
- Architecture de base
- Authentification (Login, Register)
- Navigation (Tabs + Stacks)
- HomeScreen (Eventbrite style)
- ExploreScreen (liste + carte)
- EventDetailsScreen
- TicketPurchaseScreen
- PaymentScreen + Success/Failed
- QRCodeScreen
- DashboardScreen (basique)
- MainTabNavigator avec SafeArea
- Composants UI (EventCard, GradientButton, AnimatedPressable)
- Client API complet

### En Cours 🔄
- Corrections de bugs API
- Amélioration du style Eventbrite
- Optimisation de la navigation

### À Faire Prochainement ⏳
1. Écran "Mes Billets" complet
2. Profil utilisateur éditable
3. Mot de passe oublié
4. Notifications push
5. Filtres avancés
6. Galerie d'images événement

---

## Ressources Nécessaires

### Équipe
- 1 Développeur React Native senior
- 1 Designer UI/UX (temps partiel)
- 1 QA Tester (temps partiel)

### Outils
- Expo Application Services (EAS)
- TestFlight (iOS)
- Google Play Console (Android)
- Sentry (monitoring erreurs)
- Analytics (Firebase ou Mixpanel)

### Infrastructure
- Backend API (déjà en place)
- Serveur de notifications push
- CDN pour les images

---

## Métriques de Succès

### Performance
- Temps de chargement initial < 3s
- Temps de réponse API < 500ms
- Crash rate < 1%

### Engagement
- Rétention J7 > 40%
- Sessions par utilisateur > 3/semaine
- Taux de conversion visiteur → inscription > 10%

### Business
- Téléchargements mois 1 : 1000+
- Note store > 4.0
- Taux de complétion d'achat > 60%

---

*Document de planification - EventEz Mobile*
*Dernière mise à jour: Février 2026*
