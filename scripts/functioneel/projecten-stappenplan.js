const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9221);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) { const gsm = vp.width < 500; const c = await b.newContext({ viewport: vp, hasTouch: gsm, isMobile: gsm, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.addInitScript(() => { if (!localStorage.getItem('oc-app.welkom-weg')) localStorage.setItem('oc-app.welkom-weg', '1'); }); await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    await p.click('.tab[data-tab="projecten"]'); await p.waitForTimeout(700); await p.click('.vs-opt[data-view="plan"]'); await p.waitForTimeout(500);
    const kaarten = () => p.evaluate(() => [...document.querySelectorAll('#plan-keuze .path')].map(x => ({ t: x.querySelector('.path-title').textContent, open: x.classList.contains('open'), knop: (x.querySelector('.path-next') || {}).textContent ? x.querySelector('.path-next').textContent.replace(/\s+/g, ' ').trim() : '', stappen: [...x.querySelectorAll('.steps .step')].filter(s => s.offsetParent).length })));
    let k = await kaarten(); console.log('   ', JSON.stringify(k)); ok(k.length === 3 && k.every(x => !x.open && /Begin hier/.test(x.knop)), vp.width + ' drie plankaarten, dicht, elk met Begin hier');
    await p.screenshot({ path: `shots/nav7-${vp.width}-dicht.png` });
    if (gsm) { ok(await p.isVisible('#proj-top .th-hint'), '390 pijl rechtsboven staat er'); await p.tap('#proj-top .th-hint'); } else await p.click('#proj-top'); await p.waitForTimeout(500);
    k = await kaarten(); ok(k.every(x => x.open && x.stappen >= 5), vp.width + ' pijl of titel: alle drie open met hun stappen ' + k.map(x => x.stappen)); ok(await p.getAttribute('#proj-top', 'aria-expanded') === 'true', vp.width + ' pijl draait mee');
    await p.screenshot({ path: `shots/nav7-${vp.width}-open.png` });
    await p.click('#proj-top'); await p.waitForTimeout(400); k = await kaarten(); ok(k.every(x => !x.open), vp.width + ' nog een tik: alle drie dicht');
    await p.click('#plan-keuze .path[data-path="proces"] .path-head'); await p.waitForTimeout(400); k = await kaarten(); ok(k.find(x => /proces/.test(x.t)).open && !k.find(x => /project/.test(x.t)).open, vp.width + ' één plan openklappen');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('path-head') && !!document.activeElement.closest('#plan-keuze')), vp.width + ' de focus blijft op de kop van dat plan');
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), vp.width + ' niets te breed');
    await p.click('#plan-keuze .path[data-path="project"] .path-next'); await p.waitForTimeout(700); if (await p.isVisible('#pn-name')) { await p.fill('#pn-name', 'Nieuw loket'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }
    ok(/stap 1 van 7/i.test(await p.textContent('#pathbar')), vp.width + ' Begin hier start het plan');
    await p.click('#back'); await p.waitForTimeout(700); if (!(await p.isVisible('#viewsw'))) { await p.click('.tab[data-tab="projecten"]'); await p.waitForTimeout(700); } await p.waitForTimeout(2600);
    k = await kaarten(); console.log('   ', JSON.stringify(k.map(x => x.t + ' | ' + x.knop))); ok(/project/.test(k[0].t) && k[0].knop, vp.width + ' je eigen plan staat eerst, met een knop om verder te gaan');
    // Start toont nog altijd alleen wat begonnen is
    await p.click('.tab[data-tab="start"]'); await p.waitForTimeout(600); ok((await p.$$('#paths .path')).length === 1, vp.width + ' Start: alleen het begonnen plan');
    ok(!E.length, vp.width + ' geen paginafouten ' + E); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
