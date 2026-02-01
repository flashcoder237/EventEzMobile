# EventEz - Liste Complète des Fonctionnalités

> Document de référence basé sur l'analyse du frontend web (eventez-frontend)
> Date: Février 2026

---

## 1. AUTHENTIFICATION & COMPTE

### 1.1 Authentification
- [ ] Connexion email/mot de passe
- [ ] Inscription utilisateur standard
- [ ] Inscription organisateur (individuel/organisation)
- [ ] Mot de passe oublié
- [ ] Réinitialisation du mot de passe
- [ ] Connexion sociale (Google, Facebook)
- [ ] Déconnexion
- [ ] Gestion des tokens JWT (refresh automatique)

### 1.2 Profil Utilisateur
- [ ] Modifier photo de profil
- [ ] Modifier informations personnelles (nom, prénom, téléphone)
- [ ] Modifier adresse
- [ ] Changer le mot de passe
- [ ] Supprimer le compte
- [ ] Devenir organisateur (upgrade de compte)

### 1.3 Paramètres
- [ ] Préférences de notification (email, SMS, push)
- [ ] Langue et fuseau horaire
- [ ] Thème (clair/sombre)
- [ ] Paramètres de confidentialité

---

## 2. DÉCOUVERTE D'ÉVÉNEMENTS

### 2.1 Page d'Accueil
- [ ] Barre de recherche
- [ ] Carrousel de catégories
- [ ] Événements populaires (par inscriptions)
- [ ] Événements à la une
- [ ] Événements à proximité (géolocalisation)
- [ ] Section "Comment ça marche"
- [ ] Statistiques animées
- [ ] Newsletter

### 2.2 Liste des Événements
- [ ] Recherche textuelle
- [ ] Filtrage par catégorie
- [ ] Filtrage par type (billetterie/inscription)
- [ ] Filtrage par ville/localisation
- [ ] Filtrage par date
- [ ] Filtrage par prix
- [ ] Tri (date, popularité, etc.)
- [ ] Vue grille / vue liste
- [ ] Pagination infinie (scroll)

### 2.3 Carte des Événements
- [ ] Affichage carte interactive
- [ ] Marqueurs d'événements
- [ ] Géolocalisation utilisateur
- [ ] Centrer sur ma position
- [ ] Voir détails événement depuis la carte

### 2.4 Détails d'un Événement
- [ ] Bannière et galerie d'images
- [ ] Titre, description, dates
- [ ] Lieu et carte
- [ ] Profil organisateur
- [ ] Types de billets ou formulaire
- [ ] Avis et notes
- [ ] Événements similaires
- [ ] Partage sur réseaux sociaux
- [ ] Bouton S'inscrire / Acheter

---

## 3. INSCRIPTION & BILLETTERIE

### 3.1 Achat de Billets (Type Billetterie)
- [ ] Affichage des types de billets
- [ ] Sélection des quantités
- [ ] Application de code promo
- [ ] Récapitulatif de commande
- [ ] Calcul du total

### 3.2 Inscription (Type Inscription)
- [ ] Formulaire dynamique personnalisé
- [ ] Types de champs : texte, email, téléphone, select, checkbox, date
- [ ] Validation des champs
- [ ] Champs obligatoires/optionnels
- [ ] Acceptation des conditions

### 3.3 Paiement
- [ ] Sélection méthode de paiement
- [ ] MTN Mobile Money
- [ ] Orange Money
- [ ] Virement bancaire
- [ ] Carte bancaire
- [ ] Écran de traitement
- [ ] Page de succès
- [ ] Page d'échec
- [ ] Réessayer le paiement

### 3.4 Confirmation
- [ ] Message de confirmation
- [ ] Code de référence
- [ ] QR Code du billet
- [ ] Instructions pour l'événement

---

## 4. MES BILLETS

### 4.1 Liste des Billets
- [ ] Tous mes billets achetés
- [ ] Filtrer par statut (à venir, passé, annulé)
- [ ] Recherche
- [ ] Vue carte du billet

