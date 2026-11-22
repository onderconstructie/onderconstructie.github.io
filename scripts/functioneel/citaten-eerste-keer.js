// De uitspraak onder een tool opent Citaten.
// Eerste keer: niet meteen de bibliotheek (daar loop je verloren), maar de start met bovenaan de uitspraak, wat Citaten is en twee keuzes.
// Daarna: recht naar de bibliotheek met die uitspraak. De bibliotheek zelf: gecentreerd op een breed scherm, één keuzelijst voor de thema's op de gsm.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true }), p = await c.newPage();
  p.on('pageerror', e => ok(false, 'paginafout ' + e.message));
  const tik = async tool => { await p.goto(BASE + '/' + tool + '/', { waitUntil:'domcontentloaded' }); await p.waitForTimeout(400); await p.locator('footer a.oc-citaat').click(); await p.waitForTimeout(1300); };
  await tik('kanban');
  ok(!(await p.evaluate(() => document.getElementById('bib').open)), 'eerste keer: de bibliotheek springt niet open');
  ok(await p.locator('#van-tool').isVisible(), 'eerste keer: de kaart met uitleg staat er');
  ok((await p.locator('#van-q').textContent()) === 'Wie overal is, is nergens.' && (await p.locator('#van-wie').textContent()) === 'Seneca', 'de kaart toont de uitspraak en de auteur');
  ok(await p.evaluate(() => { const r = document.getElementById('van-tool').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight / 2 && document.documentElement.scrollWidth <= innerWidth + 1; }), 'de kaart staat bovenaan in beeld, niets loopt buiten het scherm');
  ok(await p.locator('#ocStart').isVisible(), 'de gewone start met uitleg staat eronder');
  await p.locator('#van-bib').click(); await p.waitForTimeout(900);
  ok(await p.evaluate(() => document.getElementById('bib').open && document.getElementById('bib').innerText.includes('Wie overal is, is nergens.')), '"Bekijk de bibliotheek" opent ze met de uitspraak');
  ok(await p.evaluate(() => document.activeElement.id === 'bib-h'), 'de focus staat op de titel, niet op het kruisje');
  ok(await p.locator('#bib-thema').isVisible() && !(await p.locator('#bib-pillen').isVisible()), 'gsm: één keuzelijst voor de thema\'s, geen rij pillen');
  await p.locator('#bib-zoek').fill(''); await p.waitForTimeout(300);
  const n0 = await p.locator('#bib-lijst li').count(); await p.locator('#bib-thema').selectOption({ index:1 }); await p.waitForTimeout(300);
  ok(n0 > 0 && await p.locator('#bib-lijst li').count() > 0 && (await p.locator('#bib-thema').inputValue()) !== 'tijd', 'de keuzelijst wisselt van thema');
  ok(await p.evaluate(() => [...document.querySelectorAll('#bib-lijst li button')].slice(0, 5).every(k => { const r = k.getBoundingClientRect(), a = getComputedStyle(k, '::after'); return r.height + 2 * Math.abs(parseFloat(a.top) || 0) >= 44; })), 'gsm: "Voeg toe" is klein getekend maar blijft 44 px hoog om te tikken');
  await p.locator('#bib-x').click();
  await tik('kanban');
  ok(await p.evaluate(() => document.getElementById('bib').open && document.getElementById('bib').innerText.includes('Wie overal is, is nergens.')), 'tweede keer: recht naar de bibliotheek, met de uitspraak');
  ok(!(await p.locator('#van-tool').isVisible()), 'tweede keer: geen kaart met uitleg meer');
  await p.evaluate(() => localStorage.removeItem('citaten.gezien')); await p.evaluate(() => document.getElementById('bib').close());
  await tik('risico'); await p.locator('#van-bewaar').click(); await p.waitForTimeout(600);
  ok(await p.locator('#citaten > li').count() === 1 && !(await p.locator('#van-tool').isVisible()), '"Bewaar deze uitspraak" zet ze in je lijst en haalt de kaart weg');
  await p.evaluate(() => localStorage.removeItem('citaten.gezien'));
  await tik('kanban');
  ok(await p.evaluate(() => document.getElementById('bib').open), 'wie al citaten heeft, kent de tool: recht naar de bibliotheek');
  await c.close();
  const d = await b.newContext({ viewport:{ width:1366, height:900 }, serviceWorkers:'block' }), q = await d.newPage();
  await q.goto(BASE + '/zakmes/citaten/'); await q.waitForTimeout(900); await q.evaluate(() => document.getElementById('bib-start').click()); await q.waitForTimeout(900);
  ok(await q.evaluate(() => { const r = document.getElementById('bib').getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 2 && r.top > 10; }), 'laptop: de bibliotheek staat in het midden');
  ok(await q.locator('#bib-pillen').isVisible() && !(await q.locator('#bib-thema').isVisible()), 'laptop: de thema\'s blijven pillen');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
