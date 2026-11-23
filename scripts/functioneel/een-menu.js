// Eén menu met drie puntjes op gsm in een plan: de app-acties staan in het menu van de tool; de knop van de app is weg. Op laptop in een plan: één balk, de kop van de tool gaat erin op. Buiten een plan verandert er niets.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const start = async vp => { const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(400); return p; };
  const fr = (p, pad) => p.frames().find(f => f !== p.mainFrame() && new URL(f.url()).pathname === pad);
  // gsm, in het plan
  let p = await start({ width:390, height:844 });
  await p.click('.stile[data-start="project"]'); await p.waitForTimeout(600); if (await p.isVisible('#pn-skip')) await p.click('#pn-skip'); await p.waitForTimeout(3200);
  let f = fr(p, '/opdracht/');
  ok(await p.isHidden('#tb-meer') && await f.isVisible('button[aria-label="Meer acties"]'), 'gsm in een plan: één knop met drie puntjes, die van de tool');
  await f.click('button[aria-label="Meer acties"]'); await p.waitForTimeout(300);
  ok(await f.locator('button[data-oc-app]:visible').count() === 3 && /Zet op je startscherm/.test(await f.innerText('#menu')), 'het menu van de tool bevat de drie app-acties'); await p.screenshot({ path:S + '/een-menu-gsm.png' });
  await f.click('button[data-oc-app="fav"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => (store.get('favs', []) || []).includes('opdracht')) && await f.isHidden('#menu button[data-oc-app="fav"]'), 'Zet op je startscherm werkt en sluit het menu');
  await f.click('button[aria-label="Meer acties"]'); await p.waitForTimeout(300); ok(/Haal van je startscherm/.test(await f.innerText('#menu')), 'daarna staat er: Haal van je startscherm');
  await f.click('button[data-oc-app="fb"]'); await p.waitForTimeout(500); ok(await p.isVisible('#fb-sheet, #fb-dlg, .fb-sheet, [id^="fb"]:not(button):visible'), 'Suggestie of fout opent het venster van de app');
  await p.context().close();
  // gsm, losse tool: geen app-acties in het toolmenu
  p = await start({ width:390, height:844 }); await p.goto(B + '/#opdracht', { waitUntil:'networkidle' }); await p.waitForTimeout(2500); f = fr(p, '/opdracht/');
  await f.click('button[aria-label="Meer acties"]'); await p.waitForTimeout(300); ok(await f.locator('button[data-oc-app]:visible').count() === 0, 'losse tool op gsm: het toolmenu blijft zoals het was'); await p.context().close();
  // laptop, in het plan: knoppen in de balk, toolmenu ongewijzigd
  p = await start({ width:1440, height:900 }); await p.click('.stile[data-start="project"]'); await p.waitForTimeout(600); if (await p.isVisible('#pn-skip')) await p.click('#pn-skip'); await p.waitForTimeout(3200); f = fr(p, '/opdracht/');
  // laptop, in het plan: één balk. De kop van de tool is weg, de balk bedient Delen en het menu, de app-acties staan in dat menu
  ok(await p.isVisible('#tb-toolmenu') && await p.isVisible('#tb-deel') && await p.isHidden('#fav-tool') && await p.isHidden('#ext'), 'laptop in een plan: de balk heeft Delen en Meer acties, de losse app-knoppen zijn weg');
  ok(await f.isHidden('header h1.title') && await f.isHidden('header .logo') && await f.isVisible('#ocKiezer') && /Projectopdracht/.test(await p.innerText('#pathbar .pb-tool')), 'de kop van de tool is opgegaan in de balk: de balk toont de naam, de tool houdt alleen de projectkiezer');
  ok(await f.evaluate(() => document.querySelector('header').getBoundingClientRect().height) < 80, 'de tool begint hoger: de kop is geen 236 px meer');
  await p.click('#tb-toolmenu'); await p.waitForTimeout(300);
  ok(await f.isVisible('#menu') && await f.locator('button[data-oc-app]:visible').count() === 3, 'Meer acties in de balk opent het menu van de tool, met de drie app-acties'); await p.screenshot({ path:S + '/een-balk-laptop.png' });
  await p.context().close();
  // iPad staand (820 px): daar blijft de kop van de tool staan, met haar eigen knoppen
  p = await start({ width:820, height:1180 }); await p.click('.stile[data-start="project"]'); await p.waitForTimeout(600); if (await p.isVisible('#pn-skip')) await p.click('#pn-skip'); await p.waitForTimeout(3200); f = fr(p, '/opdracht/');
  ok(await p.isHidden('#tb-toolmenu') && await f.isVisible('header h1.title') && await p.isVisible('#fav-tool'), 'iPad staand: de kop van de tool en de knoppen van de app blijven zoals ze waren'); await p.context().close();
  // een tool zonder eigen menu houdt de knop van de app
  p = await start({ width:390, height:844 }); await p.evaluate(() => { pathCtx = 'vergadering'; store.set('path-ctx', 'vergadering'); markStarted('vergadering'); viaPad = true; openTool('check-in'); }); await p.waitForTimeout(3000);
  ok(await p.isVisible('#pathbar') ? await p.isVisible('#tb-meer') : true, 'een tool zonder eigen menu houdt de knop van de app');
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
