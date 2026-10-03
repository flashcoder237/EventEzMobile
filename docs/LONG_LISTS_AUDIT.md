# Audit des listes longues — mobile (2026-10-03)

Point de départ : un testeur a demandé « et si je suivais 2 000 personnes ? » à propos de l'écran
« Organisateurs suivis ». Cet audit répertorie toutes les listes de l'app qui peuvent devenir longues.
Pour chacune, il dit ce qui se passe à grande échelle et ce qu'il faut faire.

## Convention adoptée

- **Backend : pagination opt-in.** Une liste n'est paginée que si le client envoie `?page=` ou
  `?page_size=`. Sans ces paramètres, la réponse historique (le tableau complet) est conservée, pour ne
  pas casser les builds 1.3.x déjà publiés. Taille de page : 20 par défaut, 100 au maximum
  (`StandardPagination`).
- **Recherche côté serveur.** Toute liste qui peut dépasser une centaine d'éléments accepte `?search=`.
  On ne filtre jamais localement une liste qui n'est que partiellement chargée.
- **Mobile.** Le hook `src/hooks/usePaginatedList.ts` gère :
  - la page 1, le pull-to-refresh et `loadMore` sur `onEndReached` ;
  - les deux formes de réponse (paginée ou tableau) ;
  - l'abandon des réponses périmées (recherche tapée entre-temps).
  
  Le rendu passe par une `FlatList` avec `getItemLayout` quand la hauteur des lignes est fixe, et une
  fenêtre de rendu bornée.
- **Pas de N+1 côté serveur.** Les compteurs par ligne (nombre d'événements, note, état de connexion)
  sont annotés ou calculés en une seule requête.

## Corrigé dans ce lot

| Écran | Avant | Maintenant |
|---|---|---|
| Profil → Organisateurs suivis (`FollowingUsersScreen`) | Tout chargé d'un coup ; 2 requêtes SQL par ligne (nombre d'événements et note) ; gros bouton « Désabonner » sur chaque ligne | Pagination de 30, recherche serveur avec debounce, lignes denses à hauteur fixe, compteur, pastille « Suivi » discrète avec confirmation, état vide qui renvoie vers Découvrir. Côté serveur : compteurs annotés, nombre de requêtes constant (test `test_follow_lists_scale.py`) |
| Messages → Connexions (`ConnectionsScreen`) | Tout chargé à chaque focus (et 2 fois au montage) | Pagination de 30, `onEndReached`, rafraîchissement au retour sur l'écran seulement ; recherche `?search=` disponible côté serveur (test `test_connections_pagination.py`) |
| Événement → Qui est là (`EventAttendeesScreen`) | `ScrollView` + `map` de tous les participants ; 1 requête `are_connected` par participant | `FlatList` paginée par 30 ; statut de connexion en une seule requête ; `?search=` côté serveur (tests `TestEventDirectoryScale`) |
| `GET /users/my_followers/` (non utilisé par le mobile pour l'instant) | Tout chargé d'un coup | Même pagination opt-in et même recherche |

## Reste à traiter (par risque décroissant)

| Écran / endpoint | Risque à grande échelle | Solution proposée |
|---|---|---|
| `OrganizerProfileScreen` → `connectionsAPI.list()` | Charge **toutes** mes connexions pour savoir si je suis connecté à UN organisateur | Endpoint `GET /connections/status/?user_id=` (booléen) ou `is_connected` dans la réponse `GET /users/{id}/` |
| `FollowingEventsScreen`, onglet Organisateurs (`usersAPI.getFollowingUsers()` sans paramètre) | Même problème que l'ancien écran Organisateurs suivis, et le cache conserve toute la liste | Brancher `usePaginatedList` (le contrat paginé existe déjà) |
| Favoris (`/events/following/`) | Tous les événements suivis, sérialisation complète | Pagination opt-in identique ; les sections « Cette semaine / Ce mois / Plus tard » doivent alors être regroupées côté serveur |
| Mes billets / billets hors ligne (`/registrations/my_registrations/`) | Gros consommateurs (100+ inscriptions) : payload lourd, `refreshOfflineTicketCache` sur tout | La pagination opt-in existe déjà côté serveur ; il manque le mobile. Charger les billets à venir d'abord, les archives à la demande |
| Mes événements organisateur (`/events/my_events/`) | Organisateurs récurrents (centaines d'événements) | Pagination opt-in + filtre par statut côté serveur |
| Live Q&R (`/live-questions/by_event/`) | Gros événement : des milliers de questions, re-tri à chaque vote | Paginer par popularité (`?ordering=-upvotes&page=`) ; le temps réel ne pousse que les deltas |
| Invités mariage (`/invitations/guest-list/`) | 500 à 1 000 invités possibles | Pagination + recherche par nom, filtre par statut RSVP côté serveur |
| Leads exposant (`/exhibitor-leads/mine/`) | Salon : des centaines de leads | Pagination + recherche (nom, entreprise) |
| Demandes de message (`/conversations/requests/`) | Compte très visible : boîte « Demandes » volumineuse | Pagination opt-in (même convention que l'inbox) |
| Utilisateurs bloqués (`/user-messaging-settings/blocked_list/`) | Faible (rarement plus de 100) | À paginer seulement si la liste dépasse 100 |
| Mes paiements (`/payments/?mine=1`) | Déjà paginé côté serveur (`ModelViewSet`), mais l'écran ne lit que la page 1 | Vérifier : soit `onEndReached`, soit un lien « Voir plus » |
| Admin : journaux d'audit, utilisateurs, abonnements, trésorerie | Volume admin élevé ; `AuditLogsScreen` limité à 50 sans pagination | Brancher `usePaginatedList` sur les écrans admin (endpoints DRF déjà paginés) |
| Codes promo, stands, équipe, sponsors, webhooks | Volume borné par événement (dizaines) | Rien à faire pour l'instant |

## Règles pour tout nouvel écran

1. Une liste dont la taille dépend de l'activité d'un utilisateur ou d'un événement doit être
   paginée côté serveur et lue avec `usePaginatedList`. Jamais de `ScrollView` + `map`.
2. Toute information par ligne (compteur, état) doit être annotée dans le queryset. Jamais de requête
   par ligne dans le serializer.
3. La recherche se fait côté serveur dès que la liste peut dépasser une page.
4. Ne jamais casser une réponse existante : pagination opt-in tant qu'un build publié lit le tableau
   brut.
