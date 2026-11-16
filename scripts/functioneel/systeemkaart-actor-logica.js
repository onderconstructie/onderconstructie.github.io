// Systeemkaart: actoren (wie doet het gedrag, zoals in Behavioural Systems Mapping) en de ingreep als groene pijlvorm (1.3).
// Gebruik: PORT=9461 node systeemkaart-actor-logica.js   (SK=/ander-pad/ om een andere bouw te toetsen)
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461), PAD = process.env.SK || '/systeemkaart/';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const T = s => String(s || '').replace(/\s+/g, ' ').trim();
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', acceptDownloads:true }); await c.addInitScript(() => { try { Object.defineProperty(navigator, 'clipboard', { value:{ writeText: async t => { window.__clip = t; } }, configurable:true }); } catch (e) {} });
  const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + PAD, { waitUntil:'networkidle' });
  const laad = async k => { await p.evaluate(k => { localStorage.setItem('systeemkaart.v1', JSON.stringify({ lists:[k], current:k.id })); }, k); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); };
  const zie = async () => { if (await p.getAttribute('#b-zie', 'aria-pressed') !== 'true') await p.click('#b-zie'); await p.waitForTimeout(250); };
  const lijst = () => p.evaluate(() => [...document.querySelectorAll('.sk-actoren [data-p="zie"]')].map(b => b.querySelector('b').textContent + ' | ' + b.querySelector('small').textContent));
  const klikActor = async () => { const x = p.locator('.sk-actoren [data-p="zie"]').first(); if (await x.count()) { await x.click(); await p.waitForTimeout(250); } };
  const vaag = () => p.evaluate(() => [...document.querySelectorAll('#sk-els .el')].filter(g => g.classList.contains('vaag')).map(g => g.dataset.el));

  // 1. De actorenlijst klopt voor de vier voorbeelden
  const verwacht = { premie:['Teamleden | 2 gedragingen, in een kring', 'Teamleiders | 1 gedrag'], werkdruk:['Teamleden | 1 gedrag, in een kring'], toxisch:['Leidinggevende | 1 gedrag, in een kring', 'Teamleden | 1 gedrag, in een kring'], thuis:['Leidinggevenden | 1 gedrag, in een kring', 'Medewerkers | 1 gedrag, in een kring'] };
  for (const vb of Object.keys(verwacht)) {
    await p.evaluate(vb => window.systeem.laadVoorbeeld(true, vb), vb); await p.waitForTimeout(250); await zie();
    const l = (await lijst()).map(x => x.split(':')[0]);
    ok(JSON.stringify(l) === JSON.stringify(verwacht[vb]), 'Wie doet wat in ' + vb + ': ' + (l.join(' / ') || 'geen lijst'));
  }
  // 2. Uitlichten: tik op een actor = zijn gedrag, de rest vaag; nog eens tikken of Esc = terug
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'toxisch')); await p.waitForTimeout(250); await zie();
  const st = await p.evaluate(() => window.systeem.staat()), lg = st.els.find(e => e.wie === 'Leidinggevende').id;
  await klikActor();
  let v = await vaag();
  ok(!v.includes(lg) && v.length === st.els.length - 1, 'tik op Leidinggevende: alleen zijn gedrag blijft scherp (' + (st.els.length - v.length) + ' scherp)');
  await klikActor();
  ok((await vaag()).length === 0 && v.length > 0, 'nog eens tikken: alles terug');
  if (await p.locator('.sk-actoren [data-p="zie"]').count()) await klikActor(); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok((await vaag()).length === 0 && v.length > 0 && await p.isVisible('.sk-actoren'), 'Esc: alles terug, Inzicht blijft open');
  // 3. Hoofdletterongevoelig samenvoegen, en hernoemen past al het gedrag aan
  const E = (id, wie, n, x) => ({ id, t:'gedrag', wie, n, x, y:0 });
  await laad({ id:'h', name:'Hernoem', over:'', ing:{}, els:[E('a', 'Teamleden', 'maken overuren', 0), E('b', 'teamleden ', 'vragen hulp', 260), E('c', 'TEAMLEDEN', 'nemen pauze', 520), E('d', 'Klanten', 'bellen', 780), { id:'f', t:'factor', n:'Werkdruk', x:0, y:200 }], ver:[{ id:'v1', a:'f', b:'a', s:'+' }, { id:'v2', a:'a', b:'f', s:'-' }] });
  await zie(); const l3 = await lijst();
  ok(l3.length === 2 && /^Teamleden \| 3 gedragingen/.test(l3[0]), 'drie schrijfwijzen van teamleden zijn één actor (' + l3.join(' / ') + ')');
  await klikActor();
  if (await p.locator('#actor-naam').count()) { await p.fill('#actor-naam', 'Medewerkers'); await p.click('[data-p="actor-hernoem"]'); await p.waitForTimeout(300); }
  let s3 = await p.evaluate(() => window.systeem.staat());
  ok(['a', 'b', 'c'].every(id => s3.els.find(e => e.id === id).wie === 'Medewerkers') && s3.els.find(e => e.id === 'd').wie === 'Klanten', 'hernoemen vanuit de lijst past al het gedrag van die actor aan, en niets anders');
  // 4. Suggesties in het formulier, met dezelfde schrijfwijze
  await p.click('#b-toe'); await p.click('[data-p="open-el"][data-id="d"]'); await p.waitForTimeout(250);
  const sug = await p.evaluate(() => { const i = document.getElementById('e-wie'), d = i && i.list; return d ? [...d.options].map(o => o.value) : []; });
  ok(sug.includes('Medewerkers') && sug.includes('Klanten'), 'het veld Wie stelt de actoren op de kaart voor (' + sug + ')');
  await p.fill('#e-wie', 'medewerkers'); await p.press('#e-wie', 'Tab'); await p.waitForTimeout(300);
  s3 = await p.evaluate(() => window.systeem.staat());
  ok(s3.els.find(e => e.id === 'd').wie === 'Medewerkers', 'een rol die al bestaat, krijgt dezelfde schrijfwijze (' + s3.els.find(e => e.id === 'd').wie + ')');
  // 5. Een oude kaart laadt, met een persoon-icoon bij elk gedrag met een rol
  await laad({ id:'o', name:'Oud', over:'', versie:'1.1', ing:{}, els:[E('g', 'Teamleden', 'maken overuren', 0), { id:'i', t:'ingreep', n:'Verbod', x:300, y:0, ik:'Verplichten' }], ver:[{ id:'v', a:'i', b:'g', s:'-', w:3 }] });
  ok(await p.locator('[data-el="g"] .actor').count() === 1 && await p.locator('[data-el="i"] .actor').count() === 0, 'een oude kaart laadt; het gedrag krijgt een persoon-icoon vóór de rol, de ingreep niet');
  // 6. De ingreep is een pijlvorm naar rechts, en pijlen landen op de rand (ook op de punt), nooit erin
  const R2 = 300, pos = [[0, -R2], [R2, -R2 * 0.3], [R2, 0], [R2, R2 * 0.35], [0, R2], [-R2, 0], [R2 * 0.6, -R2 * 0.9], [R2 * 0.7, R2 * 0.8]];
  await laad({ id:'p', name:'Pijlvorm', over:'', ing:{}, els:[{ id:'i', t:'ingreep', n:'Kort teamoverleg elke week', x:0, y:0, ik:'Omgeving aanpassen' }].concat(pos.map(([x, y], k) => ({ id:'f' + k, t:'factor', n:'F' + k, x, y }))), ver:pos.map((_, k) => ({ id:'v' + k, a:'f' + k, b:'i', s:'+' })) });
  const r6 = await p.evaluate(() => {
    const vorm = document.querySelector('[data-el="i"] .vorm'), d = vorm.getAttribute('d'), bb = vorm.getBBox(), cy = bb.y + bb.height / 2, q = document.getElementById('sk-svg').createSVGPoint();
    const in2 = (x, y) => { q.x = x; q.y = y; return vorm.isPointInFill(q); };
    // de punt rechts op halve hoogte; rechtsboven en rechtsonder leeg; links een rechte kant (geen punt of inkeping)
    const naarRechts = in2(bb.x + bb.width - 2, cy) && !in2(bb.x + bb.width - 3, bb.y + 3) && !in2(bb.x + bb.width - 3, bb.y + bb.height - 3) && in2(bb.x + 1.5, cy) && in2(bb.x + 8, bb.y + 2) && in2(bb.x + 8, bb.y + bb.height - 2);
    const pt = document.getElementById('sk-svg').createSVGPoint(), fouten = [];
    document.querySelectorAll('#sk-ver [data-ver] path[marker-end]').forEach(pp => { const L = pp.getTotalLength(), e = pp.getPointAtLength(L), q = pp.getPointAtLength(L - 9); [[e, 'eind'], [q, 'pijlpunt']].forEach(([w, wat]) => { pt.x = w.x; pt.y = w.y; if (vorm.isPointInFill(pt)) fouten.push(pp.parentNode.dataset.ver + ' ' + wat + ' in de vorm'); });
      // en vlak bij de rand: een punt 6 px verder ligt wel in de vorm
      const r = pp.getPointAtLength(L - 1), dx = e.x - r.x, dy = e.y - r.y, n = Math.hypot(dx, dy) || 1; pt.x = e.x + dx / n * 7; pt.y = e.y + dy / n * 7; if (!vorm.isPointInFill(pt)) fouten.push(pp.parentNode.dataset.ver + ' landt niet op de rand'); });
    return { naarRechts, fouten, d };
  });
  ok(r6.naarRechts, 'de ingreep is een pijlvorm met de punt rechts op halve hoogte');
  ok(r6.naarRechts && !r6.fouten.length, 'pijlen naar de ingreep landen op de rand van de pijlvorm, ook op de punt, nooit erin (' + (r6.fouten.join(', ') || '8 richtingen') + ')');
  // 7. Teksten: geen vlag meer; Meer weten noemt de actor en BSM
  const tekst = await p.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  ok(!/groene vlag/i.test(tekst) && /groene pijlvorm/.test(tekst) && /Behavioural Systems Mapping/.test(tekst) && /alles wat één actor doet/.test(tekst), 'teksten: groene pijlvorm, de actor bij gedrag en Behavioural Systems Mapping als bron');
  // 8. Exporten vermelden de actor
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'toxisch')); await p.waitForTimeout(300);
  await p.click('.exp-btn[data-exp="copy"]'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => window.__clip || '');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.exp-btn[data-exp="csv"]')]); const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  ok(/WIE DOET WAT\n- Leidinggevende: kleineert medewerkers in overleg/.test(clip) && /;Wie \(van\);Wie \(naar\)/.test(csv) && /;Leidinggevende;/.test(csv), 'tekst en CSV vermelden de actor');
  // 9. Passend in beeld: de kaart vult het vak (minstens 70% in de beperkende richting, niets buiten beeld), zoom hoogstens 1,6;
  //    uitlichten toont het deel en zijn buren, en alle uitgelichte elementen staan volledig in beeld.
  const passend = [], uitgelicht = [];
  for (const [w, h] of [[1280, 900], [1440, 900]]) {
    await p.setViewportSize({ width:w, height:h });
    for (const vb of ['premie', 'werkdruk', 'toxisch', 'thuis']) {
      await p.evaluate(vb => window.systeem.laadVoorbeeld(true, vb), vb); await p.waitForTimeout(500);
      for (const stap of ['laden', 'volledig beeld', 'schikken']) {
        if (stap === 'volledig beeld') { await p.click('#z-alles'); await p.waitForTimeout(250); }
        if (stap === 'schikken') { await p.click('#b-schik'); await p.waitForTimeout(400); }
        const m = await p.evaluate(() => { const s = document.getElementById('sk-svg').getBoundingClientRect(), g = document.getElementById('sk-els').getBoundingClientRect(); return { a:Math.max(g.width / s.width, g.height / s.height), binnen:g.left >= s.left - 1 && g.right <= s.right + 1 && g.top >= s.top - 1 && g.bottom <= s.bottom + 1, k:window.systeem.view.k }; });
        if (!(m.a >= 0.7 && m.binnen && m.k <= 1.6)) passend.push(`${w} ${vb} ${stap}: ${Math.round(m.a * 100)}%${m.binnen ? '' : ', deels buiten beeld'}, zoom ${m.k.toFixed(2)}`);
      }
      await zie();
      const n = await p.locator('#sk-paneel [data-p="zie"]').count();
      for (let i = 0; i < n; i++) {
        const knop = p.locator('#sk-paneel [data-p="zie"]').nth(i); const id = await knop.getAttribute('data-id'); await knop.click(); await p.waitForTimeout(350);
        const r = await p.evaluate(() => { const s = document.getElementById('sk-svg').getBoundingClientRect(), weg = []; document.querySelectorAll('#sk-els .el:not(.vaag) .vorm').forEach(v => { const b2 = v.getBoundingClientRect(); if (b2.left < s.left - 1 || b2.right > s.right + 1 || b2.top < s.top - 1 || b2.bottom > s.bottom + 1) weg.push(v.closest('.el').dataset.el); }); return { weg, k:window.systeem.view.k }; });
        if (r.weg.length || r.k > 1.6) uitgelicht.push(`${w} ${vb} ${id}: ${r.weg.length} afgesneden, zoom ${r.k.toFixed(2)}`);
        await p.locator('#sk-paneel [data-p="zie"]').nth(i).click(); await p.waitForTimeout(150);
      }
    }
  }
  ok(!passend.length, 'op 1280 en 1440 vult de kaart het vak (minstens 70%, niets buiten beeld, zoom tot 1,6) bij laden, volledig beeld en Schikken' + (passend.length ? ': ' + passend.slice(0, 4).join(' | ') : ''));
  ok(!uitgelicht.length, 'uitlichten (actor of bevinding): alle uitgelichte elementen volledig in beeld' + (uitgelicht.length ? ': ' + uitgelicht.slice(0, 4).join(' | ') : ''));
  // 9b. Op de gsm (390): bij laden, volledig beeld en Schikken alles in beeld; uitlichten snijdt nooit af
  { const g = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true, serviceWorkers:'block' }), q = await g.newPage(); q.on('pageerror', e => PE.push('gsm: ' + String(e)));
    await q.goto(B + PAD, { waitUntil:'networkidle' }); const weg = [];
    const binnen = () => q.evaluate(() => { const s = document.getElementById('sk-svg').getBoundingClientRect(), P = document.getElementById('sk-paneel'), pr = P.getBoundingClientRect(), blad = getComputedStyle(P).position === 'fixed' && pr.height && !P.hasAttribute('data-leeg') ? pr.top : innerHeight, onder = Math.min(s.bottom, blad, innerHeight), boven = Math.max(s.top, 0), uit = [];
      document.querySelectorAll('#sk-els .el:not(.vaag) .vorm').forEach(v => { const r = v.getBoundingClientRect(); if (r.left < s.left - 1 || r.right > s.right + 1 || r.top < boven - 1 || r.bottom > onder + 1) uit.push(v.closest('.el').dataset.el); }); return uit.length; });
    for (const vb of ['premie', 'werkdruk', 'toxisch', 'thuis']) {
      await q.evaluate(vb => window.systeem.laadVoorbeeld(true, vb), vb); await q.waitForTimeout(600);
      await q.evaluate(() => scrollTo(0, 0)); await q.click('[data-p="sluit"]').catch(() => {}); await q.waitForTimeout(400);
      let n = await binnen(); if (n) weg.push(vb + ' laden: ' + n);
      await q.click('#z-alles'); await q.waitForTimeout(300); n = await binnen(); if (n) weg.push(vb + ' volledig beeld: ' + n);
      await q.click('#b-schik'); await q.waitForTimeout(500); n = await binnen(); if (n) weg.push(vb + ' schikken: ' + n);
      await q.click('#b-zie'); await q.waitForTimeout(300);
      const m = Math.min(await q.locator('#sk-paneel [data-p="zie"]').count(), 6);
      for (let i = 0; i < m; i++) { await q.locator('#sk-paneel [data-p="zie"]').nth(i).click(); await q.waitForTimeout(450); n = await binnen(); if (n) weg.push(vb + ' uitlichten ' + i + ': ' + n); await q.locator('#sk-paneel [data-p="zie"]').nth(i).click(); await q.waitForTimeout(150); }
      await q.click('[data-p="sluit"]').catch(() => {}); await q.waitForTimeout(200);
    }
    ok(!weg.length, 'gsm 390: bij laden, volledig beeld, Schikken en uitlichten staat niets half buiten beeld' + (weg.length ? ': ' + weg.slice(0, 5).join(' | ') : ''));
    await g.close(); }
  await laad({ id:'z', name:'Klein', over:'', ing:{}, els:[{ id:'a', t:'factor', n:'Werkdruk', x:0, y:0 }, { id:'b', t:'factor', n:'Fouten', x:260, y:0 }], ver:[{ id:'v', a:'a', b:'b', s:'+' }] });
  ok(await p.evaluate(() => window.systeem.view.k) <= 1.6, 'twee elementen worden niet reusachtig (zoom ' + (await p.evaluate(() => window.systeem.view.k)).toFixed(2) + ')');
  ok(PE.length === 0, '(controle) geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
