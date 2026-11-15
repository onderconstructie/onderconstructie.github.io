// Communicatieplan: vaste testen voor inhoudelijke fouten die testers vonden (intensiteit alleen uit het vak, hele woorden).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/communicatie/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const voorstel = hint => p.evaluate(h => { const g = newGroup('Groep'); g.hint = h; g.source = 'Betrokkenenradar'; return suggestIntens(g).v; }, hint);
  // [notitie, verwacht]; null = alles behalve "sterk" (geen vak, dus geen sterk voorstel uit de tekst)
  const gevallen = [
    ['In het oog houden · Merken er nauwelijks iets van', 'licht'],        // "nauw" in "nauwelijks" telde vroeger als "nauw betrekken"
    ['In het oog houden · Staan tegen de verandering', 'licht'],           // vrije tekst na het vak stuurt niet
    ['Op de hoogte houden · Werken informeel samen met de conciërge', 'midden'],
    ['Vroeg opzoeken · Vindt de timing slecht', 'sterk'],
    ['Nauw betrekken · Trekt het project', 'sterk'],
    ['klimaat: Moe maar welwillend', 'midden'],
    ['dominant: willen · knelpunt: verlies', 'sterk'],
    ['moet nauwelijks iets anders doen', null],
    ['moet informeel overleggen', null]
  ];
  for (const [h, v] of gevallen) { const r = await voorstel(h); ok(v ? r === v : r !== 'sterk', `"${h}": ${r}${v ? ' (verwacht ' + v + ')' : ''}`); }
  // Een onbekende intensiteit in de opslag (oud of beschadigd) gaf een paginafout: INTENS[...].n (hertest a, bestand-en-veiligheid)
  await p.evaluate(() => { localStorage.setItem('communicatie.v1', JSON.stringify({ plannen:[{ id:'p1', name:'Kapot', groups:[{ id:'g1', name:'Loket', change:'', goals:['weten', 'kapot"<b>'], intens:'heel erg"<b>', channels:['mail'] }] }], current:'p1' })); });
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400);
  // ook een onbekend doel (vergiftigde gegevens in bestand-en-veiligheid: TypeError .label)
  const kap = await p.evaluate(() => { try { render(); asideHTML(); return state.groups.map(g => intens(g)).join(); } catch (e) { return 'fout: ' + e.message; } });
  ok(['licht', 'midden', 'sterk'].includes(kap), 'onbekende intensiteit en een onbekend doel: geen fout, terugval op het voorstel (' + kap + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
