# EventEz Mobile

Application mobile multiplateforme pour EventEz - Plateforme de gestion d'événements.

## 📱 Technologies

- **Expo** SDK 52+
- **React Native** 0.76+
- **TypeScript** 5
- **React Navigation** 7

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Expo Go app sur votre téléphone (pour tests rapides)
- Android Studio (pour émulateur Android)
- Xcode (pour simulateur iOS - macOS uniquement)

### Installation

```bash
# Installer les dépendances
cd EventEzMobile
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer l'URL de l'API dans .env
# Utiliser votre IP locale pour tests sur appareil physique
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

### Lancement

```bash
# Démarrer Expo (scanner QR avec Expo Go)
npm start

# Lancer sur émulateur Android
npm run android

# Lancer sur simulateur iOS
npm run ios

# Lancer en mode web
npm run web
```

## 📂 Structure du Projet

```
src/
├── api/                 # Client API et endpoints
├── components/          # Composants réutilisables
├── contexts/            # React Contexts (Auth, etc.)
├── hooks/               # Custom hooks
├── navigation/          # Configuration navigation
├── screens/             # Écrans de l'application
├── types/               # Types TypeScript
├── utils/               # Fonctions utilitaires
└── constants/           # Constantes de l'app
```

## 🔧 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarre Expo en mode développement |
| `npm run android` | Lance sur émulateur Android |
| `npm run ios` | Lance sur simulateur iOS |
| `npm run web` | Lance en mode web |
| `npm test` | Lance les tests |
| `npm run lint` | Vérifie le code avec ESLint |

## 📋 Fonctionnalités

### Utilisateurs
- ✅ Authentification (login/register)
- ✅ Gestion du profil
- ✅ Notifications push

### Événements
- ✅ Liste des événements
- ✅ Carte interactive avec événements
- ✅ Recherche et filtres
- ✅ Événements à proximité
- ✅ Détails d'événement

### Billets
- ✅ Achat de billets
- ✅ Historique des achats
- ✅ QR codes pour check-in
- ✅ Scanner de billets

### Dashboard
- ✅ Statistiques
- ✅ Gestion événements (organisateurs)
- ✅ Messages

## 🏗️ Build Production

### Configuration EAS

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le projet
eas build:configure
```

### Build

```bash
# Build APK (Android)
eas build --platform android --profile preview

# Build AAB (Play Store)
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```

## 🔗 API Backend

L'application communique avec l'API EventEz Backend :
- Base URL: configurée via `EXPO_PUBLIC_API_URL`
- Authentification: JWT (access + refresh tokens)
- Stockage sécurisé des tokens avec `expo-secure-store`

## 📱 Plateformes Supportées

- Android 6.0+ (API 23)
- iOS 13.0+
- Web (mode expérimental)

## 🤝 Contribution

1. Créer une branche feature
2. Commiter les changements
3. Ouvrir une Pull Request

## 📄 Licence

Propriétaire - EventEz © 2026
