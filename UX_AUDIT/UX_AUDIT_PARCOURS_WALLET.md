# 🔍 UX AUDIT — PARCOURS WALLET ORGANISATEUR

**Date** : 2026-04-29
**Périmètre** : `apps/payments/{models,views,utils,tasks,serializers,country_config}.py` côté backend + `EventEzMobile/src/screens/organizer/WalletScreen.tsx` (2427 lignes) + `EventEzMobile/src/api/payments.ts` côté mobile.
**Scope explicite** : flux organisateur "voir ses gains → demander un retrait → recevoir l'argent". L'audit côté admin (process payout, review) est mentionné en marge mais ne fait pas l'objet de correctifs ici.

---

## 🟢 3 POINTS FORTS

### 1. Plumbing financier solide
- `select_for_update()` + `transaction.atomic()` sur `request_payout`, `process`, `release_pending_earnings` → la double-débit race est verrouillée.
- `F('available_balance') - amount` → écriture atomique côté SQL, jamais de rebasement Python.
- `WebhookEvent` table d'idempotence pour bloquer le double traitement NotchPay.
- Invariant `wallet.currency == payment.currency` enforcé dans `apps/payments/utils.py` (raise `ValueError` si violation) — la stratégie mono-devise est tenue jusqu'au crédit.
- 3 modes d'approbation (`auto`, `moderator`, `admin_manual`) configurables via `SiteSettings.payout_approval_mode` → flexible selon la confiance opérationnelle.
- `release_pending_earnings` Celery task gère le cas `pending_balance < amount` (partial release fallback) → robuste si quelqu'un a tripoté la BDD à la main.

### 2. UX éditoriale aboutie sur WalletScreen
- Card hero gradient noir/indigo + filigrane currency `{wallet.currency}` + cercles hologrammes + dot row "card number-like" → forte identité visuelle, pas un simple solde affiché. Cohérent avec le style guide (FunnelDisplay extra-bold + eyebrow + watermark).
- Tabs segmentés sticky (Aperçu / Transactions / Retraits / En attente) avec `Shadows.xs` actif et tab inactif gris → pattern reconnaissable, pas un toggle Material générique.
- StaggeredItem sur transactions/payouts/pending → l'animation cascade signe la qualité.
- Modal payout avec balance pill, méthodes en chips, et warning contextuel (`!wallet?.mobile_money_number` → "Configure d'abord ton numéro").
- Commission callout "POLITIQUE EVENTEZ — Commission X% par vente · Fonds libérés 48h après l'événement" → l'utilisateur sait où il met les pieds, ne se sent pas grugé.

### 3. Multi-pays géré dès la couche données
- `country_config.py` mappe 6 pays (CM/CI/SN/KE/GH/UG) avec leurs méthodes (`mtn_money`, `orange_money`, `wave`, `mpesa`, `airtel_money`, `bank_transfer`).
- `payouts/methods/` retourne dynamiquement les méthodes du pays du wallet → mobile peut être dropped en CI sans modif code.
- `OrganizerWallet.country` séparé de `currency` → pas mélangé comme on voit souvent ("XAF" implique "CM").

---

## 🔴 5 POINTS FAIBLES PRIORITAIRES À CORRIGER

### 1. **CRITIQUE** — Méthodes payout hardcodées dans le rendu mobile
**Fichier** : `WalletScreen.tsx:326-329`

```typescript
const methodLabel = payout.payout_method === 'mtn_money' ? 'MTN Money' :
                    payout.payout_method === 'orange_money' ? 'Orange Money' : 'Virement bancaire';
const methodMark = payout.payout_method === 'mtn_money' ? 'MTN' :
                   payout.payout_method === 'orange_money' ? 'OM' : 'BANK';
```

Backend supporte `wave`, `mpesa`, `airtel_money` mais le rendu mobile les colle dans le bucket "Virement bancaire" → un Sénégalais voit un payout Wave étiqueté "Virement bancaire". Régression silencieuse hors CM.

**Action** : Construire un mapping complet à partir des `PAYOUT_METHOD_CHOICES` ou (mieux) lookup via `availableMethods` déjà chargé.

