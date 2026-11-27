// Koppelingen tussen tools (ocShare v3 en oc.project): vaste testen voor wat testers vonden met twee projecten, "Nieuwe bib" en "Zwembad".
// Klaarleggen per project, de kiezer per project, hernoemen en wissen in de bron, "Maak er mijn eigen van", Gedrag volgt de projectwissel,
// en het Veranderprofiel telt alleen analyses van het eigen project. Elk geval in een eigen, lege browsercontext (niets wissen).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9025);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const NB = 'Nieuwe bib', ZW = 'Zwembad';
// ---------- eigen gegevens voor twee projecten ----------
const SH = { model:3, analyses:[
  { id:'a1', name:NB, items:[{ id:'s1', name:'Schepen van cultuur', contribution:9, willingness:8 }, { id:'s2', name:'Bibliotheekteam', contribution:8, willingness:4 }, { id:'s3', name:'Vrijwilligers', contribution:5, willingness:9 }, { id:'s4', name:'Scholen', contribution:4, willingness:6 }] },
  { id:'a2', name:ZW, items:[{ id:'s5', name:'Zwemclub', contribution:7, willingness:5 }, { id:'s6', name:'Schepen van sport', contribution:9, willingness:7 }] }], huidig:'a1' };
const scan = { id:'sc1', date:'2026-11-12', a:{ w10:0, w11:0, w12:1, w20:0, w21:1, w22:0, w30:1, w31:0, w32:0, w40:0, w41:1, w42:0, w50:0, w51:0, w52:1, bon1:0, bver0:1, bver1:0, bonv1:1, bruimte0:2, bruimte1:2 } };
const WS = { groups:[
  { id:'g1', name:'Bibliotheekteam', size:'12', change:'Uitlenen via de zelfscan', project:NB, scans:[scan], plan:[{ id:'p1', text:'Infosessie over de nieuwe uitleenbalie', src:'lvl4', who:'Teamcoach', due:'', done:false }] },
  { id:'g2', name:'Redders', size:'8', change:'Nieuw rooster', project:ZW, scans:[scan], plan:[{ id:'p2', text:'Rooster samen opmaken met de redders', src:'lvl4', who:'Hoofdredder', due:'', done:false }] }], current:'g1', view:'res', step:0 };
const unit = (id, project, wie, wat, acts) => ({ id, voorbeeld:false, project, wie, wat, waar:'', scores:{}, notes:{}, acts, meet:'', terug:'' });
const GD = { units:[unit('u1', NB, 'Bibliotheekteam', 'gebruiken de zelfscan bij elke uitlening', [
  { id:'x1', text:'Zelfscan naast de balie zetten', part:'vlot', help:'makkelijk', who:'Facility', when:'maart', done:false },
  { id:'x2', text:'Wekelijks tonen hoeveel uitleningen via de zelfscan gingen', part:'gezien', help:'voorgaan', who:'Teamleider', when:'april', done:false }])], current:'u1' };
const PR = { lists:[{ id:'l1', name:NB, items:[{ id:'i1', name:'Bewegwijzering naar de nieuwe ingang', impact:4, effort:1, done:false }] },
  { id:'l2', name:ZW, items:[{ id:'i4', name:'Nieuwe kluisjes bestellen', impact:3, effort:2, done:false }] }], current:'l1' };
const RE = { retros:[{ id:'rt1', name:'Retro Nieuwe bib sprint 1', date:'2026-11-13', format:'hrp', cards:[{ id:'c1', col:0, text:'Korte stand-up elke ochtend', votes:3 }],
  actions:[{ id:'ra1', text:'Contactpersoon aanvragen bij de leverancier', who:'Pieter, Fatima', when:'', done:false }], carried:[] }], current:'rt1', sortVotes:false, col:0, minutes:5 };

