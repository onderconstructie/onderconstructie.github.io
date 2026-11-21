// Het stappenplan "Leid een vergadering": eerst de keuze gewone vergadering of stand-up, geen vraag naar een projectnaam,
// bovenaan op Vergaderen, en "Nieuwe vergadering" zet de stappen weer open en geeft Agenda, Notities en Check-out een leeg blad
// zonder iets te wissen.
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:8000';
let fout = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true }); const p = await c.newPage();
  const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 120)));
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const stappen = () => p.evaluate(() => stepsOf('vergadering').map(s => s.t.id).join());
  ok(await stappen() === 'agenda,check-in,notities,check-out', 'gewone vergadering, kort: vier stappen (' + await stappen() + ')');
  const vol = await p.evaluate(() => trajectStappen('vergadering').map(s => s.t.id).join());
  ok(vol === 'agenda,check-in,notities,beslissingen,check-out', 'uitgebreid: alleen het Beslissingslog erbij; de som en de afstemmingslijnen staan in de eerste vraag, niet als stap (' + vol + ')');
  // de tegel vraagt eerst wat voor vergadering het wordt
  await p.click('.stile[data-start="vergadering"]'); await p.waitForTimeout(400);
  ok(await p.isVisible('#vg-dlg') && await p.locator('#vg-dlg [data-vg]').count() === 3 && !(await p.isVisible('#vg-nieuw')), 'eerste start: moet het wel een vergadering zijn? Drie keuzes');
  ok(/Samen 6 uur werktijd/.test(await p.innerText('#vg-uit')) && /En 15 lijnen om af te stemmen/.test(await p.innerText('#vg-lijn')), 'de som: 6 mensen, een uur, samen 6 uur en 15 lijnen (' + await p.innerText('#vg-uit') + ' ' + await p.innerText('#vg-lijn') + ')');
  await p.selectOption('#vg-n', '8'); await p.selectOption('#vg-duur', '90');
  ok(/Samen 12 uur werktijd\. Dat is 1,6 werkdagen/.test(await p.innerText('#vg-uit')), '8 mensen, anderhalf uur: 12 uur, 1,6 werkdagen (' + await p.innerText('#vg-uit') + ')');
  await p.click('#vg-dlg [data-vg="bericht"]'); await p.waitForTimeout(200);
  ok(await p.isVisible('#vg-bericht') && /spaar je samen 12 uur/.test(await p.innerText('#vg-bp')) && await p.evaluate(() => !startedPaths().length), '"Iets meedelen": stuur een bericht, en er start geen plan');
  await p.click('#vg-toch'); await p.waitForTimeout(200); ok(await p.isVisible('#vg-kies'), '"Toch vergaderen" brengt je terug naar de keuze');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!(await p.isVisible('#vg-dlg')) && await p.evaluate(() => !startedPaths().length), 'Escape sluit de keuze en start niets');
  await p.click('.stile[data-start="vergadering"]'); await p.waitForTimeout(300); await p.click('#vg-dlg [data-vg="gewoon"]'); await p.waitForTimeout(1500);
  const s1 = await p.evaluate(() => ({ dlg: !$('vg-dlg').hidden || !$('pn-dlg').hidden, started: startedPaths().join(), bar: (document.querySelector('#pathbar') || {}).innerText || '', proj: getProject(), cur: current }));
  ok(!s1.dlg && s1.started === 'vergadering' && s1.cur === 'agenda' && /Stap 1 van 4/.test(s1.bar), 'gewone vergadering: de agenda opent als stap 1, met de balk (' + JSON.stringify(s1) + ')');
  ok(!s1.proj, 'een vergadering vraagt geen projectnaam en zet er geen');
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  // de tegel opnieuw aantikken terwijl de vergadering loopt: verder, of een nieuwe?
  await p.click('.stile[data-start="vergadering"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#vg-verder') && /Stap 1 van 4: Agenda/.test(await p.innerText('#vg-vs')), 'tegel opnieuw aangetikt: verder of een nieuwe vergadering (' + await p.innerText('#vg-vs') + ')');
  await p.click('#vg-verder [data-vv="verder"]'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => current === 'agenda' && $('vg-dlg').hidden), '"Verder waar ik was" opent de stap waar je was');
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  await p.click('.stile[data-start="vergadering"]'); await p.waitForTimeout(300); await p.click('#vg-verder [data-vv="nieuw"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#vg-kies') && await p.isVisible('#vg-nieuw'), '"Nieuwe vergadering" brengt je naar de eerste vraag'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // vul een agenda, een overleg en een check-out, in de vorm die de tools zelf bewaren
  const vul = async (pad, doe) => { const q = await c.newPage(); await q.goto(B + pad, { waitUntil: 'networkidle' }); await q.waitForTimeout(500); await q.evaluate(doe); await q.waitForTimeout(300); await q.close(); };
  await vul('/agenda/', () => { nieuweAgendaMaken(); const a = cur(); a.name = 'Teamoverleg'; a.punten.push(nieuwPunt('Budget')); save(); });
  await vul('/notities/', () => { const m = maakOverleg(null, 'Teamoverleg'); m.mensen = [{ n: 'An', s: 0 }]; m.regels.push(nieuweRegel('', 'Budget is goedgekeurd')); save(true); });
  await vul('/check-out/', () => { nieuweCheckout(); cur().antwoorden.push({ id: 'a1', naam: 'An', idee: 'Duidelijke afspraken', vraag: '', moeilijk: '', woorden: [], besproken: false, t: Date.now() }); save(); });
  const tel = () => p.evaluate(() => { const j = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }; const a = j('agenda.v1'), n = j('notities.v1'), o = j('check-out.v1'); return [a && a.lists ? a.lists.length : -1, n && n.items ? n.items.length : -1, o && o.sessies ? o.sessies.length : -1].join(); });
  const voor = await tel();
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const klaar = () => p.evaluate(() => stepsOf('vergadering').map(s => s.done ? 1 : 0).join(''));
  ok(/1/.test(await klaar()), 'ingevulde stappen tellen als gedaan (' + await klaar() + ')');
  await p.click('.tab[data-tab="vergaderen"]'); await p.waitForTimeout(500);
  const tab = await p.evaluate(() => ({ plan: document.querySelectorAll('.tabgroup:not([hidden]) .plan-tab .path').length, n: document.querySelectorAll('.tabgroup:not([hidden]) > .group').length }));
  ok(tab.plan === 1 && tab.n === 5, 'Vergaderen: het plan bovenaan en vijf groepen losse tools (' + JSON.stringify(tab) + ')');
  // nieuwe vergadering, nu als stand-up
  await p.locator('[data-plan-opnieuw]:visible').click(); await p.waitForTimeout(300);
  ok(await p.isVisible('#vg-dlg') && await p.isVisible('#vg-nieuw'), '"Nieuwe vergadering" vraagt opnieuw de soort en zegt dat je met een leeg blad begint');
  await p.click('#vg-dlg [data-vg="standup"]'); await p.waitForTimeout(500);
  ok(await stappen() === 'check-in,kanban,notities', 'stand-up: drie stappen, rondje, bord en blokkades (' + await stappen() + ')');
  ok(await klaar() === '000', 'na "Nieuwe vergadering" staan alle stappen weer open (' + await klaar() + ')');
  const sein = await p.evaluate(() => ['agenda', 'notities', 'check-out'].map(k => localStorage.getItem('oc.plan.nieuw.' + k) ? 1 : 0).join(''));
  ok(sein === '111', 'de drie tools krijgen een seintje voor een leeg blad (' + sein + ')');
  // de tools beginnen met een leeg blad en houden het vorige
  for (const pad of ['/agenda/', '/notities/', '/check-out/']) { const q = await c.newPage(); await q.goto(B + pad, { waitUntil: 'networkidle' }); await q.waitForTimeout(700); await q.close(); }
  const na = await tel(), v = voor.split(',').map(Number), n = na.split(',').map(Number);
  ok(n.every((x, i) => x === v[i] + 1), 'Agenda, Notities en Check-out: één blad erbij, het vorige blijft (' + voor + ' wordt ' + na + ')');
  const leeg = await p.evaluate(() => { const j = k => JSON.parse(localStorage.getItem(k)); const a = j('agenda.v1'), nn = j('notities.v1'), o = j('check-out.v1'); const ca = a.lists.find(x => x.id === a.current), cn = nn.items.find(x => x.id === nn.current), co = o.sessies.find(x => x.id === o.huidig); return [ca.punten.length, ca.name, cn.regels.filter(r => r.t).length, cn.mensen.map(m => m.n).join(), co.antwoorden.length].join('|'); });
  ok(leeg === '0|Teamoverleg|0|An|0', 'het nieuwe blad is leeg, met de titel en de mensen van de vorige keer (' + leeg + ')');
  for (const pad of ['/agenda/']) { const q = await c.newPage(); await q.goto(B + pad, { waitUntil: 'networkidle' }); await q.waitForTimeout(500); await q.close(); }
  ok(await tel() === na, 'een tweede keer openen maakt geen blad extra');
  ok(!E.length, 'geen paginafouten ' + E.join(' | '));
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
