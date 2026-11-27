// Meelopen in twee bijzondere gevallen (ocShare v4.2, /app/oc-share.js):
// 1. Vastgelegd: Beslissingslog, Vergadernotities en Kennisbank houden wat je overnam zoals het was (data-volg="signaal").
//    Verandert de bron, dan één signaal per versie, met "Werk bij"; dat loopt mee bij het opnieuw openen.
// 2. Gedeeld bestand: een item dat meeloopt, krijgt één ms meer dan zijn vorige tijd (zodat het wint van zijn oude versie in het bestand,
//    maar niet van een latere wijziging van een collega); en een gedeelde tool neemt niets vanzelf over, ze stelt het voor.
// BASE=http://127.0.0.1:8971 node scripts/functioneel/vastgelegd-en-gedeeld.js
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970);
const fout = []; let n = 0; const ok = (c, m) => { n++; console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const NB = 'Nieuwe bib';

(async () => { const b = await chromium.launch(); const PE = [];
  const nieuw = async () => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} }); return c; };
  const pagina = async c => { const p = await c.newPage(); p.on('pageerror', e => PE.push(p.url().replace(B, '') + ': ' + String(e).slice(0, 160))); p.on('dialog', d => d.accept()); return p; };
  const open = async (p, u) => { await p.goto(B + u, { waitUntil:'networkidle' }); await p.waitForTimeout(1800); };
  const zet = (p, o) => p.evaluate(o => { Object.entries(o).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); }, o);
  const tekst = (p, k) => p.evaluate(k => localStorage.getItem(k) || '', k);
  const lees = (p, k) => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, k);
  const melding = p => p.evaluate(() => { const m = document.getElementById('ocs-melding'); return m ? m.textContent.replace(/\s+/g, ' ').trim() : ''; });
  const kies = async (p, teksten) => { await p.waitForSelector('.ocs-back', { timeout:6000 }); await p.waitForTimeout(200);
    await p.evaluate(T => { document.querySelectorAll('.ocs-ander').forEach(d => { d.open = true; }); document.querySelectorAll('.ocs-src .ocs-item').forEach(l => { const i = l.querySelector('input'); const t = l.querySelector('span').childNodes[0].textContent.trim(); if (!i.disabled) i.checked = T.includes(t); }); document.querySelector('.ocs-back').dispatchEvent(new Event('change')); }, teksten);
    await p.click('.ocs-ok'); await p.waitForTimeout(600); };
  const basis = { 'oc.project':{ name:NB, since:1 }, 'oc-app.projects':[NB] };
  const notities = t => ({ 'oc.share.notities':{ id:'notities', tool:'Vergadernotities', updated:Date.now(), lists:[{ name:NB, project:NB, items:[{ type:'besluit', text:t, note:'Bestuur', ref:'b1' }] }] } });

  // ---------- 1. Vastgelegd: de Beslissingslog ----------
  let c = await nieuw(), p = await pagina(c); await open(p, '/privacy/');
  await zet(p, { ...basis, ...notities('Opening een week later') });
  await open(p, '/beslissingen/'); await p.click('[data-oc-types="besluit"]:visible'); await kies(p, ['Opening een week later']);
  ok((await tekst(p, 'beslissingen.v1')).includes('Opening een week later'), 'Beslissingslog: besluit overgenomen');
  await zet(p, notities('Opening twee weken later'));
  await open(p, '/beslissingen/');
  let t = await tekst(p, 'beslissingen.v1'), m = await melding(p);
  ok(t.includes('Opening een week later') && !t.includes('Opening twee weken later'), 'vastgelegd: het besluit blijft zoals het vastgelegd werd');
  ok(/veranderde .*Opening een week later.* intussen in .*Opening twee weken later/.test(m) && /zoals je het vastlegde/.test(m), 'vastgelegd: één signaal (' + m.slice(0, 110) + ')');
  ok(await p.locator('#ocs-melding [data-m="knop"]').innerText() === 'Werk bij', 'vastgelegd: met de knop Werk bij');
  await open(p, '/beslissingen/');
  ok(!(await melding(p)), 'vastgelegd: hetzelfde signaal komt geen tweede keer');
  await zet(p, notities('Opening drie weken later'));
  await open(p, '/beslissingen/'); m = await melding(p);
  ok(/drie weken later/.test(m), 'vastgelegd: een nieuwe versie van de bron geeft opnieuw één signaal');
  await Promise.all([p.waitForNavigation({ waitUntil:'networkidle' }), p.click('#ocs-melding [data-m="knop"]')]); await p.waitForTimeout(1500);
  t = await tekst(p, 'beslissingen.v1'); m = await melding(p);
  ok(t.includes('Opening drie weken later') && !t.includes('Opening een week later'), 'Werk bij: na het opnieuw laden staat de nieuwe tekst er (' + (t.match(/Opening [a-z ]+later/g) || []).join(', ') + ')');
  ok(/Meegelopen uit Vergadernotities/.test(m), 'Werk bij: de gewone melding van meelopen (' + m.slice(0, 80) + ')');
  ok(await p.evaluate(() => [...document.querySelectorAll('body *')].some(e => e.children.length === 0 && /Opening drie weken later/.test(e.textContent))), 'Werk bij: het scherm toont de nieuwe tekst');
  await c.close();

  // ---------- 2. Gedeeld bestand: één ms meer, en niet over een latere wijziging heen ----------
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/'); await p.addScriptTag({ url:'/app/oc-share.js' });
  await zet(p, { ...basis, 'oc.share.proefbron':{ id:'proefbron', tool:'Proefbron', updated:1, lists:[{ name:NB, project:NB, items:[{ type:'taak', text:'Zaal boeken', ref:'z1' }] }] },
    'proef.v1':{ eenheden:[{ id:'u1', name:NB, gedeeld:true, gewijzigd:5000, items:[{ id:'i1', text:'Zaal boeken', gewijzigd:1700000000000 }] }] } });
  const g = p.evaluate(() => ocShare.pick({ types:['taak'], self:'proef' })); await kies(p, ['Zaal boeken']); await g;
  await zet(p, { 'oc.share.proefbron':{ id:'proefbron', tool:'Proefbron', updated:2, lists:[{ name:NB, project:NB, items:[{ type:'taak', text:'Feestzaal boeken', ref:'z1' }] }] } });
  await p.evaluate(() => ocShare.volg('proef', ['proef.v1']));
  const pv = await lees(p, 'proef.v1'), it = pv.eenheden[0].items[0];
  ok(it.text === 'Feestzaal boeken' && it.gewijzigd === 1700000000001, 'gedeeld bestand: het meegelopen item krijgt één ms meer (' + it.gewijzigd + ')');
  ok(pv.eenheden[0].gewijzigd === 5000, 'gedeeld bestand: de eenheid zelf blijft onaangeroerd');
  await c.close();

  // ---------- 3. Gedeeld bestand: niets vanzelf, wel een voorstel ----------
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/');
  const opdr = items => ({ 'oc.share.opdracht':{ id:'opdracht', tool:'Projectopdracht', updated:Date.now(), lists:[{ name:NB, project:NB, items }] } });
  await zet(p, { ...basis, ...opdr([{ type:'risico', text:'Vertraging bij de aannemer' }]) });
  await open(p, '/risico/');
  ok((await tekst(p, 'risico.v1')).includes('Vertraging bij de aannemer'), 'Risicomatrix: zonder gedeeld bestand vanzelf overgenomen');
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('risico.v1')); (s.projects || []).forEach(x => { if (!x.voorbeeld) x.gedeeld = true; }); localStorage.setItem('risico.v1', JSON.stringify(s)); });
  await zet(p, opdr([{ type:'risico', text:'Vertraging bij de aannemer' }, { type:'risico', text:'Te weinig vrijwilligers' }]));
  await open(p, '/risico/'); m = await melding(p);
  ok(!(await tekst(p, 'risico.v1')).includes('Te weinig vrijwilligers'), 'gedeelde Risicomatrix: niets vanzelf overgenomen');
  ok(/Eén nieuw item in Projectopdracht/.test(m) && /deel je via een bestand/.test(m), 'gedeelde Risicomatrix: een voorstel (' + m.slice(0, 100) + ')');
  await p.click('#ocs-melding [data-m="knop"]'); await kies(p, ['Te weinig vrijwilligers']);
  ok((await tekst(p, 'risico.v1')).includes('Te weinig vrijwilligers'), 'gedeelde Risicomatrix: Bekijk opent de kiezer, en je neemt zelf over');
  await open(p, '/risico/');
  ok(!/nieuw item/.test(await melding(p)), 'gedeelde Risicomatrix: hetzelfde voorstel komt geen tweede keer');
  await c.close();

  // ---------- 4. De echte samenvoeging van het gedeelde bestand (ocKoppel.samen in de Beslissingslog) ----------
  c = await nieuw(); p = await pagina(c); await open(p, '/privacy/'); await zet(p, basis); await open(p, '/beslissingen/');
  const S = await p.evaluate(() => {
    const st = (tekst, t) => ({ logs:[{ id:'L1', name:'Bestuur', gedeeld:true, gewijzigd:5000, items:[{ id:'i1', what:tekst, gewijzigd:t }] }], weg:{} });
    const w = r => r.logs[0].items[0].what;
    return { meegelopen: w(ocKoppel.samen(st('Opening drie weken later', 1700000000001), st('Opening een week later', 1700000000000))),
      omgekeerd: w(ocKoppel.samen(st('Opening een week later', 1700000000000), st('Opening drie weken later', 1700000000001))),
      collega: w(ocKoppel.samen(st('Opening drie weken later', 1700000000001), st('Opening na de zomer', 1700000500000))),
      zonderTik: [w(ocKoppel.samen(st('Opening drie weken later', 1700000000000), st('Opening een week later', 1700000000000))), w(ocKoppel.samen(st('Opening zes weken later', 1700000000000), st('Opening een week later', 1700000000000)))] };
  });
  ok(S.meegelopen === 'Opening drie weken later' && S.omgekeerd === 'Opening drie weken later', 'samenvoegen met het bestand: de meegelopen tekst wint van haar oude versie, langs beide kanten');
  ok(S.collega === 'Opening na de zomer', 'samenvoegen met het bestand: een latere wijziging van een collega wint van het meelopen');
  console.log('       (zonder die ene ms beslist de tekst zelf: ' + S.zonderTik.join(' / ') + ')');
  await c.close();

  ok(!PE.length, 'geen paginafouten' + (PE.length ? ': ' + PE.slice(0, 3).join(' | ') : ''));
  console.log(`\n${n} controles, fouten: ${fout.length}`); await b.close(); process.exit(fout.length ? 1 : 0);
})();
