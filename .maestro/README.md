# Maestro E2E Tests — EventEz Mobile

Tests end-to-end via [Maestro](https://maestro.mobile.dev/) sur emulator
Android ou simulator iOS. La suite couvre **53+ flows** sur tous les
parcours utilisateur critiques.

## Setup local

```bash
# 1. Installer Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"

# 2. Lancer un emulator Android OU simulator iOS
emulator -avd Pixel_6_API_34 &   # Android
# OU : open -a Simulator         # iOS

# 3. Build dev de l'app
cd EventEzMobile
npx expo run:android   # OU run:ios

# 4. Variables d'environnement attendues par les flows
export APP_ID=com.eventez.mobile
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=test_password
export TEST_ORGANIZER_EMAIL=organizer@example.com
export TEST_ORGANIZER_PASSWORD=organizer_password
export TEST_EVENT_TITLE="Festival Indie Test"
export TEST_PAYMENT_ID=replace-with-real-payment-id

# 5. Lancer un flow
maestro test .maestro/01_auth_login.yaml

# OU toute la suite
maestro test .maestro/
```

## Organisation

Les flows sont numérotés par parcours, pas chronologiquement :

| Range | Catégorie |
|---|---|
| 01-12 | Auth + onboarding (login, register, password reset, logout) |
| 03-08 | Browse / Discover / Event details / Tickets |
| 09-10, 26 | Création / édition d'event |
| 10, 19, 52 | Messagerie |
| 14, 20, 33 | Paiements / Abonnements |
| 23-25, 35-38 | Organizer dashboard (wallet, scanner, discounts, reports) |
| 29-32, 42-43, 50 | Admin (users, treasury, moderation, audit) |
| **60** | **Deep links (eventez://) ← ce repo récent** |

## Le flow deep link

`60_deep_link_payment_return.yaml` simule le retour de WebBrowser après un
paiement CinetPay/Stripe : l'OS ouvre l'app via `eventez://payment-success/{id}`
et l'app doit naviguer **directement** vers PaymentSuccessScreen, sans
passer par Discover.

C'est un cas que Jest ne peut PAS tester (deep link cold-start = vraie
intent Android / Universal Link iOS). Maestro le couvre via `openLink`.

## CI integration (optionnel)

[`maestro-cloud` GitHub Action](https://maestro.mobile.dev/cloud/getting-started) :

```yaml
- uses: mobile-dev-inc/action-maestro-cloud@v1
  with:
    api-key: ${{ secrets.MAESTRO_CLOUD_API_KEY }}
    app-file: app-release.apk
    flows: .maestro/
```

## Conventions

- **Pas de hardcoded credentials** — utilise `${TEST_*}` env vars
- **Idempotent** : un flow doit pouvoir tourner 2× sans casser (cleanup en fin
  ou `clearState: true` au début)
- **Stabilité** : `waitForAnimationToEnd` après chaque tap, `waitForLaunch` au
  début
- **Sélecteurs** : préférer `text:` quand visible, `id:` pour les éléments
  non textuels
- **Screenshots** : `takeScreenshot: <name>` aux étapes clés pour debug
