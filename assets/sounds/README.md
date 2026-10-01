# Sound assets

Dépose ici les fichiers audio référencés par `src/services/soundService.ts` :

| Fichier | Usage | Durée recommandée |
|---|---|---|
| `payment-success.mp3` | Paiement validé / billet acheté | < 800 ms, chime montant |
| `scan-success.mp3` | QR scanné valide (check-in) | < 300 ms, blip montant clair |
| `scan-fail.mp3` | QR scanné invalide / refusé | < 400 ms, buzz court |

**Sources gratuites recommandées :**
- [Freesound.org](https://freesound.org) (CC0 / CC-BY)
- [Zapsplat](https://www.zapsplat.com) (gratuit avec compte)
- [Mixkit](https://mixkit.co/free-sound-effects/) (gratuit, sans attribution)

**Recommandations techniques :**
- Format `.mp3`, 96-128 kbps, mono
- Volume normalisé à -12 dB (jamais à 0 dB)
- Tester avec et sans casque, à plusieurs volumes système

Tant que les fichiers ne sont pas présents, le service log un warning en dev et fail silencieusement en prod (l'app continue de fonctionner sans son).

## Sons synthétisés (round 3, lot natif)

Générés par `scripts/generate_ui_sounds.py` (synthèse sinusoïdale + enveloppe,
-12 dBFS, mono 44,1 kHz) : aucun asset tiers, aucune licence à suivre.

| Fichier | Usage | Réglage |
|---|---|---|
| `ui-tap.wav` (40 ms) | `feedback.confirm()` sans son dédié | « Sons d'interface » (coupé par défaut) |
| `ui-toggle.wav` (70 ms) | réservé aux interrupteurs | idem |
| `ui-success.wav` (220 ms) | réservé aux actions réussies | idem |
| `brand-chime.wav` (650 ms) | moment « billet reçu » (carillon EventEz) | « Sons » (moments forts) |
| `sale-chime.wav` (300 ms) | moment « vente encaissée » (organisateur) | idem |
| `notification/eventez_chime.wav`, `notification/eventez_sale.wav` | canaux de notification `eventez_moments` / `eventez_sales` (noms res/raw Android : `[a-z0-9_]`) | réglages système |