(async () => { const b = await chromium.launch(); const PE = [];
  const nieuw = async () => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} }); return c; };
  const pagina = async c => { const p = await c.newPage(); p.on('pageerror', e => PE.push(p.url().replace(B, '') + ': ' + String(e).slice(0, 160))); p.on('dialog', d => d.accept()); return p; };
  const open = async (p, u) => { await p.goto(B + u, { waitUntil:'networkidle' }); await p.waitForTimeout(700); };
  const zet = (p, o) => p.evaluate(o => { Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); }, o);
  const project = (n, since = Date.now()) => JSON.stringify({ name:n, since });
  const lees = (p, k) => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, k);
  // de kiezer lezen: per bron of het onder "Andere projecten" staat, en per item of het aangevinkt is
  const kiezer = async p => { await p.waitForSelector('.ocs-back', { timeout:6000 }); await p.waitForTimeout(200);
    return p.evaluate(() => [...document.querySelectorAll('.ocs-src')].map(s => ({ ander:!!s.closest('.ocs-ander'), kop:s.querySelector('.ocs-src-head').textContent.replace(/\s+/g, ' ').trim(),
      items:[...s.querySelectorAll('.ocs-item')].map(i => ({ t:i.querySelector('span').childNodes[0].textContent.trim(), aan:i.querySelector('input').checked, al:i.querySelector('input').disabled })) }))); };
  const waar = (k, t) => { const s = k.find(x => x.items.some(i => i.t === t)); return s ? (s.ander ? 'ander' : 'eigen') : 'weg'; };
  const aan = k => k.flatMap(s => s.items.filter(i => i.aan).map(i => i.t));
  const klik = async (p, sel) => { const l = p.locator(sel).filter({ visible:true }).first(); if (await l.count()) await l.click({ timeout:5000 }); else await p.locator(sel).first().click({ timeout:5000 }); };
  const kies = async (p, teksten) => { await p.evaluate(T => { document.querySelectorAll('.ocs-ander').forEach(d => { d.open = true; }); document.querySelectorAll('.ocs-item').forEach(l => { const i = l.querySelector('input'); if (!i.disabled && T.includes(l.querySelector('span').childNodes[0].textContent.trim())) { i.checked = true; i.dispatchEvent(new Event('change', { bubbles:true })); } }); }, teksten); await p.click('.ocs-ok'); await p.waitForTimeout(700); };
  // alle bronnen klaarleggen: elke tool legt klaar bij het openen
  const bronnen = async (p, tools) => { for (const t of tools) await open(p, '/' + t + '/'); };
  const basis = { 'oc.project':project(NB), 'oc-app.projects':[NB, ZW], 'stakeholders.v1':SH, 'weerstand.v1':WS, 'gedrag.v1':GD, 'prioriteit.v1':PR, 'retro.v1':RE };

  // 1. Weerstand legt per project klaar; Gedrag (?van=weerstand) vinkt nooit een doelgroep van een ander project aan
  let c = await nieuw(), p = await pagina(c); await open(p, '/privacy/'); await zet(p, basis);
  await bronnen(p, ['stakeholders', 'weerstand', 'gedrag', 'prioriteit', 'retro']);
  const ws = await lees(p, 'oc.share.weerstand') || { lists:[] };
  const dg = ws.lists.filter(l => l.items.some(i => i.type === 'betrokkene'));
  ok(dg.length === 2 && dg.every(l => l.project === (l.items[0].text === 'Redders' ? ZW : NB) && l.items.length === 1), 'Weerstand: één lijst doelgroepen per project, met het project erbij (' + dg.map(l => l.name + '/' + l.project + ':' + l.items.map(i => i.text)).join(', ') + ')');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('gedrag.v1')); s.units.push({ id:'u2', voorbeeld:false, project:'Nieuwe bib', wie:'', wat:'', waar:'', scores:{}, notes:{}, acts:[], meet:'', terug:'' }); s.current = 'u2'; localStorage.setItem('gedrag.v1', JSON.stringify(s)); });
  await open(p, '/gedrag/?van=weerstand'); if (!(await p.locator('.ocs-back').count())) await klik(p, '[data-act="imp"]');
  let k = await kiezer(p);
  ok(!aan(k).includes('Redders'), 'Gedrag vanuit Weerstand: Redders (Zwembad) staat niet vooraf aangevinkt (aangevinkt: ' + aan(k).join(', ') + ')');
  ok(waar(k, 'Redders') === 'ander' && waar(k, 'Zwemclub') === 'ander', 'Gedrag: doelgroepen van Zwembad staan onder Andere projecten');
  ok(await p.evaluate(() => { const d = document.querySelector('.ocs-ander'); return !!d && !d.open; }), 'Andere projecten staan ingeklapt');
  await p.click('.ocs-cancel'); await p.waitForTimeout(200);

  // 2. Eigen werk van Gedrag, Retro en Weerstand staat in de kiezer van het Takenbord en de Systeemkaart bij het eigen project
  await open(p, '/kanban/'); await klik(p, 'button[data-act="importTasks"]'); k = await kiezer(p);
  const eigenTaken = ['Zelfscan naast de balie zetten', 'Contactpersoon aanvragen bij de leverancier', 'Infosessie over de nieuwe uitleenbalie', 'Bewegwijzering naar de nieuwe ingang'];
  ok(eigenTaken.every(t => waar(k, t) === 'eigen'), 'Takenbord: Gedrag, Retro, Weerstand en Prioriteren van Nieuwe bib staan bij het eigen project (' + eigenTaken.map(t => t.slice(0, 18) + ':' + waar(k, t)).join(', ') + ')');
  ok(waar(k, 'Rooster samen opmaken met de redders') === 'ander' && waar(k, 'Nieuwe kluisjes bestellen') === 'ander', 'Takenbord: acties van Zwembad staan onder Andere projecten');
  ok(!aan(k).length, 'Takenbord zonder ?van: niets vooraf aangevinkt (' + aan(k).join(', ') + ')');
  await p.click('.ocs-cancel'); await p.waitForTimeout(200);
  await zet(p, { 'systeemkaart.v1':{ lists:[{ id:'s1', name:NB, over:'Uitlenen duurt te lang', els:[{ id:'e1', t:'gedrag', n:'gebruiken de zelfscan bij elke uitlening', x:0, y:0, wie:'Bibliotheekteam', doel:'meer' }], ver:[] }], current:'s1' } });
  await open(p, '/systeemkaart/');
  try { await p.click('#b-toe'); await p.waitForTimeout(300); await p.click('[data-p="imp-acties"]'); k = await kiezer(p);
    ok(['Zelfscan naast de balie zetten', 'Contactpersoon aanvragen bij de leverancier', 'Infosessie over de nieuwe uitleenbalie'].every(t => waar(k, t) === 'eigen') && waar(k, 'Rooster samen opmaken met de redders') === 'ander',
      'Systeemkaart: eigen acties bij Nieuwe bib, Zwembad onder Andere projecten (' + k.map(s => (s.ander ? '(ander) ' : '') + s.kop).join(' | ') + ')');
    await p.click('.ocs-cancel'); } catch (e) { ok(false, 'Systeemkaart: kiezer met acties ' + String(e).slice(0, 100)); }

  // 3. Betrokkenenradar -> RACI: hernoemen in de bron werkt de rol bij, wissen geeft een zacht signaal (niets dubbel, niets gewist)
  await open(p, '/raci/'); await klik(p, 'button[data-oc-types="betrokkene"]'); k = await kiezer(p);
  await kies(p, ['Schepen van cultuur', 'Bibliotheekteam', 'Vrijwilligers', 'Scholen']);
  const rollen = async () => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('raci.v1')); const m = s.mats.find(x => x.id === s.current) || s.mats[0]; return m.roles.map(r => r.name); });
  ok((await rollen()).join() === 'Schepen van cultuur,Bibliotheekteam,Vrijwilligers,Scholen', 'RACI: vier rollen uit de Betrokkenenradar (' + (await rollen()).join(', ') + ')');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('stakeholders.v1')); const a = s.analyses.find(x => x.id === 'a1'); a.items.find(x => x.name === 'Bibliotheekteam').name = 'Team bibliotheek'; a.items = a.items.filter(x => x.name !== 'Scholen'); localStorage.setItem('stakeholders.v1', JSON.stringify(s)); });
  await open(p, '/stakeholders/'); await open(p, '/raci/');
  const signaal = await p.evaluate(() => [...document.querySelectorAll('th[data-role]')].map(th => th.querySelector('.name').textContent.trim() + (th.querySelector('.oc-weg') ? ' [' + th.querySelector('.oc-weg').textContent.trim() + ']' : '')));
  ok(signaal.some(s => /^Scholen \[staat niet meer in Betrokkenenradar\]$/.test(s)) && signaal.filter(s => /staat niet meer/.test(s)).length === 1, 'RACI: Scholen (gewist in de bron) krijgt een zacht signaal; Bibliotheekteam (hernoemd, ligt nog klaar) niet (' + signaal.join(' | ') + ')');
  // v4 (meelopen): de hernoemde rol liep bij het openen al mee. In de kiezer staat ze als "staat er al"; niets dubbel.
  await klik(p, 'button[data-oc-types="betrokkene"]'); k = await kiezer(p);
  const tb = k.flatMap(s => s.items).find(i => i.t === 'Team bibliotheek');
  ok(!tb || tb.al, 'RACI: na hernoemen in de bron biedt de kiezer Team bibliotheek niet meer als nieuw aan (meegelopen)');
  await p.click('.ocs-cancel'); await p.waitForTimeout(200);
  const na = await rollen();
  ok(na.join() === 'Schepen van cultuur,Team bibliotheek,Vrijwilligers,Scholen', 'RACI: de hernoemde rol liep mee, geen dubbele rol; Scholen blijft staan (' + na.join(', ') + ')');
  await c.close();

  // 4. "Maak er mijn eigen van": met een actief project blijft het project van de app staan, en het werk hoort bij dat project
  const VB = [['prioriteit', '#example', '#vb-eigen'], ['weerstand', '#example', '#vb-eigen'], ['raci', '#example', '#vb-eigen'], ['kanban', 'button:has-text("Voorbeeld bekijken")', 'button.vb-eigen'],
    ['systeemkaart', '#example', '#vb-eigen'], ['stakeholders', '#vbLoad', '#vbEigen'], ['risico', '[data-vb="start"]', '[data-vb="eigen"]'], ['sprint', '#vb-load', '#vb-eigen'], ['gedrag', '[data-act="example"]', '[data-act="vb-eigen"]']];
  for (const [t, vb, eigen] of VB) {
    c = await nieuw(); p = await pagina(c); await open(p, '/privacy/'); await zet(p, { 'oc.project':project(NB, 1700000000000), 'oc-app.projects':[NB, ZW] });
    await open(p, '/' + t + '/');
    try { await klik(p, vb); } catch (e) { ok(false, t + ': voorbeeldknop ' + String(e).slice(0, 80)); await c.close(); continue; }
    await p.waitForTimeout(900);
    const vbShare = await lees(p, 'oc.share.' + t);
    try { await klik(p, eigen); } catch (e) { ok(false, t + ': knop Maak er mijn eigen van ' + String(e).slice(0, 80)); await c.close(); continue; }
    await p.waitForTimeout(1300);
    const pr = (await lees(p, 'oc.project') || {}).name, sh = await lees(p, 'oc.share.' + t);
    let van;
    if (t === 'systeemkaart') { const s = await lees(p, 'systeemkaart.v1'); const l = s && (s.lists.find(x => x.id === s.current) || s.lists[0]); van = l ? [l.name] : []; }
    else van = sh ? sh.lists.filter(l => !/^kerncijfers$/i.test(l.name)).map(l => l.project) : [];
    ok(!vbShare || !vbShare.lists.length, t + ': het voorbeeld legt niets klaar');
    ok(pr === NB && van.length && van.every(x => x === NB), t + ': na "Maak er mijn eigen van" blijft het project ' + NB + ' en hoort het werk erbij (app: ' + pr + '; werk: ' + van.join(', ') + ')');
    await c.close();
  }
  // zonder actief project wordt de naam van het voorbeeld het project
  c = await nieuw(); p = await pagina(c); await open(p, '/prioriteit/'); await klik(p, '#example'); await p.waitForTimeout(700); await klik(p, '#vb-eigen'); await p.waitForTimeout(1000);
  const zonder = (await lees(p, 'oc.project') || {}).name, lijst = await p.evaluate(() => cur().name);
  ok(!!zonder && zonder === lijst, 'Prioriteren zonder actief project: de naam van het voorbeeld wordt het project (' + zonder + ')');
  await c.close();

  // 5. Gedrag volgt de projectwissel: het gedrag van dat project, of een leeg nieuw (niet bewaard zolang het leeg is)
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  const GD2 = { units:[GD.units[0], unit('u3', ZW, 'Redders', 'werken met het nieuwe rooster', [])], current:'u1' };
  await zet(p, { 'oc.project':project(ZW), 'oc-app.projects':[ZW, NB], 'gedrag.v1':GD2 });
  await open(p, '/gedrag/');
  let g = await p.evaluate(() => ({ wie:cur().wie, project:cur().project, veld:(document.getElementById('f-project') || {}).value }));
  ok(g.project === ZW && g.wie === 'Redders' && g.veld === ZW, 'Gedrag na wissel naar Zwembad: het gedrag van Zwembad staat open (' + JSON.stringify(g) + ')');
  await zet(p, { 'oc.project':project('Sporthal') }); await open(p, '/gedrag/');
  g = await p.evaluate(() => ({ wie:cur().wie, project:cur().project, n:JSON.parse(localStorage.getItem('gedrag.v1')).units.length }));
  ok(g.project === 'Sporthal' && !g.wie && g.n === 2, 'Gedrag voor een nieuw project: een leeg gedrag van dat project, niet bewaard (' + JSON.stringify(g) + ')');
  await p.click('.tab[data-unit="u1"]'); await p.waitForTimeout(300); await open(p, '/gedrag/');
  ok(await p.evaluate(() => cur().id === 'u1'), 'Gedrag: kies je zelf een ander tabblad, dan blijft dat open bij de volgende keer');
  await c.close();

  // 6. Veranderprofiel: een Impact- en Klimaat-analyse met een standaardnaam telt alleen voor het project waarin je ze maakte
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/'); await zet(p, { 'oc.project':project(NB), 'oc-app.projects':[NB, ZW] });
  await open(p, '/impact/');
  await p.evaluate(() => { const a = cur(); a.name = 'Mijn analyse'; const pr = a.profiles[0]; pr.name = 'Loket'; DIMS.forEach(d => { pr.dims[d.id].score = 4; }); save(); ocPublish(); });
  await open(p, '/klimaat/');
  await p.evaluate(() => { const a = cur(); a.name = 'Mijn analyse'; const u = a.units[0]; u.name = 'Team'; u.workload = 2; u.projects = [Object.assign(newProject('Vorige verandering'), { year:'2025', goal:'nee', support:'slecht', time:'nee', budget:'nee', weight:4 })]; save(); ocPublish(); });
  const profiel = async n => { await open(p, '/veranderprofiel/'); return p.evaluate(n => { state.project = n; save(); render(); const r = compute(); return Object.fromEntries(Object.entries(r.ax).map(([k, v]) => [k, v.level])); }, n); };
  let r = await profiel(ZW);
  ok(r.impact == null && r.klimaat == null, 'Veranderprofiel Zwembad: "Mijn analyse" van Nieuwe bib telt niet mee (impact ' + r.impact + ', klimaat ' + r.klimaat + ')');
  r = await profiel(NB);
  ok(r.impact === 4 && r.klimaat != null, 'Veranderprofiel Nieuwe bib: dezelfde analyses tellen wel mee (impact ' + r.impact + ', klimaat ' + r.klimaat + ')');
  await c.close();

  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
