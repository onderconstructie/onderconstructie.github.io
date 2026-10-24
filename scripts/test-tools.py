#!/usr/bin/env python3
"""Opent elke tool in een echte browser (Chromium) en controleert wat een gebruiker zou merken.

Faalt bij: een JavaScript-fout, horizontale overloop, tekst met te weinig contrast (WCAG AA),
of tekst kleiner dan 11px. Te kleine tikdoelen worden gemeld, maar laten de test niet falen.
Decoratieve onderdelen (aria-hidden) en uitgeschakelde knoppen tellen niet mee.

Gebruik:
    python3 scripts/test-tools.py                      test de tools in deze repo (lokale server)
    python3 scripts/test-tools.py --live               test de live site, alle tools uit tools.json
    python3 scripts/test-tools.py --url=http://...     test alle tools op een ander adres (bv. een lokale kopie)
"""
import functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

URL = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--url=')), None)
LIVE = '--live' in sys.argv or URL is not None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WIDTHS = (390, 1280)
HUBS = ['/app/', '/']

CHECK = r"""() => {
  const lum = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat);
    if (p.length > 3 && p[3] < 0.5) return null;
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(Number); if (p.length < 4 || p[3] > 0.5) return cs.backgroundColor; } }
    return 'rgb(255,255,255)'; };
  const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.3; };
  const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '');
  const low = [], small = [], tiny = [], seen = new Set();
  document.querySelectorAll('body *').forEach(el => {
    if (!vis(el) || el.closest('[aria-hidden="true"], [disabled], [aria-disabled="true"]')) return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    if (own && el.tagName !== 'OPTION' && el.tagName !== 'INPUT') {
      const sc = el.closest('svg') && el.getScreenCTM ? (el.getScreenCTM()?.a || 1) : 1;
      if (fs * sc < 10.9) small.push(`${name(el)} ${(fs * sc).toFixed(1)}px "${el.textContent.trim().slice(0, 20)}"`);
      if (!el.closest('svg')) {
        const fg = lum(cs.color), bgc = bgOf(el), bg = bgc && lum(bgc);
        if (fg != null && bg != null) {
          const r = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
          const big = fs >= 24 || (fs >= 18.6 && parseInt(cs.fontWeight) >= 700);
          const key = name(el);
          if (r < (big ? 3 : 4.5) && !seen.has(key)) { seen.add(key); low.push(`${key} ${r.toFixed(2)} "${el.textContent.trim().slice(0, 20)}"`); }
        }
      }
    }
    if (el.matches('button, a.back-link, [role=button], [role=tab]') && !el.closest('p, li > span')) {
      const r = el.getBoundingClientRect(); if ((r.height < 43 && r.width < 43) || r.height < 30) tiny.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  return { sw: document.documentElement.scrollWidth, low, small, tiny };
}"""


def serve():
    class Stil(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Stil, directory=ROOT)
    httpd = socketserver.TCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{httpd.server_address[1]}'


def pages():
    tools = json.load(open(os.path.join(ROOT, 'tools.json'), encoding='utf-8'))
    paths = [t['path'] for t in tools] + HUBS
    if LIVE:
        return paths
    # lokaal: alleen wat in deze repo staat (de andere tools hebben hun eigen repo)
    return [p for p in paths if os.path.exists(os.path.join(ROOT, p.strip('/'), 'index.html')) or p == '/']


def main():
    base = URL or ('https://onderconstructie.github.io' if LIVE else serve())
    fails, warns = [], []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for w in WIDTHS:
            ctx = browser.new_context(viewport={'width': w, 'height': 900}, service_workers='block')
            for path in pages():
                page = ctx.new_page(); errors = []
                page.on('pageerror', lambda e, errors=errors: errors.append(str(e).splitlines()[0][:120]))
                try:
                    page.goto(base + path, wait_until='load', timeout=30000); page.wait_for_timeout(400)
                    r = page.evaluate(CHECK)
                except Exception as e:
                    fails.append(f'{w:>4} {path}: laadt niet ({str(e).splitlines()[0][:100]})'); page.close(); continue
                where = f'{w:>4} {path}'
                for e in errors: fails.append(f'{where}: JavaScript-fout: {e}')
                if r['sw'] > w + 1: fails.append(f'{where}: loopt {r["sw"] - w}px buiten het scherm')
                for x in r['low'][:5]: fails.append(f'{where}: te weinig contrast: {x}')
                for x in r['small'][:5]: fails.append(f'{where}: tekst te klein: {x}')
                for x in r['tiny'][:3]: warns.append(f'{where}: klein tikdoel: {x}')
                page.close()
            ctx.close()
        browser.close()
    n = len(pages()) * len(WIDTHS)
    for x in warns: print('Let op: ' + x)
    for x in fails: print('FOUT:   ' + x)
    print(f'\n{n} pagina-breedtes getest, {len(fails)} fouten, {len(warns)} opmerkingen.')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
