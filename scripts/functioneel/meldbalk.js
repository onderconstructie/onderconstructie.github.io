// Meldbalk bovenaan: korte boodschap, oproep tot feedback, weg na het kruisje
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 9281); const S = process.env.SHOTS || 'shots';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const w of [320, 390, 1366]) { const c = await b.newContext({ viewport:{ width:w, height:800 }, hasTouch:w < 500, isMobile:w < 500, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(700); const welkom = await p.$('#welkom:not([hidden]) [data-welkom-weg], .welkom:not([hidden]) button'); 
    await p.evaluate(() => { localStorage.setItem('oc-app.welkom-weg', '1'); }); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(700);
    const m = await p.evaluate(() => { const r = document.getElementById('meld').getBoundingClientRect(), h = document.querySelector('.header').getBoundingClientRect(); return { top:r.top, h:r.height, b:r.bottom, kop:h.top, breed:document.documentElement.scrollWidth <= innerWidth, tekst:document.getElementById('meld').innerText.replace(/\s+/g, ' ').trim() }; });
    console.log('  ', w, 'hoogte', m.h, '|', m.tekst);
    ok(m.top === 0 && Math.abs(m.b - m.kop) < 1 && m.breed, w + ': de balk staat helemaal bovenaan, de kop sluit eronder aan, niets loopt over'); ok(m.h <= (w < 360 ? 70 : 48), w + ': de balk blijft laag (' + m.h + 'px)');
    ok(/bijgeschaafd|schaven nog bij/.test(m.tekst) && /Meld een fout of idee/.test(m.tekst), w + ': boodschap en oproep staan erin'); await p.screenshot({ path:S + '/meld-' + w + '.png', clip:{ x:0, y:0, width:w, height:300 } });
    await p.click('#meld-fb'); await p.waitForTimeout(400); ok(await p.isVisible('#fb-sheet'), w + ': Meld een fout of idee opent het venster Suggestie of fout'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); if (await p.isVisible('#fb-sheet')) await p.click('#fb-sheet [data-fb-close], #fb-close').catch(() => {});
    await p.waitForTimeout(200); ok(!(await p.isVisible('#fb-sheet')), w + ': het venster sluit weer');
    await p.click('#meld-x'); await p.waitForTimeout(200); ok(!(await p.isVisible('#meld')), w + ': kruisje sluit de balk'); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(500); ok(!(await p.isVisible('#meld')), w + ': ze blijft weg na herladen');
    ok(!E.length, w + ': geen paginafouten ' + E); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
