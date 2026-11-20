// Start: "Verder waar je was" en "Je favorieten" klap je dicht (onthouden); Onlangs maak je in één keer leeg (werk blijft); favorieten in één keer weg.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 9281); const S = process.env.SHOTS || 'shots';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const w of [390, 1366]) { const c = await b.newContext({ viewport:{ width:w, height:850 }, hasTouch:w < 500, isMobile:w < 500, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.setItem('oc-app.welkom-weg', '1'); const n = Date.now() - 60000, u = {}; ['paradox', 'qr', 'kompas', 'hier', 'adem'].forEach((id, i) => { u[id] = { t:n - i * 3600e3, n:2 }; }); localStorage.setItem('raci.v1', JSON.stringify({ lijsten:[{ id:'a', naam:'Premieloket', taken:['x'], rollen:['y'] }] })); u.raci = { t:n + 5, n:3 }; localStorage.setItem('oc-app.usage', JSON.stringify(u)); localStorage.setItem('oc-app.favs', JSON.stringify(['agenda', 'kladblok', 'adem', 'kantelpunt'])); });
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(800);
    const zicht = sel => p.isVisible(sel), hoog = () => p.evaluate(() => Math.round(document.getElementById('start').getBoundingClientRect().top + scrollY));
    // standaard: Verder waar je was open; op een gsm staan Onlangs en Je favorieten dicht, op een groter scherm open
    const st = await p.evaluate(() => ['mywork', 'onlangs', 'favs'].map(i => document.getElementById(i + '-luik').getAttribute('aria-expanded')).join());
    ok(st === (w < 700 ? 'true,false,false' : 'true,true,true'), w + ': standaard ' + (w < 700 ? 'Onlangs en favorieten dicht' : 'alles open') + ' (' + st + ')');
    if (w < 700) { ok(await zicht('#resume') && !(await zicht('#cont .rc-ic')) && !(await zicht('#fav-grid')) && /4 tools/.test(await p.textContent('#onlangs-som')), w + ': de grote knop staat er, de twee luikjes zijn één regel'); await p.screenshot({ path:S + '/luik-standaard-' + w + '.png' });
      await p.click('#onlangs-luik'); await p.click('#favs-luik'); await p.waitForTimeout(300); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600); ok(await zicht('#cont .rc-ic') && await zicht('#fav-grid'), w + ': zelf opengezet blijft open na herladen'); }
    else { await p.click('#onlangs-luik'); await p.waitForTimeout(200); ok(!(await zicht('#cont .rc-ic')) && !(await zicht('#cont-leeg')) && await zicht('#resume'), w + ': Onlangs klapt apart dicht, de grote knop blijft'); await p.click('#onlangs-luik'); await p.waitForTimeout(200); }
    ok(await zicht('#resume .rs') || await zicht('#resume button'), w + ': Verder waar je was staat open'); ok(await zicht('#fav-grid .fav-tile') && await zicht('#cont .rc-ic'), w + ': favorieten en Onlangs staan er');
    const h0 = await hoog();
    // dichtklappen
    await p.click('#mywork-luik'); await p.click('#favs-luik'); await p.waitForTimeout(300);
    ok(!(await zicht('#resume')) && !(await zicht('#recent-row')) && !(await zicht('#fav-grid')) && !(await zicht('#favs-edit')) && !(await zicht('#manage')), w + ': dicht: alleen de twee titels blijven');
    ok(await p.getAttribute('#mywork-luik', 'aria-expanded') === 'false' && await p.getAttribute('#favs-luik', 'aria-expanded') === 'false', w + ': de knoppen zeggen dat ze dicht zijn');
    const som = [await p.textContent('#mywork-som'), await p.textContent('#favs-som')]; ok(/Afstemmingsparadox en 4 meer/.test(som[0]) && som[1] === '4 tools', w + ': de samenvatting zegt wat erin zit (' + som.join(' | ') + ')');
    const h1 = await hoog(); ok(w >= 1200 ? h1 === h0 : h1 < h0 - 150, w + (w >= 1200 ? ': op een breed scherm staan de doelen ernaast en blijven ze staan' : ': Wat wil je doen? schuift flink omhoog') + ' (' + h0 + ' → ' + h1 + ')');
    const kl = await p.evaluate(() => [...document.querySelectorAll('.luik')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return r.height >= 44 && r.right <= innerWidth && r.left >= 0; })); ok(kl.every(Boolean) && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), w + ': tikdoelen groot genoeg, niets loopt over');
    await p.screenshot({ path:S + '/luik-dicht-' + w + '.png' });
    await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600); ok(!(await zicht('#resume')) && !(await zicht('#fav-grid')), w + ': na herladen nog dicht');
    // weer open, met het toetsenbord
    await p.focus('#mywork-luik'); await p.keyboard.press('Enter'); await p.focus('#favs-luik'); await p.keyboard.press('Space'); await p.waitForTimeout(300); ok(await zicht('#resume') && await zicht('#fav-grid'), w + ': Enter en spatie klappen weer open');
    // Onlangs leegmaken en terugzetten
    const voor = await p.evaluate(() => localStorage.getItem('raci.v1'));
    await p.click('#cont-leeg'); await p.waitForTimeout(300);
    ok(!(await zicht('#resume')) && !(await zicht('#cont .rc-ic')) && await zicht('#cont-terug'), w + ': Maak leeg: de grote knop en Onlangs zijn weg, met een regel om terug te zetten');
    ok(await p.evaluate(() => localStorage.getItem('raci.v1')) === voor && await zicht('#manage'), w + ': je werk staat er nog, Reservekopie blijft bereikbaar');
    await p.click('#cont-terug-k'); await p.waitForTimeout(300); ok(await zicht('#resume') && await zicht('#cont .rc-ic') && !(await zicht('#cont-terug')), w + ': Zet terug herstelt de lijst');
    await p.click('#cont-leeg'); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600); ok(!(await zicht('#resume')) && !(await zicht('#cont-terug')), w + ': leeg blijft leeg na herladen');
    await p.waitForTimeout(50); await p.evaluate(() => { logUse('adem'); renderRecent(); }); await p.waitForTimeout(200); ok(await zicht('#resume'), w + ': wat je daarna weer gebruikt, komt terug');
    // favorieten: alle weg in twee tikken
    ok(!(await zicht('#favs-alle')), w + ': Alle weg staat er niet buiten Bewerk'); await p.click('#favs-edit'); await p.waitForTimeout(200); ok(await zicht('#favs-alle'), w + ': in Bewerk staat Alle weg');
    await p.click('#favs-alle'); ok(/Zeker/.test(await p.textContent('#favs-alle')) && await p.evaluate(() => favs().length) === 4, w + ': eerste tik vraagt Zeker? en wist nog niets');
    await p.click('#favs-h'); await p.click('#favs-luik'); await p.waitForTimeout(200); ok(await p.evaluate(() => favs().length) === 4, w + ': ergens anders tikken annuleert');
    await p.click('#favs-edit'); await p.click('#favs-alle'); await p.click('#favs-alle'); await p.waitForTimeout(300); ok(await p.evaluate(() => favs().length) === 0 && !(await zicht('#favs')), w + ': tweede tik haalt alle favorieten weg');
    ok(!E.length, w + ': geen paginafouten ' + E); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
