// Systeemkaart: een uitkomst tekenen met een kader rond een factor (1.4).
// Gebruik: PORT=9461 node systeemkaart-uitkomst-logica.js   (SK=/ander-pad/ om een andere bouw te toetsen)
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461), PAD = process.env.SK || '/systeemkaart/';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + PAD, { waitUntil:'networkidle' });
  const E = [{ id:'f', t:'factor', n:'Werkdruk', x:0, y:0 }, { id:'u', t:'uitkomst', n:'Tevreden klanten', x:340, y:0, doel:'meer' }, { id:'g', t:'gedrag', wie:'Teamleden', n:'maken overuren', x:0, y:220 }, { id:'i', t:'ingreep', n:'Kort overleg', x:340, y:220 }, { id:'a', t:'factor', n:'Fouten', x:0, y:440 }, { id:'b', t:'factor', n:'Herwerk', x:200, y:440 }];
  const laad = async () => { await p.evaluate(E => { localStorage.setItem('systeemkaart.v1', JSON.stringify({ lists:[{ id:'k', name:'Kader', over:'', ing:{}, els:E, ver:[{ id:'v', a:'f', b:'u', s:'-' }] }], current:'k' })); }, E); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); await p.click('#z-alles'); await p.waitForTimeout(250); };
  const st = () => p.evaluate(() => window.systeem.staat());
  const doos = async ids => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const id of ids) { const r = await p.locator(`[data-el="${id}"] .vorm`).first().boundingBox(); x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.width); y1 = Math.max(y1, r.y + r.height); } return { x0, y0, x1, y1 }; };
  // een met de hand getekend kader: onregelmatige punten, eventueel scheef
  const kader = async (d, marge, opt = {}) => { const j = opt.jitter || 3, sk = opt.scheef || 0; let s = 7;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
    const hoek = [[d.x0 - marge + sk, d.y0 - marge], [d.x1 + marge + sk, d.y0 - marge - 4], [d.x1 + marge, d.y1 + marge], [d.x0 - marge - 2, d.y1 + marge + 3], [d.x0 - marge + sk + 3, d.y0 - marge + 2]];
    await p.mouse.move(hoek[0][0], hoek[0][1]); await p.mouse.down();
    for (let k = 1; k < hoek.length; k++) { const [ax, ay] = hoek[k - 1], [bx, by] = hoek[k]; for (let t = 1; t <= 10; t++) await p.mouse.move(ax + (bx - ax) * t / 10 + rnd() * j * 2, ay + (by - ay) * t / 10 + rnd() * j * 2); }
    await p.mouse.up(); await p.waitForTimeout(450); };
  const soort = async id => (await st()).els.find(e => e.id === id).t;

  // 1. Kader rond een factor: de factor wordt een uitkomst, geen nieuw element; meteen de keuze meer of minder
  await laad(); await kader(await doos(['f']), 22);
  let s1 = await st();
  ok(s1.els.length === 6 && await soort('f') === 'uitkomst', 'kader rond een factor: de factor wordt een uitkomst (' + s1.els.length + ' elementen, f is ' + await soort('f') + ')');
  const melding = await p.evaluate(() => (document.querySelector('.sk-kadertip') || {}).textContent || '');
  ok(/Uitkomst gemaakt\. Wil je meer of minder\?/.test(melding) && await p.locator('#sk-paneel [data-k="doel"][data-v="meer"]').isVisible() && await p.locator('#sk-paneel [data-k="doel"][data-v="minder"]').isVisible(), 'melding "Uitkomst gemaakt. Wil je meer of minder?" met meteen de keuze');
  await p.screenshot({ path:(process.env.SHOT || '/tmp') + '/melding-1280.png' }).catch(() => {});
  // 2. Ongedaan maken
  await p.click('#b-terug'); await p.waitForTimeout(250);
  ok(s1.els.find(e => e.id === 'f').t === 'uitkomst' && await soort('f') === 'factor' && (await st()).els.length === 6, 'ongedaan maken: de uitkomst wordt weer een factor');
  // 3. Kader rond een uitkomst: niets verandert, wel een melding
  await kader(await doos(['u']), 22);
  ok((await st()).els.length === 6 && await soort('u') === 'uitkomst' && /al een uitkomst/.test(await p.textContent('#toast-text')), 'kader rond een uitkomst: blijft, met de melding dat het al een uitkomst is');
  // 4. Kader rond een gedrag, een ingreep, twee elementen of niets: gewoon een nieuwe factor
  for (const [ids, wat] of [[['g'], 'een gedrag'], [['i'], 'een ingreep'], [['a', 'b'], 'twee elementen']]) {
    await laad(); await kader(await doos(ids), 22); const s4 = await st();
    ok(s4.els.length === 7 && s4.els[6].t === 'factor' && ids.every(id => s4.els.find(e => e.id === id).t === E.find(x => x.id === id).t), 'kader rond ' + wat + ': een nieuwe factor, er verandert niets anders');
  }
  const leeg = async () => { const di = await doos(['i']), db = await doos(['b']); return { x0:di.x0 + 50, y0:db.y0, x1:di.x0 + 150, y1:db.y1 }; };
  await laad(); await kader(await leeg(), 10);
  ok((await st()).els.length === 7 && (await st()).els[6].t === 'factor' && (await st()).ver.length === 1, 'een rechthoek op een lege plek: een nieuwe factor, zoals voorheen');
  // 5. Kleine en scheve kaders met de hand
  for (const [marge, opt, wat] of [[16, { jitter:4 }, 'klein en bibberig'], [22, { scheef:14, jitter:5 }, 'scheef'], [8, { jitter:2 }, 'heel krap (begint op de rand)']]) {
    await laad(); await kader(await doos(['f']), marge, opt);
    ok(await soort('f') === 'uitkomst' && (await st()).els.length === 6, 'kader ' + wat + ' wordt herkend (' + await soort('f') + ', ' + (await st()).els.length + ' elementen)');
  }
  // 5b. Uitgezoomd (kleine elementen op het scherm) met een ruime marge: nog altijd een uitkomst
  await laad(); await p.click('#z-uit'); await p.click('#z-uit'); await p.waitForTimeout(200); await kader(await doos(['f']), 24, { jitter:3 });
  ok(await soort('f') === 'uitkomst' && (await st()).els.length === 6, 'uitgezoomd, kader met ruime marge: herkend (' + await soort('f') + ')');
  // 6. Een nieuwe rechthoek: twee knoppen Factor (gekozen) en Uitkomst, minstens 44 px
  await laad(); await kader(await leeg(), 10);
  const kn = await p.evaluate(() => [...document.querySelectorAll('#sk-paneel .sk-fu [data-k="soort"]')].map(x => { const r = x.getBoundingClientRect(); return [x.dataset.v, x.getAttribute('aria-checked'), Math.round(r.height)]; }));
  ok(kn.length === 2 && kn[0][0] === 'factor' && kn[0][1] === 'true' && kn[1][0] === 'uitkomst' && kn.every(x => x[2] >= 44), 'na een rechthoek: knoppen Factor (gekozen) en Uitkomst, naast elkaar, minstens 44 px (' + JSON.stringify(kn) + ')');
  if (kn.length === 2) { await p.click('#sk-paneel .sk-fu [data-v="uitkomst"]'); await p.waitForTimeout(250); }
  const s6 = await st(); ok(s6.els[6] && s6.els[6].t === 'uitkomst', 'Uitkomst kiezen maakt er een uitkomst van');
  // 7. Uitleg: startscherm, legende, aria-label
  await p.evaluate(() => localStorage.removeItem('systeemkaart.v1')); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const start = await p.evaluate(() => document.getElementById('ocStart').textContent.replace(/\s+/g, ' ')), aria = await p.getAttribute('#sk-svg', 'aria-label'), mw = await p.evaluate(() => document.querySelector('.explain').textContent.replace(/\s+/g, ' '));
  ok(/Uitkomst ?teken een kader rond een factor/.test(start) && /kader rond een factor/.test(aria) && /Teken een kader rond een factor/.test(mw) && !/Kies bij een factor de soort Uitkomst/.test(mw), 'uitleg: kader rond een factor in startscherm, aria-label, Hoe werkt dit en Meer weten');
  ok(!PE.length, '(controle) geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
