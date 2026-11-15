// Klimaat en Impact na een apart voorbeeld (hertest d1): de kerncijfers horen bij het project van de app, niet bij de open analyse,
// en het aparte voorbeeld krijgt ook zijn eigen projectveld (anders hield het project "Nieuwe bib" en vermengde het bij een andere naam).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const VB = '#example, #example-btn, #vb-show, #vb-load';
(async () => { const b = await chromium.launch();
  const c = await b.newContext({ viewport:{ width:1200, height:1000 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  await c.addInitScript(() => { if (!localStorage.getItem('oc.welkom')) { localStorage.setItem('oc.welkom', '1'); localStorage.setItem('oc.project', JSON.stringify({ name:'Nieuwe bib', since:1 })); localStorage.setItem('oc-app.projects', JSON.stringify(['Nieuwe bib'])); } });
  const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e).slice(0, 150))); p.on('dialog', d => d.accept().catch(() => {}));
  const klik = async sel => { await p.evaluate(sel => { const e = document.querySelector(sel); if (e) { e.hidden = false; e.click(); } }, sel); await p.waitForTimeout(700); };
  for (const t of ['klimaat', 'impact']) {
    await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
    await klik(VB); await klik('#vb-eigen');   // geval a: het voorbeeld wordt het werk van Nieuwe bib
    await klik(VB); await klik('#vb-eigen');   // geval b: Nieuwe bib heeft werk, het tweede voorbeeld wordt een apart project
    const r = await p.evaluate(t => { const d = JSON.parse(localStorage.getItem(t + '.v1')), sh = JSON.parse(localStorage.getItem('oc.share.' + t) || '{"lists":[]}');
      return { an:d.analyses.map(a => a.name + '|' + (a.project || '')), kern:sh.lists.filter(l => l.items.some(i => i.type === 'kerncijfer')).map(l => l.project).join() }; }, t);
    const apart = r.an.find(x => !/^Nieuwe bib\|/.test(x)) || '';
    ok(apart && apart.split('|')[0] === apart.split('|')[1], `${t}: het aparte voorbeeld heeft zijn eigen projectveld (${r.an.join(' ; ')})`);
    // hertest e: elk project zijn eigen lijst kerncijfers; die van het project van de app komt eerst
    ok(r.kern.split(',')[0] === 'Nieuwe bib' && r.kern.split(',').length === new Set(r.kern.split(',')).size, `${t}: de kerncijfers van Nieuwe bib, het project van de app, staan eerst; elk project één lijst (${r.kern})`);
  }
  await p.goto(B + '/veranderprofiel/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
  const vp = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  ok(/Klimaat UIT DE TOOL/i.test(vp) && /Impact UIT DE TOOL/i.test(vp), 'Veranderprofiel van Nieuwe bib haalt Klimaat en Impact uit de tools (' + (/\d Impact \S+ \S+ \S+/.exec(vp) || [''])[0] + ' | ' + (/\d Klimaat \S+ \S+ \S+/.exec(vp) || [''])[0] + ')');
  // Hertest e: kerncijfers per project. Werk onder Beta mag het profiel van Nieuwe bib niet leeg maken, ook zonder de bronnen opnieuw te openen.
  const app = n => p.evaluate(n => { localStorage.setItem('oc.project', JSON.stringify({ name:n, since:Date.now() })); }, n);
  const ga = async t => { await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500); };
  const profiel = async n => { await app(n); await ga('veranderprofiel'); return p.evaluate(() => { const f = readFigures(); return (f['klimaat.analyse'] || {}).v + ' / ' + (f['impact.analyse'] || {}).v; }); };
  await app('Beta');
  for (const t of ['klimaat', 'impact']) { await ga(t); await klik(VB); await klik('#vb-eigen'); }
  let v = await profiel('Beta'); ok(v === 'Beta / Beta', 'profiel van Beta: de analyses van Beta (' + v + ')');
  v = await profiel('Nieuwe bib'); ok(v === 'Nieuwe bib / Nieuwe bib', 'profiel van Nieuwe bib na werk onder Beta, bronnen niet heropend: nog altijd die van Nieuwe bib (' + v + ')');
  // twee analyses in één project: de open analyse als ze bij het project hoort, anders de laatst bewaarde van dat project
  await ga('klimaat');
  await p.evaluate(() => { const a = state.analyses.find(x => x.name === 'Nieuwe bib'); const n = { ...JSON.parse(JSON.stringify(a)), id:'tweede', name:'Mijn analyse', project:'Nieuwe bib' };
    state.analyses.push(n); state.current = 'tweede'; save(); }); await p.waitForTimeout(700);
  v = await profiel('Nieuwe bib'); ok(v.startsWith('Mijn analyse /'), 'twee analyses in Nieuwe bib: de open analyse telt (' + v + ')');
  await app('Beta'); await ga('klimaat'); await p.waitForTimeout(400);   // nu staat de analyse van Beta open
  v = await profiel('Nieuwe bib'); ok(v.startsWith('Mijn analyse /'), 'Beta open in Klimaat: Nieuwe bib houdt zijn laatst bewaarde analyse (' + v + ')');
  v = await profiel('Beta'); ok(v === 'Beta / Beta', 'Beta toont nooit een analyse van Nieuwe bib (' + v + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