### 4.2 Détails du Billet
- [ ] Informations de l'événement
- [ ] QR Code grand format
- [ ] Type de billet
- [ ] Quantité
- [ ] Statut (confirmé, en attente, utilisé)
- [ ] Référence
- [ ] Partager le billet

### 4.3 Actions sur Billet
- [ ] Télécharger le billet (PDF)
- [ ] Annuler le billet
- [ ] Transférer le billet
- [ ] Demander remboursement

---

## 5. AGENDA & SESSIONS

### 5.1 Programme d'un Événement
- [ ] Liste des tracks/pistes
- [ ] Liste des sessions par track
- [ ] Détails de chaque session
- [ ] Horaires et durées
- [ ] Lieu de la session

### 5.2 Intervenants
- [ ] Liste des speakers
- [ ] Profil du speaker (bio, photo, liens)
- [ ] Sessions du speaker

### 5.3 Inscription aux Sessions
- [ ] S'inscrire à une session
- [ ] Se désinscrire
- [ ] Voir capacité restante
- [ ] Liste d'attente si complet

### 5.4 Mes Sessions
- [ ] Sessions auxquelles je suis inscrit
- [ ] Rappels de sessions
- [ ] Confirmer ma présence

---

## 6. SUIVI & FAVORIS

### 6.1 Suivre un Événement
- [ ] Bouton suivre/ne plus suivre
- [ ] Préférences de notification par événement
- [ ] Liste des événements suivis

### 6.2 Liste d'Attente (Waitlist)
- [ ] Rejoindre la liste d'attente
- [ ] Quitter la liste d'attente
- [ ] Position dans la file
- [ ] Notification quand place disponible

---

## 7. MESSAGERIE

### 7.1 Conversations
- [ ] Liste des conversations
- [ ] Créer une nouvelle conversation
- [ ] Archiver une conversation
- [ ] Épingler une conversation
- [ ] Supprimer une conversation

### 7.2 Messages
- [ ] Envoi de messages texte
- [ ] Envoi de pièces jointes (images, fichiers)
- [ ] Envoi de messages vocaux
- [ ] Répondre à un message
- [ ] Transférer un message
- [ ] Réactions (emojis)
- [ ] Indicateur "en train d'écrire"
- [ ] Accusés de lecture
- [ ] Supprimer un message

### 7.3 Gestion des Utilisateurs
- [ ] Bloquer un utilisateur
- [ ] Débloquer un utilisateur
- [ ] Liste des utilisateurs bloqués

---

## 8. NOTIFICATIONS

### 8.1 Centre de Notifications
- [ ] Liste des notifications
- [ ] Types : info, succès, avertissement, erreur
- [ ] Marquer comme lu
- [ ] Marquer tout comme lu
- [ ] Supprimer une notification
- [ ] Supprimer plusieurs notifications

### 8.2 Préférences
- [ ] Notifications push
- [ ] Notifications email
- [ ] Notifications SMS
- [ ] Par type d'événement

---

## 9. ORGANISATEUR - GESTION D'ÉVÉNEMENTS

### 9.1 Liste de Mes Événements
- [ ] Tableau de tous mes événements
- [ ] Statut : brouillon, soumis, validé, publié, annulé
- [ ] Statistiques rapides (inscriptions, revenus)
- [ ] Actions rapides (modifier, dupliquer, supprimer)
- [ ] Recherche et filtres
- [ ] Pagination

### 9.2 Création d'Événement
- [ ] Étape 1 : Informations générales (titre, description, catégorie, tags)
- [ ] Étape 2 : Lieu et horaires (adresse, dates, timezone, en ligne/présentiel)
- [ ] Étape 3 : Type d'événement (billetterie ou inscription)
- [ ] Étape 4 : Configuration billets OU formulaire personnalisé
- [ ] Étape 5 : Médias (bannière, galerie)
- [ ] Étape 6 : Révision et publication
- [ ] Sauvegarde automatique en brouillon
- [ ] Indicateur de progression

### 9.3 Modification d'Événement
- [ ] Tous les champs éditables
- [ ] Historique des versions
- [ ] Prévisualisation

