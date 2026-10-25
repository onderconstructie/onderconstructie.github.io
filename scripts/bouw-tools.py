#!/usr/bin/env python3
"""Bouwt tools.json: de lijst van tools in de app, opgehaald uit de tools zelf.

Elke tool beschrijft zichzelf in zijn <head>:
    <title>Naam – Onder Constructie</title>
    <meta name="description" content="Wat de tool doet, in een zin of twee.">
    <meta name="oc:groep" content="projecten">           projecten | zakmes | reset
    <meta name="oc:labels" content="mensen, vergaderen">  thema's, met komma's (mag leeg als oc:pdca er is)
    <meta name="oc:pdca" content="plan, do">              optioneel: fase(s) in de PDCA-cyclus, sterkste eerst
    <meta name="oc:kort" content="Kanbanbord voor sprints en taken">
    <meta name="oc:volgorde" content="20">               volgorde zolang je een tool nog niet gebruikte
    <meta name="oc:achtergrond" content="nee">           optioneel: niet open laten in de app
    <meta name="oc:opslag" content="vinkje.v1, oc.share.vinkje">  optioneel: localStorage-sleutels van de tool
                                                          (een * achteraan is een voorvoegsel, bv. mm.*)
    <meta name="oc:traject" content="verandering:2">     optioneel: plaats in een stappenplan (naam:stap, komma's)
    <link rel="icon" href="data:image/svg+xml,...">      het icoon in de app

Een nieuwe tool toevoegen: die tags in de tool zetten en zijn pad hieronder in PADEN.

Gebruik:
    python3 scripts/bouw-tools.py                     haalt alles op van de live site
    python3 scripts/bouw-tools.py --lokaal map=pad    leest lokale bestanden (om te testen)
"""
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

SITE = 'https://onderconstructie.github.io'
PADEN = [
    '/project-radar/', '/kanban/', '/stakeholders/', '/risico/', '/mixer/', '/paradox/',
    '/fortuna/', '/check-in/', '/project-realisme/', '/vinkje/',
    '/beslissingen/', '/raci/', '/prioriteit/', '/retro/', '/vergaderkost/',
    '/gap/', '/weerstand/', '/impact/', '/klimaat/', '/veranderprofiel/', '/sponsor/', '/communicatie/', '/stroom/', '/mindmap/', '/gedrag/', '/visgraat/',
    '/qr/', '/focus/', '/zakmes/looplicht/', '/zakmes/memomities/',
    '/hier/', '/adem/', '/hart/',
]
GROEPEN = {'projecten', 'zakmes', 'reset'}
PDCA = ['plan', 'do', 'check', 'act']
TRAJECTEN = ['verandering', 'project']


class Kop(HTMLParser):
    """Leest alleen wat in <head> staat."""
    def __init__(self):
        super().__init__()
        self.meta, self.icoon, self.titel, self._in_titel, self.klaar = {}, None, '', False, False

    def handle_starttag(self, tag, attrs):
        if self.klaar:
            return
        a = dict(attrs)
        if tag == 'meta' and a.get('name'):
            self.meta[a['name']] = a.get('content', '')
        elif tag == 'link' and 'icon' in (a.get('rel') or '').split() and not self.icoon:
            self.icoon = a.get('href')
        elif tag == 'title':
            self._in_titel = True
        elif tag == 'body':
            self.klaar = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self._in_titel = False
        elif tag == 'head':
            self.klaar = True

    def handle_data(self, data):
        if self._in_titel:
            self.titel += data


def lees(pad, lokaal):
    if lokaal is not None:
        for prefix, map_ in lokaal.items():
            if pad.startswith(prefix):
                bestand = map_ + pad[len(prefix):] + 'index.html'
                return open(bestand, encoding='utf-8').read()
        raise FileNotFoundError(pad)
    with urllib.request.urlopen(SITE + pad, timeout=30) as r:
        return r.read().decode('utf-8')


def svg_uit(href, pad):
    if not href:
        raise ValueError(f'{pad}: geen <link rel="icon">')
    if not href.startswith('data:image/svg+xml'):
        raise ValueError(f'{pad}: het icoon moet een inline SVG zijn (data:image/svg+xml,...)')
    data = href.split(',', 1)[1]
    return urllib.parse.unquote(data)


