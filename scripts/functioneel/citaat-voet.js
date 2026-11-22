// Onder een tool: de uitspraak met auteur en het icoontje van Citaten; een tik opent die zin in de bibliotheek van Citaten.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', SHOTS = process.env.SHOTS || '/tmp', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true, deviceScaleFactor:2 }), p = await c.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('citaten.gezien', '1'); } catch {} });   // iemand die Citaten al kent; de eerste keer staat in citaten-eerste-keer.js
  p.on('pageerror', e => { console.log('FOUT paginafout: ' + e.message); fout++; });
  for (const [tool, zin, wie] of [['rondje', 'twee oren en één mond', 'Zeno'], ['kanban', 'Wie overal is, is nergens', 'Seneca']]) {
    await p.goto(BASE + '/' + tool + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    const a = p.locator('footer a.oc-citaat');
    ok(await a.count() === 1 && (await a.locator('.quote').textContent()).includes(zin) && (await a.locator('.oc-citaat-wie').textContent()) === wie, tool + ': de uitspraak en alleen de naam van de auteur staan onderaan');
    ok(await a.locator('svg').count() === 1 && /Open in Citaten/.test(await a.getAttribute('aria-label')), tool + ': met het icoontje van Citaten en een duidelijke naam voor wie voorleest');
    await a.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const bx = await a.boundingBox(); ok(bx.height >= 44 && bx.x >= 0 && bx.x + bx.width <= 390, tool + ': raakvlak minstens 44 px en binnen het scherm');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tool + ': niets loopt buiten de breedte');
    await p.screenshot({ path:SHOTS + '/citaat-' + tool + '.png' });
    await a.click(); await p.waitForTimeout(1800);
    ok(/\/zakmes\/citaten\//.test(p.url()), tool + ': een tik opent Citaten');
    ok(await p.evaluate(() => document.getElementById('bib').open), tool + ': de bibliotheek staat open');
    const t = await p.evaluate(() => document.getElementById('bib').innerText);
    ok(t.includes(zin), tool + ': en toont die uitspraak (' + (await p.inputValue('#bib-zoek')) + ')');
    if (tool === 'rondje') await p.screenshot({ path:SHOTS + '/citaat-in-citaten.png' });
  }
  // in de app: de tool ligt in een kader; de tik moet Citaten openen
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
  await p.goto(BASE + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
  await p.evaluate(() => openTool('rondje')); await p.waitForTimeout(2500);
  const fr = p.frames().find(f => /\/rondje\//.test(f.url()));
  await fr.locator('footer a.oc-citaat').scrollIntoViewIfNeeded(); await fr.locator('footer a.oc-citaat').click(); await p.waitForTimeout(3000);
  const waar = await p.evaluate(() => ({ current, frames:[...frames.keys()].join(',') }));
  const cf = p.frames().find(f => /\/zakmes\/citaten\//.test(f.url()));
  ok(!!cf, 'in de app: de tik opent Citaten (open: ' + waar.current + '; kaders: ' + waar.frames + ')');
  if (cf) ok(await cf.evaluate(() => document.getElementById('bib').open && document.getElementById('bib').innerText.includes('twee oren')), 'in de app: de bibliotheek toont de uitspraak');
  await p.screenshot({ path:SHOTS + '/citaat-in-app.png' });
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
