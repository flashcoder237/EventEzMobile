#!/usr/bin/env python3
"""
Génération GRATUITE des traductions d'interface (Argos Translate, hors-ligne).

Lit le fichier source `src/i18n/locales/en.json` et produit `{lang}.json` pour
chaque langue demandée, prêts à publier sur un hébergement statique (GitHub
Pages, etc.) que le mobile télécharge en OTA (cf. src/i18n/translations.ts).

100% gratuit : Argos Translate tourne EN LOCAL, sans clé API, sans carte.

────────────────────────────────────────────────────────────────────────────
INSTALLATION (une fois)
    pip install argostranslate

UTILISATION
    # Set de langues par défaut :
    python scripts/translate_locales.py

    # Langues précises :
    python scripts/translate_locales.py --langs es,pt,de,it,ar

    # Toutes les langues pour lesquelles un modèle en→X existe :
    python scripts/translate_locales.py --all

    # Ne (re)traduire que les clés manquantes (préserve les corrections
    # humaines déjà faites dans translations-dist/{lang}.json) :
    python scripts/translate_locales.py --langs es --only-missing

SORTIE
    translations-dist/{lang}.json   ← à publier sur le CDN
    translations-dist/manifest.json ← liste des langues générées
────────────────────────────────────────────────────────────────────────────

Notes :
- Les variables i18next `{{var}}`, les références `$t(...)` et les balises
  `<b>…</b>` sont PROTÉGÉES (jamais traduites) puis restaurées.
- Qualité « machine » : à réviser pour les langues prioritaires. Le moteur
  mobile a `fallbackLng:'en'` → une clé manquante/mauvaise retombe sur l'anglais.
- Argos ne couvre pas les 183 langues (~50 dispo). Les autres sont simplement
  ignorées (warning) → elles resteront en anglais côté app. C'est OK.
"""
import argparse
import json
import os
import re
import sys
import time