def tool(pad, lokaal):
    k = Kop()
    k.feed(lees(pad, lokaal))
    m = k.meta
    fout = lambda w: ValueError(f'{pad}: {w}')
    groep = m.get('oc:groep', '').strip()
    if groep not in GROEPEN:
        raise fout(f'oc:groep moet een van {sorted(GROEPEN)} zijn, niet "{groep}"')
    for nodig in ('oc:kort', 'description'):
        if not m.get(nodig, '').strip():
            raise fout(f'{nodig} ontbreekt')
    pdca = [p.strip().lower() for p in m.get('oc:pdca', '').split(',') if p.strip()]
    for p in pdca:
        if p not in PDCA:
            raise fout(f'oc:pdca kent alleen {PDCA}, niet "{p}"')
    traject = []
    for t in m.get('oc:traject', '').split(','):
        if not t.strip():
            continue
        naam, _, stap = t.strip().partition(':')
        if naam not in TRAJECTEN or not stap.strip().isdigit():
            raise fout(f'oc:traject moet naam:stap zijn met naam in {TRAJECTEN}, niet "{t.strip()}"')
        traject.append({'naam': naam, 'stap': int(stap)})
    labels = [l.strip() for l in m.get('oc:labels', '').split(',') if l.strip()]
    if not labels and not pdca:
        raise fout('geef minstens oc:labels of oc:pdca')
    titel = re.sub(r'\s*[–-]\s*Onder Constructie\s*$', '', html.unescape(k.titel).strip())
    return {
        'id': pad.strip('/').split('/')[-1],
        'g': groep,
        'path': pad,
        'title': titel,
        'sub': m['oc:kort'].strip(),
        'desc': m['description'].strip(),
        'labels': labels,
        'pdca': pdca,
        'order': int(m.get('oc:volgorde', '999') or 999),
        'keep': m.get('oc:achtergrond', '').strip().lower() != 'nee',
        'traject': traject,
        'storage': [k.strip() for k in m.get('oc:opslag', '').split(',') if k.strip()],
        'icon': svg_uit(k.icoon, pad),
    }


def main():
    lokaal = None
    if '--lokaal' in sys.argv:
        lokaal = {}
        for arg in sys.argv[sys.argv.index('--lokaal') + 1:]:
            prefix, map_ = arg.split('=', 1)
            lokaal[prefix] = map_.rstrip('/') + '/'
    try:
        vorige = {t['path']: t for t in json.load(open('tools.json', encoding='utf-8'))}
    except Exception:
        vorige = {}
    tools, fouten, waarschuwingen = [], [], []
    for pad in PADEN:
        try:
            tools.append(tool(pad, lokaal))
        except (FileNotFoundError, urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            # Nog niet (of tijdelijk niet) online: de vorige vermelding houden, zodat één tool niet alles tegenhoudt.
            if pad in vorige:
                tools.append(vorige[pad])
                waarschuwingen.append(f'{pad}: niet bereikbaar ({e}), vorige vermelding behouden')
            else:
                waarschuwingen.append(f'{pad}: niet bereikbaar ({e}), nog niet opgenomen')
        except Exception as e:
            fouten.append(str(e))
    ids = [t['id'] for t in tools]
    dubbel = sorted({i for i in ids if ids.count(i) > 1})
    if dubbel:
        fouten.append('dubbele id: ' + ', '.join(dubbel))
    for w in waarschuwingen:
        print('Let op: ' + w, file=sys.stderr)
    if fouten:
        print('Niet gebouwd. Problemen:\n  ' + '\n  '.join(fouten), file=sys.stderr)
        sys.exit(1)
    tools.sort(key=lambda t: ({'projecten': 0, 'zakmes': 1, 'reset': 2}[t['g']], t['order']))
    with open('tools.json', 'w', encoding='utf-8') as f:
        json.dump(tools, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'tools.json: {len(tools)} tools')


if __name__ == '__main__':
    main()
