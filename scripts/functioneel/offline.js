// Offline: open de app één keer met service worker, wacht tot alles bewaard is, ga offline en open elke tool.
const { chromium } = require('playwright'); const fs = require('fs');
const B = (process.env.BASE || 'http://127.0.0.1:8000');
const tools = JSON.parse(fs.readFileSync(process.env.TOOLS || require('path').join(__dirname, '../../tools.json'), 'utf8'));
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1100, height: 900 } }); const p = await c.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', 'true'); localStorage.setItem('oc.welkom', '1'); } catch (e) {} });
  await p.goto(B + '/', { waitUntil: 'networkidle' });
  let n = 0, tot = tools.length; const t0 = Date.now();
  for (let i = 0; i < 90; i++) { n = await p.evaluate(async (paths) => { const ks = await caches.keys(); let n = 0; for (const k of ks) { const c = await caches.open(k); for (const u of paths) if (await c.match(u)) n++; } return n; }, tools.map(t => t.path)); if (n >= tot) break; await p.waitForTimeout(1500); }
  const sec = Math.round((Date.now() - t0) / 1000);
  const groot = await p.evaluate(async () => { let b = 0, n = 0; for (const k of await caches.keys()) { const c = await caches.open(k); for (const r of await c.keys()) { const x = await c.match(r); const bl = await x.blob(); b += bl.size; n++; } } return { mb: Math.round(b / 104857.6) / 10, n, sw: !!navigator.serviceWorker.controller }; });
  console.log(`bewaard: ${n}/${tot} tools na ${sec}s; cache ${groot.mb} MB in ${groot.n} bestanden; sw actief: ${groot.sw}`);
  await c.setOffline(true); const R = {};
  // de app zelf offline
  await p.reload({ waitUntil: 'load' }).catch(e => console.log('app offline FOUT', String(e).slice(0, 80))); await p.waitForTimeout(600);
  console.log('app offline: tegels', await p.evaluate(() => document.querySelectorAll('.stile').length));
  for (const t of tools) { const q = await c.newPage(), N = [], E = []; q.on('requestfailed', r => N.push(r.url().replace(B, '').slice(0, 70))); q.on('pageerror', e => E.push(String(e).slice(0, 90)));
    let ok = false; try { await q.goto(B + t.path, { waitUntil: 'load', timeout: 12000 }); await q.waitForTimeout(500); ok = await q.evaluate(() => !!document.querySelector('h1') && document.body.innerText.length > 40);
      // export offline: pdf of afbeelding
      const ex = await q.$('[data-exp="pdf"],[data-exp="png"]'); if (ex) { await q.click('#vb-load,.oc-vb', { timeout: 600 }).catch(() => {}); await ex.click({ force: true, timeout: 800 }).catch(() => {}); await q.waitForTimeout(900); }
    } catch (e) { E.push('LAAD ' + String(e).slice(0, 80)); }
    if (!ok || N.length || E.length) R[t.id] = { ok, N: [...new Set(N)].slice(0, 5), E: E.slice(0, 3) }; await q.close(); }
  console.log('offline problemen:', Object.keys(R).length); Object.entries(R).forEach(([k, r]) => console.log(' ', k, JSON.stringify(r)));
  fs.writeFileSync('offline.json', JSON.stringify(R)); await b.close();
})();
