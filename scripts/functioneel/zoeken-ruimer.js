// Zoeken (v17.21): gewone woorden vinden de tool, één tikfout mag, onzin vindt niets. En op laptop opent een toolnaam in een dichte groepskaart de tool.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const p = await (await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block' })).newPage(); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
  const zoek = q => p.evaluate(q => { const a = searchTools(q); return (a.length ? a : searchBijna(q)).map(t => t.id); }, q);
  for (const [q, id] of [['gevaar', 'risico'], ['belanghebbenden', 'stakeholders'], ['gantt', 'tijdlijn'], ['scrum', 'sprint'], ['risco', 'risico'], ['stakholder', 'stakeholders'], ['agnda', 'agenda'], ['retroo', 'retro'], ['kanbam', 'kanban']]) { const r = await zoek(q); ok(r.includes(id), '"' + q + '" vindt ' + id + ' (' + r.slice(0, 4).join(', ') + ')'); }
  for (const q of ['xqzvw', 'qqstress', 'blorp']) { const r = await zoek(q); ok(r.length === 0, 'onzin "' + q + '" vindt niets (' + r.length + ')'); }
  const r5 = await zoek('risco'); ok(r5.length <= 6, 'een tikfout geeft een korte lijst, geen stortvloed (' + r5.length + ')');
  await p.fill('#search', 'risco'); await p.waitForTimeout(600); ok(/^Risicomatrix/.test((await p.locator('#results [data-id]').first().innerText()).replace(/\u00ad/g, '')), 'in het scherm: "risco" toont de Risicomatrix bovenaan'); await p.fill('#search', ''); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // toolnaam in een dichte groepskaart
  await p.click('.tab[data-tab="projecten"]'); await p.waitForTimeout(600);
  const naam = p.locator('.group.collapsed .gh-t[data-gh-open]').first(); const id = await naam.getAttribute('data-gh-open'); await naam.click(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => current) === id && await p.isHidden('#pathbar'), 'laptop: een klik op een toolnaam in een dichte groep opent die tool (' + id + '), los, zonder plan');
  await p.context().close();
  const q = await (await b.newContext({ viewport:{ width:820, height:1180 }, hasTouch:true, serviceWorkers:'block' })).newPage(); await q.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await q.goto(B + '/', { waitUntil:'networkidle' }); await q.tap('.tab[data-tab="projecten"]'); await q.waitForTimeout(600);
  const n0 = await q.locator('.group.collapsed').count(); if (n0) { await q.locator('.group.collapsed .gh-t[data-gh-open]').first().tap(); await q.waitForTimeout(700); ok(!(await q.evaluate(() => document.getElementById('viewer').classList.contains('open'))), 'met de vinger klapt de groep open, zoals voorheen'); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
