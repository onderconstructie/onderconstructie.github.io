// Tik op het versienummer in de voet: je leest wat er nieuw is in die versie. Zonder verbinding: een eerlijke melding.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['laptop', { width:1440, height:900 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage();
    await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
    const v = (await p.textContent('#ver-open')).trim(); const lijst = await (await p.request.get(B + '/nieuw.json')).json();
    ok(lijst[0].v === v.replace('v', ''), w + ': de bovenste nota hoort bij de versie in de voet (' + v + ')');
    await p.click('#ver-open'); await p.waitForSelector('.ver-nu');
    ok((await p.textContent('.ver-nu')).includes(lijst[0].t), w + ': het venster toont de nota van deze versie');
    ok(await p.locator('.ver-rij').count() === 4 && (await p.textContent('.ver-rij >> nth=0')).includes(lijst[1].v), w + ': daaronder de vier versies ervoor');
    ok(await p.evaluate(() => { const r = document.getElementById('ver').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), w + ': het venster past op het scherm');
    await p.screenshot({ path:S + '/versie-' + w + '.png' });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(!(await p.evaluate(() => document.getElementById('ver').open)), w + ': Escape sluit');
    await p.route('**/nieuw.json', r => r.abort()); await p.click('#ver-open'); await p.waitForTimeout(400);
    ok(/verbinding/.test(await p.textContent('#ver-in')) && (await p.textContent('#ver-in')).includes(v), w + ': zonder verbinding: de versie en een eerlijke melding');
    await p.click('#ver-dicht'); ok(!(await p.evaluate(() => document.getElementById('ver').open)), w + ': het kruisje sluit');
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
