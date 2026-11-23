// Start met een lopend plan (v17.17): twee zones vanaf tabletbreedte, niets uitgerokken, en "Stap X van Y" op één plek.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['ipad', { width:820, height:1180 }], ['laptop', { width:1440, height:900 }], ['groot', { width:1920, height:1080 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage();
    await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('raci.v1', '{"proef":1}'); });
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.evaluate(() => { store.set('paths-started', ['project']); ['adem', 'opdracht', 'raci', 'kanban'].forEach((x, i) => { logUse(x); }); store.set('favs', ['opdracht', 'kanban', 'notities']); }); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);
    const m = await p.evaluate(() => { const r = s => { const e = document.querySelector(s); return e && e.getClientRects().length ? e.getBoundingClientRect() : null; }; const st = r('#start'), pl = r('#paths-wrap'), kaart = r('#paths-wrap .path'), tegel = r('#stiles .stile'), h1 = r('#start-h'), h2 = r('#paths-h'), ver = r('#resume'), onl = r('#recent-row'), fav = r('#favs .fav-tile'), main = r('.main');
      const tekst = s => String((document.querySelector(s) || {}).textContent || '').replace(/\s+/g, ' ').trim();
      return { vert:ver && onl && kaart && tegel && onl.left > ver.right ? [Math.round(tegel.right - ver.right), Math.round(kaart.left - onl.left)] : null, lijn:kaart && tegel ? Math.round(kaart.top - tegel.top) : null, kop:h1 && h2 ? Math.round(h2.top - h1.top) : null, st:st && [st.left, st.right, st.top], pl:pl && [pl.left, pl.right, pl.top], kaart:kaart && kaart.width, tegel:tegel && tegel.width, fav:fav && fav.left, main:main && [main.left, main.width], over:document.documentElement.scrollWidth > innerWidth + 1,
        verder:tekst('#resume'), tegelT:tekst('.stile[data-start="project"] .st-cta'), plan:tekst('#paths .path-note') }; });
    const stap = (m.verder.match(/Stap (\d+) van (\d+)/) || []).slice(1).join('/');
    ok(!m.over, w + ': niets steekt uit');
    ok(!!stap && /^(Verder)+$/.test(m.tegelT) && !/\d/.test(m.tegelT) && (await p.evaluate(() => (document.querySelector('.main').innerText.match(/[Ss]tap \d+ van \d+/g) || []).length)) === 1, w + ': "Stap X van Y" staat op één plek, de tegel zegt gewoon Verder (' + stap + ' | ' + m.tegelT + ' | ' + m.plan + ')');
    if (w === 'gsm') ok(m.pl[2] > m.st[2] + 100, 'gsm: het stappenplan staat onder de doelen');
    else { ok(m.pl[0] >= m.st[1] && Math.abs(m.pl[2] - m.st[2]) < 40, w + ': doelen links, stappenplan rechts ernaast');
      ok(Math.abs(m.lijn) <= 1 && Math.abs(m.kop) <= 1, w + ': de plankaart begint op dezelfde lijn als de eerste doelkaart (' + m.lijn + ' px), de koppen ook (' + m.kop + ' px)');
      if (m.vert) ok(Math.abs(m.vert[0]) <= 2 && Math.abs(m.vert[1]) <= 2, w + ': de kaders staan ook verticaal op één lijn met Verder waar je was en Onlangs (' + m.vert.join(', ') + ' px)');
      ok(m.kaart <= 620 && m.tegel <= 640, w + ': plankaart (' + Math.round(m.kaart) + ') en doelkaarten (' + Math.round(m.tegel) + ') zijn niet uitgerokken');
      ok(await p.evaluate(() => { const g = document.querySelector('#favs .fav-grid').getBoundingClientRect(), k = [...document.querySelectorAll('#favs .fav-tile')].map(e => e.getBoundingClientRect()), m = document.querySelector('.main').getBoundingClientRect(); const mid = (k[0].left + k[k.length - 1].right) / 2; return Math.abs(mid - (m.left + m.right) / 2) < 12; }), w + ': favorieten staan in het midden');
      ok(await p.evaluate(() => { const k = document.querySelector('#mywork .manage'); return !k || getComputedStyle(k).visibility === 'hidden' || !k.getClientRects().length; }), w + ': geen Reservekopie-knop meer bovenaan'); }
    await p.screenshot({ path:S + '/start-werk-' + w + '.png', fullPage:true }); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
