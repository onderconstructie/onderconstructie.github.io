// Een voorbeeld laden in een leeg project laat geen lege lijst achter (hertest d1: Retro "Leeg 15/11/2026" en Weerstand "Nieuwe doelgroep"
// bleven bewaard, en de Weerstand legde die lege doelgroep ook klaar voor andere tools).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  const open = async (t, data) => {
    const c = await b.newContext({ viewport:{ width:1200, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 140)));
    await p.goto(B + '/' + t + '/', { waitUntil:'domcontentloaded' });
    await p.evaluate(d => { localStorage.setItem('oc.welkom', '1'); localStorage.setItem('oc.project', JSON.stringify({ name:'Leeg', since:Date.now() })); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
    await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400);
    await p.evaluate(() => { const e = document.querySelector('#vb-show, #vb-load, #example'); e.hidden = false; e.click(); }); await p.waitForTimeout(700);
    return { p, c, E };
  };
  // Retro: een leeg project, het voorbeeld laden
  let { p, c, E } = await open('retro', {});
  let r = await p.evaluate(() => JSON.parse(localStorage.getItem('retro.v1')).retros.map(x => (x.voorbeeld ? 'VB:' : '') + x.name));
  ok(r.length === 1 && /^VB:/.test(r[0]), 'retro: alleen het voorbeeld, geen lege retro ernaast (' + r.join(' ; ') + ')');
  ok(!E.length, 'retro: geen fouten ' + E.join(' | ')); await c.close();
  // Weerstand: Nieuwe bib heeft een doelgroep; in het lege project Leeg zet de tool een lege doelgroep klaar, dan het voorbeeld
  ({ p, c, E } = await open('weerstand', { 'weerstand.v1': { groups:[{ id:'g1', name:'Lezers', project:'Nieuwe bib', size:'40', change:'', plan:[{ id:'p1', text:'Infoavond', src:'eigen', who:'', due:'', done:false }], scans:[{ id:'s1', date:'2026-11-01', a:{} }] }], current:'g1' } }));
  r = await p.evaluate(() => ({ g:JSON.parse(localStorage.getItem('weerstand.v1')).groups.map(x => (x.voorbeeld ? 'VB:' : '') + (x.name || '(leeg)') + '/' + x.project), sh:(JSON.parse(localStorage.getItem('oc.share.weerstand') || '{"lists":[]}').lists || []).map(l => l.project + '/' + l.name).join(' ; ') }));
  ok(!r.g.some(x => /^(\(leeg\)|Nieuwe doelgroep)\/Leeg$/.test(x)) && r.g.includes('Lezers/Nieuwe bib'), 'weerstand: geen lege doelgroep voor Leeg naast het voorbeeld, Lezers blijft (' + r.g.join(' ; ') + ')');
  ok(!/Leeg\//.test(r.sh), 'weerstand: niets van Leeg klaargelegd voor andere tools (' + r.sh + ')');
  ok(!E.length, 'weerstand: geen fouten ' + E.join(' | ')); await c.close();
  // Hertest e: alleen echt onaangeroerde lijsten vallen weg. Een retro met een eigen naam of een ander formaat (nog zonder kaartjes) blijft.
  ({ p, c, E } = await open('retro', { 'retro.v1': { retros:[{ id:'r1', name:'Retro sprint 12 met het hele team', project:'Leeg', date:'2026-11-15', format:'hrp', cards:[], actions:[], carried:[] }], current:'r1' } }));
  r = await p.evaluate(() => JSON.parse(localStorage.getItem('retro.v1')).retros.map(x => (x.voorbeeld ? 'VB:' : '') + x.name));
  ok(r.includes('Retro sprint 12 met het hele team'), 'retro met een eigen naam blijft na het voorbeeld (' + r.join(' ; ') + ')'); await c.close();
  ({ p, c, E } = await open('retro', { 'retro.v1': { retros:[{ id:'r1', name:'Leeg 15/11/2026', project:'Leeg', date:'2026-11-15', format:'gba', cards:[], actions:[], carried:[] }], current:'r1' } }));
  r = await p.evaluate(() => JSON.parse(localStorage.getItem('retro.v1')).retros.map(x => (x.voorbeeld ? 'VB:' : '') + x.name + '/' + x.format));
  ok(r.includes('Leeg 15/11/2026/gba'), 'retro met een ander formaat blijft na het voorbeeld (' + r.join(' ; ') + ')'); await c.close();
  // Een doelgroep met alleen "wat verandert er" ingevuld (nog geen scan) blijft
  ({ p, c, E } = await open('weerstand', { 'weerstand.v1': { groups:[{ id:'g1', name:'Nieuwe doelgroep', project:'Leeg', size:'', change:'Wij stappen over op het nieuwe zaaksysteem in maart', plan:[], scans:[{ id:'s1', date:'2026-11-01', a:{} }] }], current:'g1' } }));
  r = await p.evaluate(() => JSON.parse(localStorage.getItem('weerstand.v1')).groups.filter(x => !x.voorbeeld).map(x => x.change));
  ok(r.some(x => /zaaksysteem/.test(x)), 'doelgroep met een ingevulde verandering blijft na het voorbeeld (' + r.join(' ; ') + ')'); ok(!E.length, 'geen fouten ' + E.join(' | ')); await c.close();
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