### 9.4 Actions sur Événement
- [ ] Publier (brouillon → soumis)
- [ ] Soumettre pour validation
- [ ] Dupliquer un événement
- [ ] Annuler un événement (avec raison)
- [ ] Supprimer un événement

### 9.5 Types de Billets
- [ ] Créer un type de billet
- [ ] Nom, description, prix
- [ ] Quantité disponible
- [ ] Dates de vente (début/fin)
- [ ] Modifier / Supprimer

### 9.6 Formulaire Personnalisé
- [ ] Ajouter des champs
- [ ] Types : texte, email, numéro, select, checkbox, textarea, date
- [ ] Champs obligatoires/optionnels
- [ ] Ordre des champs
- [ ] Supprimer un champ

---

## 10. ORGANISATEUR - INSCRIPTIONS

### 10.1 Liste des Inscriptions
- [ ] Toutes les inscriptions à mes événements
- [ ] Filtrer par événement
- [ ] Filtrer par statut
- [ ] Filtrer par date
- [ ] Recherche par nom/email
- [ ] Export CSV

### 10.2 Détails d'une Inscription
- [ ] Informations du participant
- [ ] Réponses au formulaire
- [ ] Billets achetés
- [ ] Statut de paiement
- [ ] QR Code

### 10.3 Approbation (si auto_approve = false)
- [ ] Liste des inscriptions en attente
- [ ] Approuver une inscription
- [ ] Rejeter une inscription (avec raison)
- [ ] Approbation en masse

### 10.4 Check-in
- [ ] Scanner QR Code
- [ ] Vérifier la validité du billet
- [ ] Marquer comme présent
- [ ] Historique des check-ins
- [ ] Statistiques de présence

### 10.5 Communication
- [ ] Envoyer email aux inscrits
- [ ] Renvoyer confirmation
- [ ] Générer QR codes en masse

---

## 11. ORGANISATEUR - PAIEMENTS & FINANCES

### 11.1 Historique des Paiements
- [ ] Liste de tous les paiements reçus
- [ ] Filtrer par événement
- [ ] Filtrer par méthode de paiement
- [ ] Filtrer par statut
- [ ] Détails de chaque paiement

### 11.2 Factures
- [ ] Liste des factures
- [ ] Télécharger PDF
- [ ] Détails facture

### 11.3 Remboursements
- [ ] Demandes de remboursement
- [ ] Traiter un remboursement
- [ ] Historique des remboursements

---

## 12. ORGANISATEUR - PORTEFEUILLE (WALLET)

### 12.1 Tableau de Bord Wallet
- [ ] Solde disponible
- [ ] Gains en attente
- [ ] Total des gains
- [ ] Graphique des revenus

### 12.2 Transactions
- [ ] Historique des transactions
- [ ] Entrées (ventes)
- [ ] Sorties (retraits)
- [ ] Commissions prélevées

### 12.3 Gains en Attente
- [ ] Liste des gains en attente
- [ ] Date de libération (48h après événement)

### 12.4 Demande de Retrait
- [ ] Montant à retirer
- [ ] Méthode : virement bancaire, MTN Money, Orange Money
- [ ] Historique des retraits
- [ ] Statut des demandes

### 12.5 Coordonnées Bancaires
- [ ] Ajouter/modifier compte bancaire (IBAN)
- [ ] Ajouter/modifier numéro Mobile Money

---

## 13. ORGANISATEUR - ANALYTICS

### 13.1 Tableau de Bord
- [ ] Résumé des événements
- [ ] Résumé des inscriptions
- [ ] Résumé des revenus
- [ ] Graphiques et tendances

### 13.2 Analytics par Événement
- [ ] Nombre de vues
- [ ] Nombre d'inscriptions
- [ ] Taux de remplissage
- [ ] Revenus générés
- [ ] Évolution dans le temps

### 13.3 Rapports
- [ ] Créer un rapport personnalisé
- [ ] Exporter en CSV
- [ ] Exporter en PDF
- [ ] Planifier des rapports automatiques

---

## 14. ORGANISATEUR - SESSIONS (Agenda)

### 14.1 Gestion des Tracks
- [ ] Créer une piste/track
- [ ] Modifier / Supprimer

