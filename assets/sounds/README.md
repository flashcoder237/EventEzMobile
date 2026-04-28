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
