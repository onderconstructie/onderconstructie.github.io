// Een nieuwe vergadering begint echt opnieuw.
// 1. Na "Nieuwe vergadering" telt een stap pas als gedaan wanneer je er iets in veranderde. Alleen openen is niet genoeg,
//    ook al bewaart de tool je vorige vergadering nog. (Vroeger sprong "Verder" daardoor meteen naar de Check-out.)
// 2. Tik je op "Nieuwe vergadering" terwijl je in de Check-out staat, dan ga je naar stap 1, de Agenda.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true }), p = await c.newPage();
  p.on('pageerror', e => ok(false, 'paginafout ' + e.message));
  await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); } catch {} });
  const thuis = async () => { await p.goto(BASE + '/'); await p.waitForTimeout(1300); };
  const stappen = () => p.evaluate(() => stepsOf('vergadering').map(s => s.t.id + (s.done ? '✓' : '')).join(','));
  const tegel = () => p.locator('.stile').filter({ hasText:'Leid een vergadering' }).first();
  const typAgenda = async tekst => { const f = p.frameLocator('iframe[title="Agenda"]'); if (await f.locator('#begin-btn').isVisible()) await f.locator('#begin-btn').click(); await f.locator('#add-t').fill(tekst); await f.locator('#add-t').press('Enter'); await p.waitForTimeout(700); };
  // eerste vergadering, met inhoud in Agenda en Notities
  await thuis(); await tegel().click(); await p.waitForTimeout(500); await p.locator('#vg-dlg .vg-keuze[data-vg="gewoon"]').click(); await p.waitForTimeout(1800);
  await typAgenda('Begroting');
  await p.evaluate(() => openTool('notities', false, null, '', false)); await p.waitForTimeout(1500);
  const q = await c.newPage(); await q.goto(BASE + '/notities/'); await q.waitForTimeout(900); await q.locator('.oc-vb:visible, #example:visible, #voorbeeld:visible').first().click(); await q.waitForTimeout(700); await q.close();
  await thuis();
  ok((await stappen()).startsWith('agenda✓,check-in,notities✓'), 'eerste vergadering: Agenda en Notities tellen als gedaan (' + await stappen() + ')');
  // nieuwe vergadering via de tegel op Start
  await tegel().click(); await p.waitForTimeout(600); await p.locator('#vg-dlg [data-vv]:not([data-vv="verder"])').first().click(); await p.waitForTimeout(600);
  await p.locator('#vg-dlg .vg-keuze[data-vg="gewoon"]').click(); await p.waitForTimeout(2600);
  ok(await p.evaluate(() => current) === 'agenda', 'nieuwe vergadering: je begint in de Agenda');
  await p.evaluate(() => openTool('notities', false, null, '', false)); await p.waitForTimeout(2600);
  await thuis();
  ok(await stappen() === 'agenda,check-in,notities,check-out', 'alleen openen telt niet: alle stappen staan nog open (' + await stappen() + ')');
  // v17.40: één plek in het plan. In deze nieuwe vergadering opende je laatst de Notities: daar ga je verder (de Check-out van de vorige vergadering telt niet meer).
  ok((await tegel().getAttribute('data-id')) === 'notities' && /Verder/.test(await tegel().innerText()), 'de tegel op Start zegt Verder en wijst naar waar je in deze vergadering was, de Notities');
  await tegel().click(); await p.waitForTimeout(600); await p.locator('#vg-dlg [data-vv="verder"]').click(); await p.waitForTimeout(2600);
  ok(await p.evaluate(() => current) === 'notities', '"Verder waar ik was" brengt je naar de Notities, niet naar de Check-out van de vorige vergadering');
  await p.evaluate(() => openTool('agenda', false, null, '', false)); await p.waitForTimeout(1800);
  await typAgenda('Nieuw punt van vandaag'); await thuis();
  ok((await stappen()).startsWith('agenda✓,check-in,notities,'), 'iets invullen telt wel: de Agenda is gedaan (' + await stappen() + ')');
  // "Nieuwe vergadering" in het plan, terwijl je in de Check-out staat
  await p.evaluate(() => { pathCtx = 'vergadering'; openTool('check-out', false, null, '', false); }); await p.waitForTimeout(1600);
  await p.evaluate(() => document.querySelector('[data-plan-opnieuw]').click()); await p.waitForTimeout(500);
  await p.locator('#vg-dlg .vg-keuze[data-vg="gewoon"]').click(); await p.waitForTimeout(1800);
  ok(await p.evaluate(() => current) === 'agenda', '"Nieuwe vergadering" vanuit de Check-out: je gaat naar stap 1, de Agenda');
  ok(await stappen() === 'agenda,check-in,notities,check-out', 'en alle stappen staan weer open');
  // een vergadering die al liep voor deze regel bestond (geen basis bewaard): zoals vroeger, er verdwijnt geen vinkje
  await p.evaluate(() => { const m = store.get('plan-basis', {}); delete m.vergadering; store.set('plan-basis', m); const u = store.get('usage', {}); ['agenda', 'notities'].forEach(i => u[i] = { s:1, t:Date.now() }); store.set('usage', u); });
  ok((await stappen()).startsWith('agenda✓,check-in,notities✓'), 'een lopende vergadering van voor deze regel houdt haar vinkjes');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
