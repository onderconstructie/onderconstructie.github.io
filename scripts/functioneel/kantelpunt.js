// Kantelpunt: invullen, uitkomst in woorden, één verloop, bewaren, wissen, overnemen, downloaden, en de plaats in de app.
// BASE=http://127.0.0.1:8000 node scripts/functioneel/kantelpunt.js   (schermafbeeldingen in SHOTS, standaard de map v)
// De logica van het model zelf staat in kantelpunt-model.js.
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970), SHOTS = process.env.SHOTS || 'v'; require('fs').mkdirSync(SHOTS, { recursive: true });
let fouten = 0, n = 0;
const ok = (c, wat, extra) => { n++; if (!c) { fouten++; console.log('  FOUT: ' + wat + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); } else console.log('  ok: ' + wat); };
(async () => {
  const b = await chromium.launch();
  const nieuw = async (opt = {}) => {
    const w = opt.w || 390, c = await b.newContext({ viewport: { width: w, height: opt.h || 844 }, hasTouch: w < 700, isMobile: w < 700, serviceWorkers: 'block', acceptDownloads: true, reducedMotion: opt.rustig ? 'reduce' : 'no-preference' });
    if (opt.vooraf) await c.addInitScript(opt.vooraf);
    const p = await c.newPage(); p.E = [];
    p.on('pageerror', e => p.E.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) p.E.push(m.text().slice(0, 160)); });
    await p.goto(B + (opt.pad || '/kantelpunt/'), { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    return p;
  };
  const sleutel = p => p.evaluate(() => localStorage.getItem('kantelpunt.v1'));
  const uit = p => p.evaluate(() => document.getElementById('uit').innerText.replace(/\s+/g, ' ').trim());
  const hoofd = p => p.evaluate(() => (document.querySelector('#uit .kp-hoofd') || { textContent: '' }).textContent);
  const zicht = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return !!e && !e.hidden && !!e.offsetParent; }, id);
  const vul = async (p, i, naam, mensen, start, houding) => {
    const g = p.locator(`#groepen .kp-g[data-i="${i}"]`);
    if (naam != null) await g.locator('.kp-naam').fill(naam);
    if (mensen != null) await g.locator('[data-v="n"]').fill(String(mensen));
    if (start != null) await g.locator('[data-v="start"]').fill(String(start));
    if (houding) await g.locator(`[data-h="${houding}"]`).click();
    await p.waitForTimeout(350);
  };

  // ---------- 1. leeg begin
  let p = await nieuw();
  ok(await sleutel(p) === null, 'openen bewaart niets');
  ok((await uit(p)).startsWith('Vul minstens één groep in'), 'leeg: de tool zegt wat er nodig is', (await uit(p)).slice(0, 60));
  ok(!(await zicht(p, 'verloop')) && !(await zicht(p, 'export')) && !(await zicht(p, 'oc-wipe')) && await zicht(p, 'voorbeeld'), 'leeg: geen verloop, geen downloads, geen Opnieuw beginnen, wel Voorbeeld bekijken');
  ok(await p.locator('#groepen .kp-g').count() === 2, 'twee lege groepen om mee te beginnen');
  await p.screenshot({ path: SHOTS + '/k1-leeg.png', fullPage: true });

  // ---------- 2. voorbeeld
  await p.click('#voorbeeld'); await p.waitForTimeout(500);
  ok(await zicht(p, 'vb') && await sleutel(p) === null, 'het voorbeeld toont een band en wordt niet bewaard');
  ok((await hoofd(p)) === 'Dit kan beide kanten op.', 'het voorbeeld ligt dicht bij het kantelpunt', await hoofd(p));
  ok(await zicht(p, 'verloop') && await zicht(p, 'export') && !(await zicht(p, 'voorbeeld')), 'met het voorbeeld: verloop en downloads zichtbaar');
  ok(/Dit is een denkmodel, geen voorspelling/.test(await uit(p)), 'de uitkomst zegt dat het een denkmodel is');
  ok(!/%/.test(await p.evaluate(() => [...document.querySelectorAll('#uit > :not(details)')].map(e => e.innerText).join(' '))), 'geen procenten in de uitkomst');
  const cellen = await p.evaluate(() => { const c = [...document.querySelectorAll('#uit .kp-strook i')]; return { tot: c.length, aan: c.filter(x => x.classList.contains('aan')).length, half: c.filter(x => x.classList.contains('half')).length }; });
  ok(cellen.tot === 300 && cellen.aan > 0 && cellen.aan < 300, 'de strook toont elk verloop als één vakje', cellen);
  await p.click('#uit .kp-hoe summary'); await p.waitForTimeout(150);
  const hoe = await p.evaluate(() => document.querySelector('#uit .kp-hoe').innerText.replace(/\s+/g, ' '));
  const m = hoe.match(/(\d+) keer af.*?(\d+) keer sloeg het aan.*?(\d+) keer bleef het halfweg en (\d+) keer bleef het hangen/);
  ok(m && +m[1] === 300 && +m[2] + +m[3] + +m[4] === 300 && +m[2] === cellen.aan, 'Zo is dit berekend: de tellingen kloppen met de strook', hoe.slice(0, 200));
  await p.screenshot({ path: SHOTS + '/k2-voorbeeld.png', fullPage: true });
  // dezelfde invoer, dezelfde uitkomst
  const kern = () => p.evaluate(() => [...document.querySelectorAll('#uit > :not(details)')].map(e => e.innerText + [...e.querySelectorAll('.kp-balk i')].map(i => i.style.width).join()).join(' | ') + document.querySelectorAll('#uit .kp-strook i.aan').length);
  const u1 = await kern(); await p.click('#blik [data-blik="team"]'); await p.waitForTimeout(400); const u2 = await kern(); await p.click('#blik [data-blik="mix"]'); await p.waitForTimeout(400);
  ok(u2 !== u1 && await kern() === u1, 'een andere blik geeft een andere uitkomst, terugzetten geeft exact dezelfde');
  ok(await sleutel(p) !== null && !(await zicht(p, 'vb')), 'wie in het voorbeeld iets wijzigt, maakt het van zichzelf: bewaard, band weg');

  // ---------- 3. alles wissen en ongedaan
  ok(await zicht(p, 'oc-wipe'), 'Opnieuw beginnen staat er zodra er werk is');
  await p.click('#oc-wipe'); await p.waitForTimeout(200); await p.click('.ocw-yes'); await p.waitForTimeout(400);
  ok(await sleutel(p) === null && (await uit(p)).startsWith('Vul minstens') && await p.inputValue('#gedrag') === '', 'Alles wissen: leeg, en de sleutel is weg');
  await p.click('#toast-btn'); await p.waitForTimeout(400);
  ok(await sleutel(p) !== null && (await hoofd(p)) !== '' && await p.inputValue('#groepen .kp-g[data-i="0"] .kp-naam') === 'Loket', 'Ongedaan zet alles terug');
  ok(p.E.length === 0, 'geen fouten (voorbeeld en wissen)', p.E.slice(0, 3)); await p.context().close();

  // ---------- 4. zelf invullen
  p = await nieuw();
  await p.fill('#gedrag', 'Elke klacht binnen de dag beantwoorden'); await vul(p, 0, 'Loket', 30, null, 'vlot');
  ok((await uit(p)).startsWith('Zet ergens minstens één voortrekker'), 'zonder voortrekkers: de tool zegt dat er iemand moet beginnen', (await uit(p)).slice(0, 60));
  await vul(p, 0, null, null, 5);
  ok(/^Dit slaat (bijna altijd|meestal) aan\.$/.test(await hoofd(p)), 'een vlotte groep met voortrekkers slaat aan', await hoofd(p));
  await vul(p, 0, null, null, null, 'wacht');
  ok(/^Dit blijft (bijna altijd|meestal) hangen\.$/.test(await hoofd(p)), 'dezelfde groep afwachtend: blijft hangen', await hoofd(p));
  ok(!/Waar zoek je je voortrekkers/.test(await uit(p)), 'met één groep: geen vraag waar je voortrekkers zoekt');
  await vul(p, 1, 'Backoffice', 20, 0, 'vlot');
  ok(/Waar zoek je je voortrekkers\?/.test(await uit(p)) && await p.locator('#uit .kp-rij.nu').count() === 1, 'met twee groepen: de keuzes staan er, de huidige is gemarkeerd');
  ok(/Per groep Loket .* mee Backoffice .* mee/.test(await uit(p)), 'per groep staat er in woorden hoe vaak ze meegaat', (await uit(p)).slice(0, 160));
  // grenzen
  await vul(p, 0, null, 10, 25);
  ok((await p.locator('#groepen .kp-g[data-i="0"] .kp-g-msg').textContent()) === 'Meer voortrekkers dan mensen: het model rekent met 10.', 'meer voortrekkers dan mensen: een melding, geen fout');
  await p.locator('#groepen .kp-g[data-i="0"] [data-v="n"]').fill('99999'); await p.keyboard.press('Tab'); await p.waitForTimeout(300);
  ok(await p.inputValue('#groepen .kp-g[data-i="0"] [data-v="n"]') === '500', 'een te groot getal springt naar de grens', await p.inputValue('#groepen .kp-g[data-i="0"] [data-v="n"]'));
  await vul(p, 0, null, 30, 5, 'kijkt');
  // bewaren en herladen
  const voor = await uit(p); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(await uit(p) === voor && await p.inputValue('#gedrag') === 'Elke klacht binnen de dag beantwoorden', 'na herladen staat alles er nog, met dezelfde uitkomst');
  // groepen toevoegen en verwijderen
  for (let i = 0; i < 4; i++) { await p.click('#plus-groep'); await p.waitForTimeout(80); }
  ok(await p.locator('#groepen .kp-g').count() === 6 && !(await zicht(p, 'plus-groep')), 'hooguit zes groepen');
  ok(await p.evaluate(() => document.activeElement.classList.contains('kp-naam') && document.activeElement.closest('.kp-g').dataset.i === '5'), 'na + Groep staat de cursor in de nieuwe groep');
  await p.click('#groepen .kp-g[data-i="1"] .kp-weg'); await p.waitForTimeout(300);
  ok(await p.locator('#groepen .kp-g').count() === 5 && (await p.locator('#toast-text').textContent()) === 'Backoffice verwijderd', 'een groep verwijderen meldt welke');
  await p.click('#toast-btn'); await p.waitForTimeout(300);
  ok(await p.inputValue('#groepen .kp-g[data-i="1"] .kp-naam') === 'Backoffice' && await uit(p) === voor, 'Ongedaan zet de groep terug, met dezelfde uitkomst');
  // opmaak in een naam wordt tekst
  await vul(p, 2, '"><img src=x onerror="window.__x=1"><b id=xb>x</b>', 12, 1);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !window.__x && !document.getElementById('xb')) && /<img src=x/.test(await uit(p)), 'opmaak in een naam blijft gewone tekst');
  ok(p.E.length === 0, 'geen fouten (invullen)', p.E.slice(0, 3)); await p.context().close();

  // ---------- 5. één verloop
  p = await nieuw({ vooraf: () => { try { if (!localStorage.getItem('kantelpunt.v1')) localStorage.setItem('kantelpunt.v1', JSON.stringify({ v: 1, gedrag: 'Test', blik: 'mix', groepen: [{ naam: 'A', n: 40, start: 6, houding: 'vlot' }, { naam: 'B', n: 30, start: 0, houding: 'kijkt' }] })); } catch {} } });
  ok(/^Start: 6 voortrekkers van de 70 mensen\.$/.test(await p.textContent('#ronde')), 'het verloop begint bij de voortrekkers', await p.textContent('#ronde'));
  const groen = () => p.evaluate(() => { const cv = document.getElementById('cv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let g = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] > 150 && d[i + 2] > 90 && d[i + 2] < 160) g++; return g; });
  const g0 = await groen();
  await p.click('#speel'); await p.waitForTimeout(300); ok((await p.textContent('#speel')) === 'Pauze', 'tijdens het spelen heet de knop Pauze');
  await p.waitForFunction(() => /verandert er niets meer|niemand volgt/.test(document.getElementById('ronde').textContent), null, { timeout: 30000 });
  const eind = await p.textContent('#ronde'); const g1 = await groen();
  ok(/^Na ronde \d+ verandert er niets meer: \d+ van de 70 doen mee\.$/.test(eind) && g1 > g0, 'het verloop loopt tot er niets meer verandert, en er komen groene stippen bij', [eind, g0, g1]);
  ok((await p.textContent('#speel')) === 'Opnieuw', 'aan het einde heet de knop Opnieuw');
  ok(/A: \d+ van 40\. B: \d+ van 30\./.test(await p.getAttribute('#cv', 'aria-label')), 'het canvas beschrijft de stand per groep', await p.getAttribute('#cv', 'aria-label'));
  await p.locator('#verloop').scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOTS + '/k3-verloop.png' });
  await p.click('#ander'); await p.waitForTimeout(300);
  ok(/^Start: 6 voortrekkers/.test(await p.textContent('#ronde')) && (await p.textContent('#speel')) === 'Speel af', 'Ander verloop begint opnieuw bij de start');
  ok(p.E.length === 0, 'geen fouten (verloop)', p.E.slice(0, 3)); await p.context().close();
  // zonder beweging: ronde per ronde, zelf
  p = await nieuw({ rustig: true, vooraf: () => { try { localStorage.setItem('kantelpunt.v1', JSON.stringify({ v: 1, gedrag: '', blik: 'mix', groepen: [{ naam: 'A', n: 40, start: 6, houding: 'vlot' }] })); } catch {} } });
  ok((await p.textContent('#speel')) === 'Eerste ronde', 'minder beweging: de knop zet zelf één ronde verder', await p.textContent('#speel'));
  await p.click('#speel'); await p.waitForTimeout(200);
  ok(/^(Ronde 1:|Na ronde 1 )/.test(await p.textContent('#ronde')), 'minder beweging: één tik is één ronde', await p.textContent('#ronde'));
  await p.context().close();

  // ---------- 6. overnemen uit een andere tool
  p = await nieuw({ vooraf: () => { try { localStorage.setItem('oc.share.impact', JSON.stringify({ tool: 'Impactanalyse', lists: [{ name: 'Nieuw loket', items: [{ type: 'betrokkene', text: 'Loketbedienden' }, { type: 'betrokkene', text: 'Dossierbeheerders' }, { type: 'taak', text: 'Handleiding schrijven' }] }] })); } catch {} } });
  ok(await zicht(p, 'neem'), 'ligt er iets klaar in een andere tool, dan staat Overnemen er');
  await p.click('#neem'); await p.waitForTimeout(400);
  const kies = await p.evaluate(() => { const d = document.querySelector('.ocs-back'); return d ? d.innerText.replace(/\s+/g, ' ') : ''; });
  ok(/Loketbedienden/.test(kies) && /Dossierbeheerders/.test(kies) && !/Handleiding schrijven/.test(kies), 'de kiezer toont de betrokkenen, geen taken', kies.slice(0, 200));
  await p.evaluate(() => document.querySelectorAll('.ocs-back input[type=checkbox]').forEach(c => { if (!c.checked) c.click(); })); await p.waitForTimeout(150);
  await p.click('.ocs-ok'); await p.waitForTimeout(500);
  const namen = await p.evaluate(() => [...document.querySelectorAll('#groepen .kp-naam')].map(x => x.value));
  ok(namen.join() === 'Loketbedienden,Dossierbeheerders', 'de namen staan in de lege groepen, niets erbij verzonnen', namen);
  ok(/2 groepen overgenomen\. Vul het aantal mensen in\./.test(await p.textContent('#toast-text')) && (await uit(p)).startsWith('Vul minstens'), 'de tool vraagt nu het aantal mensen', await p.textContent('#toast-text'));
  ok(p.E.length === 0, 'geen fouten (overnemen)', p.E.slice(0, 3)); await p.context().close();

  // ---------- 7. downloaden en bewaren als bestand
  p = await nieuw({ w: 1280, h: 900 });
  await p.click('#menu-btn'); await p.click('[data-bestand="bewaar"]'); await p.waitForTimeout(300);
  ok((await p.textContent('#toast-text')) === 'Er is nog niets om te bewaren.', 'leeg: Bewaar als bestand zegt dat er niets is');
  await p.click('#voorbeeld'); await p.waitForTimeout(400); await p.fill('#gedrag', 'Mijn gedrag'); await p.waitForTimeout(400);
  const dl = async knop => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), knop()]); const pad = await d.path(); return { naam: d.suggestedFilename(), kb: Math.round(require('fs').statSync(pad).size / 1024), pad }; };
  const png = await dl(() => p.click('#export-png'));
  ok(/^kantelpunt-\d{4}-\d{2}-\d{2}\.png$/.test(png.naam) && png.kb > 30, 'Afbeelding: een png met de datum in de naam', png);
  require('fs').copyFileSync(png.pad, SHOTS + '/k4-export.png');
  const pdf = await dl(() => p.click('#export-pdf'));
  ok(/^kantelpunt-\d{4}-\d{2}-\d{2}\.pdf$/.test(pdf.naam) && pdf.kb > 20, 'PDF gedownload', pdf);
  const js = await dl(async () => { await p.click('#menu-btn'); await p.click('[data-bestand="bewaar"]'); });
  const inhoud = JSON.parse(require('fs').readFileSync(js.pad, 'utf8'));
  ok(/\.json$/.test(js.naam) && inhoud.data && JSON.parse(inhoud.data['kantelpunt.v1']).gedrag === 'Mijn gedrag', 'Bewaar als bestand: het werk zit in het bestand', js.naam);
  ok(p.E.length === 0, 'geen fouten (downloaden)', p.E.slice(0, 3)); await p.context().close();

  // ---------- 8. past op elk scherm
  for (const w of [320, 390, 1280]) {
    p = await nieuw({ w, h: 800 }); await p.click('#voorbeeld'); await p.waitForTimeout(500);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
      klein: [...document.querySelectorAll('main button, main summary')].filter(e => e.offsetParent && !e.closest('p')).map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(x => x.h < 44 && x.w < 44 || x.h < 30),
      cv: document.getElementById('cv').getBoundingClientRect().width, kaart: document.getElementById('verloop').getBoundingClientRect().width }));
    ok(m.sw <= m.iw, `${w}px: geen horizontale overloop`, m);
    ok(m.klein.length === 0, `${w}px: elk tikdoel minstens 44 px`, m.klein);
    ok(m.cv > 200 && m.cv < m.kaart, `${w}px: het verloop past in zijn kaart`, [m.cv, m.kaart]);
    await p.context().close();
  }

  // ---------- 9. in de app
  p = await nieuw({ pad: '/', vooraf: () => { try { localStorage.setItem('oc-app.welkom-weg', 'true'); } catch {} } });
  const inApp = await p.evaluate(async () => { setTab('verandering'); subAlles(false); await new Promise(r => setTimeout(r, 200)); const k = document.querySelector('#tabgroup .group.sub[data-group="sub-gedrag"]'); return { ids: [...k.querySelectorAll('.row[data-id]')].map(r => r.dataset.id), g: byId.kantelpunt && byId.kantelpunt.g, begonnen: hasData(byId.kantelpunt) }; });
  ok(inApp.ids.join() === 'gedrag,kantelpunt' && inApp.g === 'verandering', 'in de app: Kantelpunt staat onder Verandering, kopje Gedrag', inApp);
  ok(!inApp.begonnen, 'in de app: een ongebruikte tool telt niet als begonnen');
  await p.click('#tabgroup .row[data-id="kantelpunt"]'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current === 'kantelpunt' && document.getElementById('pathbar').hidden), 'de tool opent in de app, zonder stappenbalk', await p.evaluate(() => current));
  const f = p.frameLocator('#frames iframe:not([hidden])').first();
  await f.locator('#voorbeeld').click(); await p.waitForTimeout(500);
  ok(/Dit kan beide kanten op/.test(await f.locator('#uit').innerText()) && !(await p.evaluate(() => hasData(byId.kantelpunt))), 'in de app: het voorbeeld werkt en telt niet als eigen werk');
  await f.locator('#gedrag').fill('Echt werk'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => hasData(byId.kantelpunt)), 'in de app: na echt invullen telt de tool als begonnen');
  await p.screenshot({ path: SHOTS + '/k5-in-de-app.png' });
  await p.evaluate(() => showHome()); await p.click('#search-open'); await p.fill('#search', 'simulator'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => [...document.querySelectorAll('.row[data-id="kantelpunt"]')].some(e => e.offsetParent)), 'zoeken op simulator vindt Kantelpunt');
  ok(p.E.length === 0, 'geen fouten (in de app)', p.E.slice(0, 3)); await p.context().close();

  console.log(`\ncontroles: ${n}, fouten: ${fouten}`);
  await b.close(); process.exit(fouten ? 1 : 0);
})();
