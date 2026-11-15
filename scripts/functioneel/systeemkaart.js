// Systeemkaart: vormen tekenen en herkennen, verbanden trekken, slepen, ongedaan maken, ingrijpen, analyse, toetsenbord en bewaren.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9441);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  await p.goto(B + '/systeemkaart/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  ok(await p.isVisible('#ocStart'), 'leeg: de startkaart staat er');
  await p.click('#ocStart .oc-begin'); await p.waitForTimeout(300);
  ok(await p.isVisible('#sk-leeg'), 'na Begin: de tekenhulp op de lege kaart');
  const box = await p.locator('#sk-svg').boundingBox();
  const teken = async pts => { await p.mouse.move(box.x + pts[0][0], box.y + pts[0][1]); await p.mouse.down(); for (const q of pts.slice(1)) await p.mouse.move(box.x + q[0], box.y + q[1], { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(250); };
  const cirkel = (cx, cy, rx, ry) => Array.from({ length: 41 }, (_, i) => [cx + rx * Math.cos(i / 40 * Math.PI * 2), cy + ry * Math.sin(i / 40 * Math.PI * 2)]);
  const lijn = (a, b2, n = 8) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b2[0] - a[0]) * i / n, a[1] + (b2[1] - a[1]) * i / n]);
  const st = () => p.evaluate(() => window.systeem.staat());
  // gedrag: een cirkel
  await teken(cirkel(250, 250, 80, 45));
  let s = await st();
  ok(s.els.length === 1 && s.els[0].t === 'gedrag', 'een getekende cirkel wordt gedrag (' + s.els.map(e => e.t) + ')');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'e-wie'), 'bij nieuw gedrag staat de cursor meteen in Wie?');
  await p.keyboard.type('Teamleden'); await p.keyboard.press('Enter'); await p.keyboard.type('maken overuren'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  s = await st(); ok(s.els[0].wie === 'Teamleden' && s.els[0].n === 'maken overuren', 'wie en wat ingevuld met het toetsenbord');
  // factor: een rechthoek
  await teken([...lijn([520, 180], [700, 180]), ...lijn([700, 180], [700, 290]).slice(1), ...lijn([700, 290], [520, 290]).slice(1), ...lijn([520, 290], [520, 182]).slice(1)]);
  s = await st(); ok(s.els.length === 2 && s.els[1].t === 'factor', 'een getekende rechthoek wordt een factor');
  await p.keyboard.type('Werkdruk'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  // ingreep: een driehoek
  await teken([...lijn([300, 450], [380, 580]), ...lijn([380, 580], [220, 580]).slice(1), ...lijn([220, 580], [300, 452]).slice(1)]);
  s = await st(); ok(s.els.length === 3 && s.els[2].t === 'ingreep', 'een getekende driehoek wordt een ingreep (' + s.els.map(e => e.t) + ')');
  await p.keyboard.type('Kort teamoverleg'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  // een krabbel wordt niets
  await teken(lijn([900, 600], [1000, 640]));
  ok((await st()).els.length === 3, 'een losse krabbel maakt niets aan');
  // verband: van de rand van het ene naar het andere element
  const rect = async id => { const r = await p.locator(`[data-el="${id}"] .vorm`).boundingBox(); return r; };
  s = await st(); const [g, f, i] = s.els;
  let ra = await rect(g.id), rb = await rect(f.id);
  await teken(lijn([ra.x - box.x + ra.width - 4, ra.y - box.y + ra.height / 2], [rb.x - box.x + rb.width / 2, rb.y - box.y + rb.height / 2]));
  s = await st(); ok(s.ver.length === 1 && s.ver[0].a === g.id && s.ver[0].b === f.id && s.ver[0].s === '+', 'een lijn van rand tot element wordt een verband, standaard +');
  ok(await p.isVisible('.sk-zin') && /Vaker|Meer/.test(await p.textContent('.sk-zin')), 'het verband wordt teruggelezen als zin');
  await p.click('[data-k="s"][data-v="-"]'); await p.waitForTimeout(150);
  s = await st(); ok(s.ver[0].s === '-', 'het teken wordt − met één tik');
  ok(/geeft minder/.test(await p.textContent('.sk-zin')), 'de zin past zich aan: meer geeft minder');
  // en terug: werkdruk geeft meer overuren -> kring
  rb = await rect(f.id); ra = await rect(g.id);
  await teken(lijn([rb.x - box.x + 4, rb.y - box.y + rb.height - 4], [ra.x - box.x + ra.width / 2, ra.y - box.y + ra.height / 2]));
  s = await st(); ok(s.ver.length === 2, 'tweede verband in de andere richting');
  const A = await p.evaluate(() => { const a = window.systeem.analyse(); return a.kringen.map(k => k.soort); });
  ok(A.length === 1 && A[0] === 'B', 'een kring met één − is een remmende kring (' + A + ')');
  // slepen
  const voor = (await st()).els.find(e => e.id === f.id);
  rb = await rect(f.id); await p.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await p.mouse.down(); await p.mouse.move(rb.x + rb.width / 2 + 80, rb.y + rb.height / 2 + 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  const na = (await st()).els.find(e => e.id === f.id);
  ok(Math.abs(na.x - voor.x) > 40 && (await st()).els.length === 3, 'een element in het midden vastnemen versleept het');
  await p.click('#b-terug'); await p.waitForTimeout(200);
  const terug = (await st()).els.find(e => e.id === f.id);
  ok(terug.x === voor.x && terug.y === voor.y, 'ongedaan maken zet het element terug');
  // ingreep verbinden met werkdruk (via Verbind met)
  const ri = await rect(i.id); await p.mouse.click(ri.x + ri.width / 2 + 10, ri.y + ri.height / 2); await p.waitForTimeout(200);
  ok(await p.isVisible('#e-naam'), 'tik op een element opent het paneel');
  await p.click('[data-p="verbind"]'); await p.waitForTimeout(150);
  ok(await p.isVisible('#sk-band'), 'Verbind met: de band vraagt op welk element je tikt');
  rb = await rect(f.id); await p.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2); await p.waitForTimeout(250);
  s = await st(); ok(s.ver.some(v => v.a === i.id && v.b === f.id), 'Verbind met maakt het verband');
  await p.click('[data-k="s"][data-v="-"]'); await p.waitForTimeout(150);
  // ingrijpen: meer ingreep -> werkdruk daalt -> overuren
  await p.click('#b-ing'); await p.waitForTimeout(200);
  const r2 = await rect(i.id); await p.mouse.click(r2.x + r2.width / 2 + 10, r2.y + r2.height / 2); await p.waitForTimeout(300);
  s = await st(); ok(s.ing[i.id] === 1, 'in Ingrijpen zet een tik de ingreep aan');
  const res = await p.textContent('.sk-res');
  ok(/Werkdruk: daalt/.test(res), 'gevolg: werkdruk daalt (' + res.trim().slice(0, 80) + ')');
  ok(await p.locator('text=geen voorspelling').count() > 0, 'de eerlijke grens staat erbij');
  const sim = await p.evaluate(() => { const s2 = window.systeem.simuleer(); return s2.xs.every(m => [...m.values()].every(x => x >= -1 && x <= 1)); });
  ok(sim, 'de doorrekening blijft begrensd');
  // twee ingrepen vergelijken
  await p.click('[data-p="naar-a"]'); await p.waitForTimeout(200);
  s = await st(); ok(s.ingA && s.ingA[i.id] === 1 && !Object.keys(s.ing).length, 'Vergelijk: ingreep A bewaard, B is leeg');
  const rg = await rect(g.id); await p.mouse.click(rg.x + rg.width / 2, rg.y + rg.height / 2); await p.waitForTimeout(150); await p.mouse.click(rg.x + rg.width / 2, rg.y + rg.height / 2); await p.waitForTimeout(300);
  s = await st(); ok(s.ing[g.id] === -1, 'B: twee tikken op het gedrag is minder');
  ok(await p.locator('.sk-tab tbody tr').count() >= 1 && /A en B vergeleken/.test(await p.textContent('#sk-paneel')), 'A en B staan naast elkaar in een tabel');
  await p.click('[data-k="ab"][data-v="A"]'); await p.waitForTimeout(200);
  ok(/^A:/.test(await p.textContent('#sk-band-t')), 'je kan ingreep A terug bekijken op de kaart');
  await p.click('[data-k="ab"][data-v="B"]'); await p.click('[data-p="stop-ab"]'); await p.waitForTimeout(200);
  s = await st(); ok(!s.ingA, 'stop met vergelijken');
  await p.click('#sk-band-x'); await p.waitForTimeout(150);
  // analyse
  await p.click('#b-zie'); await p.waitForTimeout(200);
  ok(/Remmende kring/.test(await p.textContent('#sk-paneel')), 'Wat zie je? toont de kring');
  await p.click('[data-p="zie"][data-id="k0"]'); await p.waitForTimeout(200);
  ok(await p.locator('#sk-els .el.vaag').count() === 1, 'een kring aantikken: de rest van de kaart wordt vaag');
  // toevoegen zonder tekenen
  await p.click('#b-toe'); await p.waitForTimeout(150);
  await p.click('[data-k="t-nieuw"][data-v="uitkomst"]'); await p.fill('#n-naam', 'Tevreden klanten'); await p.click('form[data-form="el"] button[type="submit"]'); await p.waitForTimeout(200);
  s = await st(); ok(s.els.some(e => e.t === 'uitkomst' && e.n === 'Tevreden klanten'), 'toevoegen met het formulier werkt');
  // naamtip
  await p.fill('#n-naam', 'Te hoge werkdruk'); await p.click('[data-k="t-nieuw"][data-v="factor"]'); await p.fill('#n-naam', 'Te hoge werkdruk'); await p.click('form[data-form="el"] button[type="submit"]'); await p.waitForTimeout(200);
  const tips = await p.evaluate(() => window.systeem.analyse().tips.map(t => t.fix || t.soort));
  ok(tips.includes('Werkdruk'), 'naamtip: "Te hoge werkdruk" wordt "Werkdruk" voorgesteld');
  // toetsenbord op de kaart
  await p.focus('#sk-svg'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  ok(await p.isVisible('#e-naam'), 'pijltjes op de kaart kiezen een element');
  // bewaren
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  s = await st(); ok(s.els.length === 5 && s.ver.length === 3, 'na herladen staat alles er nog (' + s.els.length + ' / ' + s.ver.length + ')');
  // voorbeeld
  await p.evaluate(() => window.systeem.laadVoorbeeld(true)); await p.waitForTimeout(300);
  const K = await p.evaluate(() => window.systeem.analyse().kringen.map(k => k.soort).join(''));
  ok(K.includes('R') && K.includes('B'), 'het voorbeeld heeft een versterkende en een remmende kring (' + K + ')');
  ok(await p.evaluate(() => !!window.systeem.analyse().terugslag), 'het voorbeeld toont de snelle oplossing die terugslaat');
  const snel = await p.evaluate(() => { const l = window.systeem.staat(), id = n => l.els.find(e => e.n === n).id, sA = window.systeem.simuleer({ [id('Kort teamoverleg elke week')]: 1 }), sB = window.systeem.simuleer({ [id('Tijdelijke extra kracht')]: 1 }), w = id('Werkdruk'), eerste = s => { for (let t = 1; t <= s.T; t++) if ((s.xs[t].get(w) || 0) < -0.1) return t; return 0; }; return [eerste(sA), eerste(sB)]; });
  ok(snel[1] && snel[1] < snel[0], 'voorbeeld: extra kracht laat de werkdruk sneller dalen dan teamoverleg (stap ' + snel + ')');
  await p.click('#b-schik'); await p.waitForTimeout(300);
  const overlap = await p.evaluate(() => { const els = window.systeem.staat().els; let n = 0; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (Math.abs(els[i].x - els[j].x) < 100 && Math.abs(els[i].y - els[j].y) < 40) n++; return n; });
  ok(overlap === 0, 'Schikken: geen elementen op elkaar');
  // veiligheid: vreemde id's uit een bestand worden vervangen
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('systeemkaart.v1')); const l = d.lists.find(x => x.id === d.current); l.els[0].id = '"onmouseover="Q=1'; l.ver.forEach(v => { if (v.a === l.els[1].id) v.a = l.els[0].id; }); localStorage.setItem('systeemkaart.v1', JSON.stringify(d)); });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  const ids = await p.evaluate(() => window.systeem.staat().els.map(e => e.id));
  ok(ids.every(id => /^[a-z0-9_-]{1,20}$/i.test(id)) && !(await p.evaluate(() => document.querySelector('[onmouseover]'))), 'een gevaarlijke id wordt vervangen, er komt geen code in de pagina');
  // geen eindeloze herteken-lus in rust
  const n0 = await p.evaluate(() => { window.__n = 0; const o = window.systeem.analyse; return 0; });
  await p.evaluate(() => { const ob = new MutationObserver(() => window.__n++); ob.observe(document.getElementById('sk-paneel'), { childList:true }); });
  await p.waitForTimeout(2600);
  ok(await p.evaluate(() => window.__n) === 0, 'in rust wordt het paneel niet steeds opnieuw getekend');
  // slepen kan ook uitgezoomd
  await p.click('#z-alles'); await p.click('#z-uit'); await p.click('#z-uit'); await p.waitForTimeout(150);
  const e0 = (await st()).els[2], r0 = await rect(e0.id);
  await p.mouse.move(r0.x + r0.width / 2, r0.y + r0.height / 2); await p.mouse.down(); await p.mouse.move(r0.x + r0.width / 2 + 60, r0.y + r0.height / 2 + 30, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  ok((await st()).els.find(e => e.id === e0.id).x !== e0.x && (await st()).els.length === 11, 'uitgezoomd: het midden vastnemen versleept nog altijd');
  // verbinden met het toetsenbord
  const v0 = (await st()).ver.length;
  await p.focus('#sk-svg'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  await p.click('[data-p="verbind"]'); await p.waitForTimeout(150); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  ok((await st()).ver.length === v0 + 1, 'Verbind met werkt met pijltjes en Enter');
  // rekenmodel: een remmende kring komt tot rust in plaats van te schommelen; onzekerheid werkt door; zwakke ketens verdwijnen niet
  const model = await p.evaluate(() => {
    const l = { els:['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id, t:'factor', n:id, x:0, y:0 })), ver:[] }, V = (a, b, s, w = 2) => l.ver.push({ id:a + b, a, b, s, w, v:false });
    V('a', 'b', '+'); V('b', 'c', '+'); V('c', 'b', '-');                       // remmende kring b-c
    const sim = window.systeem._sim;
    const r1 = sim(l, { a:1 }); const rust = r1.rust > 0;
    l.ver = []; V('a', 'b', '?'); V('b', 'c', '+'); const r2 = sim(l, { a:1 }); const onz = window.systeem._pijl(r2, 'c', r2.T) === '↕';
    l.ver = []; ['ab', 'bc', 'cd', 'de', 'ef'].forEach(x => V(x[0], x[1], '+', 1)); const r3 = sim(l, { a:1 }); const ver = window.systeem._pijl(r3, 'f', r3.T) === '↑';
    return [rust, onz, ver];
  });
  ok(model[0], 'een remmende kring komt tot rust');
  ok(model[1], 'een pijl "weet ik niet" maakt wat erachter ligt onzeker (niet: niets)');
  ok(model[2], 'een keten van vijf zwakke pijlen geeft aan het einde nog een effect');
  const kr = await p.evaluate(() => { const els = Array.from({ length:6 }, (_, i) => ({ id:'k' + i })), ver = []; els.forEach(a => els.forEach(b => { if (a !== b) ver.push({ id:a.id + b.id, a:a.id, b:b.id, s:'+' }); })); const k = window.systeem._kringen({ els, ver }); return [k.length, k.totaal, k.volledig, k.slice(0, 15).every(x => x.els.length === 2)]; });
  ok(kr[1] === 409 && kr[2] && kr[3], 'volledige graaf van 6: 409 kringen geteld, de 15 tweekringen eerst (' + kr + ')');
  ok(!E.length, 'geen fouten in de pagina ' + E.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
