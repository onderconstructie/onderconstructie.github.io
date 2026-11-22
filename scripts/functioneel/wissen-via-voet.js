// Wissen staat niet meer op Start: je bereikt het via de voet (Reservekopie en wissen).
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['laptop', { width:1440, height:900 }]]) {
    const c = await b.newContext({ viewport:vp }); const p = await c.newPage();
    await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); if (!sessionStorage.getItem('gezet')) { localStorage.setItem('raci.v1', '{"proef":1}'); sessionStorage.setItem('gezet', '1'); } });
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(700);
    ok(!(await p.$('#exit-mw')), w + ': geen vuilbakje op Start');
    ok(/(wissen|gegevens)/.test(await p.textContent('#data-open')), w + ': de voet zegt Reservekopie en wissen');
    await p.click('#data-open'); await p.waitForTimeout(400); ok(await p.isVisible('#shared-exit'), w + ': in het venster staat de ingang om te wissen');
    await p.click('#shared-exit'); await p.waitForTimeout(500); ok(await p.isVisible('#exit-sheet') && await p.isVisible('#exit-go'), w + ': het wisvenster gaat open');
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