**Fichier** : `WalletScreen.tsx:846-862, 872-879`

```typescript
{payoutMethod !== 'bank_transfer' && !wallet?.mobile_money_number && (
  <View style={styles.warningBoxE}>
    <Text>Configurez d'abord votre numéro Mobile Money</Text>
  </View>
)}
...
<TouchableOpacity
  disabled={!payoutAmount || processingPayout}  // pas de check destination !
  onPress={handleRequestPayout}
>
```

Le warning est cosmétique : `disabled` ne tient compte que du montant et du loading. Cohérent avec le bug backend (point 1) — si on fixe le serializer, le mobile recevra un 400 mais l'UX reste pénible.

**Action** : Ajouter la check destination dans le `disabled`. Le backend `PayoutRequestSerializer.validate_payout_method` refuse déjà (lignes 426-444 — checke aussi le pays vs provider) → cette correction évite juste un aller-retour 400.

### 3. **ÉLEVÉ** — Pas d'action "Annuler ma demande de retrait pending"
**Backend** : `Payout.STATUS_CHOICES` inclut `'cancelled'`, mais aucune action `cancel` pour l'organisateur. Une fois requestée, la demande est figée jusqu'à traitement admin/auto.

**Conséquence UX** : l'organisateur qui se rend compte qu'il a renseigné le mauvais numéro doit attendre 24h+ que l'admin reject (ce qui re-crédite), puis refaire la demande. Frustration garantie sur les premières utilisations.

**Action** : Ajouter `@action(detail=True, methods=['post']) cancel(self, ...)` sur `PayoutViewSet`, autorisé uniquement si `status == 'pending'` ET `wallet.organizer == request.user`. Re-crédite via `F('available_balance') + amount` sous lock + crée `WalletTransaction adjustment` + log audit. Côté mobile, bouton "Annuler" sur les payout cards `pending` uniquement.

### 4. **ÉLEVÉ** — Erreurs API silencieuses dans `fetchData`
**Fichier** : `WalletScreen.tsx:146, 150`

```typescript
} catch (err) {
  if (__DEV__) console.error('Erreur chargement méthodes:', err);
}
...
} catch (error) {
  if (__DEV__) console.error('Erreur chargement données portefeuille:', error);
}
```

Même anti-pattern dénoncé dans `UX_AUDIT_PARCOURS_INVITE.md` (point 3 prioritaire). Si le backend tombe ou que le token est expiré, l'utilisateur voit `wallet=null` (toujours en chargement) ou `wallet={...} sans methods` (modal qui propose "Aucune méthode disponible") sans aucune indication.

**Action** : Toast d'erreur (`useAlert.showError`) + bouton retry visible sur l'écran. Ne PAS masquer en `__DEV__`.

---

## 🟠 PROBLÈMES SÉVÉRITÉ ÉLEVÉE

### 6. `formatPrice` toujours en `fr-FR`
**Fichier** : `WalletScreen.tsx:212-214`

```typescript
const formatPrice = (price: number) => new Intl.NumberFormat('fr-FR').format(price);
```

Sépare avec espaces (`12 500`). Pour un Kenyan voyant des KES, le séparateur attendu est virgule (`12,500`). Pas un blocker mais signe une plateforme "francophone d'abord, autres pays ensuite".

### 7. `wallet?.currency || 'FCFA'` — fallback Cameroun masqué
**Fichier** : `WalletScreen.tsx:177, 547`

`'FCFA'` apparaît comme fallback si `wallet.currency` n'est pas chargé. Sur les autres wallets multilignes, on utilise `'XAF'`. Inconsistance : `'FCFA'` est un libellé grand public, `'XAF'` un code ISO. Doublon.

**Action** : Toujours `wallet?.currency || 'XAF'` pour cohérence interne, et formatter le label affiché via une fonction `formatCurrencyLabel(code)` (XAF → "FCFA", KES → "KES", etc).

### 8. "WALLET PREMIUM" trompeur
**Fichier** : `WalletScreen.tsx:513`

```typescript
<Text style={styles.creditCardEyebrow}>WALLET PREMIUM</Text>
```

