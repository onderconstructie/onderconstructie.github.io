// Start met een lopend plan (v17.17): twee zones vanaf tabletbreedte, niets uitgerokken, en "Stap X van Y" op één plek.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['ipad', { width:820, height:1180 }], ['laptop', { width:1440, height:900 }], ['groot', { width:1920, height:1080 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage();
    await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('raci.v1', '{"proef":1}'); });
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.evaluate(() => { store.set('paths-started', ['project']); ['adem', 'opdracht', 'raci', 'kanban'].forEach((x, i) => { logUse(x); }); store.set('favs', ['opdracht', 'kanban', 'notities']); }); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);
    const m = await p.evaluate(() => { const r = s => { const e = document.querySelector(s); return e && e.getClientRects().length ? e.getBoundingClientRect() : null; }; const st = r('#start'), pl = r('#paths-wrap'), kaart = r('#paths-wrap .path'), tegel = r('#stiles .stile'), fav = r('#favs .fav-tile'), main = r('.main');
      const tekst = s => String((document.querySelector(s) || {}).textContent || '').replace(/\s+/g, ' ').trim();
      return { st:st && [st.left, st.right, st.top], pl:pl && [pl.left, pl.right, pl.top], kaart:kaart && kaart.width, tegel:tegel && tegel.width, fav:fav && fav.left, main:main && [main.left, main.width], over:document.documentElement.scrollWidth > innerWidth + 1,
        verder:tekst('#resume'), tegelT:tekst('.stile[data-start="project"] .st-cta'), plan:tekst('#paths .path-note') }; });
    const stap = (m.verder.match(/Stap (\d+) van (\d+)/) || []).slice(1).join('/');
    ok(!m.over, w + ': niets steekt uit');
    ok(!!stap && /^(Verder)+$/.test(m.tegelT) && !/\d/.test(m.tegelT) && (await p.evaluate(() => (document.querySelector('.main').innerText.match(/[Ss]tap \d+ van \d+/g) || []).length)) === 1, w + ': "Stap X van Y" staat op één plek, de tegel zegt gewoon Verder (' + stap + ' | ' + m.tegelT + ' | ' + m.plan + ')');
    if (w === 'gsm') ok(m.pl[2] > m.st[2] + 100, 'gsm: het stappenplan staat onder de doelen');
    else { ok(m.pl[0] >= m.st[1] && Math.abs(m.pl[2] - m.st[2]) < 40, w + ': doelen links, stappenplan rechts ernaast');
      ok(m.kaart <= 620 && m.tegel <= 640, w + ': plankaart (' + Math.round(m.kaart) + ') en doelkaarten (' + Math.round(m.tegel) + ') zijn niet uitgerokken');
      ok(Math.abs(m.fav - m.st[0]) < 8, w + ': favorieten lijnen links met de rest'); }
    await p.screenshot({ path:S + '/start-werk-' + w + '.png', fullPage:true }); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
