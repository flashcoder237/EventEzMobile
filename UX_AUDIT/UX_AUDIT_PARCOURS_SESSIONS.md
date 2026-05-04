# 🔍 UX AUDIT — PARCOURS SESSIONS / AGENDA

**Date** : 2026-04-29
**Périmètre** : `apps/events/agenda_views.py` + `agenda_serializers.py` côté backend + `EventEzMobile/src/screens/events/SessionDetailsScreen.tsx`, `src/components/events/AgendaTab.tsx`, `src/api/sessions.ts` côté mobile.

---

## 🟢 POINTS FORTS

1. **Modèle riche** : Tracks, Speakers, Sessions, SessionRegistration, SessionResource, SessionWaitlist, SessionRegistrationSerializer avec `attended`, `attended_at`, `rating`, `feedback` → un vrai produit sessions, pas un agenda CMS.
2. **Validation cross-event** : `SessionCreateSerializer.validate()` vérifie que speakers, moderator, track appartiennent au même event que la session — empêche les fuites cross-event au create.
3. **Permissions session** : `attendees`, `statistics`, `mark_attended`, `add_resource` filtrent strict sur `session.event.organizer == request.user`. Pas de leak.
4. **Workflow waitlist** : `SessionWaitlist` gère position, `notify_next_in_line` automatique au `unregister` → infrastructure solide.
5. **`requires_registration` flag** : différencie keynotes (libre) vs ateliers limités (inscription requise) → UX correcte sur le principe.
6. **`is_full` et `available_spots`** computed sur le modèle, exposés via serializer `ReadOnlyField`.

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **CRITIQUE** — Sessions non cliquables dans l'agenda
**Fichier** : `EventEzMobile/src/components/events/AgendaTab.tsx:35-77`

```tsx
sessions.map((session, index) => (
  <View key={session.id || index} style={[styles.sessionCard, ...]}>
    <Text>{session.title}</Text>
    ...
  </View>
))
```

Les cards de session sont des `<View>`, pas des `<TouchableOpacity>`. **Aucune action onPress nulle part.** Conséquences :
- L'utilisateur voit le programme mais ne peut **pas s'inscrire** à une session.
- Le bouton "S'inscrire à cette session" sur `SessionDetailsScreen` n'est **jamais atteignable**.
- `SessionDetailsScreen` (843 lignes) est dead code accessible uniquement via deeplink ou via `SpeakerDetailsScreen`.
- `joinWaitlist`, `mark_attended`, ressources téléchargeables → toutes invisibles côté utilisateur final.

C'est le bug le plus impactant du parcours : tout l'investissement backend (waitlist, ressources, attendance, stats) est invisible côté mobile.

**Action** : wrapper chaque session card dans `<TouchableOpacity onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}>` + ajouter un chevron `chevron-forward` à droite + accessibility role.

### 2. **CRITIQUE** — `SessionSerializer` n'expose pas `is_registered`
**Fichier** : `apps/events/agenda_serializers.py:66-88`

Le champ `is_registered` n'est pas dans la liste des fields du serializer. Mais le mobile lit `session.is_registered` partout :

```typescript
// SessionDetailsScreen.tsx:87
if (session.is_registered) {
  await sessionsAPI.unregisterFromSession(sessionId);
  ...
} else {
  await sessionsAPI.registerToSession(sessionId);
  ...
}
```

Au mount initial, `session.is_registered === undefined === falsy` → button affiche **toujours "S'inscrire"**, même pour les sessions auxquelles l'utilisateur est déjà inscrit. Un re-clic renvoie un 400 backend "Vous êtes déjà inscrit".

**Action** : ajouter `SerializerMethodField` `is_registered` qui retourne `True` ssi `SessionRegistration.objects.filter(session=obj, user=request.user).exists()` ; ajouter aussi `is_in_waitlist` pour symétrie. Ajouter à `fields = [..., 'is_registered', 'is_in_waitlist']`.

### 3. **CRITIQUE** — Race condition sur `register` (peut dépasser `max_capacity`)
**Fichier** : `apps/events/agenda_views.py:171-193`

```python
if session.is_full:
    return Response({'detail': '...'}, 400)

if SessionRegistration.objects.filter(...).exists():
    return Response({'detail': '...'}, 400)

registration = SessionRegistration.objects.create(session=session, user=request.user)
session.registration_count += 1
session.save()
```

Aucune `transaction.atomic` ni `select_for_update`. Deux requêtes concurrentes :
- Lisent toutes les deux `is_full=False` (ex: 49/50)
- Lisent toutes les deux `registration_count=49`
- Créent chacune un `SessionRegistration`
- Save `registration_count=50` (au lieu de 51)

Résultat : 51 inscriptions pour 50 places, compteur affichant 50. Le fix de race wallet (P19 mémoire) doit être appliqué ici aussi.

