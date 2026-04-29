# Audit UX — Parcours Check-in QR (Mobile)

**Date** : 2026-04-29
**Auditeur** : Claude (lecture de code)
**Profil simulé** : Staff de l'organisateur à l'entrée d'un event (concert, conférence). Doit scanner ~100 billets en 30 minutes avec connexion irrégulière, sous pression de la file d'attente.
**Parcours** : `QRScannerScreen` (caméra + scan + modal résultat + check-in optionnel)
**Méthodologie** : Lecture du code source, simulation de scénarios réels (succès, doublon, échec, offline).

## ✅ Statut d'implémentation

- ✅ **Phase 10** (commit 4562783) : offline queue end-to-end via `useCheckinQueue` (AsyncStorage + auto-flush au retour de connexion + drop des erreurs définitives 404/400) ; saisie manuelle de la référence avec modal dédié + lien Settings sur permission denied ; auto-dismiss du modal succès en mode auto-checkin (1.5s) ; haptique différencié succès/échec ; warning event mismatch ; badge offline/sync visible.
- 🔁 Pas encore livré : batch mode "X sur Y du même groupe", récap de fin de session, pref autoCheckIn persistant, lecteur basse résolution mode économie batterie.

---

## ÉTAPE UNIQUE — QRScannerScreen

### 🖱 ACTION EFFECTUÉE
J'ouvre le scanner depuis le dashboard de mon event. Demande de permission caméra → j'autorise → caméra s'ouvre. Je scanne un premier QR valide → modal succès. Je tape "Continuer". Je rescanne le même billet (doublon test) → message "Déjà enregistré". Je scanne un QR factice/invalide → message d'erreur. Je continue, switch flash on/off, je scanne 50 billets de suite.

### 👁 CE QUE JE VOIS
- **Si permission refusée** : screen vide editorial avec icône caméra + "Accès à la caméra requis" + bouton "Autoriser l'accès" + lien "Retour".
- **Caméra plein écran** : `CameraView` `back` `enableTorch={flashOn}` avec `barcodeTypes: ['qr']`.
- **Header overlay** : croix retour à gauche, eyebrow "Check-in" + titre "Scanner QR" + sous-titre = nom de l'event, bouton flash à droite (icône orange si activé).
- **Zone de scan** : 70% largeur, carré centré, 4 coins blancs en équerre, hint "Placez le QR code du billet dans le cadre".
- **Pendant traitement** : overlay dans le carré avec spinner blanc + "Vérification...".
- **Bottom controls** : 
  - Stats row : Scannés (gris) | Validés (vert) | Échoués (rouge), séparés par lignes verticales.
  - Toggle "Check-in automatique après scan" (cochée par défaut).
- **Vibration 100ms** à chaque scan détecté + son via `useSoundEffect('scan-success' / 'scan-fail')`.
- **Modal résultat** : 
  - Si succès : icône check vert, titre "Succès!" ou "Déjà enregistré", carte ticket details (Participant / Email / Type / Référence).
  - Si échec : icône cross rouge, message d'erreur explicite ("Aucun billet trouvé", "Billet déjà utilisé ou invalide", "Format de QR code non reconnu", etc.).
  - Bouton "Continuer" (relance le scan) ou "Effectuer le check-in" si autoCheckIn=false et alreadyCheckedIn=true.

### 🧠 CE QUE JE COMPRENDS
- **Le scanner gère 3 formats de QR** : URL `/verify/{uuid}`, JSON legacy `{registration_id: ...}`, UUID brut. Bonne robustesse.
- **Le toggle autoCheckIn permet 2 modes** :
  - Auto (cochée) : scan = check-in immédiat. Rapide pour les events à fort débit.
  - Manuel (décochée) : scan = vérification seule, l'utilisateur doit confirmer avec un bouton.