# ── Set de langues par défaut (parmi celles couvertes par Argos) ──────────────
DEFAULT_LANGS = [
    'es', 'pt', 'de', 'it', 'nl', 'ru', 'ar', 'tr',
    'zh', 'ja', 'ko', 'pl', 'uk', 'vi', 'id', 'hi',
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_SOURCE = os.path.join(REPO_ROOT, 'src', 'i18n', 'locales', 'en.json')
DEFAULT_OUT = os.path.join(REPO_ROOT, 'translations-dist')

# Sentinelles en zone privée Unicode : MT ne les altère pas.
_OPEN, _CLOSE = '', ''
# Capture : {{var}}, {{var, formatter}}, $t(ns:key), <tag>, </tag>
_PROTECT_RE = re.compile(r'(\{\{.*?\}\}|\$t\([^)]*\)|</?[a-zA-Z][^>]*>)')
_RESTORE_RE = re.compile(_OPEN + r'\s*(\d+)\s*' + _CLOSE)


def protect(text):
    """Remplace les tokens non-traduisibles par des sentinelles."""
    tokens = []

    def repl(m):
        tokens.append(m.group(0))
        return f'{_OPEN}{len(tokens) - 1}{_CLOSE}'

    return _PROTECT_RE.sub(repl, text), tokens


def restore(text, tokens):
    """Réinjecte les tokens d'origine à la place des sentinelles."""
    def repl(m):
        idx = int(m.group(1))
        return tokens[idx] if 0 <= idx < len(tokens) else m.group(0)

    return _RESTORE_RE.sub(repl, text)


def make_translator(target, memo):
    """Retourne une fonction text->traduction (mémoïsée), ou None si modèle absent."""
    import argostranslate.translate as tr

    def fn(text):
        if text in memo:
            return memo[text]
        protected, tokens = protect(text)
        try:
            out = tr.translate(protected, 'en', target)
        except Exception:
            out = protected  # échec ponctuel → garde le texte (sera restauré)
        out = restore(out, tokens)
        memo[text] = out
        return out

    return fn


def ensure_model(target):
    """Installe le paquet Argos en→target s'il existe. True si dispo."""
    import argostranslate.package as pkg
    import argostranslate.translate as tr

    # Déjà installé ?
    for lang in tr.get_installed_languages():
        if lang.code == 'en':
            for tl in tr.get_installed_languages():
                if tl.code == target and lang.get_translation(tl):
                    return True

    pkg.update_package_index()
    available = pkg.get_available_packages()
    match = next((p for p in available if p.from_code == 'en' and p.to_code == target), None)
    if not match:
        return False
    try:
        path = match.download()
        pkg.install_from_path(path)
        return True
    except Exception as exc:
        print(f'  ! échec installation modèle en->{target}: {exc}')
        return False


def all_available_targets():
    import argostranslate.package as pkg
    pkg.update_package_index()
    return sorted({p.to_code for p in pkg.get_available_packages() if p.from_code == 'en'})


def release_language(target, uninstall_disk=False):
    """
    Libère le modèle en->target après usage.

    - MÉMOIRE (toujours) : vide les caches internes d'Argos (traductions +
      objets CTranslate2 chargés en RAM) puis force le GC. Sans ça, chaque
      langue d'une vague empile son modèle en mémoire (~100+ Mo/langue) →
      consommation qui grimpe sur un run de 9 langues.
    - DISQUE (si uninstall_disk) : désinstalle le paquet de
      ~/.local/share/argos-translate. À activer quand l'espace disque du runner
      prime sur la vitesse (sinon on garde le modèle pour le cache CI / réutil).
    """
    import gc
    # 1. Libère la mémoire : les traductions Argos gardent des références au
    # modèle CTranslate2 chargé. On tente de vider les structures connues sans
    # dépendre d'une version précise de l'API (best-effort, tolérant).
    try:
        import argostranslate.translate as tr
        for lang in tr.get_installed_languages():
            # Chaque objet Language garde des Translation en cache interne.
            for attr in ('translations_from', 'translations_to'):
                cache = getattr(lang, attr, None)
                if isinstance(cache, list):
                    cache.clear()
                elif isinstance(cache, dict):
                    cache.clear()
        # CTranslate2 charge un Translator par modèle ; le déréférencer + GC
        # permet à CTranslate2 de libérer la RAM native.
    except Exception:
        pass
    gc.collect()

    # 2. Désinstalle du disque si demandé.
    if uninstall_disk:
        try:
            import argostranslate.package as pkg
            for p in pkg.get_installed_packages():
                if p.from_code == 'en' and p.to_code == target:
                    pkg.uninstall(p)
                    print(f'  ↳ modèle en->{target} désinstallé du disque.')
                    break
        except Exception as exc:
            print(f'  ! désinstallation en->{target} impossible : {exc}')


def translate_tree(node, fn, existing=None, only_missing=False):
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            ev = existing.get(k) if isinstance(existing, dict) else None
            out[k] = translate_tree(v, fn, ev, only_missing)
        return out
    if isinstance(node, list):
        return [translate_tree(x, fn, None, only_missing) for x in node]
    if isinstance(node, str):
        if only_missing and isinstance(existing, str) and existing.strip():
            return existing
        if not node.strip():
            return node
        return fn(node)
    return node


def count_strings(node):
    if isinstance(node, dict):
        return sum(count_strings(v) for v in node.values())
    if isinstance(node, list):
        return sum(count_strings(v) for v in node)
    return 1 if isinstance(node, str) and node.strip() else 0


def count_missing(source, existing):
    """Nombre de chaînes à traduire : présentes (non vides) dans la source mais
    absentes/vides dans `existing`. Sert à sauter une langue déjà complète."""
    if isinstance(source, dict):
        ex = existing if isinstance(existing, dict) else {}
        return sum(count_missing(v, ex.get(k)) for k, v in source.items())
    if isinstance(source, list):
        return sum(count_missing(x, None) for x in source)
    if isinstance(source, str) and source.strip():
        return 0 if (isinstance(existing, str) and existing.strip()) else 1
    return 0


def main():
    # Permet `from i18n_priority import ...` quel que soit le cwd d'appel.
    if SCRIPT_DIR not in sys.path:
        sys.path.insert(0, SCRIPT_DIR)

    parser = argparse.ArgumentParser(description='Génère les traductions UI via Argos (gratuit, offline).')
    parser.add_argument('--langs', help='Codes séparés par des virgules (ex: es,pt,de).')
    parser.add_argument('--all', action='store_true', help='Toutes les langues couvertes par Argos.')
    parser.add_argument('--wave', type=int, help='Traduire UNE vague de priorité (1..N). Cf. scripts/i18n_priority.py.')
    parser.add_argument('--priority', action='store_true',
                        help='Toutes les langues cibles dans l\'ordre de priorité (déconseillé en CI — préfère --wave).')
    parser.add_argument('--source', default=DEFAULT_SOURCE, help='Fichier source en.json.')
    parser.add_argument('--out', default=DEFAULT_OUT, help='Dossier de sortie.')
    parser.add_argument('--only-missing', action='store_true', help='Ne traduire que les clés absentes du fichier cible existant.')
    parser.add_argument('--free-disk', action='store_true',
                        help='Désinstalle chaque modèle du disque après usage (économie d\'espace, au prix de re-téléchargements). La RAM est TOUJOURS libérée après chaque langue.')
    args = parser.parse_args()

    try:
        import argostranslate  # noqa: F401
    except ImportError:
        print('Argos Translate non installé. Lance :\n    pip install argostranslate')
        sys.exit(1)

    if not os.path.exists(args.source):
        print(f'Source introuvable : {args.source}')
        sys.exit(1)

    with open(args.source, 'r', encoding='utf-8') as f:
        source = json.load(f)
    total = count_strings(source)
    print(f'Source : {args.source} ({total} chaînes)')

    if args.wave is not None:
        from i18n_priority import wave, wave_count
        targets = wave(args.wave)
        if not targets:
            print(f'Vague {args.wave} invalide (1..{wave_count()}). Rien à faire.')
            sys.exit(0)
        print(f'Vague {args.wave}/{wave_count()} : {", ".join(targets)}')
    elif args.priority:
        from i18n_priority import all_langs
        targets = all_langs()
        print(f'Ordre de priorité ({len(targets)} langues cibles) : {", ".join(targets)}')
    elif args.all:
        targets = [t for t in all_available_targets() if t != 'en']
        print(f'Langues Argos disponibles : {", ".join(targets)}')
    elif args.langs:
        targets = [c.strip() for c in args.langs.split(',') if c.strip()]
    else:
        targets = DEFAULT_LANGS

    os.makedirs(args.out, exist_ok=True)
    generated = []

    for target in targets:
        print(f'\n→ {target}')
        out_path = os.path.join(args.out, f'{target}.json')

        existing = None
        if args.only_missing and os.path.exists(out_path):
            try:
                with open(out_path, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
            except Exception:
                existing = None

        # En --only-missing : si la cible couvre DÉJÀ toutes les clés, on saute
        # sans même charger le modèle (économie de download + temps). C'est ce
        # qui rend les runs réguliers quasi instantanés quand rien n'a changé.
        if args.only_missing and existing is not None:
            missing = count_missing(source, existing)
            if missing == 0:
                print('  ✓ déjà complet, ignoré (aucune clé manquante).')
                continue
            print(f'  {missing} clé(s) manquante(s) à traduire.')

        if not ensure_model(target):
            print(f'  ⚠ pas de modèle Argos en->{target}, ignoré (restera en anglais dans l\'app).')
            continue

        memo = {}
        fn = make_translator(target, memo)
        start = time.time()
        translated = translate_tree(source, fn, existing, args.only_missing)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)
        dt = time.time() - start
        print(f'  ✓ {out_path} ({len(memo)} chaînes traduites, {dt:.0f}s)')
        generated.append(target)

        # Libère le modèle après CETTE langue avant de passer à la suivante :
        # sinon les modèles s'empilent en RAM (~100+ Mo/langue) sur une vague de
        # 9. --free-disk désinstalle aussi du disque (opt-in). memo/fn/translated
        # sont déréférencés pour que le GC de release_language les récupère.
        del fn, translated, memo
        release_language(target, uninstall_disk=args.free_disk)

    # Manifest : liste TOUTES les langues présentes (générées ce run + déjà là).
    # On conserve la version des langues inchangées, on bump celles (re)générées.
    old_manifest = {}
    manifest_path = os.path.join(args.out, 'manifest.json')
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                old_manifest = json.load(f)
        except Exception:
            old_manifest = {}
    available = sorted(
        f[:-5] for f in os.listdir(args.out)
        if f.endswith('.json') and f != 'manifest.json'
    )
    now = int(time.time())
    manifest = {
        lang: (now if lang in generated else old_manifest.get(lang, now))
        for lang in available
    }
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f'\nTerminé. {len(generated)} langue(s) (re)générée(s) dans {args.out}/')
    print('Publie ce dossier sur ton hébergement statique et pointe')
    print('EXPO_PUBLIC_TRANSLATIONS_URL dessus (ex: https://<user>.github.io/eventez-i18n).')


if __name__ == '__main__':
    main()