**Action** : entourer en `transaction.atomic()` + `Session.objects.select_for_update().get(pk=session.pk)` + use `F('registration_count') + 1` pour l'incrément atomique. Idem sur `unregister`.

### 4. **CRITIQUE** — Pas de waitlist UX malgré le backend prêt
**Fichier** : `SessionDetailsScreen.tsx:485-487`

```typescript
{session.is_registered ? 'Se desinscrire' : isFull ? 'Complet' : 'S\'inscrire a cette session'}
```

Quand `isFull && !session.is_registered`, le bouton affiche "Complet" et est désactivé (`disabled={isRegistering || (isFull && !session.is_registered)}`). **Cul-de-sac total.**

Backend retourne pourtant explicitement :
```json
{"detail": "...", "session_full": true, "waitlist_available": true}
```

Et `sessionsAPI` expose déjà `joinWaitlist`/`getWaitlistStatus`/`leaveWaitlist`. Le code est écrit, jamais branché.

**Action** : sur `isFull && !session.is_registered` → afficher "Rejoindre la liste d'attente" avec onPress `handleJoinWaitlist`. Si déjà dans la waitlist (`session.is_in_waitlist`), afficher "Position N · Quitter la liste d'attente".

---

## 🟠 PROBLÈMES SÉVÉRITÉ ÉLEVÉE

### 5. Pas de check session passée
**Fichier** : `SessionDetailsScreen.tsx:460-493`

Le bouton "S'inscrire" reste actif sur des sessions terminées. Un utilisateur peut s'inscrire à une session de la veille (le backend ne refuse pas non plus — pas de check `start_time > now()`). Comportement inattendu pour un agenda.

**Action** : si `session.end_time < now()`, masquer le bouton et afficher "Cette session est passée" + (si `session.recording_url`) lien vers replay.

### 6. Pas de scan QR pour `mark_attended`
**Fichier** : `apps/events/agenda_views.py:330` + mobile inexistant

Backend exige `user_id` dans le body. Aucun écran mobile ne câble cette action sur le scanner QR existant (`QRScannerScreen.tsx`). L'organisateur doit fournir un user_id manuellement → impossible en pratique.

**Action** : ajouter un mode `mode: 'session_check_in'` au QRScannerScreen ; quand on scanne le QR du participant + qu'on est dans une session, appeler `sessionsAPI.markAttended(sessionId, { user_id: scannedUser.id })`.

### 7. Pas de cancel/refund-aware sur `unregister`
**Fichier** : `apps/events/agenda_views.py:198-223`

Backend supprime l'inscription session sans aucune trace audit. Pas de notification à l'organisateur, pas d'historique. Si la session était payante (badge "atelier premium"), aucun mécanisme de remboursement.

**Action** : conserver `SessionRegistration` avec `status='cancelled'` au lieu de delete + audit log. Notifier l'organisateur si > 5 désinscriptions sur une session (peut-être un signal de mauvaise programmation).

### 8. Locale française hardcodée
**Fichier** : `SessionDetailsScreen.tsx:134, 143-148`, `AgendaTab.tsx:39, 43`

```typescript
date.toLocaleTimeString('fr-FR', ...)
date.toLocaleDateString('fr-FR', ...)
```

Sur tous les écrans sessions. Utilisateurs anglophones (Kenya, Ghana) verront des dates en français.

**Action** : helper `formatTime(date, locale)` qui lit la locale système (`Localization.locale`).

### 9. `formatNumber` inexistant pour `registration_count`
**Fichier** : `SessionDetailsScreen.tsx:303`

```typescript
{session.registration_count || 0} / {session.max_capacity} places
```

Sur une session de 5000 places, on lit `4985 / 5000 places` — OK mais sans formatage milliers. Cohérent avec le reste de l'app mais à voir si on l'aligne.

---

## 🟡 PROBLÈMES MOYENS

### 10. Pas de cache stale-while-revalidate
Aucun usage de `useQuery` (cf. memory `Cache & Offline (2026-03-04)`). Chaque navigation refetch toutes les sessions de l'event. Impact : sur des events à 50+ sessions, latence réseau visible.

### 11. `getCalendar` endpoint inutilisé
Backend `/sessions/calendar/` retourne une vue calendrier optimisée (`SessionCalendarSerializer`) — jamais appelée côté mobile. Pourtant utile pour un écran "Mon agenda perso" avec sessions inscrites timeline.

### 12. `my_sessions` action fait N+1
**Fichier** : `agenda_views.py:389-398`

```python
registrations = SessionRegistration.objects.filter(user=request.user)\
    .select_related('session__event', 'session__track')

sessions = [reg.session for reg in registrations]
serializer = SessionSerializer(sessions, many=True)
```

Le `select_related` ne couvre pas les `speakers` (M2M), donc le serializer va hit la DB pour chaque session pour les speakers. Sur 20 sessions × 3 speakers = 60+ queries. `prefetch_related('speakers', 'attached_resources')` à ajouter.

