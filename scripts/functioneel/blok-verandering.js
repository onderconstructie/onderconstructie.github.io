// Het tabblad Verandering en de vroegere groep Reset in het Zakmes (Even pauze): elke tool heeft een plaats, de oude ingangen werken nog.
// BASE=http://127.0.0.1:8000 node scripts/functioneel/blok-verandering.js   (schermafbeeldingen in SHOTS, standaard de map v)
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970), SHOTS = process.env.SHOTS || 'v'; require('fs').mkdirSync(SHOTS, { recursive: true });
let fouten = 0, n = 0;
const ok = (c, wat, extra) => { n++; if (!c) { fouten++; console.log('  FOUT: ' + wat + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); } else console.log('  ok: ' + wat); };
(async () => {
  const b = await chromium.launch();
  const nieuw = async (w = 390, h = 844, pad = '/', welkom = false) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700, serviceWorkers: 'block' });
    const p = await c.newPage(); p.E = [];
    p.on('pageerror', e => p.E.push(String(e)));
    if (!welkom) await c.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', 'true'); } catch {} });
    await p.goto(B + pad, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    return p;
  };
  const inTab = (p, id) => p.evaluate(async id => { setTab(id); if (id === 'projecten') { setView('onderwerp', false, false); GROUPS.forEach(g => setCollapsed(g.id, false)); } else if (id !== 'start') subAlles(false);
    await new Promise(r => setTimeout(r, 150));
    const zicht = e => !!e.offsetParent;
    return { kop: (document.querySelector('#tabgroup .th-title') || {}).textContent || '', meta: (document.querySelector('#tabgroup .th-meta') || {}).textContent || '',
      kopjes: [...document.querySelectorAll(id === 'projecten' ? '#groups .group' : '#tabgroup .group.sub')].filter(zicht).map(g => g.querySelector('.group-title').textContent + ': ' + [...g.querySelectorAll('.row[data-id]')].map(r => r.dataset.id).join(' ')),
      ids: [...new Set([...document.querySelectorAll(id === 'projecten' ? '#groups .row[data-id]' : '#tabgroup .row[data-id]')].filter(zicht).map(r => r.dataset.id))] }; }, id);

  let p = await nieuw();
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#tabbar .tab')].map(t => t.textContent.trim()));
  console.log('tabs:', tabs.join(' | '));
  ok(tabs.join() === 'Start,Projecten,Verandering,Vergaderen,Zakmes', 'vijf tabbladen, Reset is weg, Verandering erbij', tabs);
  const T = {};
  for (const id of ['projecten', 'verandering', 'vergaderen', 'zakmes']) { T[id] = await inTab(p, id); console.log(`\n== ${id} (${T[id].ids.length}) ${T[id].kop} · ${T[id].meta}`); T[id].kopjes.forEach(k => console.log('   ' + k)); }
  const alle = await p.evaluate(() => TOOLS.map(t => t.id));
  const gezien = new Set(Object.values(T).flatMap(x => x.ids));
  ok(alle.every(id => gezien.has(id)), 'elke tool staat onder minstens één tabblad', alle.filter(id => !gezien.has(id)));
  ok(await p.evaluate(() => TOOLS.every(t => t.g !== 'reset' && GROUPS.some(g => g.id === t.g))), 'geen tool hangt nog aan de groep Reset');
  const v = T.verandering;
  ok(v.kop === 'Verandering' && v.kopjes.length === 3, 'Verandering: drie kopjes', v.kopjes.map(k => k.split(':')[0]));
  ok(['stakeholders', 'sponsor', 'impact', 'klimaat', 'veranderprofiel', 'communicatie', 'weerstand', 'gedrag', 'goesting', 'energie'].every(id => v.ids.includes(id)), 'Verandering: de acht verandertools plus Goestingmeter en Energiekaart', v.ids);
  ok(/^Gedrag: systeemkaart gedrag kantelpunt$/.test(v.kopjes[1]), 'kopje Gedrag bevat Systeemkaart, Gedragsverandering en Kantelpunt', v.kopjes[1]);
  ok(v.meta.startsWith(v.ids.length + ' tools'), 'de teller in de kop klopt', v.meta);
  ok(!T.projecten.ids.some(id => ['impact', 'weerstand', 'gedrag'].includes(id)) && T.projecten.kopjes.length === 4, 'Projecten: vier groepen, zonder de verandertools', T.projecten.kopjes.map(k => k.split(':')[0]));
  ok(await p.evaluate(() => { setTab('projecten'); return document.getElementById('proj-ngroep').textContent; }) === '4', 'Projecten zegt 4 groepen');
  const z = T.zakmes;
  ok(z.kopjes.some(k => /^Even pauze: adem hier hart klankkast bingo$/.test(k)), 'Zakmes: kopje Even pauze met rust en een glimlach', z.kopjes);
  ok(T.vergaderen.ids.includes('pluim') && T.vergaderen.ids.includes('bingo'), 'Vergaderen: Pluim en Buzzwordbingo staan er nog');
  ok(!z.ids.includes('pluim') && !z.ids.includes('goesting'), 'Zakmes: geen Pluim of Goestingmeter');
  // het stappenplan Begeleid een verandering staat in de tab Verandering, niet meer bij Projecten
  const plannen = await p.evaluate(async () => { setTab('projecten'); setView('plan', false, false); await new Promise(r => setTimeout(r, 200));
    const pr = [...document.querySelectorAll('#plan-keuze .path')].filter(e => e.offsetParent).map(e => e.dataset.path), telt = document.getElementById('pm-nplan').textContent, noot = document.querySelector('#proj-top .th-note').textContent;
    setTab('verandering'); await new Promise(r => setTimeout(r, 200));
    const k = document.querySelector('#plan-tab .path'); return { pr, telt, noot, ver: k && k.offsetParent ? k.dataset.path : null, titel: k ? k.querySelector('.path-title').textContent : '', voorKopjes: !!k && !!(k.compareDocumentPosition(document.querySelector('#tabgroup .group.sub')) & 4) }; });
  ok(plannen.pr.slice().sort().join() === 'proces,project' && plannen.telt === '2', 'Projecten, Stappenplan: twee plannen, zonder Begeleid een verandering', plannen);
  ok(plannen.noot === 'Van opzet tot terugblik', 'de ondertitel van Projecten noemt verandering niet meer', plannen.noot);
  ok(plannen.ver === 'verandering' && plannen.titel === 'Begeleid een verandering' && plannen.voorKopjes, 'Verandering: het stappenplan staat bovenaan, boven de groepen', plannen);
  await p.click('#plan-tab .path-head'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelector('#plan-tab .path').classList.contains('open') && document.activeElement.classList.contains('path-head') && !!document.activeElement.closest('#plan-tab')), 'de plankaart klapt open en de focus blijft op haar kop');
  ok(await p.locator('#plan-tab .path .mee-k').count() === 3 && await p.locator('#plan-tab ol.steps .step-btn').count() >= 5, 'open: de strook Loopt mee en de stappen');
  await p.screenshot({ path: SHOTS + '/b8-plan-in-verandering.png' });
  await p.click('#plan-tab ol.steps .step-btn[data-id="stakeholders"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current === 'stakeholders' && pathCtx === 'verandering' && startedPaths().includes('verandering')), 'een stap in de plankaart start het veranderplan', await p.evaluate(() => current));
  await p.evaluate(() => { showHome(); setTab('verandering'); const s = new Set(store.get('paths-open', [])); s.delete('verandering'); store.set('paths-open', [...s]); renderPaths(); }); await p.waitForTimeout(300);
  await p.evaluate(() => { setTab('verandering'); subAlles(true); }); await p.waitForTimeout(200); await p.screenshot({ path: SHOTS + '/b1-verandering-dicht.png' });
  await p.evaluate(() => subAlles(false)); await p.waitForTimeout(200); await p.screenshot({ path: SHOTS + '/b2-verandering-open.png', fullPage: true });
  await p.evaluate(() => { setTab('zakmes'); subAlles(true); }); await p.waitForTimeout(200); await p.screenshot({ path: SHOTS + '/b3-zakmes.png' });

  // de kring per fase in Projecten toont de verandertools nog
  const kring = await p.evaluate(async () => { setTab('projecten'); setView('fase', false, false); await new Promise(r => setTimeout(r, 200)); return [...new Set([...document.querySelectorAll('#home [data-id]')].filter(e => e.offsetParent).map(e => e.dataset.id))]; });
  const inKring = await p.evaluate(() => PHASES.map(f => TOOLS.filter(t => (t.pdca || []).includes(f.id)).length).join('/') + ' | impact in een fase: ' + ((byId.impact.pdca || []).length > 0));
  console.log('\nkring per fase (aantal tools per fase):', inKring);
  await p.screenshot({ path: SHOTS + '/b7-projecten-kring.png' });

  // Start: Kom even tot rust
  await p.evaluate(() => { setTab('start'); }); await p.waitForTimeout(200);
  const rust = p.locator('#stiles .stile[data-start="reset"]');
  ok(await rust.count() === 1 && (await rust.innerText()).includes('Kom even tot rust'), 'Start: de ingang Kom even tot rust staat er nog');
  await rust.click(); await p.waitForTimeout(600);
  let st = await p.evaluate(() => ({ tab: document.getElementById('home').dataset.tab, open: [...document.querySelectorAll('#tabgroup .group.sub:not(.collapsed)')].map(g => g.dataset.group), focus: (document.activeElement.closest('.group') || {}).dataset && document.activeElement.closest('.group').dataset.group }));
  ok(st.tab === 'zakmes' && st.open.join() === 'sub-pauze' && st.focus === 'sub-pauze', 'de ingang opent het Zakmes met alleen Even pauze open, focus daar', st);
  await p.screenshot({ path: SHOTS + '/b4-rust-ingang.png' });
  await p.click('#tabgroup .group.sub[data-group="sub-pauze"] .row[data-id="adem"]'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => current) === 'adem', 'Adem opent vanuit Even pauze', await p.evaluate(() => current));
  ok(p.E.length === 0, 'geen fouten', p.E.slice(0, 3)); await p.context().close();

  // oude adressen
  for (const [pad, wat] of [['/?start=reset', 'snelkoppeling ?start=reset'], ['/?groep=reset', 'oude pagina ?groep=reset']]) {
    p = await nieuw(390, 844, pad); await p.waitForTimeout(500);
    st = await p.evaluate(() => ({ tab: document.getElementById('home').dataset.tab, open: [...document.querySelectorAll('#tabgroup .group.sub:not(.collapsed)')].map(g => g.dataset.group) }));
    ok(st.tab === 'zakmes' && st.open.includes('sub-pauze'), wat + ' leidt naar Even pauze in het Zakmes', st);
    ok(p.E.length === 0, 'geen fouten', p.E.slice(0, 3)); await p.context().close();
  }
  p = await nieuw(390, 844, '/?groep=verandering'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.getElementById('home').dataset.tab) === 'verandering', '?groep=verandering opent het tabblad Verandering');
  await p.context().close();
  p = await nieuw(390, 844, '/?start=verandering'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current === 'stakeholders' && pathCtx === 'verandering' && startedPaths().includes('verandering')), '?start=verandering start nog altijd het stappenplan', await p.evaluate(() => current));
  await p.context().close();

  // zoeken
  p = await nieuw();
  await p.click('#search-open'); await p.waitForTimeout(300); await p.fill('#search', 'qqstress'); await p.waitForTimeout(600);
  const tip = await p.evaluate(() => [...document.querySelectorAll('.res-tip .stile')].map(x => x.dataset.start + ':' + x.innerText.split('\n')[0]));
  ok(tip.join().includes('reset:Kom even tot rust'), 'zoeken op stress stelt Kom even tot rust voor', tip);
  await p.fill('#search', 'adem'); await p.waitForTimeout(600);
  const lab = await p.evaluate(() => { const r = [...document.querySelectorAll('.row[data-id="adem"]')].find(e => e.offsetParent); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
  console.log('zoekresultaat adem:', lab.slice(0, 90));
  ok(!/Reset/.test(lab), 'het zoekresultaat noemt Reset niet meer', lab);
  ok(p.E.length === 0, 'geen fouten (zoeken)', p.E.slice(0, 3)); await p.context().close();

  // welkomstgids
  p = await nieuw(390, 844, '/', true);
  const keuzes = await p.evaluate(() => [...document.querySelectorAll('#wz-keuzes .wz-keuze')].map(k => k.dataset.doel));
  ok(keuzes.includes('reset'), 'welkomstgids: de keuze Kom even tot rust bestaat nog', keuzes);
  await p.click('#wz-start'); await p.waitForTimeout(500);
  await p.click('#wz-keuzes .wz-keuze[data-doel="reset"]'); await p.waitForTimeout(500);
  const wz = await p.evaluate(() => ({ plan: [...document.querySelectorAll('#wz-plan li')].map(x => x.textContent.trim()), knop: document.getElementById('wz-klaar').textContent.trim(), zicht: !!document.getElementById('wz-klaar').offsetParent }));
  console.log('welkomstgids:', JSON.stringify(wz));
  if (!wz.zicht) { for (let i = 0; i < 3 && !(await p.evaluate(() => !!document.getElementById('wz-klaar').offsetParent)); i++) { await p.locator('dialog[open] button:visible, #wiz button:visible').filter({ hasText: /Verder|Volgende/ }).first().click().catch(() => {}); await p.waitForTimeout(400); } }
  const wz2 = await p.evaluate(() => ({ plan: [...document.querySelectorAll('#wz-plan li')].map(x => x.textContent.trim()), knop: document.getElementById('wz-klaar').textContent.trim() }));
  ok(wz2.plan.join() === 'Even pauze' && wz2.knop === 'Open Even pauze', 'welkomstgids toont Even pauze', wz2);
  await p.screenshot({ path: SHOTS + '/b5-welkom.png' });
  await p.click('#wz-klaar'); await p.waitForTimeout(700);
  st = await p.evaluate(() => ({ tab: document.getElementById('home').dataset.tab, open: [...document.querySelectorAll('#tabgroup .group.sub:not(.collapsed)')].map(g => g.dataset.group) }));
  ok(st.tab === 'zakmes' && st.open.join() === 'sub-pauze', 'welkomstgids eindigt in Even pauze', st);
  ok(p.E.length === 0, 'geen fouten (welkomstgids)', p.E.slice(0, 3)); await p.context().close();

  // tabbalk op smalle schermen
  for (const w of [320, 360, 390, 1280]) {
    p = await nieuw(w, 760);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, t: [...document.querySelectorAll('#tabbar .tab-lbl')].filter(e => e.offsetParent).map(e => ({ l: e.textContent, regels: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)), over: e.scrollWidth > e.clientWidth + 1 })) }));
    ok(m.sw <= m.iw && m.t.every(x => x.regels <= 1 && !x.over), `${w}px: tabbalk past, elk label op één regel`, m.t.filter(x => x.regels > 1 || x.over));
    await p.screenshot({ path: `${SHOTS}/b6-tabbalk-${w}.png` }); await p.context().close();
  }
  console.log(`\ncontroles: ${n}, fouten: ${fouten}`);
  await b.close(); process.exit(fouten ? 1 : 0);
})();
