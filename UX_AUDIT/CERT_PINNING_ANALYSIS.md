# Cert Pinning — analyse et options

**Date** : 2026-05-05
**Statut** : à valider — nécessite approbation pour installer un package natif

## Pourquoi le cert pinning n'est pas implémentable en JS pur

Sur Expo / React Native, les requêtes HTTPS passent par le client TLS du système (NSURLSession sur iOS, OkHttp/HttpsURLConnection sur Android). La validation du certificat est faite **avant** que la réponse arrive en JS — il n'y a aucun hook JavaScript pour intercepter la chaîne de certificats ou comparer un fingerprint attendu.

axios (client HTTP utilisé partout dans `src/api/instance.ts`) délègue à `fetch` natif. `responseType`, `adapter`, et autres options agissent sur le **payload** mais pas sur le **transport TLS**.

## Ce qui marche déjà sans pinning

- **HTTPS forcé** en production via `API_BASE_URL` (lecture stricte de `EXPO_PUBLIC_API_URL`).
- **JWT signé** côté backend (HS256) — un attaquant MITM qui réussirait à intercepter ne pourrait pas forger un token sans la clé.
- **Idempotency keys** sur les paiements (`getOrCreateIdempotencyKey`) — empêche un replay de requête.
- **Sentry** rapporte les erreurs réseau qui pourraient indiquer un MITM (timeouts, errors TLS).
- **HSTS** côté backend — cf. config nginx/cloudfront, à confirmer en infra.

## Ce que le pinning vrai apporterait

Empêcher un attaquant qui aurait :
1. Compromis une CA (rare, médiatique quand ça arrive)
2. Installé un cert root malveillant sur le device (jailbreak / root, ou device d'entreprise mal configuré)
3. Mis en place un proxy HTTPS interceptant (Charles, mitmproxy, …)

Le pinning vérifie que le cert vient bien d'un fingerprint connu, peu importe la chaîne CA. Empêche le MITM même avec une CA compromise.

## Options pour implémenter

### Option A — `react-native-ssl-pinning` (recommandé)

Lib officielle, dev build requis (déjà cas avec `expo-dev-client`).

```bash
npm install react-native-ssl-pinning
npx expo prebuild --clean  # ou via EAS Build
```

Puis dans `api/instance.ts`, on remplace l'adapter axios par un wrapper `fetch` de la lib :

```ts
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

const adapter = async (config) => {
  const response = await pinnedFetch(`${config.baseURL}${config.url}`, {
    method: config.method,
    headers: config.headers,
    body: config.data ? JSON.stringify(config.data) : undefined,
    sslPinning: {
      certs: ['eventez_prod_cert'], // bundle SHA256 fingerprints in app
    },
  });
  // ... convert to axios response shape
};
```

**Coût** :
- Build dev/prod doit être recompilé
- Rotation cert = release app obligatoire (planifier avant expiration)
- Bundle des fingerprints en assets (`certs/eventez.cer`)

### Option B — Public Key Pinning manuel

Stocker la SHA-256 fingerprint de la clé publique du serveur dans une constante chiffrée. Au moment du build, l'app récupère le cert via une première requête puis compare. **N'empêche pas un MITM dès la première requête** — donc pas une vraie protection.

### Option C — Skip pinning, miser sur les mitigations existantes

Pour une app qui n'est pas à risque de cyberguerre étatique, les mitigations en place (HTTPS, JWT signé, idempotency, Sentry) couvrent 99% des scénarios réalistes. Le pinning ajoute du risque opérationnel (rotation cert ratée → app cassée) plus que de sécurité réelle.

## Recommandation

**Option C** pour la version actuelle.

Si l'app traite des données ultra-sensibles à terme (santé, identité légale, gros transferts) → migrer vers l'**Option A** dans un sprint dédié, avec :
- Bundle des certs prod + staging
- Plan de rotation documenté
- Test d'expiration en CI
- Fallback "self-signed cert" pour le dev local

## Action immédiate

Aucune. Tâche blocked tant que l'arbitrage produit/sécurité n'est pas tranché.
