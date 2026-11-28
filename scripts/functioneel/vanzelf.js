// Vanzelf overnemen (ocShare v4.1, /app/oc-share.js): op zes vaste paden neemt een tool vanzelf over wat nieuw is in je project.
// BASE=http://127.0.0.1:8970 node scripts/functioneel/vanzelf.js   (de app en alle tools onder één adres)
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970);
const fout = []; let n = 0; const ok = (c, m) => { n++; console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const NB = 'Nieuwe bib', ZW = 'Zwembad';

(async () => { const b = await chromium.launch(); const PE = [];
  const nieuw = async () => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} }); return c; };
  const pagina = async c => { const p = await c.newPage(); p.on('pageerror', e => PE.push(p.url().replace(B, '') + ': ' + String(e).slice(0, 160))); p.on('dialog', d => d.accept()); return p; };
  const open = async (p, u) => { await p.goto(B + u, { waitUntil:'networkidle' }); await p.waitForTimeout(2200); };
  const zet = (p, o) => p.evaluate(o => { Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); }, o);
  const tekst = (p, k) => p.evaluate(k => localStorage.getItem(k) || '', k);
  const melding = p => p.evaluate(() => { const m = document.getElementById('ocs-melding'); return m ? m.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const share = (id, tool, items, project) => ({ id, tool, updated:Date.now(), lists:[{ name:project || NB, project:project || NB, items }] });
  const basis = { 'oc.project':{ name:NB, since:1 }, 'oc-app.projects':[NB, ZW] };
  const MP = t => ({ type:'mijlpaal', text:t, when:'2027-06-01' });

  // 1. De zes paden, telkens in een lege tool van het actieve project
  const PADEN = [
    ['tijdlijn', 'tijdlijn.v1', { 'oc.share.opdracht':share('opdracht', 'Projectopdracht', [MP('Opening in juni'), MP('Bouwvergunning binnen')]) }, ['Opening in juni', 'Bouwvergunning binnen'], 'Projectopdracht'],
    ['risico', 'risico.v1', { 'oc.share.opdracht':share('opdracht', 'Projectopdracht', [{ type:'risico', text:'Vertraging bij de aannemer' }]) }, ['Vertraging bij de aannemer'], 'Projectopdracht'],
    ['meetplan', 'meetplan.v1', { 'oc.share.opdracht':share('opdracht', 'Projectopdracht', [{ type:'doel', text:'Meer jongeren in de bib' }]) }, ['Meer jongeren in de bib'], 'Projectopdracht'],
    ['stakeholders', 'stakeholders.v1', { 'oc.share.opdracht':share('opdracht', 'Projectopdracht', [{ type:'betrokkene', text:'Schepen van cultuur', note:'Opdrachtgever' }]) }, ['Schepen van cultuur'], 'Projectopdracht'],
    ['leerpunten', 'leerpunten.v1', { 'oc.share.retro':share('retro', 'Retro', [{ type:'leerpunt', text:'Vergunning vroeger aanvragen', note:'Volgende keer anders' }]) }, ['Vergunning vroeger aanvragen'], 'Retro'],
    ['kanban', 'sprintflow_kanban_v5', { 'oc.share.retro':share('retro', 'Retro', [{ type:'actie', text:'Contactpersoon aanvragen', ref:'ra1' }]), 'oc.share.beslissingen':share('beslissingen', 'Beslissingslog', [{ type:'actie', text:'Uitnodigingen aanpassen', ref:'a1' }]) }, ['Contactpersoon aanvragen', 'Uitnodigingen aanpassen'], 'Retro'],
  ];
  for (const [tool, sleutel, data, verwacht, bron] of PADEN) {
    const c = await nieuw(), p = await pagina(c); await open(p, '/privacy/'); await zet(p, { ...basis, ...data });
    await open(p, '/' + tool + '/'); const t = await tekst(p, sleutel), m = await melding(p);
    ok(verwacht.every(x => t.includes(x)), `${tool}: vanzelf overgenomen (${verwacht.map(x => x + ':' + t.includes(x)).join(', ')})`);
    ok(/^Vanzelf overgenomen uit/.test(m) && m.includes(bron), `${tool}: melding "${m.slice(0, 70)}"`);
    await open(p, '/' + tool + '/'); const t2 = await tekst(p, sleutel);
    ok(verwacht.every(x => t2.split(x).length === t.split(x).length), `${tool}: opnieuw openen neemt niets dubbel over`);
    await c.close();
  }

  // 1b. Op een gsm: de melding is breed genoeg om te lezen (v17.40: met left:50% werd de tekst één letter breed)
  { const c = await b.newContext({ viewport:{ width:390, height:780 }, serviceWorkers:'block', locale:'nl-BE' }); await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} });
    const p = await pagina(c); await open(p, '/privacy/'); await zet(p, { ...basis, ...PADEN[0][2] }); await open(p, '/tijdlijn/');
    const w = await p.evaluate(() => { const m = document.getElementById('ocs-melding'), t = m && m.querySelector('span'); return t ? Math.round(t.getBoundingClientRect().width) : 0; });
    ok(w >= 200, 'gsm: de tekst van de melding is ' + w + ' px breed'); await c.close(); }

  // 2. Tijdlijn in detail: nieuw bijkomend, gewist blijft gewist, ander project nooit, een eerste keer met eigen werk
  let c = await nieuw(), p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { ...basis, 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:1, lists:[{ name:NB, project:NB, items:[MP('Opening in juni')] }, { name:ZW, project:ZW, items:[MP('Zwembad open')] }] } });
  await open(p, '/tijdlijn/');
  let t = await tekst(p, 'tijdlijn.v1'); ok(t.includes('Opening in juni') && !t.includes('Zwembad open'), 'Tijdlijn: alleen het eigen project, nooit een ander project');
  await zet(p, { 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:2, lists:[{ name:NB, project:NB, items:[MP('Opening in juni'), MP('Verhuis van de collectie')] }] } });
  await open(p, '/tijdlijn/'); t = await tekst(p, 'tijdlijn.v1');
  ok(t.includes('Verhuis van de collectie') && t.split('Opening in juni').length === 2, 'Tijdlijn: wat later bijkomt, gaat vanzelf mee (zonder dubbel)');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('tijdlijn.v1')); s.lists.forEach(l => { l.items = l.items.filter(i => i.text !== 'Verhuis van de collectie'); }); localStorage.setItem('tijdlijn.v1', JSON.stringify(s)); });
  await open(p, '/tijdlijn/'); t = await tekst(p, 'tijdlijn.v1');
  ok(!t.includes('Verhuis van de collectie'), 'Tijdlijn: wat je wiste, komt niet vanzelf terug');
  // uitzetten in de melding
  await zet(p, { 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:3, lists:[{ name:NB, project:NB, items:[MP('Opening in juni'), MP('Proefdraaien')] }] } });
  await open(p, '/tijdlijn/'); ok((await tekst(p, 'tijdlijn.v1')).includes('Proefdraaien'), 'Tijdlijn: Proefdraaien vanzelf overgenomen');
  await p.click('#ocs-melding [data-m="knop"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => localStorage.getItem('oc.vanzelf.tijdlijn') === '0') && /niet meer vanzelf/.test(await melding(p)), 'Tijdlijn: "Niet meer vanzelf" zet het uit voor deze tool');
  await zet(p, { 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:4, lists:[{ name:NB, project:NB, items:[MP('Opening in juni'), MP('Proefdraaien'), MP('Feest')] }] } });
  await open(p, '/tijdlijn/'); ok(!(await tekst(p, 'tijdlijn.v1')).includes('Feest'), 'Tijdlijn: uitgezet, dan niets vanzelf');
  // weer aanzetten in de kiezer
  await p.click('#oc-imp'); await p.waitForSelector('.ocs-back'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const i = document.getElementById('ocs-vz'); return !!i && !i.checked; }), 'Kiezer: de schakelaar "Neem vanzelf over" staat er, uit');
  await p.click('#ocs-vz'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => localStorage.getItem('oc.vanzelf.tijdlijn') === null), 'Kiezer: aanvinken zet vanzelf overnemen weer aan');
  ok(await p.evaluate(() => document.querySelector('.ocs-ok').disabled), 'Kiezer: de schakelaar telt niet als een keuze (Neem over blijft grijs)');
  await p.click('[data-vz="overal-uit"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => localStorage.getItem('oc.vanzelf') === '0'), 'Kiezer: "In alle tools uitzetten" zet het overal uit');
  await p.click('.ocs-cancel'); await c.close();

  // 3. Een eerste keer met eigen werk: wat er nu klaarligt, blijft je keuze; alleen wat later bijkomt, gaat vanzelf mee
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { ...basis, 'tijdlijn.v1':{ lists:[{ id:'l1', name:NB, items:[{ id:'x1', text:'Eigen mijlpaal', date:'2027-01-10', status:'gepland', who:'', created:1 }] }], current:'l1' },
    'oc.share.opdracht':share('opdracht', 'Projectopdracht', [MP('Opening in juni'), MP('Bouwvergunning binnen')]) });
  await open(p, '/tijdlijn/'); t = await tekst(p, 'tijdlijn.v1');
  ok(t.includes('Eigen mijlpaal') && !t.includes('Opening in juni'), 'Tijdlijn met eigen werk: wat er al klaarlag, komt niet vanzelf binnen');
  await zet(p, { 'oc.share.opdracht':share('opdracht', 'Projectopdracht', [MP('Opening in juni'), MP('Bouwvergunning binnen'), MP('Sleutel-overdracht')]) });
  await open(p, '/tijdlijn/'); t = await tekst(p, 'tijdlijn.v1');
  ok(t.includes('Sleutel-overdracht') && !t.includes('Opening in juni'), 'Tijdlijn met eigen werk: alleen wat later bijkomt, gaat vanzelf mee');
  await c.close();

  // 4. Geopend vanuit een andere tool (?van=) of zonder actief project: niets vanzelf (met actief project en zonder ?van= wel: zie 1)
  for (const [tool, sleutel, data, verwacht] of PADEN) {
    const van = Object.keys(data)[0].replace('oc.share.', ''), c = await nieuw(), p = await pagina(c);
    await open(p, '/privacy/'); await zet(p, { ...basis, ...data });
    await open(p, `/${tool}/?van=${van}`); const t = await tekst(p, sleutel), m = await melding(p);
    ok(!verwacht.some(x => t.includes(x)) && !/^Vanzelf overgenomen/.test(m), `${tool} geopend met ?van=${van}: niets vanzelf, je kiest zelf`);
    await c.close();
  }
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { 'oc.share.opdracht':share('opdracht', 'Projectopdracht', [MP('Opening in juni')]) });
  await open(p, '/tijdlijn/'); ok(!(await tekst(p, 'tijdlijn.v1')).includes('Opening in juni'), 'zonder actief project: niets vanzelf');
  await c.close();

  ok(!PE.length, 'geen paginafouten' + (PE.length ? ': ' + PE.slice(0, 3).join(' | ') : ''));
  console.log(`\n${n} controles, fouten: ${fout.length}`); await b.close(); process.exit(fout.length ? 1 : 0);
})();