- **La feedback multi-canal** (vibration + son + modal) est essentielle pour confirmer chaque scan en environnement bruyant.
- **Le Vibration.vibrate(100)** fonctionne même flash off, c'est un signal tactile au staff.

### 😊 RESSENTI UTILISATEUR
**Confiance forte** : feedback complet (vibration + son + visuel), stats temps réel, mode flash pour low-light. C'est conçu pour la réalité du terrain.
**Bonne couverture des cas** : doublon → message clair, format invalide → message dédié, billet inexistant → 404.
**Anxiété sur connexion fragile** : si le réseau lague, l'overlay "Vérification..." reste indéfiniment. Le staff devant 50 personnes ne sait pas s'il faut attendre 5s ou abandonner.
**Ergonomie tap** : le toggle autoCheckIn est en bas, pas le plus accessible quand on tient le téléphone à 2 mains.

### ⚠ PROBLÈMES DÉTECTÉS

1. **Pas de timeout sur le scan** : `verifyAndCheckIn` peut bloquer indéfiniment. Pas de message "Connexion lente — réessayer ?" après 10s.
2. **Pas de mode offline** : si la connexion tombe pendant l'event, plus aucun scan ne fonctionne. Pas de queue locale qui se sync au retour de la connexion.
3. **`scanned` flag bloque le scanner pendant le modal** : OK pour éviter doubles scans, mais si l'utilisateur ferme le modal trop vite, le flag est reset → premier scan suivant accepté. Race condition possible si scan rapide.
4. **Pas de batch mode** : pour les concerts, le staff scanne souvent plusieurs billets pour un même groupe. Pas de "1 / 4 du groupe scanné, continuer ?".
5. **Modal bloque la caméra** : pendant l'affichage du résultat, on ne peut PAS scanner le suivant. C'est volontaire (validation manuelle) mais peut-être trop strict en mode auto. Solution : auto-dismiss après 2s en mode auto.
6. **Stats non persistées** : si l'app crash ou l'écran est fermé, les stats Scannés/Validés/Échoués repartent à 0. Pas de récap "Tu as fait 87 check-ins aujourd'hui".
7. **Pas de mode "verify only" au démarrage** : `autoCheckIn=true` par défaut. Le staff qui veut juste vérifier sans valider doit décocher CHAQUE fois.
8. **Pas de filtre sur l'event** : `verifyAndCheckIn(registrationId, autoCheckIn)` valide TOUT QR EventEz scanné. Si le staff de l'event A scanne par erreur un billet de l'event B, est-ce qu'il y a un check côté backend que l'event correspond ?
9. **Format de QR incompatible avec d'autres lecteurs** : le QR encode `/verify/{uuid}`, donc si quelqu'un scanne avec un lecteur générique, il arrive sur la page web `/verify/...`. C'est OK mais la page web doit être prête.
10. **`reference_code` fallback `id.slice(0,8).toUpperCase()`** (ligne 386) : si `reference_code` manque, on tronque l'UUID. L'audit visiteur a déjà résolu ça côté backend, mais le fallback reste utile.
11. **Pas de bouton "Saisie manuelle"** : si un participant a perdu son téléphone, le staff ne peut pas taper la référence manuellement. Forcé de refuser l'accès ou faire un workaround.
12. **Vibration 100ms** : pas distinguable entre succès et échec. Tactiquement, succès = 1 vibration courte, échec = 2 vibrations rapides serait plus utile.
13. **Permission caméra refusée** : si l'utilisateur refuse, le bouton "Autoriser l'accès" rouvre le prompt système. Mais si l'utilisateur a "Refuser pour toujours" sur Android, le bouton est inerte. Pas de redirection vers les Settings système.
14. **Pas d'indicateur de batterie** : un scanner caméra plein écran consomme énormément. À 30 min d'event, batterie peut tomber à 20%.

### 💡 SUGGESTIONS D'AMÉLIORATION

