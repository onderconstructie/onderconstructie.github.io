// Systeemkaart 1.5: "Hoe hangt dit samen?" (wegen van A naar B), "Hoe weten we dit?" (bewijs bij element en pijl) en kringen een naam geven.
// Gebruik: PORT=9461 node systeemkaart-v3-logica.js   (SK=/ander-pad/ om een andere bouw te toetsen)
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461), PAD = process.env.SK || '/systeemkaart/';
const fs = require('fs');
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', acceptDownloads:true });
  await c.addInitScript(() => { try { Object.defineProperty(navigator, 'clipboard', { value:{ writeText: async t => { window.__clip = t; } }, configurable:true }); } catch (e) {} });
  const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + PAD, { waitUntil:'networkidle' });
  const laad = async k => { await p.evaluate(k => { localStorage.setItem('systeemkaart.v1', JSON.stringify({ lists:[k], current:k.id })); }, k); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); };
  const id = n => p.evaluate(n => { const e = window.systeem.staat().els.find(x => x.n === n); return e ? e.id : null; }, n);
  const weg = (a, b2) => p.evaluate(([a, b2]) => window.systeem.wegen ? window.systeem.wegen(a, b2) : null, [a, b2]);
  const st = () => p.evaluate(() => window.systeem.staat());

  console.log('Hoe hangt dit samen?');
  // 1. Wegen en netto-effect in de vier voorbeelden
  await p.evaluate(() => window.systeem.laadVoorbeeld(true, 'premie')); await p.waitForTimeout(300);
  let w = await weg(await id('Werkdruk'), await id('Fouten'));
  ok(w && w.lijst[0] && w.lijst[0].teken === '+' && w.lijst[0].traag && /^Meer werkdruk geeft langs deze weg meer fouten, maar pas na een tijd\.$/.test(w.lijst[0].zin), 'premieloket, werkdruk naar fouten: meer, na een tijd (' + (w && w.lijst[0] && w.lijst[0].zin) + ')');
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'werkdruk')); await p.waitForTimeout(300);
  w = await weg(await id('Taken schrappen'), await id('Kwaliteit van de dienstverlening'));
  ok(w && w.lijst[0] && w.lijst[0].teken === '+' && w.lijst[0].els.length === 4 && /^Taken schrappen geeft langs deze weg meer kwaliteit van de dienstverlening\.$/.test(w.lijst[0].zin) && w.lijst.length <= 5 && w.lijst.every((x, i) => !i || x.els.length >= w.lijst[i - 1].els.length), 'werkdruk, taken schrappen naar kwaliteit: de kortste weg eerst, netto meer (' + (w && w.lijst[0] && w.lijst[0].zin) + ')');
  const wg = await weg(await id('Kwaliteit van de dienstverlening'), await id('Taken schrappen'));
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'toxisch')); await p.waitForTimeout(300);
  const g1 = await id('kleineert medewerkers in overleg'), u1 = await id('Teamresultaten');
  w = await weg(g1, u1);
  ok(w && w.totaal >= 3 && w.lijst.every(x => x.teken === '-') && !w.tegen && /geeft langs deze weg minder teamresultaten/.test(w.lijst[0].zin) && /^Vaker "Leidinggevende/.test(w.lijst[0].zin), 'toxisch, kleineren naar teamresultaten: elke weg minder, geen tegenspraak (' + (w && w.totaal) + ' wegen)');
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'thuis')); await p.waitForTimeout(300);
  w = await weg(await id('werken thuis'), await id('Kwaliteit van het werk'));
  ok(w && w.lijst[0] && w.lijst[0].teken === '?' && /weet ik niet/.test(w.lijst[0].zin) && w.lijst.some(x => x.teken === '-'), 'thuiswerken naar kwaliteit: de weg via concentratie hangt af van een pijl "weet ik niet" (' + (w && w.lijst[0] && w.lijst[0].zin) + ')');
  // 2. Geen weg: eerlijk, met de richting terug
  const wn = await weg(await id('Vertrouwen'), await id('Pendeltijd'));
  ok(wn && wn.totaal === 0 && wg && wg.totaal === 0, 'geen weg van vertrouwen naar pendeltijd, en geen van kwaliteit naar taken schrappen');
  // 3. Tegenspraak in één zin
  await laad({ id:'t', name:'Tegen', over:'', ing:{}, els:[{ id:'a', t:'ingreep', n:'Thuiswerkdag', x:0, y:0 }, { id:'c', t:'factor', n:'Overleg', x:280, y:160 }, { id:'d', t:'uitkomst', n:'Kwaliteit', x:560, y:0, doel:'meer' }], ver:[{ id:'v1', a:'a', b:'d', s:'+' }, { id:'v2', a:'a', b:'c', s:'-' }, { id:'v3', a:'c', b:'d', s:'+' }] });
  w = await weg('a', 'd');
  ok(w && w.tegen && w.lijst.length === 2, 'twee wegen met een ander teken: tegenspraak');
  // 4. In het paneel: knop bij een element, tweede element aantikken, wegen, uitlichten volledig in beeld; geen weg met de weg terug
  await p.click('#b-toe'); await p.click('[data-p="open-el"][data-id="a"]'); await p.waitForTimeout(250);
  const heeftKnop = await p.locator('[data-p="samen"]').count();
  if (heeftKnop) { await p.click('[data-p="samen"]'); await p.waitForTimeout(200); const r = await p.locator('[data-el="d"] .vorm').boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(300); }
  const paneel = await p.evaluate(() => document.getElementById('sk-paneel').textContent.replace(/\s+/g, ' '));
  ok(heeftKnop && /(Meer|Minder) Kwaliteit/.test(await p.evaluate(() => [...document.querySelectorAll('.sk-weg-kop')].map(x => x.textContent).join('|'))) && /2 wegen, de kortste eerst/.test(paneel) && /spreken elkaar tegen/.test(paneel) && /Thuiswerkdag geeft langs deze weg (meer|minder) kwaliteit/.test(paneel), 'knop "Hoe hangt dit samen met…", tik op het tweede element: de wegen in gewone taal, met de tegenspraak' + (fout.length ? '' : '') + (/2 wegen/.test(paneel) ? '' : ' [' + paneel.slice(0, 300) + ']'));
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'toxisch')); await p.waitForTimeout(400);
  const g1b = await id('kleineert medewerkers in overleg'), u1b = await id('Teamresultaten');
  await p.click('#b-toe'); await p.click(`[data-p="open-el"][data-id="${g1b}"]`); await p.waitForTimeout(250);
  let goed = false;
  if (await p.locator('[data-p="samen"]').count()) { await p.click('[data-p="samen"]'); await p.waitForTimeout(200); await p.selectOption('#samen-b', u1b); await p.waitForTimeout(300);
    await p.locator('[data-p="weg"]').nth(1).click(); await p.waitForTimeout(500);
    goed = await p.evaluate(() => { const s = document.getElementById('sk-svg').getBoundingClientRect(), sch = [...document.querySelectorAll('#sk-els .el:not(.vaag)')]; return sch.length >= 3 && document.querySelectorAll('#sk-els .el.vaag').length > 0 && sch.every(g => { const r = g.querySelector('.vorm').getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1; }); }); }
  ok(goed, 'tik op een weg: alleen die weg blijft scherp en staat volledig in beeld');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.selectOption('#samen-a', await id('Vertrouwenspersoon')).catch(() => {}); await p.selectOption('#samen-b', await id('Coaching voor de leidinggevende')).catch(() => {}); await p.waitForTimeout(300);
  ok(/Er is geen weg van .*Vertrouwenspersoon.* naar .*Coaching.*Ook niet van/.test(await p.evaluate(() => document.getElementById('sk-paneel').textContent.replace(/\s+/g, ' '))), 'geen weg: dat zegt de tool, en ook dat er geen weg terug is');
  await p.selectOption('#samen-a', u1b).catch(() => {}); await p.selectOption('#samen-b', await id('Coaching voor de leidinggevende')).catch(() => {}); await p.waitForTimeout(300);
  ok(/Wel een weg terug/.test(await p.evaluate(() => document.getElementById('sk-paneel').textContent.replace(/\s+/g, ' '))), 'geen weg van teamresultaten naar coaching, wel een weg terug');

  console.log('Hoe weten we dit?');
  // 5. Een oude kaart: het vroegere "Waarom" bij een pijl wordt "Hoe weten we dit?"; bij een element kan het nu ook
  await laad({ id:'o', name:'Oud', over:'', versie:'1.1', ing:{}, els:[{ id:'f', t:'factor', n:'Werkdruk', x:0, y:0 }, { id:'g', t:'gedrag', wie:'Teamleden', n:'maken overuren', x:320, y:0 }], ver:[{ id:'v', a:'f', b:'g', s:'+', w:2, v:false, z:false, uit:'Gezien in de planning van maart' }] });
  await p.click('#b-toe'); await p.click('[data-p="open-el"][data-id="f"]'); await p.waitForTimeout(250);
  await p.evaluate(() => { const d = document.querySelector('#sk-paneel details'); if (d) d.open = true; });
  const bronVeld = await p.locator('#e-bron').count();
  if (bronVeld) { await p.fill('#e-bron', 'Uit een gesprek met drie teamleden'); await p.waitForTimeout(300); }
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  let s5 = await st();
  ok(bronVeld && s5.els.find(e => e.id === 'f').uit === 'Uit een gesprek met drie teamleden' && s5.ver[0].uit === 'Gezien in de planning van maart', 'bewijs bij een element blijft bewaard; het oude pijlveld blijft staan');
  ok(await p.locator('[data-el="f"] .bron').count() === 1 && await p.locator('[data-el="g"] .bron').count() === 0 && await p.locator('[data-ver="v"] .bron').count() === 1, 'een klein symbool op de kaart waar iets ingevuld is, bij element en pijl');
  const r5 = await p.locator('[data-ver="v"] .raak').first(); await r5.click({ force:true }).catch(() => {}); await p.waitForTimeout(250);
  ok(/Hoe weten we dit\?/.test(await p.textContent('#sk-paneel')) && await p.inputValue('#v-uit').catch(() => '') === 'Gezien in de planning van maart' && !/Waarom\? Bron/.test(await p.textContent('#sk-paneel')), 'bij een pijl heet het veld nu "Hoe weten we dit?", met de oude tekst erin');
  await p.click('.exp-btn[data-exp="copy"]'); await p.waitForTimeout(300); const clip = await p.evaluate(() => window.__clip || '');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.exp-btn[data-exp="csv"]')]); const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(/hoe weten we dit: Uit een gesprek met drie teamleden/.test(clip) && /Hoe weten we dit: Gezien in de planning/.test(clip) && /Hoe weten we dit \(van\)/.test(csv) && /Uit een gesprek met drie teamleden/.test(csv), 'tekst en CSV vermelden hoe we het weten');

  console.log('Kringen een naam geven');
  // 6. Naam geven, bewaard, op de kaart, volgt hernoemen, verdwijnt met de kring
  await p.evaluate(() => window.systeem.laadVoorbeeld(false, 'toxisch')); await p.waitForTimeout(400);
  const g1c = await id('kleineert medewerkers in overleg'), u1c = await id('Teamresultaten');
  if (await p.getAttribute('#b-zie', 'aria-pressed') !== 'true') await p.click('#b-zie'); await p.waitForTimeout(250);
  const pot = await p.locator('.sk-potlood').count();
  if (pot) { await p.locator('.sk-potlood').first().click(); await p.waitForTimeout(200); await p.fill('#kring-naam', 'De kern'); await p.click('[data-p="kring-bewaar"]'); await p.waitForTimeout(300); }
  ok(pot && /De kern · versterkende kring/.test(await p.textContent('#sk-paneel')) && /De kern/.test(await p.evaluate(() => (document.querySelector('[data-kring="0"]') || {}).textContent || '')), 'de naam staat in Inzicht en bij het kringteken op de kaart');
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  let s6 = await st(); const sleutel = Object.keys(s6.kringNamen || {})[0] || '';
  ok(sleutel.split(',').length === 6 && s6.kringNamen[sleutel] === 'De kern', 'de naam blijft bewaard, met de elementen van de kring als sleutel');
  await p.evaluate(g1 => { const d = JSON.parse(localStorage.getItem('systeemkaart.v1')), l = d.lists.find(x => x.id === d.current); l.els.find(e => e.id === g1).n = 'zet medewerkers voor schut'; localStorage.setItem('systeemkaart.v1', JSON.stringify(d)); }, g1c);
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); s6 = await st();
  await p.click('.exp-btn[data-exp="copy"]'); await p.waitForTimeout(300); const clip6 = await p.evaluate(() => window.__clip || '');
  ok((s6.kringNamen || {})[sleutel] === 'De kern' && /"De kern", Versterkende kring/.test(clip6), 'een element hernoemen: de kring houdt haar naam (ook in de tekst)');
  await p.evaluate(([g1, u1]) => { const d = JSON.parse(localStorage.getItem('systeemkaart.v1')), l = d.lists.find(x => x.id === d.current), f4 = l.els.find(e => e.n === 'Fouten die pas laat bovenkomen').id; l.ver = l.ver.filter(v => !(v.a === f4 && v.b === u1)); localStorage.setItem('systeemkaart.v1', JSON.stringify(d)); }, [g1c, u1c]);
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400); s6 = await st();
  ok(sleutel && !(s6.kringNamen || {})[sleutel], 'een pijl uit de kring weg: de kring en haar naam verdwijnen stil');
  ok(/Samenhang en bewijs/.test(await p.evaluate(() => document.querySelector('.sk-mw').textContent)), 'Meer weten heeft een blok "Samenhang en bewijs"');
  ok(!PE.length, '(controle) geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
