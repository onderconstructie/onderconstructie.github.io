// Relaxroulette: een rad met dingen die je graag doet. Draai eraan en doe wat het aanwijst.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true }), p = await c.newPage();
  p.on('pageerror', e => ok(false, 'paginafout ' + e.message));
  const S = () => p.evaluate(() => relaxroulette.staat());
  await p.goto(BASE + '/zakmes/relaxroulette/'); await p.waitForTimeout(1000);
  ok(await p.locator('h1.title').innerText() === 'Relaxroulette', 'de tool heet Relaxroulette');
  let s = await S();
  ok(s.items.length === 10 && s.items.some(i => /hobby uit je jeugd/.test(i.t)) && s.items.some(i => /bedankje/.test(i.t)) && s.items.some(i => /ik denk er even over na/.test(i.t)), 'het rad is al gevuld met tien dingen, ook de drie die Bartel aanbracht');
  ok(await p.locator('#rr-rad .rr-stuk').count() === 10 && await p.locator('#rr-rad .rr-stuk svg, #rr-rad .rr-stuk g g, #rr-rad .rr-stuk > g').count() >= 10, 'tien stukken taart, elk met een tekening');
  ok(await p.evaluate(() => localStorage.getItem('relaxroulette.v1') === null), 'zolang je niets wijzigt, wordt er niets bewaard');
  // draaien
  await p.locator('#rr-draai').click(); await p.waitForTimeout(300);
  ok(await p.locator('#rr-draai').isDisabled(), 'tijdens het draaien kan je niet nog eens draaien');
  await p.waitForTimeout(3400);
  const g1 = await p.evaluate(() => relaxroulette.gekozen());
  ok(!!g1 && await p.locator('#rr-uit').isVisible() && (await p.locator('#rr-uit-t').innerText()).length > 5 && (await p.locator('#rr-knipoog').innerText()).length > 5, 'het rad kiest één ding, met een knipoog erbij');
  ok(await p.evaluate(() => { const g = document.querySelector('.rr-stuk.aan > g'), w = document.querySelector('.rr-wiel').getBoundingClientRect(), i = g.getBoundingClientRect(); return Math.abs(i.left + i.width / 2 - (w.left + w.width / 2)) < 6 && i.top + i.height / 2 < w.top + w.height / 2; }), 'het gekozen stuk staat recht onder de pijl bovenaan');
  await p.locator('#rr-rad-knop').click(); await p.waitForTimeout(3700);
  ok(await p.evaluate(() => relaxroulette.gekozen()) !== g1, 'nog eens draaien (een tik op het rad zelf) geeft iets anders');
  await p.locator('#rr-gedaan').click(); await p.waitForTimeout(300);
  ok((await S()).gedaan === 1 && !(await p.locator('#rr-uit').isVisible()) && (await p.locator('#rr-teller').innerText()).includes('1 keer'), 'Gedaan telt mee en ruimt de keuze op');
  // eigen dingen
  await p.locator('#rr-nieuw').fill('Tien minuten gitaar spelen'); await p.locator('#rr-ico [data-ico="noot"]').click(); await p.locator('#rr-form button[type=submit]').click(); await p.waitForTimeout(250);
  s = await S(); ok(s.items.length === 11 && s.items[10].t === 'Tien minuten gitaar spelen' && s.items[10].ico === 'noot' && await p.locator('#rr-rad .rr-stuk').count() === 11, 'een eigen ding komt op het rad, met de gekozen tekening');
  await p.locator('#rr-nieuw').fill('tien minuten gitaar spelen'); await p.locator('#rr-form button[type=submit]').click(); await p.waitForTimeout(200);
  ok((await S()).items.length === 11 && (await p.locator('#rr-status').innerText()).includes('staat al'), 'hetzelfde ding komt er geen twee keer op');
  await p.locator('#rr-nieuw').fill('Nog iets'); await p.locator('#rr-form button[type=submit]').click(); await p.waitForTimeout(200);
  ok((await S()).items.length === 12 && !(await p.locator('#rr-form').isVisible()) && await p.locator('#rr-vol').isVisible(), 'bij twaalf is het rad vol, met uitleg');
  await p.locator('[data-weg]').first().click(); await p.waitForTimeout(250);
  ok((await S()).items.length === 11, 'een ding weghalen');
  await p.locator('#toast-btn').click(); await p.waitForTimeout(250);
  ok((await S()).items.length === 12, 'ongedaan maken zet het terug');
  ok(await p.evaluate(() => [...document.querySelectorAll('.rr-weg, .rr-icokies button, #rr-draai, #rr-gedaan')].every(k => { const r = k.getBoundingClientRect(); return !r.width || (r.width >= 44 && r.height >= 44); })), 'alle knoppen zijn 44 px');
  await p.reload(); await p.waitForTimeout(800);
  ok((await S()).items.length === 12 && (await S()).gedaan === 1, 'na herladen staat je eigen rad er nog');
  await p.locator('#rr-terug').click(); await p.waitForTimeout(250);
  ok((await S()).items.length === 10 && (await S()).gedaan === 1, 'de voorbeelden terugzetten houdt je teller');
  // te weinig om te draaien
  await p.evaluate(() => localStorage.setItem('relaxroulette.v1', JSON.stringify({ items:[{ t:'Alleen dit', ico:'onzin' }], gedaan:'x' }))); await p.reload(); await p.waitForTimeout(700);
  s = await S(); ok(s.items.length === 1 && s.items[0].ico === 'ster' && s.gedaan === 0 && await p.locator('#rr-draai').isDisabled() && await p.locator('#rr-weinig').isVisible(), 'vreemde opslag wordt opgeschoond; met één ding kan je niet draaien');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'niets loopt buiten het scherm');
  ok(await p.locator('footer a.oc-citaat .oc-citaat-wie').innerText() === 'Seneca', 'onderaan staat de uitspraak van Seneca');
  await c.close();
  // wie liever geen beweging ziet: geen draaiende animatie, wel een keuze
  const r = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', reducedMotion:'reduce' }), q = await r.newPage();
  await q.goto(BASE + '/zakmes/relaxroulette/'); await q.waitForTimeout(800); await q.locator('#rr-draai').click(); await q.waitForTimeout(400);
  ok(await q.locator('#rr-uit').isVisible(), 'minder beweging: de keuze staat er meteen, zonder draaien');
  await r.close();
  const d = await b.newContext({ viewport:{ width:1366, height:900 }, serviceWorkers:'block' }), a = await d.newPage();
  a.on('pageerror', e => ok(false, 'app: paginafout ' + e.message));
  await a.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('citaten.gezien', '1'); } catch {} });
  await a.goto(BASE + '/'); await a.waitForTimeout(1300);
  ok(await a.evaluate(() => !!byId.relaxroulette && ZAK_SUB.find(g => g.id === 'pauze').tools.includes('relaxroulette')), 'app: de tool staat in Zakmes onder Even pauze');
  await a.evaluate(() => openTool('relaxroulette')); await a.waitForTimeout(1500);
  ok(await a.frameLocator('iframe[title="Relaxroulette"]').locator('h1.title').innerText() === 'Relaxroulette', 'app: de tool opent in het kader');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
