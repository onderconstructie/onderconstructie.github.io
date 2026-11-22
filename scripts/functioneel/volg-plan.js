// Projectopdracht los geopend: een wijzer naar het plan. Eén tik: de stappenbalk met Volgende. In het plan zelf: geen wijzer.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['laptop', { width:1440, height:900 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); let p = await c.newPage();
    await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
    const fr = () => p.frames().find(f => /\/opdracht\/(\?|$)/.test(f.url()) && f !== p.mainFrame());
    // 1. in de app, los geopend
    await p.goto(B + '/#opdracht', { waitUntil:'networkidle' }); await p.waitForTimeout(2500);
    ok(await fr().isVisible('#oc-volgplan') && await p.isHidden('#pathbar'), w + ': los in de app: de wijzer staat er, de stappenbalk niet');
    await p.screenshot({ path:S + '/volgplan-' + w + '-los.png' });
    await fr().click('#oc-volgplan'); await p.waitForTimeout(1200);
    console.log(await p.evaluate(() => (document.querySelector('#pathbar .pb-next')||{}).title)); ok(await p.isVisible('#pathbar .pb-next') && /Volgende stap/.test(await p.getAttribute('#pathbar .pb-next', 'title')), w + ': één tik: de balk met Volgende (naar Productboom)');
    ok(await fr().isHidden('#oc-volgplan'), w + ': in het plan verdwijnt de wijzer');
    await p.screenshot({ path:S + '/volgplan-' + w + '-plan.png' });
    // 2. rechtstreekse link naar de tool, buiten de app
    await p.goto(B + '/opdracht/', { waitUntil:'networkidle' }); await p.waitForTimeout(800);
    ok(await p.isVisible('#oc-volgplan'), w + ': rechtstreekse link: de wijzer staat er');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), w + ': niets steekt uit');
    await p.screenshot({ path:S + '/volgplan-' + w + '-link.png' });
    await p.click('#oc-volgplan'); await p.waitForTimeout(3000);
    ok(new URL(p.url()).pathname === '/' && await p.isVisible('#pathbar .pb-next'), w + ': de link opent de app met de tool als stap 1, Volgende erbij');
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
