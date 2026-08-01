"""
Ordre de priorité des langues pour la génération i18n (après en/fr déjà bundlés).

Classé par nombre approximatif de locuteurs (L1+L2) dans le monde, découpé en
VAGUES. On traduit une vague à la fois (CI par batch) au lieu de tout d'un coup :
Argos télécharge un modèle ~100 Mo PAR langue → `--all` (180 langues) fait
exploser le temps CI et le cache GitHub. Par vagues de ~10, chaque run reste
court, contrôlable et reprend là où il s'est arrêté (`--only-missing`).

Seules les langues réellement couvertes par un modèle Argos en->X seront
générées ; les autres sont ignorées (l'app retombe sur l'anglais via
fallbackLng). La liste ci-dessous est donc une CIBLE ordonnée, pas une garantie.

Pour ajuster : réordonne/déplace les codes entre vagues. `all_langs()` aplatit
tout dans l'ordre.
"""

# Chaque sous-liste = une vague. Ordre = priorité décroissante.
WAVES = [
    # Vague 1 — top mondial (les plus parlés après en/fr), forte couverture Argos.
    ['es', 'zh', 'hi', 'ar', 'pt', 'ru', 'de', 'ja', 'it'],
    # Vague 2 — grands marchés + Europe/Asie majeurs.
    ['ko', 'tr', 'vi', 'id', 'pl', 'uk', 'nl', 'th', 'fa'],
    # Vague 3 — Afrique (marché EventEz) + langues régionales importantes.
    ['sw', 'ha', 'yo', 'am', 'zu', 'so', 'ig', 'sn', 'ny'],
    # Vague 4 — Asie du Sud / Sud-Est.
    ['bn', 'ta', 'te', 'ur', 'ms', 'ml', 'mr', 'gu', 'pa'],
    # Vague 5 — Europe (petits pays) + divers.
    ['el', 'cs', 'sv', 'da', 'fi', 'no', 'hu', 'ro', 'sk'],
    # Vague 6 — longue traîne (si modèle Argos dispo).
    ['he', 'bg', 'hr', 'sr', 'sl', 'lt', 'lv', 'et', 'ca'],
]


def wave(n: int):
    """Langues de la vague n (1-indexée). Liste vide si hors bornes."""
    return WAVES[n - 1] if 1 <= n <= len(WAVES) else []


def all_langs():
    """Toutes les langues cibles, aplaties dans l'ordre de priorité."""
    seen, out = set(), []
    for w in WAVES:
        for code in w:
            if code not in seen:
                seen.add(code)
                out.append(code)
    return out


def wave_count() -> int:
    return len(WAVES)
