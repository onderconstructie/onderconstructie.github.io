// Start, één logica: titel of pijltje = in/uitklappen (pijltje altijd rechts op dezelfde plek); kruisje = van Start halen, met "Zet terug"; je werk blijft.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 9281); const S = process.env.SHOTS || 'shots';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const w of [390, 1366]) { const c = await b.newContext({ viewport:{ width:w, height:850 }, hasTouch:w < 500, isMobile:w < 500, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.setItem('oc-app.welkom-weg', '1'); const n = Date.now() - 60000, u = {}; ['paradox', 'qr', 'kompas', 'hier', 'adem'].forEach((id, i) => { u[id] = { t:n - i * 3600e3, n:2 }; }); localStorage.setItem('raci.v1', '{"proef":1}'); localStorage.setItem('oc-app.usage', JSON.stringify(u)); localStorage.setItem('oc-app.favs', JSON.stringify(['agenda', 'kladblok', 'adem', 'kantelpunt'])); });
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(800);
    const zicht = sel => p.isVisible(sel), stand = () => p.evaluate(() => ['mywork', 'onlangs', 'favs'].map(i => document.getElementById(i + '-luik').getAttribute('aria-expanded')).join());
    const pijlen = () => p.evaluate(() => [...document.querySelectorAll('.luik-k')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return Math.round(r.left) + '/' + Math.round(r.width) + 'x' + Math.round(r.height); }));
    // vanaf 1000 px staat Onlangs rechts naast je werk en staan de favorieten eronder: het pijltje van je werk staat aan het eind van de linkerkolom,
    // de andere aan de rechterrand, op dezelfde plek. Open of dicht: elk pijltje blijft waar het stond.
    const zelfdeX = a => a.length && a.every(x => /\/44x44$/.test(x)) && (w < 1000 ? a.every(x => x === a[0]) : (() => { const r = a[a.length - 1], l = a.filter(x => x !== r); return l.length === 1 && parseInt(l[0]) < parseInt(r); })());
    // standaard: alles open, behalve Onlangs op een gsm
    ok(await stand() === (w < 700 ? 'true,false,true' : 'true,true,true'), w + ': standaard ' + (w < 700 ? 'alleen Onlangs dicht' : 'alles open') + ' (' + await stand() + ')');
    ok(await zicht('#resume') && await zicht('#fav-grid .fav-tile'), w + ': de grote knop en de favorieten staan er');
    if (w < 700) { ok(!(await zicht('#cont .rc-ic')) && /4 tools/.test(await p.textContent('#onlangs-som')), w + ': Onlangs is één regel met wat erin zit'); await p.screenshot({ path:S + '/luik-standaard-' + w + '.png' }); await p.click('.luik-k[data-luik="onlangs"]'); await p.waitForTimeout(250); }
    ok(await zicht('#cont .rc-ic'), w + ': Onlangs open');
    // het pijltje staat bij elk luikje op dezelfde plek, open én dicht
    const open = await pijlen(); ok(open.length === 3 && zelfdeX(open), w + ': drie pijltjes, zelfde plek en 44 px groot (' + open.join(' ') + ')');
    for (const i of ['onlangs', 'favs', 'mywork']) { await p.click(`.luik-k[data-luik="${i}"]`); await p.waitForTimeout(150); }
    const dicht = await pijlen(); ok(dicht.length === 2 && zelfdeX(dicht) && dicht[0] === open[w < 1000 ? 0 : 1] && dicht[1] === open[2], w + ': dicht staan de pijltjes nog op dezelfde plek (' + dicht.join(' ') + ')');
    ok(await stand() === 'false,false,false' && !(await zicht('#resume')) && !(await zicht('#fav-grid')) && !(await zicht('#favs-edit')) && !(await zicht('#manage')) && !(await zicht('#exit-mw')), w + ': dicht: alleen de titels en hun pijltje');
    ok(/Afstemmingsparadox en 4 meer/.test(await p.textContent('#mywork-som')) && await p.textContent('#favs-som') === '4 tools' && await zicht('#favs-som'), w + ': de samenvatting zegt wat erin zit');
    const licht = await p.evaluate(() => ['mywork-luik', 'favs-luik'].every(i => { const c = getComputedStyle(document.getElementById(i)); return c.boxShadow === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(c.backgroundColor); })); ok(licht, w + ': dicht is licht: geen kader, geen achtergrond');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), w + ': niets loopt over'); await p.screenshot({ path:S + '/luik-dicht-' + w + '.png' });
    await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600); ok(await stand() === 'false,false,false', w + ': na herladen nog dicht');
    // weer open: met het toetsenbord op de titel, en met een tik op de titel
    await p.focus('#mywork-luik'); await p.keyboard.press('Enter'); await p.focus('#favs-luik'); await p.keyboard.press('Space'); await p.click('#onlangs-luik'); await p.waitForTimeout(300); ok(await stand() === 'true,true,true' && await zicht('#cont .rc-ic'), w + ': de titel klapt ook open (Enter, spatie, tik)');
    ok(await p.evaluate(() => [...document.querySelectorAll('.luik-k')].every(e => e.tabIndex === -1 && e.getAttribute('aria-hidden') === 'true')), w + ': het pijltje is een extra tikdoel; met Tab kom je op de titel, één keer');
    // Onlangs: geen kruisje meer; het pijltje klapt dicht, wissen doe je via de voet
    ok(!(await p.$('#cont-leeg')) && !(await p.$('#exit-mw')) && !(await p.$('#mywork .luik-x')), w + ': geen kruisje en geen vuilbakje meer bij Verder waar je was en Onlangs');
    ok(await p.evaluate(() => localStorage.getItem('raci.v1')) === '{"proef":1}', w + ': je werk staat er nog');
    await p.waitForTimeout(50); await p.evaluate(() => { logUse('adem'); renderRecent(); }); await p.waitForTimeout(200); ok(await zicht('#resume'), w + ': wat je daarna weer gebruikt, komt terug');
    // favorieten: het kruisje in Bewerk haalt ze allemaal weg, met Zet terug
    ok(!(await zicht('#favs-alle')), w + ': het kruisje voor alle favorieten staat er niet buiten Bewerk'); await p.click('#favs-edit'); await p.waitForTimeout(200); ok(await zicht('#favs-alle'), w + ': in Bewerk staat het er');
    await p.click('#favs-alle'); await p.waitForTimeout(300); ok(await p.evaluate(() => favs().length) === 0 && !(await zicht('#favs')) && await zicht('#favs-terug'), w + ': alle favorieten weg, met een regel Zet terug');
    await p.click('#favs-terug-k'); await p.waitForTimeout(300); ok(await p.evaluate(() => favs().join()) === 'agenda,kladblok,adem,kantelpunt' && await zicht('#fav-grid .fav-tile') && !(await zicht('#favs-terug')), w + ': Zet terug zet ze in dezelfde volgorde terug');
    ok(!E.length, w + ': geen paginafouten ' + E); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