1. **Timeout 10s sur la vérification** : si pas de réponse, modal "Connexion lente. Réessayer / Annuler / Saisie manuelle".
2. **Mode offline avec queue** : si offline détecté (NetInfo), stocker `{ registrationId, timestamp, autoCheckIn }` dans AsyncStorage. Au retour de connexion, sync background avec retry. Afficher un badge "12 scans en attente de sync".
3. **Auto-dismiss du modal en mode auto** : 2s après le résultat, fermer automatiquement et rendre la main au scanner. Le staff économise un tap toutes les 5 secondes.
4. **Batch mode** : "Ce billet a 3 places. Scanner les 3 maintenant ?" — ouvre 3 mini slots à valider d'affilée.
5. **Stats persistées et récap fin de session** : à la fermeture du scanner, modal "Bilan de la session : 87 scans / 84 validés / 3 échoués / Durée 28 min".
6. **Toggle autoCheckIn persistant** : `AsyncStorage` la pref pour que le staff ne re-décoche pas à chaque ouverture.
7. **Vérifier event match côté frontend** : avant de POST, comparer `registration.event_id` avec l'eventId du screen. Si mismatch, modal "Ce billet est pour un autre événement (X). Valider quand même ?".
8. **Bouton "Saisie manuelle"** : à côté du flash, bouton "ABC" qui ouvre un champ TextInput pour taper la référence à 10 caractères. Backup essentiel.
9. **Patterns de vibration différenciés** : `Vibration.vibrate([0, 100])` pour succès, `Vibration.vibrate([0, 100, 100, 100])` pour échec. Le staff distingue sans regarder.
10. **Lien Settings système** : si `permission.canAskAgain === false`, afficher "Ouvre les paramètres" qui appelle `Linking.openSettings()`.
11. **Indicateur batterie** : `expo-battery` → `useBatteryLevel()` → afficher un mini icône batterie dans le header si < 30%.
12. **Mode économie d'énergie** : option "Caméra basse résolution" pour scanner > 1h sans vider la batterie.

---

# 🏁 RAPPORT FINAL — Parcours check-in

## Note globale UX : **6.5 / 10**

Le scanner est **bien construit pour le cas nominal** : caméra fluide, feedback multi-canal (vibration + son + visuel), stats temps réel, gestion des 3 formats de QR. Mais il **manque de robustesse pour les conditions réelles d'event** : connexion fragile non gérée (pas d'offline), pas de saisie manuelle de fallback, pas de batch mode, stats éphémères. Sur un event de 500 personnes avec WiFi capricieux, le staff galérera.

## 🟢 3 POINTS FORTS

1. **Feedback multi-canal** — vibration + son + modal détaillé. Confirmation tangible de chaque scan.
2. **3 formats de QR supportés** — URL, JSON, UUID brut. Robuste face à différentes versions de tickets émises.
3. **Mode dual auto / manuel** — flexibilité selon le scénario (haute cadence vs validation contrôlée).

## 🔴 3 POINTS FAIBLES PRIORITAIRES

1. **Pas de mode offline** — connexion irrégulière = scanner inutilisable. Un event en zone rurale ou avec WiFi saturé est catastrophique.
2. **Pas de saisie manuelle** — un participant sans téléphone est bloqué. Le staff doit faire des workarounds embarrassants.
3. **Modal résultat bloque le scanner en continu** — perte de temps significative à grande échelle (1-2s × 100 scans = 2-3 min perdues).

## 🎯 RECOMMANDATION GÉNÉRALE

Pour un produit de billetterie **événementielle**, le check-in est le moment de vérité — c'est ce que les organisateurs et leur staff jugeront. La couche fonctionnelle est solide ; il manque les **garde-fous de la réalité du terrain** : offline queue, fallback manuel, persistance des stats. 1-2 jours de dev sur ces 3 axes prioritaires transformeraient l'outil en quelque chose de **robuste et premium**, à hauteur du reste de l'app.

