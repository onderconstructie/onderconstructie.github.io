// Schetsboek: de galerij met sjablonen en het voorbeeld tekenen zonder fouten, en er staat nergens nog een ster.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };
  const p = await (await b.newContext({ viewport:{ width:1100, height:900 }, serviceWorkers:'block' })).newPage();
  p.on('pageerror', e => { console.log('FOUT paginafout: ' + e.message); fout++; });
  const res = await p.goto(BASE + '/zakmes/schets/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
  const bron = await res.text();
  ok(!/H\.ster\(/.test(bron), 'geen ster meer in sjablonen of voorbeeld');
  ok(/beker\(/.test(bron) && /vlag\(/.test(bron) && /doos\(/.test(bron), 'beker, vlag en pakje bestaan');
  await p.evaluate(() => { const s = document.querySelector('.start'); if (s) s.hidden = true; document.getElementById('nieuw-btn').click(); }); await p.waitForTimeout(1200);
  const namen = await p.evaluate(() => [...document.querySelectorAll('.gal-sheet b, .gal-sheet strong, .gal-sheet h3')].map(e => e.textContent.trim()));
  ok(['Tijdlijn', 'Productboom', 'Projectkaart'].every(n => namen.includes(n)), 'de galerij toont Tijdlijn, Productboom en Projectkaart (' + namen.length + ' kaartjes)');
  const leeg = await p.evaluate(() => [...document.querySelectorAll('.gal-sheet canvas')].filter(c => { try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true; } catch { return false; } }).length);
  ok(leeg === 0, 'elk sjabloon met een tekening is ook echt getekend (lege: ' + leeg + ')');
  await p.goto(BASE + '/zakmes/schets/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('[data-act="voorbeeld"]').click()); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => document.querySelectorAll('li .tb').length) === 3, 'het voorbeeld opent met drie bladen');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
