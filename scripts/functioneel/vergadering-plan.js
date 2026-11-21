// Het stappenplan "Leid een vergadering": start vanaf Start, vijf stappen, geen vraag naar een projectnaam,
// bovenaan op Vergaderen, en "Nieuwe vergadering" zet de stappen weer open zonder iets te wissen.
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:8000';
let fout = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', hasTouch: true })).newPage();
  const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 120)));
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const plan = await p.evaluate(() => ({ kort: stepsOf('vergadering').map(s => s.t.id).join(), vol: trajectStappen('vergadering').map(s => s.t.id).join() }));
  ok(plan.kort === 'vergaderkost,agenda,check-in,notities,check-out', 'kort: vijf stappen van nodig tot afsluiten (' + plan.kort + ')');
  ok(plan.vol === 'vergaderkost,paradox,agenda,check-in,notities,beslissingen,check-out', 'uitgebreid: Afstemmingsparadox en Beslissingslog erbij (' + plan.vol + ')');
  await p.click('.stile[data-start="vergadering"]'); await p.waitForTimeout(1500);
  const s1 = await p.evaluate(() => ({ dlg: [...document.querySelectorAll('dialog[open]')].map(d => d.id).join(), started: startedPaths().join(), bar: (document.querySelector('#pathbar') || {}).innerText || '', proj: getProject() }));
  ok(!s1.dlg && s1.started === 'vergadering' && /Stap 1 van 5/.test(s1.bar) && /Agenda/.test(s1.bar), 'de tegel op Start opent stap 1 met de balk, zonder tussenvraag (' + JSON.stringify(s1) + ')');
  ok(!s1.proj, 'een vergadering vraagt geen projectnaam en zet er geen');
  await p.click('#pathbar .pb-next'); await p.waitForTimeout(1200);
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  // doe alsof de eerste twee stappen ingevuld zijn (de tools zelf zijn nu dicht en overschrijven dit niet)
  await p.evaluate(() => { for (const k of ['vergaderkost.v1', 'agenda.v1']) localStorage.setItem(k, JSON.stringify({ x: 1, items: [1], punten: [{ t: 'a' }] })); });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const klaar = () => p.evaluate(() => stepsOf('vergadering').map(s => s.done ? 1 : 0).join(''));
  ok(await klaar() === '11000', 'twee stappen ingevuld: twee gedaan (' + await klaar() + ')');
  ok(/2\/5|3\/5/.test(await p.innerText('.stile[data-start="vergadering"]')), 'de tegel toont waar je bent');
  await p.click('.tab[data-tab="vergaderen"]'); await p.waitForTimeout(500);
  const tab = await p.evaluate(() => ({ plan: document.querySelectorAll('.tabgroup:not([hidden]) .plan-tab .path').length, kop: [...document.querySelectorAll('.tabgroup:not([hidden]) .group h3, .tabgroup:not([hidden]) .group .group-title')].map(x => x.textContent.trim()).join('|'), n: document.querySelectorAll('.tabgroup:not([hidden]) > .group').length }));
  ok(tab.plan === 1 && tab.n === 5, 'Vergaderen: het plan bovenaan en vijf groepen losse tools (' + JSON.stringify(tab) + ')');
  ok(await p.locator('[data-plan-opnieuw]:visible').count() === 1, '"Nieuwe vergadering" staat bij het begonnen plan');
  const voor = await p.evaluate(() => localStorage.getItem('agenda.v1'));
  await p.locator('[data-plan-opnieuw]:visible').click(); await p.waitForTimeout(400);
  ok(await klaar() === '00000', 'na "Nieuwe vergadering" staan alle stappen weer open (' + await klaar() + ')');
  ok(await p.evaluate(() => localStorage.getItem('agenda.v1')) === voor, 'wat je invulde blijft staan');
  ok(!E.length, 'geen paginafouten ' + E.join(' | '));
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