### 14.2 Gestion des Speakers
- [ ] Ajouter un intervenant
- [ ] Nom, bio, photo, liens sociaux
- [ ] Modifier / Supprimer

### 14.3 Gestion des Sessions
- [ ] Créer une session
- [ ] Titre, description, durée
- [ ] Assigner à un track
- [ ] Assigner des speakers
- [ ] Capacité maximale
- [ ] Activer liste d'attente
- [ ] Modifier / Supprimer

---

## 15. MODÉRATION (Modérateurs)

### 15.1 File de Validation
- [ ] Liste des événements en attente de validation
- [ ] Voir détails de l'événement
- [ ] Approuver un événement
- [ ] Rejeter un événement (avec raison)
- [ ] Laisser un commentaire

### 15.2 Signalements
- [ ] Liste des contenus signalés
- [ ] Résoudre un signalement
- [ ] Actions : avertissement, suspension, suppression

### 15.3 Gestion des Catégories
- [ ] Créer une catégorie
- [ ] Modifier nom, image
- [ ] Activer/désactiver
- [ ] Supprimer

---

## 16. ADMINISTRATION (Admins)

### 16.1 Gestion des Utilisateurs
- [ ] Liste de tous les utilisateurs
- [ ] Recherche et filtres
- [ ] Créer un utilisateur
- [ ] Modifier un utilisateur
- [ ] Changer le rôle (user, organizer, moderator, admin)
- [ ] Suspendre / Réactiver un compte
- [ ] Supprimer un utilisateur

### 16.2 Vérification des Profils
- [ ] Profils en attente de vérification
- [ ] Documents soumis
- [ ] Approuver / Rejeter

### 16.3 Logs d'Audit
- [ ] Historique de toutes les actions système
- [ ] Filtrer par utilisateur
- [ ] Filtrer par type d'action
- [ ] Filtrer par date
- [ ] Tracking IP et user agent

---

## 17. PAGES STATIQUES

### 17.1 À Propos
- [ ] Mission et vision
- [ ] Équipe
- [ ] Historique
- [ ] Valeurs
- [ ] Statistiques
- [ ] FAQ

### 17.2 Contact
- [ ] Formulaire de contact
- [ ] Coordonnées
- [ ] Carte avec localisation
- [ ] FAQ

### 17.3 Tarification
- [ ] Plans d'abonnement
- [ ] Comparaison des fonctionnalités
- [ ] Tarifs

---

## 18. FONCTIONNALITÉS TECHNIQUES

### 18.1 Performance
- [ ] Mise en cache des données (SWR)
- [ ] Scroll infini optimisé
- [ ] Chargement différé des images
- [ ] Skeleton loaders

### 18.2 Offline
- [ ] Stockage local des billets
- [ ] Mode hors ligne basique
- [ ] Synchronisation à la reconnexion

### 18.3 Notifications Push
- [ ] Réception de notifications push
- [ ] Actions depuis la notification
- [ ] Badge sur l'icône de l'app

### 18.4 Sécurité
- [ ] Stockage sécurisé des tokens
- [ ] Expiration automatique des sessions
- [ ] Validation des données côté client

---

## LÉGENDE

- [ ] Non implémenté
- [x] Implémenté
- [~] Partiellement implémenté

---

## STATISTIQUES

| Catégorie | Total Fonctionnalités |
|-----------|----------------------|
| Authentification & Compte | 18 |
| Découverte d'Événements | 25 |
| Inscription & Billetterie | 20 |
| Mes Billets | 12 |
| Agenda & Sessions | 13 |
| Suivi & Favoris | 5 |
| Messagerie | 18 |
| Notifications | 9 |
| Organisateur - Événements | 28 |
| Organisateur - Inscriptions | 18 |
| Organisateur - Paiements | 11 |
| Organisateur - Wallet | 13 |
| Organisateur - Analytics | 11 |
| Organisateur - Sessions | 9 |
| Modération | 10 |
| Administration | 13 |
| Pages Statiques | 10 |
| Fonctionnalités Techniques | 10 |
| **TOTAL** | **~243** |

---

*Document généré automatiquement - EventEz Mobile Development*
