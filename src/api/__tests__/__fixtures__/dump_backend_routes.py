# -*- coding: utf-8 -*-
"""Dump every backend URL route under /api/ (generic regex + allowed HTTP methods) as JSON.

Usage (from EventEzBackend): .venv/Scripts/python.exe dump_routes.py out.json
"""
import os
import sys
import json
import re

sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402

django.setup()
from django.urls import get_resolver, URLPattern, URLResolver  # noqa: E402
from django.urls.resolvers import RoutePattern, RegexPattern  # noqa: E402

GROUP = '(?:[^/]+)'


def collapse_named(r):
    """Replace each named group (?P<x>...) (balanced parens) by a generic segment."""
    out = []
    i = 0
    while i < len(r):
        m = re.match(r'\(\?P<\w+>', r[i:])
        if m:
            depth = 0
            j = i
            while j < len(r):
                c = r[j]
                if c == '\\':
                    j += 2
                    continue
                if c == '(':
                    depth += 1
                elif c == ')':
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            out.append(GROUP)
            i = j + 1
        else:
            out.append(r[i])
            i += 1
    return ''.join(out)


def pat_to_regex(p):
    if isinstance(p, RoutePattern):
        s = str(p._route)
        parts = re.split(r'(<(?:\w+:)?\w+>)', s)
        res = []
        for x in parts:
            m = re.fullmatch(r'<(?:(\w+):)?\w+>', x)
            if m:
                res.append('(?:.+)' if m.group(1) == 'path' else GROUP)
            else:
                res.append(re.escape(x))
        return ''.join(res)
    r = p._regex if isinstance(p, RegexPattern) else str(p)
    if r.startswith('^'):
        r = r[1:]
    if r.endswith('$'):
        r = r[:-1]
    r = r.replace('\\Z', '')
    return collapse_named(r)


STD = ['get', 'post', 'put', 'patch', 'delete']


def methods_for(cb):
    actions = getattr(cb, 'actions', None)
    if actions:
        return sorted(m.upper() for m in actions.keys() if m in STD)
    cls = getattr(cb, 'view_class', None) or getattr(cb, 'cls', None)
    if cls is not None:
        names = getattr(cls, 'http_method_names', STD)
        found = sorted(m.upper() for m in STD if m in names and hasattr(cls, m))
        return found or ['*']
    return ['*']


out = []


def walk(patterns, prefix=''):
    for p in patterns:
        if isinstance(p, URLResolver):
            walk(p.url_patterns, prefix + pat_to_regex(p.pattern))
        elif isinstance(p, URLPattern):
            out.append({
                'regex': prefix + pat_to_regex(p.pattern),
                'methods': methods_for(p.callback),
                'name': p.name or '',
            })


walk(get_resolver().url_patterns)
api = []
for r in out:
    if r['regex'].startswith('api/'):
        r['regex'] = r['regex'][len('api/'):]
        api.append(r)
seen = set()
res = []
for r in api:
    k = (r['regex'], tuple(r['methods']))
    if k in seen:
        continue
    seen.add(k)
    res.append(r)
json.dump(
    {
        'generated_by': 'EventEzBackend urlconf dump (regenerate: see README in this folder)',
        'count': len(res),
        'routes': res,
    },
    open(sys.argv[1], 'w', encoding='utf-8'),
    indent=1,
    ensure_ascii=False,
)
print(len(res), 'routes')