### 13. `joinWaitlist` retourne 400 si déjà inscrit OU déjà en waitlist (codes confondus)
**Fichier** : `agenda_views.py:251-269`

Les deux cas renvoient `400 'Vous êtes déjà inscrit'` ou `'Vous êtes déjà dans la liste d'attente'`. Le mobile reçoit `error.response.data.detail` brut → impossible de différencier "tu es inscrit, pas besoin de waitlist" de "tu es déjà dans la file" pour montrer des actions différentes.

**Action** : ajouter un code structuré (`code: 'ALREADY_REGISTERED' | 'ALREADY_WAITLISTED'`) dans la response 400.

### 14. `attended_at` sans timezone-aware affichage côté mobile
Pas de display dans le UX actuel — point dormant, à régler quand on câble la liste d'attendees.

---

## 🟢 PROBLÈMES MINEURS

### 15. `SessionCalendarSerializer` non documenté côté mobile
Type `SessionCalendar` n'existe pas dans `types/index.ts`. Si on câble `getCalendar`, à créer.

### 16. `AgendaTab` ne montre pas `is_featured` / `level` / `language`
Information disponible côté backend, jamais affichée dans la liste agenda — 3 props perdues. Acceptable pour MVP, mais c'est de la donnée invisible.

### 17. Pas d'export ICS d'une session
Aucun bouton "Ajouter à mon calendrier" dans SessionDetailsScreen. Backend a `events/{id}/export-ical/` mais pas équivalent session.

---

## 📊 RÉSUMÉ PAR SÉVÉRITÉ

| # | Sévérité | Couche | Problème |
|---|---|---|---|
| 1 | 🔴 Critique | Mobile | Sessions non cliquables → SessionDetailsScreen inaccessible |
| 2 | 🔴 Critique | Backend | `is_registered` absent du serializer → boutton toujours "S'inscrire" |
| 3 | 🔴 Critique | Backend | Race condition sur `register` (peut dépasser max_capacity) |
| 4 | 🔴 Critique | Mobile | Pas de waitlist UX (cul-de-sac sur "Complet") |
| 5 | 🟠 Élevé | Mobile+Backend | Pas de check session passée (s'inscrire post mortem) |
| 6 | 🟠 Élevé | Mobile | Pas de scan QR pour mark_attended |
| 7 | 🟠 Élevé | Backend | `unregister` delete sans audit ni notification |
| 8 | 🟠 Élevé | Mobile | Locale `'fr-FR'` hardcodée |
| 9 | 🟠 Élevé | Mobile | Pas de format milliers sur registration_count |
| 10 | 🟡 Moyen | Mobile | Pas de cache stale-while-revalidate |
| 11 | 🟡 Moyen | Mobile | `getCalendar` endpoint inutilisé |
| 12 | 🟡 Moyen | Backend | `my_sessions` N+1 sur speakers |
| 13 | 🟡 Moyen | Backend | Codes erreur waitlist/registered confondus |
| 14 | 🟡 Moyen | Mobile | `attended_at` non affiché TZ-aware |
| 15 | 🟢 Mineur | Mobile | `SessionCalendar` type absent |
| 16 | 🟢 Mineur | Mobile | `is_featured`/`level`/`language` masqués dans agenda |
| 17 | 🟢 Mineur | Mobile | Pas d'export ICS d'une session |

---

## 🎯 PRIORISATION POUR IMPLÉMENTATION

**Round 1 — Critiques (à faire MAINTENANT)** :
- ✅ Fix #1 : Wrapper sessions cliquables dans `AgendaTab`
- ✅ Fix #2 : `is_registered` + `is_in_waitlist` dans `SessionSerializer`
- ✅ Fix #3 : Atomic register/unregister + F() expressions
- ✅ Fix #4 : Branchement waitlist UX dans `SessionDetailsScreen`
- ✅ Fix #5 : Check session passée (mobile + backend)

**Round 2 — Élevé** :
- Fix #6 : Mode session check-in sur QRScannerScreen
- Fix #12 : `prefetch_related('speakers')` sur `my_sessions`
- Fix #13 : codes erreur structurés sur waitlist/register

**Round 3 — Polish** :
- Fix #7 : audit log + soft cancel
- Fix #8 : helper locale-aware
- Fix #11, #15, #17 : screen "Mon agenda perso", export ICS, type SessionCalendar

---

> **Verdict** : le backend Sessions/Agenda est riche et bien fait, mais **80% des features sont invisibles côté UX** parce que les sessions ne sont pas cliquables dans l'agenda et que `is_registered` n'est pas exposé. Avec 4 fixes critiques (1 mobile + 1 serializer + 1 atomic + 1 waitlist branchement), tout le système devient utilisable.

*Audit réalisé par lecture de code — 2026-04-29.*