Tous les organisateurs voient ce libellé, qu'ils soient Free, Essential ou Premium. Le mot "PREMIUM" suggère un statut ; c'est de la cosmétique trompeuse — même reproche que le bookmark décoratif ou le "Suivre" qui contacte (cf. `UX_AUDIT_PARCOURS_INVITE.md` recommandation générale).

**Action** : Remplacer par "WALLET ORGANISATEUR" ou — mieux — afficher dynamiquement le tier d'abonnement (`subscription.plan_name`).

### 9. `wallet.id` slice pour "card last digits"
**Fichier** : `WalletScreen.tsx:531`

```typescript
<Text style={styles.cardLastDigits}>{(wallet?.id || 'XXXX').slice(-4).toUpperCase()}</Text>
```

`wallet.id` est un UUID. Les 4 derniers caractères donneront du genre `7A2F` ou `B3D9` — ressemble à un code carte ? Non, ça ressemble à une string aléatoire. Ce n'est pas un PAN.

**Action** : Soit utiliser un `wallet.short_id` numérique exposé exprès par le backend, soit virer le placeholder et mettre la date de création (`MEMBRE DEPUIS`) ou le pays (`CM • XAF`).

### 10. Backend hardcodé "XAF" dans logs et `__str__`
**Fichiers** :
- `apps/payments/models.py:513` — `f"Pending {self.amount} XAF - Release: {self.release_date}"`
- `apps/payments/tasks.py:260` — `logger.info(f"Gain libéré: {earning.amount} XAF pour wallet {wallet.id}")`
- `apps/payments/views.py:1831` — export CSV : `f"{t.amount} XAF" if t.amount is not None else ''`

Cosmétique mais si un jour quelqu'un croise les logs par devise pour faire des stats, ça fout en l'air le filtrage. L'export CSV est plus grave : un Kenyan downloadant son ledger verra "12 500 XAF" alors que c'est des KES.

**Action** : Remplacer par `wallet.currency` partout.

---

## 🟡 PROBLÈMES MOYENS

### 11. Pas d'export mobile
Backend expose `/wallet/transactions/export/?format=csv|excel|pdf` (vu `apps/payments/views.py:1813`). Mobile `walletAPI` n'a pas d'helper → fonctionnalité dormante.

### 12. `processPayout` typé `any`
**Fichier** : `EventEzMobile/src/api/payments.ts:199`

```typescript
processPayout: (id: string, processData: any) => api.post(...)
```

Devrait être typé : `{ action: 'approve' | 'reject', notes?: string, failure_reason?: string, transaction_reference?: string }`. Pas critique pour l'orga (cette action est admin-only) mais ça plante les futurs écrans modérateur.

### 13. Tab "Pending" : pas de distinction "0 jour" vs "libéré bientôt"
**Fichier** : `WalletScreen.tsx:405-407`

```typescript
{days > 0 ? `J−${days}` : 'BIENTÔT'}
```

Si `days_until_release == 0`, on affiche "BIENTÔT" — vrai dans les heures qui suivent. Mais si la Celery task n'a pas tourné (broker down), un earning peut rester `is_released=False` avec `days=0` indéfiniment. L'utilisateur voit "BIENTÔT" depuis 3 jours.

**Action** : Si `release_date < now() - 1h` ET `is_released==False`, afficher "EN COURS DE LIBÉRATION" + petit warning icon. Le backend devrait aussi exposer ces orphelins comme alertes admin.

### 14. `monthly_earnings` du `stats` action non utilisé côté mobile
Backend retourne `monthly_stats` (`apps/payments/views.py:1796-1810`) mais aucun graphique côté mobile. Tout est dans le tab Aperçu : derniers 5 transactions + 3 payouts. Pas de courbe, pas de comparaison mensuelle.

---

## 🟢 PROBLÈMES MINEURS

### 15. `update_bank_details` ne valide pas la cohérence avec `wallet.country`
Si un wallet `country=CM` met à jour `mobile_money_provider='wave'` (qui n'existe qu'au Sénégal), pas de rejet. Le payout se planterait au runtime.

