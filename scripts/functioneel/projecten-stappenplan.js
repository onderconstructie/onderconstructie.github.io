const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9161);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 320, height: 640 }]) { const c = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.addInitScript(() => { if (!localStorage.getItem('oc-app.welkom-weg')) localStorage.setItem('oc-app.welkom-weg', '1'); }); await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    await p.tap('.tab[data-tab="projecten"]'); await p.waitForTimeout(800);
    const sw = await p.evaluate(() => [...document.querySelectorAll('.vs-opt')].filter(x => x.offsetParent).map(x => ({ t: x.innerText.trim(), past: x.scrollWidth <= x.clientWidth + 1, h: Math.round(x.getBoundingClientRect().height), aan: x.getAttribute('aria-checked') })));
    console.log('   ', JSON.stringify(sw)); ok(sw.length === 3 && sw.map(x => x.t).join('|') === 'Stappenplan|Fase|Onderwerp', vp.width + ' drie keuzes'); ok(sw.every(x => x.past && x.h >= 44), vp.width + ' tekst past, 44 hoog');
    ok(!(await p.isVisible('#plan-keuze')) && await p.isVisible('#cycle'), vp.width + ' fase: geen blok, wel de cirkel'); await p.screenshot({ path: `shots/nav5-${vp.width}-fase.png` });
    await p.tap('.vs-opt[data-view="plan"]'); await p.waitForTimeout(500);
    ok(await p.isVisible('#plan-keuze') && !(await p.isVisible('#cycle')) && !(await p.isVisible('#groups .group')), vp.width + ' stappenplan: alleen de plannen'); ok((await p.$$('#plan-keuze .pk-rij')).length === 3, vp.width + ' drie plannen'); ok(/3 stappenplannen/i.test(await p.innerText('#proj-top')), vp.width + ' kop: 3 stappenplannen'); await p.screenshot({ path: `shots/nav5-${vp.width}-plan.png` });
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), vp.width + ' niets te breed');
    await p.tap('#plan-keuze .pk-rij[data-ctx="project"]'); await p.waitForTimeout(700); if (await p.isVisible('#pn-name')) { await p.fill('#pn-name', 'Nieuw loket'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }
    ok(/stap 1 van 7/i.test(await p.textContent('#pathbar')), vp.width + ' plan gestart');
    await p.tap('#back'); await p.waitForTimeout(700); if (!(await p.isVisible('#viewsw'))) { await p.tap('.tab[data-tab="projecten"]'); await p.waitForTimeout(700); } await p.waitForTimeout(2600);
    ok(/Stap 1 van 7: Projectopdracht/.test(await p.textContent('#plan-keuze .pk-rij')), vp.width + ' terug: je eigen plan staat eerst, met je stap'); await p.screenshot({ path: `shots/nav5-${vp.width}-bezig.png` });
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700); await p.tap('.tab[data-tab="projecten"]'); await p.waitForTimeout(600); ok(await p.isVisible('#plan-keuze'), vp.width + ' de keuze Stappenplan is onthouden');
    await p.tap('.vs-opt[data-view="onderwerp"]'); await p.waitForTimeout(500); ok(!(await p.isVisible('#plan-keuze')) && await p.isVisible('#groups .group'), vp.width + ' onderwerp: de groepen');
    await p.tap('.vs-opt[data-view="fase"]'); await p.waitForTimeout(500); const m = await p.evaluate(() => ({ onder: Math.round(Math.max(...[...document.querySelectorAll('.cy-st')].map(x => x.getBoundingClientRect().bottom))), nav: Math.round(document.querySelector('.tab').closest('nav, div').getBoundingClientRect().top) })); console.log('   ', JSON.stringify(m)); if (vp.height >= 740) ok(m.onder <= m.nav, vp.width + ' fase: de vier fasen volledig in beeld');
    ok(!E.length, vp.width + ' geen paginafouten ' + E); await c.close(); }
  // breed scherm: zoals het was
  { const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e)));
    await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('oc-app.view', JSON.stringify('plan')); }); await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800); await p.click('.tab[data-tab="projecten"]'); await p.waitForTimeout(700);
    console.log('   opslag view:', await p.evaluate(() => Object.keys(localStorage).filter(k => /view/.test(k)).map(k => k + '=' + localStorage.getItem(k)).join(' ')));
    const sw = await p.evaluate(() => [...document.querySelectorAll('.vs-opt')].filter(x => x.offsetParent).map(x => x.innerText.replace(/\s+/g, ' ').trim())); ok(sw.join('|') === 'Stappenplan|Per fase|Per onderwerp', '1280 drie keuzes: ' + sw.join('|'));
    ok(await p.isVisible('#plan-keuze') && !(await p.isVisible('#cycle')) && (await p.$$('#plan-keuze .pk-rij')).length === 3, '1280 de bewaarde keuze Stappenplan toont de drie plannen');
    ok(/3 stappenplannen/i.test(await p.innerText('#proj-top')) && !/4 fasen/i.test(await p.innerText('#proj-top')), '1280 kop: 3 stappenplannen'); await p.screenshot({ path: 'shots/nav5-1280-plan.png' });
    await p.click('.vs-opt[data-view="fase"]'); await p.waitForTimeout(400); ok(/4 fasen/i.test(await p.innerText('#proj-top')) && !(await p.isVisible('#plan-keuze')) && await p.isVisible('#cycle'), '1280 fase: kop 4 fasen, de cirkel, geen plannen');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500); ok((await p.$$eval('.vs-opt', a => a.filter(x => x.offsetParent).length)) === 3, 'venster smaller: drie keuzes'); ok(!E.length, '1280 geen paginafouten ' + E); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
