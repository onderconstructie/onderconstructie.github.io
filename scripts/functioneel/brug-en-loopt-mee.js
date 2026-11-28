// De brug na de Projectopdracht ("Verandert dit project iemands werk?") en de strook Loopt mee in de stappenplannen.
// BASE=http://127.0.0.1:8000 node scripts/functioneel/brug-en-loopt-mee.js   (schermafbeeldingen in SHOTS, standaard de map v)
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970);
const SHOTS = process.env.SHOTS || 'v'; require('fs').mkdirSync(SHOTS, { recursive: true });
let fouten = 0, n = 0;
const ok = (c, wat, extra) => { n++; if (!c) { fouten++; console.log('  FOUT: ' + wat + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); } else console.log('  ok: ' + wat); };
(async () => {
  const b = await chromium.launch();
  const nieuw = async (w = 390, h = 844) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700, serviceWorkers: 'block' });
    const p = await c.newPage(); p.E = [];
    p.on('pageerror', e => p.E.push(String(e)));
    p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) p.E.push(m.text()); });
    await c.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', 'true'); } catch {} });   // geen welkomstgids
    await p.goto(B + '/', { waitUntil: 'networkidle' });
    return p;
  };
  const stappen = (p, tr, waar = '#paths') => p.evaluate(([tr, waar]) => [...document.querySelectorAll(`${waar} .path[data-path="${tr}"] ol.steps > .step .step-name`)].map(x => x.textContent), [tr, waar]);
  const ook = (p, tr) => p.evaluate(tr => [...document.querySelectorAll(`#paths .path[data-path="${tr}"] .ook-lijst .step-name`)].map(x => x.textContent), tr);
  const klaar = p => p.evaluate(() => { const d = document.querySelector('.onb, #onb, [id^="onb"]'); return !!d; });

  // ---------- 1. Nieuw project, korte route
  let p = await nieuw();
  await p.evaluate(() => { zetProject('Testproject'); store.set('paths-started', ['project']); store.set('paths-open', ['project']); store.set('route', { project: 'kort' }); renderPaths(); showHome(); });
  await p.waitForTimeout(300);
  let s = await stappen(p, 'project');
  console.log('\n== kort, voor de opdracht:', s.join(' > '));
  ok(!s.includes('Cockpit'), 'Cockpit is geen stap meer');
  ok(await p.locator('#paths .path[data-path="project"] .mee .mee-k').count() === 3, 'strook Loopt mee toont drie tools');
  ok((await p.evaluate(() => [...document.querySelectorAll('#paths .path[data-path="project"] .mee-n')].map(x => x.textContent))).join() === 'Cockpit,Beslissingslog,Risicomatrix', 'namen in de strook');
  ok(await p.locator('#paths .brug').count() === 0, 'geen vraag zolang de Projectopdracht leeg is');
  await p.locator('#paths .path[data-path="project"]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: SHOTS + '/1-kort-strook.png' });

  // de Projectopdracht krijgt inhoud (zoals de tool het zelf klaarlegt)
  const vulOpdracht = () => { localStorage.setItem('oc.share.opdracht', JSON.stringify({ lists: [{ name: 'Testproject', items: [{ text: 'Doel' }] }] })); renderPaths(); };
  await p.evaluate(vulOpdracht); await p.waitForTimeout(200);
  ok(await p.locator('#paths .path[data-path="project"] .brug').count() === 1, 'vraag verschijnt onder de Projectopdracht zodra die iets bevat');
  ok((await p.locator('#paths .brug b').textContent()) === 'Moeten mensen anders gaan werken door dit project?', 'tekst van de vraag');
  await p.locator('#paths .brug').scrollIntoViewIfNeeded();
  await p.screenshot({ path: SHOTS + '/2-vraag-in-plan.png' });

  // Nee
  await p.click('#paths .brug [data-brug="nee"]'); await p.waitForTimeout(250);
  ok(await p.locator('#paths .brug').count() === 0, 'na Nee is de vraag weg');
  ok(JSON.stringify(await stappen(p, 'project')) === JSON.stringify(s), 'na Nee is het plan ongewijzigd');
  ok((await p.locator('#paths .path[data-path="project"] .brug-st').textContent()).includes('Toch erbij nemen'), 'na Nee staat er één regel om het terug te draaien');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.closest('.path[data-path="project"]') !== null), 'focus blijft in het plan');
  ok(!(await p.evaluate(() => document.getElementById('app-toast').classList.contains('show'))), 'na Nee komt er geen melding: de regel in het plan volstaat');

  // Ja (kort), via "Toch erbij nemen": alleen de Impactanalyse erbij
  await p.click('#paths .path[data-path="project"] .brug-st [data-brug="ja"]'); await p.waitForTimeout(250);
  let s2 = await stappen(p, 'project');
  console.log('== kort, na Ja:', s2.join(' > '));
  ok(s2.length === s.length + 1 && s2[s2.indexOf('Productboom') + 1] === 'Impactanalyse', 'na Ja staat de Impactanalyse na de Productboom', s2);
  let o = await ook(p, 'project');
  ok(['Betrokkenenradar', 'Communicatieplan', 'Weerstand'].every(x => o.includes(x)), 'de andere drie staan onder Ook handig', o);
  ok((await p.locator('#app-toast-text').textContent()) === 'Impactanalyse staat in je plan', 'melding na Ja');
  await p.locator('#paths .path[data-path="project"]').scrollIntoViewIfNeeded();
  await p.screenshot({ path: SHOTS + '/3-kort-na-ja.png' });

  // Impactanalyse krijgt inhoud: de rest schuift in het plan
  await p.evaluate(() => { localStorage.setItem('oc.share.impact', JSON.stringify({ lists: [{ name: 'Testproject', items: [{ text: 'Loket' }] }] })); renderPaths(); });
  await p.waitForTimeout(200);
  let s3 = await stappen(p, 'project');
  console.log('== kort, Impact ingevuld:', s3.join(' > '));
  ok(s3[s3.indexOf('Impactanalyse') + 1] === 'Betrokkenenradar', 'Betrokkenenradar na de Impactanalyse', s3);
  ok(s3[s3.indexOf('RACI-matrix') + 1] === 'Communicatieplan', 'Communicatieplan na de RACI', s3);
  ok(s3[s3.indexOf('Takenbord') + 1] === 'Weerstand', 'Weerstand na het Takenbord', s3);
  ok(s3.length === s.length + 4, 'vier stappen erbij', s3.length);
  await p.screenshot({ path: SHOTS + '/4-kort-alles.png', fullPage: true });

  // Sla over werkt op een brugstap
  await p.evaluate(() => { stapZet('stap-over', 'project', 'weerstand', true); renderPaths(); }); await p.waitForTimeout(150);
  ok(!(await stappen(p, 'project')).includes('Weerstand'), 'een brugstap kun je overslaan');
  await p.evaluate(() => { stapZet('stap-over', 'project', 'weerstand', false); renderPaths(); });

  // Weglaten
  await p.click('#paths .path[data-path="project"] .brug-st [data-brug="nee"]'); await p.waitForTimeout(250);
  ok(JSON.stringify(await stappen(p, 'project')) === JSON.stringify(s), 'Weglaten haalt de vier stappen er weer uit');
  await p.click('#paths .path[data-path="project"] .brug-st [data-brug="ja"]'); await p.waitForTimeout(250);
  ok((await stappen(p, 'project')).length === s.length + 4, 'Toch erbij nemen zet ze terug');

  // Het antwoord hoort bij het project
  await p.evaluate(() => { zetProject('Ander project'); renderPaths(); }); await p.waitForTimeout(250);
  ok(await p.locator('#paths .path[data-path="project"] .brug').count() === 1, 'een ander project krijgt de vraag opnieuw');
  ok(JSON.stringify(await stappen(p, 'project')) === JSON.stringify(s), 'een ander project begint zonder de brugstappen');
  await p.evaluate(() => { zetProject('Testproject'); renderPaths(); }); await p.waitForTimeout(250);
  ok((await stappen(p, 'project')).length === s.length + 4, 'terug naar het eerste project: het antwoord staat er nog');

  // Na herladen
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok((await stappen(p, 'project')).length === s.length + 4, 'na herladen staat het plan er nog zo');

  // Balk in de Impactanalyse: hoort bij het projectplan
  await p.click('#paths .path[data-path="project"] ol.steps .step-btn[data-id="impact"]'); await p.waitForTimeout(1500);
  let balk = await p.evaluate(() => ({ verborgen: document.getElementById('pathbar').hidden, plan: document.getElementById('pathbar').dataset.path, tekst: document.getElementById('pathbar').innerText.replace(/\s+/g, ' ') }));
  ok(!balk.verborgen && balk.plan === 'project', 'de balk in de Impactanalyse hoort bij het projectplan', balk);
  await p.screenshot({ path: SHOTS + '/5-balk-impact.png' });
  ok(p.E.length === 0, 'geen fouten (kort)', p.E.slice(0, 3));
  await p.context().close();

  // ---------- 2. Uitgebreide route
  p = await nieuw();
  await p.evaluate(() => { zetProject('Groot project'); store.set('paths-started', ['project']); store.set('paths-open', ['project']); store.set('route', { project: 'vol' }); renderPaths(); showHome(); });
  await p.waitForTimeout(300);
  const v = await stappen(p, 'project');
  console.log('\n== uitgebreid:', v.join(' > '));
  ok(!v.includes('Cockpit'), 'uitgebreid: Cockpit is geen stap');
  await p.evaluate(vulOpdracht); await p.waitForTimeout(200);
  ok((await p.locator('#paths .brug p').textContent()).includes('4 stappen'), 'uitgebreid: de vraag zegt dat er 4 stappen bijkomen');
  await p.click('#paths .brug [data-brug="ja"]'); await p.waitForTimeout(250);
  const v2 = await stappen(p, 'project');
  console.log('== uitgebreid, na Ja:', v2.join(' > '));
  ok(v2.length === v.length + 4, 'uitgebreid: alle vier meteen in het plan', v2.length - v.length);
  ok((await p.locator('#paths [data-route="vol"] span').textContent()) === `${v2.length} stappen`, 'de teller bij Uitgebreid klopt', await p.locator('#paths [data-route="vol"] span').textContent());
  await p.screenshot({ path: SHOTS + '/6-uitgebreid.png', fullPage: true });
  await p.click('#paths .path[data-path="project"] ol.steps .step-btn[data-id="impact"]'); await p.waitForTimeout(1500);
  const bt = await p.evaluate(() => document.getElementById('pathbar').innerText.replace(/\s+/g, ' '));
  ok(/Betrokkenenradar/.test(bt), 'uitgebreid: Volgende in de Impactanalyse is de Betrokkenenradar', bt);
  await p.click('#pathbar .pb-next'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current === 'stakeholders' && !document.getElementById('pathbar').hidden && document.getElementById('pathbar').dataset.path === 'project'), 'uitgebreid: de Betrokkenenradar opent binnen het projectplan');
  ok(p.E.length === 0, 'geen fouten (uitgebreid)', p.E.slice(0, 3));
  await p.context().close();

  // ---------- 3. De vraag onderweg (v17.28): geen venster meer, de vraag staat onderaan in de Projectopdracht zelf
  const dlgOpen = () => p.evaluate(() => !!document.querySelector('.app-dlg-back:not([hidden])'));   // geen enkel venster van de schil
  const inTool = () => p.frames().find(f => f !== p.mainFrame() && /\/opdracht\//.test(f.url()));
  // v17.40: een stap telt per project, en alleen voor wat je zelf deed (oc-app.werk-pp, bijgehouden door de tool): dat zetten we hier mee
  const vulNu = naam => p.evaluate(naam => { localStorage.setItem('oc.share.opdracht', JSON.stringify({ lists: [{ name: naam, items: [{ text: 'Doel' }] }] })); const w = JSON.parse(localStorage.getItem('oc-app.werk-pp') || '{}'); w.opdracht = [...new Set([...(w.opdracht || []), naam])]; localStorage.setItem('oc-app.werk-pp', JSON.stringify(w)); delete document.getElementById('pathbar').dataset.sig; renderPathbar(current); }, naam);
  p = await nieuw();
  await p.evaluate(() => { zetProject('Onderweg'); store.set('route', { project: 'kort' }); store.set('proj-asked', ['project']); renderPaths(); });
  await p.click('.sd-k[data-start="project"], .stile[data-start="project"]'); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => current) === 'opdracht', 'het plan opent in de Projectopdracht', await p.evaluate(() => current));
  let blok = inTool().locator('#oc-brug');
  ok(await blok.count() === 1 && /Nog één vraag bij je opdracht/.test(await blok.innerText()) && /Moeten mensen anders gaan werken/.test(await blok.innerText()), 'de vraag staat in de Projectopdracht zelf');
  ok(await inTool().evaluate(() => { const b = document.getElementById('oc-brug'), f = document.getElementById('form'); return !!(f.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) && b.getBoundingClientRect().top >= f.getBoundingClientRect().bottom - 1; }), 'ze staat onder het formulier, niet ertussen');
  ok(await blok.locator('[aria-pressed="true"]').count() === 0, 'er is nog niets gekozen');
  await vulNu('Onderweg'); await p.waitForTimeout(600);
  await p.click('#pathbar .pb-next'); await p.waitForTimeout(1500);
  ok(!(await dlgOpen()) && await p.evaluate(() => current) === 'mindmap', 'Volgende gaat meteen door, zonder venster', await p.evaluate(() => current));
  ok(/van 7/.test(await p.evaluate(() => document.getElementById('pathbar').innerText)), 'zonder antwoord blijft het plan zoals het is');
  await p.click('#pathbar .pb-prev'); await p.waitForTimeout(1500);
  blok = inTool().locator('#oc-brug'); await blok.locator('[data-ob="ja"]').click(); await p.waitForTimeout(700);
  await p.screenshot({ path: SHOTS + '/7-vraag-onderweg.png' });
  ok(await p.evaluate(() => brugVan('project')) === 'ja' && await blok.locator('[data-ob="ja"]').getAttribute('aria-pressed') === 'true', 'Ja wordt onthouden en blijft aangeduid');
  ok(await p.evaluate(() => current) === 'opdracht', 'je blijft in de Projectopdracht: antwoorden stuurt je niet weg');
  ok(/van 8/.test(await p.evaluate(() => document.getElementById('pathbar').innerText)), 'de balk telt de Impactanalyse mee', await p.evaluate(() => document.getElementById('pathbar').innerText.replace(/\s+/g, ' ')));
  await p.click('#pathbar .pb-next'); await p.waitForTimeout(1500); await p.click('#pathbar .pb-next'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current) === 'impact', 'na de Productboom komt de Impactanalyse', await p.evaluate(() => current));
  ok(!(await dlgOpen()), 'nergens een venster');
  await p.click('#pathbar .pb-prev'); await p.waitForTimeout(1300); await p.click('#pathbar .pb-prev'); await p.waitForTimeout(1500);
  blok = inTool().locator('#oc-brug'); await blok.locator('[data-ob="nee"]').click(); await p.waitForTimeout(600);
  ok(await p.evaluate(() => brugVan('project')) === 'nee' && /van 7/.test(await p.evaluate(() => document.getElementById('pathbar').innerText)), 'Nee haalt de stap weer uit het plan');
  ok(p.E.length === 0, 'geen fouten (onderweg)', p.E.slice(0, 3));
  await p.context().close();

  // zonder antwoord: de vraag blijft in het plan staan
  p = await nieuw();
  await p.evaluate(() => { zetProject('Later'); store.set('route', { project: 'kort' }); store.set('proj-asked', ['project']); renderPaths(); });
  await p.click('.sd-k[data-start="project"], .stile[data-start="project"]'); await p.waitForTimeout(1500);
  await vulNu('Later');
  await p.click('#pathbar .pb-next'); await p.waitForTimeout(1500);
  ok(!(await dlgOpen()) && await p.evaluate(() => current) === 'mindmap', 'geen venster, je gaat door', await p.evaluate(() => current));
  ok(await inTool().locator('#oc-brug').count() === 0 || await p.evaluate(() => current) !== 'opdracht', 'in een andere stap staat de vraag niet');
  await p.evaluate(() => { showHome(); const s = new Set(store.get('paths-open', [])); s.add('project'); store.set('paths-open', [...s]); renderPaths(); }); await p.waitForTimeout(300);
  ok(await p.locator('#paths .path[data-path="project"] .brug').count() === 1, 'de vraag staat nog wel in het plan');
  // los geopend, zonder plan: de tool toont de vraag niet
  const los = await p.context().newPage(); await los.goto(B + '/opdracht/', { waitUntil: 'networkidle' }); ok(await los.locator('#oc-brug').count() === 0, 'los geopend toont de Projectopdracht de vraag niet'); await los.close();
  ok(p.E.length === 0, 'geen fouten (onderweg, later)', p.E.slice(0, 3));
  await p.context().close();

  // een lopend project: de opdracht stond al ingevuld, je gaat verder bij een latere stap
  p = await nieuw();
  await p.evaluate(() => { zetProject('Lopend'); store.set('route', { project: 'kort' }); store.set('proj-asked', ['project']); store.set('paths-started', ['project']); store.set('paths-open', ['project']);
    localStorage.setItem('oc.share.opdracht', JSON.stringify({ lists: [{ name: 'Lopend', items: [{ text: 'Doel' }] }] })); renderPaths(); showHome(); });
  await p.waitForTimeout(300);
  await p.click('#paths .path[data-path="project"] ol.steps .step-btn[data-id="tijdlijn"]'); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => current) === 'tijdlijn' && !(await dlgOpen()), 'lopend project: een latere stap openen geeft geen venster', await p.evaluate(() => current));
  await p.evaluate(() => { showHome(); renderPaths(); }); await p.waitForTimeout(400);
  ok(await p.isVisible('#paths .path[data-path="project"] .brug'), 'lopend project: de vraag staat in het plan, onder stap 1');
  await p.click('#paths .path[data-path="project"] .brug [data-brug="nee"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => brugVan('project')) === 'nee', 'lopend project: Nee wordt onthouden');
  // een los geopende tool hoort niet bij het plan: geen vraag
  await p.evaluate(() => { zetProject('Los'); showHome(); renderPaths(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { const k = document.querySelector('#view-fase [data-id="tijdlijn"], #alle [data-id="tijdlijn"], [data-id="tijdlijn"]:not(.step-btn)'); if (k) k.click(); }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => document.getElementById('pathbar').hidden) ? !(await dlgOpen()) : true, 'een los geopende tool stelt de vraag niet');
  ok(p.E.length === 0, 'geen fouten (lopend)', p.E.slice(0, 3));
  await p.context().close();

  // ---------- 4. Strook: opent de tool, start geen plan
  p = await nieuw();
  await p.evaluate(() => { store.set('view', 'plan'); });
  const gestart = () => p.evaluate(() => store.get('paths-started', []));
  await p.evaluate(() => { store.set('paths-started', ['proces']); store.set('paths-open', ['proces']); renderPaths(); showHome(); }); await p.waitForTimeout(300);
  ok(await p.locator('#paths .path[data-path="proces"] .mee-k').count() === 3, 'strook staat ook in het procesplan');
  ok(!(await stappen(p, 'proces')).includes('Cockpit'), 'proces: Cockpit is geen stap');
  await p.click('#paths .path[data-path="proces"] .mee-k[data-id="beslissingen"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current) === 'beslissingen', 'tik in de strook opent het Beslissingslog', await p.evaluate(() => current));
  ok(await p.evaluate(() => document.getElementById('pathbar').hidden), 'geen stappenbalk in een tool uit de strook');
  ok(JSON.stringify(await gestart()) === '["proces"]', 'een tool uit de strook start geen ander plan', await gestart());
  // verandering en verhaal
  await p.evaluate(() => { store.set('paths-started', ['proces', 'verandering', 'verhaal']); store.set('paths-open', ['proces', 'verandering', 'verhaal']); showHome(); renderPaths(); }); await p.waitForTimeout(300);
  ok(await p.locator('#paths .path[data-path="verandering"] .mee-k').count() === 3, 'strook staat in het veranderplan');
  ok(await p.locator('#paths .path[data-path="verhaal"] .mee').count() === 0, 'geen strook bij Vertel een verhaal');
  ok(await p.locator('#paths .path[data-path="verandering"] .brug, #paths .path[data-path="proces"] .brug').count() === 0, 'geen vraag in de andere plannen');
  console.log('== verandering:', (await stappen(p, 'verandering')).join(' > '));
  console.log('== proces:', (await stappen(p, 'proces')).join(' > '));
  ok(p.E.length === 0, 'geen fouten (strook)', p.E.slice(0, 3));
  await p.context().close();

  // ---------- 5. Venster "Je stappenplan" in een tool
  p = await nieuw();
  await p.evaluate(() => { zetProject('Venster'); store.set('route', { project: 'kort' }); store.set('proj-asked', ['project']); renderPaths(); });
  await p.click('.sd-k[data-start="project"], .stile[data-start="project"]'); await p.waitForTimeout(1500);
  await p.evaluate(() => { localStorage.setItem('oc.share.opdracht', JSON.stringify({ lists: [{ name: 'Venster', items: [{ text: 'Doel' }] }] })); const w = JSON.parse(localStorage.getItem('oc-app.werk-pp') || '{}'); w.opdracht = ['Venster']; localStorage.setItem('oc-app.werk-pp', JSON.stringify(w)); });   // v17.40: zelf ingevuld, voor dit project
  await p.click('#pathbar [data-pb-plan]'); await p.waitForTimeout(400);
  ok(await p.locator('#plan-body .mee-k').count() === 3, 'venster: strook Loopt mee');
  ok(await p.locator('#plan-body .brug').count() === 1, 'venster: de vraag onder de Projectopdracht');
  await p.screenshot({ path: SHOTS + '/8-venster.png' });
  await p.click('#plan-body .brug [data-brug="ja"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('plan-dlg').open), 'venster blijft open na het antwoord');
  ok((await stappen(p, 'project', '#plan-body')).includes('Impactanalyse'), 'venster: Impactanalyse staat erbij');
  await p.click('#plan-body .mee-k[data-id="risico"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !document.getElementById('plan-dlg').open && current === 'risico'), 'venster: tik op Risicomatrix sluit het venster en opent de tool', await p.evaluate(() => current));
  ok(p.E.length === 0, 'geen fouten (venster)', p.E.slice(0, 3));
  await p.context().close();

  // ---------- 6. Breed scherm en overloop
  for (const w of [320, 360, 390, 1280]) {
    p = await nieuw(w, 800);
    await p.evaluate(() => { zetProject('Breedte'); store.set('paths-started', ['project']); store.set('paths-open', ['project']); store.set('route', { project: 'kort' }); localStorage.setItem('oc.share.opdracht', JSON.stringify({ lists: [{ name: 'Breedte', items: [{ text: 'Doel' }] }] })); renderPaths(); showHome(); });
    await p.waitForTimeout(300);
    const m = await p.evaluate(() => { const k = [...document.querySelectorAll('#paths .mee-k')].map(x => { const r = x.getBoundingClientRect(), n = x.querySelector('.mee-n'); return { w: Math.round(r.width), h: Math.round(r.height), over: n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().height > parseFloat(getComputedStyle(n).fontSize) * 1.5 }; }); const br = document.querySelector('#paths .brug-k .dbtn').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, k, knop: Math.round(br.height) }; });
    ok(m.sw <= m.iw, `${w}px: geen horizontale overloop`, m);
    ok(m.k.every(x => x.h >= 44 && !x.over), `${w}px: tikdoelen in de strook minstens 44px, namen passen`, m.k);
    ok(m.knop >= 44, `${w}px: Ja en Nee minstens 44px hoog`, m.knop);
    await p.locator('#paths .path[data-path="project"]').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${SHOTS}/9-breedte-${w}.png` });
    await p.context().close();
  }

  console.log(`\ncontroles: ${n}, fouten: ${fouten}`);
  await b.close(); process.exit(fouten ? 1 : 0);
})();