### 16. Pas de pagination retournée pour les transactions
`GET /wallet/transactions/?limit=50&offset=0` retourne une liste plate, pas un objet `{count, next, previous, results}`. Le mobile fait `transactionsRes.data?.results || transactionsRes.data` ce qui marche par défensive coding mais n'est pas propre, et le scroll infini est impossible.

### 17. Bank section validation : aucun feedback côté front si IBAN invalide
Le front accepte n'importe quoi dans `bank_account_number`. Le backend le stocke tel quel. Si l'admin manuel fait une faute de frappe au moment du virement, c'est l'admin qui perd la transaction, pas le user.

---

## 📊 RÉSUMÉ DES PROBLÈMES PAR SÉVÉRITÉ

| # | Sévérité | Couche | Problème |
|---|---|---|---|
| 1 | 🔴 Critique | Mobile | Méthodes payout hardcodées (mtn/om/bank uniquement, manque wave/mpesa/airtel) |
| 2 | 🟠 Élevé | Mobile | Modal payout cliquable même destination vide (backend 400 mais UX pénible) |
| 3 | 🟠 Élevé | Backend+Mobile | Pas de "Annuler ma demande pending" |
| 4 | 🟠 Élevé | Mobile | Erreurs API silencieuses (`__DEV__ && console.error`) |
| 6 | 🟠 Élevé | Mobile | `formatPrice` toujours `fr-FR` |
| 7 | 🟠 Élevé | Mobile | Fallback `'FCFA'` vs `'XAF'` incohérent |
| 8 | 🟠 Élevé | Mobile | "WALLET PREMIUM" trompeur (cosmétique fake) |
| 9 | 🟠 Élevé | Mobile | `wallet.id.slice(-4)` UUID affiché comme PAN |
| 10 | 🟠 Élevé | Backend | "XAF" hardcodé dans logs + export CSV |
| 11 | 🟡 Moyen | Mobile | Pas d'export mobile |
| 12 | 🟡 Moyen | Mobile | `processPayout` typé `any` |
| 13 | 🟡 Moyen | Mobile | "BIENTÔT" indistinguable de "orphelin Celery" |
| 14 | 🟡 Moyen | Mobile | Stats mensuels backend pas utilisés (pas de graph) |
| 15 | 🟢 Mineur | Backend | `update_bank_details` ne valide pas la cohérence pays/provider |
| 16 | 🟢 Mineur | Backend | `transactions` non paginé (objet plat) |
| 17 | 🟢 Mineur | Mobile | Pas de validation IBAN/numéro mobile côté front |

---

## 🎯 PRIORISATION POUR IMPLÉMENTATION

**Round 1 — Cohérence multi-pays + UX bloquante (à faire MAINTENANT)** :
- ✅ Fix #1 : Mapping payout method dynamique (utilise `availableMethods`)
- ✅ Fix #2 : Disable bouton modal si destination vide + redirection vers config
- ✅ Fix #3 : Action `cancel` sur Payout pending (backend + mobile)
- ✅ Fix #4 : Toast erreur sur `fetchData` (plus de catch silencieux)

**Round 2 — Cohérence devise/pays (faisable rapidement)** :
- Fix #7 : Cleanup `'FCFA'` → `wallet.currency`
- Fix #10 : `wallet.currency` dans logs + export CSV
- Fix #15 : `update_bank_details` valide le provider vs `wallet.country`

**Round 3 — Polish (peut attendre une autre passe)** :
- Fix #6, #8, #9, #11, #12, #13, #14, #16, #17

---

> **Verdict** : le wallet est un produit *techniquement* sain (race conditions, atomicité, idempotence, multi-pays) mais avec un **layer de cosmétique trompeuse** ("WALLET PREMIUM", UUID fake-PAN) et des **trous UX bloquants** (destination vide acceptée, méthodes payout hardcodées) qui cassent la confiance dès qu'on quitte le bonheur Cameroun-MTN-Orange. Round 1 est nécessaire avant tout déploiement hors CM.

*Audit réalisé par lecture de code — 2026-04-29.*
