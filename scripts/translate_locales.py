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


def main():
    parser = argparse.ArgumentParser(description='Génère les traductions UI via Argos (gratuit, offline).')
    parser.add_argument('--langs', help='Codes séparés par des virgules (ex: es,pt,de).')
    parser.add_argument('--all', action='store_true', help='Toutes les langues couvertes par Argos.')
    parser.add_argument('--source', default=DEFAULT_SOURCE, help='Fichier source en.json.')
    parser.add_argument('--out', default=DEFAULT_OUT, help='Dossier de sortie.')
    parser.add_argument('--only-missing', action='store_true', help='Ne traduire que les clés absentes du fichier cible existant.')
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

    if args.all:
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
        if not ensure_model(target):
            print(f'  ⚠ pas de modèle Argos en->{target}, ignoré (restera en anglais dans l\'app).')
            continue

        existing = None
        out_path = os.path.join(args.out, f'{target}.json')
        if args.only_missing and os.path.exists(out_path):
            with open(out_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)

        memo = {}
        fn = make_translator(target, memo)
        start = time.time()
        translated = translate_tree(source, fn, existing, args.only_missing)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(translated, f, ensure_ascii=False, indent=2)
        dt = time.time() - start
        print(f'  ✓ {out_path} ({len(memo)} chaînes uniques, {dt:.0f}s)')
        generated.append(target)

    # Manifest (timestamp = version simple pour invalider le cache plus tard)
    manifest = {lang: int(time.time()) for lang in generated}
    with open(os.path.join(args.out, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f'\nTerminé. {len(generated)} langue(s) générée(s) dans {args.out}/')
    print('Publie ce dossier sur ton hébergement statique et pointe')
    print('EXPO_PUBLIC_TRANSLATIONS_URL dessus (ex: https://<user>.github.io/eventez-i18n).')


if __name__ == '__main__':
    main()
