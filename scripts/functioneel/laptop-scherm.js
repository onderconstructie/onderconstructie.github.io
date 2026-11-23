// Laptop: het scherm wordt gebruikt.
// 1. Een lege Start toont rechts de route van het doel waar je op staat (een draad met knooppunten). Niet op gsm of tablet, en niet als er al werk loopt.
// 2. Tools met Invullen en Overzicht tonen die twee naast elkaar vanaf 1100 px; smaller blijven het tabs.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  const nieuw = async (w, h, raak) => { const c = await b.newContext({ viewport:{ width:w, height:h }, serviceWorkers:'block', hasTouch:!!raak }), p = await c.newPage(); p.on('pageerror', e => ok(false, 'paginafout ' + e.message)); await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); } catch {} }); return p; };
  let p = await nieuw(1440, 900);
  await p.goto(BASE + '/'); await p.waitForTimeout(1400);
  ok(await p.locator('#rk').isVisible() && await p.locator('#rk h3').innerText() === 'Start een project' && await p.locator('#rk .rk-draad li').count() === 7, 'lege Start op laptop: rechts de route van het eerste doel, zeven stappen');
  ok(await p.evaluate(() => { const a = document.getElementById('start').getBoundingClientRect(), r = document.getElementById('rk').getBoundingClientRect(); return r.left > a.right && Math.abs(r.top - a.top) < 40 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth + 1; }), 'de route staat naast de doelen, niets loopt buiten het scherm');
  ok(await p.locator('#rk .rk-draad li.nu').count() === 1 && await p.locator('#rk .rk-draad li.af').count() === 0, 'de eerste stap is aangeduid als de stap die nu komt');
  await p.locator('.stile').nth(4).hover(); await p.waitForTimeout(250);
  ok(await p.locator('#rk h3').innerText() === 'Leid een vergadering' && await p.locator('#rk .rk-draad li').count() === 4 && await p.locator('.stile.kijkt').count() === 1, 'met de muis op een ander doel wisselt de route mee');
  await p.locator('.stile').nth(5).focus(); await p.waitForTimeout(250);
  ok(await p.locator('#rk h3').innerText() === 'Kom even tot rust' && await p.locator('#rk .rk-los li').count() >= 5 && await p.locator('#rk .rk-draad').count() === 0, 'met Tab ook; een doel zonder plan toont zijn tools zonder draad');
  await p.locator('.stile').nth(1).hover(); await p.waitForTimeout(200); if (await p.locator('#rk button:visible').count()) throw new Error('met de muis hoort er geen knop zichtbaar te zijn in de uitleg'); await p.locator('.stile').nth(1).click(); await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const d = document.getElementById('pn-dlg'); return (d && !d.hidden) || document.documentElement.classList.contains('in-tool') || !!current; }), 'de knop in de route doet wat de tegel doet: het plan begint');
  // met lopend werk: de bestaande indeling, geen route ernaast
  await p.evaluate(() => { store.set('favs', ['risico', 'rondje']); }); await p.goto(BASE + '/'); await p.waitForTimeout(1300);
  ok(!(await p.locator('#rk').isVisible()) && await p.locator('#favs').isVisible(), 'met favorieten of lopend werk: geen route ernaast, de vertrouwde indeling blijft');
  await p.context().close();
  for (const [w, h, naam] of [[390, 844, 'gsm'], [820, 1180, 'tablet']]) { p = await nieuw(w, h, true); await p.goto(BASE + '/'); await p.waitForTimeout(1200); ok(!(await p.locator('#rk').isVisible()) && await p.locator('.stile').count() === 6, naam + ': geen route ernaast, de doelen staan er zoals altijd'); await p.context().close(); }
  // tools naast elkaar
  for (const tool of ['rondje', 'eerst-alleen', 'samen-beslissen', 'check-out']) {
    p = await nieuw(1440, 900); await p.goto(BASE + '/' + tool + '/'); await p.waitForTimeout(1000);
    const m = await p.evaluate(() => { const v = document.getElementById('p-vul'), o = document.getElementById('p-ov'), w = document.getElementById('wissel'); const a = v.getBoundingClientRect(), r = o.getBoundingClientRect(); return { beide:a.width > 0 && r.width > 0, naast:r.left >= a.right - 1 && Math.abs(r.top - a.top) < 4, tabs:getComputedStyle(w).display, ov:o.innerText.trim().length > 5, breed:document.documentElement.scrollWidth <= innerWidth + 1 }; });
    ok(m.beide && m.naast && m.tabs === 'none' && m.ov && m.breed, tool + ' op laptop: invullen en overzicht naast elkaar, zonder tabs, met inhoud rechts');
    await p.context().close();
    p = await nieuw(390, 844, true); await p.goto(BASE + '/' + tool + '/'); await p.waitForTimeout(900);
    ok(await p.evaluate(() => getComputedStyle(document.getElementById('wissel')).display !== 'none' && document.getElementById('p-ov').getBoundingClientRect().width === 0), tool + ' op gsm: tabs zoals voorheen');
    await p.context().close();
  }
  // het overzicht groeit mee
  p = await nieuw(1440, 900); await p.goto(BASE + '/eerst-alleen/'); await p.waitForTimeout(900);
  await p.evaluate(() => localStorage.setItem('eerst-alleen.v1', JSON.stringify({ sessies:[{ id:'s1', vraag:'Wat houdt ons tegen?', fase:'verzamel', minuten:2, ideeen:[] }] }))); await p.reload(); await p.waitForTimeout(800);
  await p.locator('#ea-idee').fill('Geen tijd'); await p.locator('#ea-idee').press('Enter'); await p.waitForTimeout(250);
  ok((await p.locator('#ov').innerText()).includes('Geen tijd'), 'wat je links toevoegt, staat meteen rechts in het overzicht');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
