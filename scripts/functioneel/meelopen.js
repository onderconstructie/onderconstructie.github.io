// Meelopen (ocShare v4, /app/oc-share.js): een overgenomen kopie volgt haar bron.
// Deel A test de motor zelf met verzonnen gegevens; deel B met echte tools (Vinkje en Retro als bron, Takenbord, Vinkje en Tijdlijn als kopie).
// BASE=http://127.0.0.1:8970 node scripts/functioneel/meelopen.js   (de app en alle tools onder één adres)
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970);
const fout = []; let n = 0; const ok = (c, m) => { n++; console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const NB = 'Nieuwe bib';

(async () => { const b = await chromium.launch(); const PE = [];
  const nieuw = async () => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} }); return c; };
  const pagina = async c => { const p = await c.newPage(); p.on('pageerror', e => PE.push(p.url().replace(B, '') + ': ' + String(e).slice(0, 160))); p.on('dialog', d => d.accept()); return p; };
  const open = async (p, u) => { await p.goto(B + u, { waitUntil:'networkidle' }); await p.waitForTimeout(700); };
  const zet = (p, o) => p.evaluate(o => { Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); }, o);
  const lees = (p, k) => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, k);
  const kies = async (p, teksten) => { await p.waitForSelector('.ocs-back', { timeout:6000 }); await p.waitForTimeout(200);
    await p.evaluate(T => { document.querySelectorAll('.ocs-ander').forEach(d => { d.open = true; }); document.querySelectorAll('.ocs-item').forEach(l => { const i = l.querySelector('input'); const t = l.querySelector('span').childNodes[0].textContent.trim(); if (!i.disabled) i.checked = T.includes(t); }); document.querySelector('.ocs-back').dispatchEvent(new Event('change')); }, teksten);
    await p.click('.ocs-ok'); await p.waitForTimeout(600); };
  const melding = p => p.evaluate(() => { const m = document.getElementById('ocs-melding'); return m ? m.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const bron = (lists, extra) => ({ id:'proefbron', tool:'Proefbron', updated:1, lists, ...(extra || {}) });

  // ---------- A. De motor, met verzonnen gegevens ----------
  let c = await nieuw(), p = await pagina(c); await open(p, '/privacy/'); await p.addScriptTag({ url:'/app/oc-share.js' });
  // A1 publish schrijft niet opnieuw als er niets veranderde
  const pub = () => p.evaluate(() => ocShare.publish('proefpub', 'Proefpub', [{ name:'Nieuwe bib', project:'Nieuwe bib', items:[{ type:'taak', text:'Budget goedkeuren', ref:'t1' }, { type:'taak', text:'Zaal boeken', ref:'t2', klaar:true }, { type:'actie', text:'Planning bijsturen', prio:'hoog' }] }]));
  await pub(); const u1 = (await lees(p, 'oc.share.proefpub')).updated; await p.waitForTimeout(30); await pub(); const s1 = await lees(p, 'oc.share.proefpub');
  ok(s1.updated === u1, 'publish: niets veranderd, dan niet opnieuw wegschrijven (updated blijft ' + u1 + ')');
  ok(s1.lists[0].items.length === 2 && s1.klaar && s1.klaar.length === 1 && s1.klaar[0].t === 'Zaal boeken' && s1.klaar[0].r === 't2', 'publish: wat klaar is, staat apart onder klaar (niet in de lijst)');
  ok(s1.lists[0].items.find(i => i.text === 'Planning bijsturen').prio === 'hoog', 'publish: prio gaat mee als vast veld');
  ok(await p.evaluate(() => ocShare.count(['taak'], 'x') === 1 && !ocShare.sources(['taak'], 'x').some(s => s.items.some(i => i.text === 'Zaal boeken'))), 'kiezer en teller zien wat klaar is niet');

  // A2 overnemen vult het register; daarna lopen hernoemen en klaar mee
  await zet(p, { 'oc.project':{ name:NB, since:1 }, 'oc.share.proefbron':bron([{ name:NB, project:NB, h:1, ch:1, items:[{ type:'taak', text:'Budget goedkeuren', ref:'r1' }, { type:'taak', text:'Zaal boeken', ref:'r2' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Catering regelen' }, { type:'taak', text:'Stoelen tellen' }] }]),
    'proef.v1':{ lijsten:[{ naam:NB, items:[] }, { naam:'Voorbeeld', voorbeeld:true, items:[{ id:'v1', text:'Budget goedkeuren', done:false }] }] } });
  const neem = async teksten => { const g = p.evaluate(() => ocShare.pick({ types:['taak'], self:'proef' })); await kies(p, teksten); return g; };
  const gekozen = await neem(['Budget goedkeuren', 'Zaal boeken', 'Catering regelen', 'Stoelen tellen']);
  await p.evaluate(g => { const s = JSON.parse(localStorage.getItem('proef.v1')); g.forEach((x, i) => s.lijsten[0].items.push(i === 2 ? { id:'k' + i, titel:x.text, status:'todo' } : { id:'k' + i, text:x.text, done:false })); localStorage.setItem('proef.v1', JSON.stringify(s)); }, await gekozen);
  const R = await lees(p, 'oc.volg.proef');
  ok(R && R.e.length === 4 && R.e.find(e => e.t === 'Budget goedkeuren').r === 'r1' && R.e.find(e => e.t === 'Catering regelen').i === 3, 'overnemen: het register onthoudt bron, ref en plaats (' + (R ? R.e.map(e => e.t + '@' + e.i + (e.r ? '#' + e.r : '')).join(', ') : 'geen') + ')');
  const volg = (af) => p.evaluate(af => ocShare.volg('proef', ['proef.v1'], af), af);
  const items = async () => (await lees(p, 'proef.v1')).lijsten[0].items;
  // hernoemen met ref, en zonder ref op dezelfde plaats in een even lange lijst
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget laten goedkeuren', ref:'r1' }, { type:'taak', text:'Zaal boeken', ref:'r2' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Broodjes bestellen' }, { type:'taak', text:'Stoelen tellen' }] }]) });
  let u = await volg('status=klaar'), it = await items();
  ok(it[0].text === 'Budget laten goedkeuren' && it[2].titel === 'Broodjes bestellen' && u.hernoemd.length === 2, 'hernoemen loopt mee: met ref, en zonder ref op dezelfde plaats (' + it.map(x => x.text || x.titel).join(', ') + ')');
  ok((await lees(p, 'proef.v1')).lijsten[1].items[0].text === 'Budget goedkeuren', 'een voorbeeld raken we nooit aan');
  // klaar met ref: vlag en status; weer open: terug
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget laten goedkeuren', ref:'r1' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Broodjes bestellen' }, { type:'taak', text:'Stoelen tellen' }] }], { klaar:[{ l:NB, p:NB, y:'taak', t:'Zaal boeken', r:'r2' }] }) });
  u = await volg('status=klaar'); it = await items();
  ok(it[1].done === true && u.klaar.length === 1, 'klaar in de bron: de kopie staat ook op klaar');
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget laten goedkeuren', ref:'r1' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Stoelen tellen' }] }], { klaar:[{ l:NB, p:NB, y:'taak', t:'Zaal boeken', r:'r2' }, { l:NB, p:NB, y:'taak', t:'Broodjes bestellen' }] }) });
  u = await volg('status=klaar'); it = await items();
  ok(it[2].status === 'klaar', 'klaar zonder vlag: de status van de tool wordt klaar (data-af)');
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget laten goedkeuren', ref:'r1' }, { type:'taak', text:'Zaal boeken', ref:'r2' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Broodjes bestellen' }, { type:'taak', text:'Stoelen tellen' }] }]) });
  u = await volg('status=klaar'); it = await items();
  ok(it[1].done === false && it[2].status === 'todo', 'weer open in de bron: de kopie ook, met de status van voordien (' + it[1].done + ', ' + it[2].status + ')');
  // wat je zelf wijzigde, blijft van jou
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('proef.v1')); s.lijsten[0].items[0].text = 'Budget voorleggen aan het college'; localStorage.setItem('proef.v1', JSON.stringify(s)); });
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget goedkeuren door schepen', ref:'r1' }, { type:'taak', text:'Zaal boeken', ref:'r2' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Broodjes bestellen' }, { type:'taak', text:'Stoelen tellen' }] }]) });
  await volg(); it = await items();
  ok(it[0].text === 'Budget voorleggen aan het college', 'zelf gewijzigd: de bron overschrijft je eigen tekst niet');
  // gewist in de bron (de lijst wordt korter): een signaal, niets gewist; het signaal komt maar één keer
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget goedkeuren door schepen', ref:'r1' }, { type:'taak', text:'Zaal boeken', ref:'r2' }, { type:'taak', text:'Affiche maken' }, { type:'taak', text:'Broodjes bestellen' }] }]) });
  u = await volg(); it = await items();
  ok(u.weg.length === 1 && u.weg[0].t === 'Stoelen tellen' && it.some(x => x.text === 'Stoelen tellen') && !u.hernoemd.length, 'gewist in de bron: een signaal, de kopie blijft staan, niets hernoemd');
  u = await volg(); ok(!u.weg.length, 'het signaal komt maar één keer');
  // twijfel (de bron schuift op en wordt korter): niets hernoemen
  await zet(p, { 'oc.share.proefbron':bron([{ name:NB, project:NB, items:[{ type:'taak', text:'Budget goedkeuren door schepen', ref:'r1' }, { type:'taak', text:'Zaal boeken', ref:'r2' }, { type:'taak', text:'Broodjes bestellen' }] }]) });
  u = await volg(); ok(!u.hernoemd.length, 'bij twijfel (lijst korter) wordt niets hernoemd');
  // volle opslag: een rustige melding, geen fout
  await p.evaluate(() => { const echt = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('oc.share.')) { const e = new Error('vol'); e.name = 'QuotaExceededError'; throw e; } return echt.call(this, k, v); };
    ocShare.publish('vol', 'Vol', [{ name:'x', items:[{ type:'taak', text:'iets' }] }]); Storage.prototype.setItem = echt; });
  await p.waitForTimeout(300); ok(/geen plaats meer/.test(await melding(p)), 'volle opslag: een rustige melding (' + (await melding(p)).slice(0, 60) + ')');
  await c.close();

  // ---------- B. Echte tools ----------
  // B1 Vinkje (bron) -> Takenbord (kopie): hernoemen en afvinken lopen mee
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { 'oc.project':{ name:NB, since:1 }, 'oc-app.projects':[NB], 'vinkje.v1':{ lists:[{ id:'l1', name:NB, items:[{ id:'i1', text:'Dozen bestellen', done:false, who:'Els' }, { id:'i2', text:'Kabels labelen', done:false, who:'Jonas' }] }], current:'l1' } });
  await open(p, '/vinkje/');
  let sh = await lees(p, 'oc.share.vinkje'); ok(sh && sh.lists[0].items.every(i => i.ref), 'Vinkje legt klaar met een vaste ref (' + (sh ? sh.lists[0].items.map(i => i.text + '#' + i.ref).join(', ') : 'niets') + ')');
  await open(p, '/kanban/'); await p.click('button[data-act="importTasks"]'); await kies(p, ['Dozen bestellen', 'Kabels labelen']);
  const kaarten = async () => { const s = await lees(p, 'sprintflow_kanban_v5'); return (s.projects || []).filter(x => !x.voorbeeld).flatMap(x => x.cards || []).map(x => x.title + ':' + x.status); };
  ok((await kaarten()).length === 2, 'Takenbord: twee kaarten overgenomen (' + (await kaarten()).join(', ') + ')');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('vinkje.v1')); s.lists[0].items[0].text = 'Verhuisdozen bestellen'; s.lists[0].items[1].done = true; localStorage.setItem('vinkje.v1', JSON.stringify(s)); });
  await open(p, '/vinkje/'); sh = await lees(p, 'oc.share.vinkje');
  ok(sh.klaar && sh.klaar.some(k => k.t === 'Kabels labelen' && k.r === 'i2'), 'Vinkje: afgevinkt gaat mee als klaar');
  await open(p, '/kanban/'); const kk = await kaarten();
  ok(kk.includes('Verhuisdozen bestellen:' + kk.find(x => x.startsWith('Verhuisdozen')).split(':')[1]) && !kk.some(x => x.startsWith('Dozen bestellen')), 'Takenbord: de hernoemde taak heet nu Verhuisdozen bestellen (' + kk.join(', ') + ')');
  ok(kk.includes('Kabels labelen:klaar'), 'Takenbord: de afgevinkte taak staat op Klaar');
  ok(/Meegelopen/.test(await melding(p)), 'Takenbord: een rustige melding (' + (await melding(p)).slice(0, 80) + ')');
  await c.close();

  // B2 Retro (bron) -> Vinkje (kopie): een actie die je hernoemt en afrondt in de Retro
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  const RE = { retros:[{ id:'rt1', name:'Retro Nieuwe bib sprint 1', project:NB, date:'2026-11-13', format:'hrp', cards:[], actions:[{ id:'ra1', text:'Contactpersoon aanvragen bij de leverancier', who:'Pieter', when:'', done:false }, { id:'ra2', text:'Planning delen met het team', who:'Fatima', when:'', done:false }], carried:[] }], current:'rt1', sortVotes:false, col:0, minutes:5 };
  await zet(p, { 'oc.project':{ name:NB, since:1 }, 'oc-app.projects':[NB], 'retro.v1':RE, 'vinkje.v1':{ lists:[{ id:'l1', name:NB, items:[] }], current:'l1' } });
  await open(p, '/retro/'); await open(p, '/vinkje/');
  await p.click('[data-oc-types]:visible'); await kies(p, ['Contactpersoon aanvragen bij de leverancier', 'Planning delen met het team']);
  const vinkjes = async () => ((await lees(p, 'vinkje.v1')).lists.find(l => l.id === 'l1') || { items:[] }).items.map(i => i.text + (i.done ? ' [v]' : ''));
  ok((await vinkjes()).length === 2, 'Vinkje: twee acties uit de Retro (' + (await vinkjes()).join(', ') + ')');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('retro.v1')); s.retros[0].actions[0].text = 'Vaste contactpersoon aanvragen bij de leverancier'; s.retros[0].actions[1].done = true; localStorage.setItem('retro.v1', JSON.stringify(s)); });
  await open(p, '/retro/'); await open(p, '/vinkje/'); const vv = await vinkjes();
  ok(vv.includes('Vaste contactpersoon aanvragen bij de leverancier') && vv.includes('Planning delen met het team [v]'), 'Vinkje: hernoemd en afgevinkt in de Retro loopt mee (' + vv.join(', ') + ')');
  await c.close();

  // B3 Projectopdracht (bron, nagebootst met ref) -> Tijdlijn (kopie): een mijlpaal die je hernoemt
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { 'oc.project':{ name:NB, since:1 }, 'oc-app.projects':[NB], 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:1, lists:[{ name:NB, project:NB, items:[{ type:'mijlpaal', text:'Opening in juni', when:'2027-06-01', ref:'m1' }] }] } });
  await open(p, '/tijdlijn/'); await p.click('[data-oc-types]:visible'); await kies(p, ['Opening in juni']);
  const lijn = async () => ((await lees(p, 'tijdlijn.v1')) || { lists:[] }).lists.filter(l => !l.voorbeeld).flatMap(l => l.items.map(i => i.text + ':' + (i.status || '')));
  ok((await lijn()).some(x => x.startsWith('Opening in juni')), 'Tijdlijn: mijlpaal overgenomen (' + (await lijn()).join(', ') + ')');
  await zet(p, { 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:2, lists:[{ name:NB, project:NB, items:[{ type:'mijlpaal', text:'Opening in september', when:'2027-09-01', ref:'m1' }] }] } });
  await open(p, '/tijdlijn/'); const ll = await lijn();
  ok(ll.some(x => x.startsWith('Opening in september')) && !ll.some(x => x.startsWith('Opening in juni')), 'Tijdlijn: de hernoemde mijlpaal loopt mee (' + ll.join(', ') + ')');
  ok(await p.evaluate(() => [...document.querySelectorAll('body *')].some(e => e.children.length === 0 && /Opening in september/.test(e.textContent))), 'Tijdlijn: het scherm toont de nieuwe naam');
  await c.close();

  // B4 Project Radar: een zwaar probleem krijgt prioriteit Hoog in het Takenbord, via het vaste veld
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { 'oc.project':{ name:NB, since:1 }, 'oc-app.projects':[NB], 'oc.share.project-radar':{ id:'project-radar', tool:'Project Radar', updated:1, lists:[{ name:NB, project:NB, items:[{ type:'actie', text:'Budget bijsturen', note:'Ernstig', prio:'hoog', ref:'budget' }, { type:'actie', text:'Planning bijsturen', note:'Licht probleem', prio:'laag', ref:'planning' }] }] } });
  await open(p, '/kanban/'); await p.click('button[data-act="importTasks"]'); await kies(p, ['Budget bijsturen', 'Planning bijsturen']);
  const prio = Object.fromEntries(((await lees(p, 'sprintflow_kanban_v5')).projects || []).flatMap(x => x.cards || []).map(x => [x.title, x.priority || '']));
  ok(prio['Budget bijsturen'] === 'high' && prio['Planning bijsturen'] !== 'high', 'Takenbord: prio hoog uit het vaste veld (ook als de notitie anders luidt): ' + JSON.stringify(prio));
  await c.close();

  ok(!PE.length, 'geen paginafouten' + (PE.length ? ': ' + PE.slice(0, 3).join(' | ') : ''));
  console.log(`\n${n} controles, fouten: ${fout.length}`); await b.close(); process.exit(fout.length ? 1 : 0);
})();
