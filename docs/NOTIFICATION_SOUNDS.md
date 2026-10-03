# Sons de notification EventEz — état, limites, brief sound design

> Demande d'origine (retours testeur 2026-10-03) : « Peut-on personnaliser le
> son des notifications ? Si oui mets des experts sur ça ! » — **Oui**, dans
> les limites que fixent Android et iOS (détaillées ci-dessous).

## 1. Comment ça marche (et pourquoi c'est contraint)

| | Android | iOS |
|---|---|---|
| Où vit le son | Sur le **canal** de notification. Figé à la création du canal : l'app ne peut plus le modifier ensuite. | Dans le **payload** de chaque push (`sound: "fichier.wav"`), fichier embarqué dans l'app. |
| « Un son par catégorie » | = un canal par catégorie. | = un nom de fichier par catégorie, choisi par le serveur. |
| Choix par l'utilisateur | Oui, **dans les réglages système** du canal (son, vibration, silence, priorité). | Non par catégorie : seulement Sons on/off pour toute l'app (Réglages > Notifications > EventEz). |
| Mode silencieux / Ne pas déranger | Toujours respectés (canaux standard). | Toujours respectés. Seule une liste blanche fermée de push `time-sensitive` peut passer le mode Concentration, **si l'utilisateur l'autorise**. Jamais de son `critical`. |
| Contraintes fichier | `res/raw`, nom en minuscules `[a-z0-9_]`. | ≤ 30 s (sinon son par défaut), `.wav`/`.caf`/`.aiff`, dans le bundle. |

Conséquence : on ne peut pas proposer dans l'app un menu « choisir un son pour les messages » qui marche sur les deux plateformes. On fait ce qui est fiable :
1. **le serveur choisit le bon son par catégorie** (signature EventEz) ;
2. **Réglages > Sons des notifications** ouvre les réglages système des notifications d'EventEz, où l'utilisateur change ou coupe le son de chaque catégorie (Android) ou de l'app (iOS).

## 2. Palette actuelle (app ≥ 1.3.5)

| Catégorie | Types de notification | Canal Android | Son | Statut |
|---|---|---|---|---|
| **Moment fort** — « c'est maintenant » | `event_today`, rappel 2 h (`starting_soon`), `event_live`, `checkin_welcome` | `eventez_moments` | `eventez_chime.wav` (carillon) | ✅ branché |
| **Vente** (organisateur) | `organizer_milestone` (paliers de ventes) | `eventez_sales` | `eventez_sale.wav` (double note) | ✅ branché |
| Message | `new_message`, `message_reaction` | `messages` | son du téléphone | à concevoir |
| Rappel | `event_reminder` (veille), `session_reminder` | `event_reminders` | son du téléphone | à concevoir |
| Argent | `payment_confirmation`, `refund_processed`, `payout_status` | `payments` | son du téléphone | à concevoir |
| Urgent | `event_cancelled`, `waitlist_available`, `event_low_stock` | `urgent_actions` | son du téléphone | à concevoir |
| Le reste | — | `default` | son du téléphone | volontairement neutre |

Code : `EventEzBackend/apps/notifications/services.py` (`SOUND_PROFILES`, `_sound_profile_key`, `_channel_and_sound`). Les apps < 1.3.5 (qui n'ont ni canaux ni fichiers) gardent leur canal historique et le son par défaut : la version vient de `PushDeviceToken.app_version`, désormais renvoyée au backend après **chaque mise à jour** de l'app (`pushNotificationService.registrationKey`).

Les deux `.wav` actuels sont **synthétisés par script** (provisoires, cf. `assets/sounds/README.md`). Ils doivent être remplacés par les sons du sound designer.

## 3. Ajouter un son de catégorie (procédure dev)

Comme un canal Android est figé, **on ne remplace jamais le son d'un canal existant** : on crée un nouveau canal.
1. Déposer `eventez_<nom>.wav` dans `assets/sounds/notification/` et l'ajouter à `expo-notifications > sounds` dans `app.json` (build store requis, pas d'OTA).
2. Créer le canal dans `src/lib/native/notificationChannels.ts` (`ensureSoundChannels`), avec un id **nouveau** (ex. `eventez_messages_v1`) ; pour changer de son plus tard → `_v2`, et supprimer `_v1`.
3. Côté backend : ajouter le profil dans `SOUND_PROFILES`, la règle dans `_sound_profile_key`, et relever `SOUND_MIN_APP_VERSION` à la version qui embarque le fichier.
4. Tests : `apps/notifications/test_push_sounds.py`.

## 4. Brief pour le sound designer

**Intention.** Une famille sonore EventEz reconnaissable en une demi-seconde, chaleureuse et festive sans être criarde. On doit pouvoir l'entendre 20 fois par jour sans agacement, et reconnaître la catégorie sans regarder l'écran.

**Signature commune.** Une même « couleur » de timbre sur tous les sons (par ex. marimba/kalimba douce + léger shimmer), en majeur, avec un motif de 2-3 notes dont l'intervalle varie selon la catégorie. Référence de marque : indigo #4F46E5, corail #FF6B6B, plateforme internationale à racines africaines (Douala) : un clin d'œil percussif est bienvenu, mais pas un cliché.

| Son | Rôle | Durée | Caractère |
|---|---|---|---|
| `eventez_chime` | Moment fort (portes ouvertes, direct) | 0,8-1,2 s | Montant, lumineux, « on y est » |
| `eventez_sale` | Vente / palier organisateur | 0,5-0,8 s | Deux notes ascendantes, gratifiant, « cha-ching » sans caisse enregistreuse |
| `eventez_message` | Message | 0,2-0,4 s | Très court, discret, une note ronde |
| `eventez_reminder` | Rappel | 0,5-0,8 s | Doux, deux notes, sans urgence |
| `eventez_money` | Paiement / remboursement confirmé | 0,4-0,6 s | Rassurant, résolu (tonique) |
| `eventez_urgent` | Annulation, place libérée | 0,8-1,2 s | Plus présent mais jamais alarmant, pas de sirène |

**Contraintes techniques.**
- Durée **< 1,5 s** (la limite iOS de 30 s est hors sujet : un son de notif long agace).
- WAV 16 bits PCM, 44,1 kHz, **mono** ; attaque < 10 ms sans clic ; queue fondue à zéro.
- Loudness : environ **-16 LUFS intégré**, true peak ≤ **-1 dBTP**. Tous les sons au même niveau perçu (aucun « plus fort » pour l'urgent : c'est le caractère qui change, pas le volume).
- Doit rester intelligible sur un haut-parleur de téléphone d'entrée de gamme : énergie principale entre 800 Hz et 5 kHz, pas de basses sous 200 Hz.
- Tester avec le téléphone dans une poche, en salle bruyante (concert) et en silence (bureau).

**Livrables.** Les six fichiers ci-dessus nommés exactement ainsi (minuscules, `_`), plus une version `.caf` optionnelle pour iOS et une planche d'écoute (les six enchaînés avec 1 s de blanc).
