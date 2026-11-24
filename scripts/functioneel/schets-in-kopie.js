// De tekeningen van Schets zitten in de reservekopie (v17.29) en komen terug bij terugzetten, ook op een leeg toestel.
// Ze staan in IndexedDB, niet in localStorage: de kopie draagt ze onder 'schets.bladen', terugzetten schrijft ze weer naar IndexedDB.
const { chromium } = require('playwright'); const fs = require('fs'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const bladen = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('oc-schets', 1); r.onupgradeneeded = () => r.result.createObjectStore('bladen', { keyPath:'id' }); r.onerror = () => res(null); r.onsuccess = () => { const q = r.result.transaction('bladen').objectStore('bladen').getAll(); q.onsuccess = () => { r.result.close(); res(q.result.map(x => ({ id:x.id, n:(x.items || []).length }))); }; q.onerror = () => res(null); }; }));
  const c = await b.newContext({ viewport:{ width:1280, height:800 }, serviceWorkers:'block', acceptDownloads:true }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message));
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
  // 1. echt tekenen in Schets
  await p.goto(B + '/zakmes/schets/', { waitUntil:'networkidle' }); await p.waitForTimeout(900);
  const begin = p.locator('.oc-start .oc-begin'); if (await begin.count() && await begin.isVisible()) { await begin.click(); await p.waitForTimeout(500); }
  for (const y of [330, 420, 510]) { await p.mouse.move(420, y); await p.mouse.down(); await p.mouse.move(620, y + 30, { steps:8 }); await p.mouse.move(820, y - 10, { steps:8 }); await p.mouse.up(); await p.waitForTimeout(150); }
  await p.waitForTimeout(1200);
  const voor = await bladen(p); const lijnen = (voor || []).reduce((a, x) => a + x.n, 0);
  ok(voor && voor.length >= 1 && lijnen >= 3, 'er staat een tekening in Schets (' + lijnen + ' lijnen op ' + (voor || []).length + ' blad)');
  ok(await p.evaluate(() => localStorage.getItem('schets.v1') !== null && localStorage.getItem('schets.bladen') === null), 'in localStorage staat alleen het anker, niet de tekening');
  // 2. reservekopie
  await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(600); await p.click('#data-open'); await p.waitForTimeout(500);
  ok(/Ook je tekeningen uit Schets zitten erin/.test(await p.locator('.sheet-intro').first().innerText()), 'het venster zegt dat de tekeningen in de kopie zitten');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout:15000 }), p.click('#data-backup')]); const pad = S + '/schets-kopie.json'; await dl.saveAs(pad);
  const kopie = JSON.parse(fs.readFileSync(pad, 'utf8')); let inKopie = []; try { inKopie = JSON.parse(kopie.data['schets.bladen']); } catch (e) {}
  ok(Array.isArray(inKopie) && inKopie.reduce((a, x) => a + (x.items || []).length, 0) === lijnen, 'de kopie bevat de tekening: ' + inKopie.reduce((a, x) => a + (x.items || []).length, 0) + ' lijnen');
  ok(kopie.data['schets.v1'] != null, 'de kopie bevat ook het anker van Schets');
  // 3. een leeg toestel: alles weg
  await p.evaluate(() => new Promise(res => { localStorage.clear(); localStorage.setItem('oc-app.welkom-weg', '1'); const r = indexedDB.deleteDatabase('oc-schets'); r.onsuccess = r.onerror = r.onblocked = () => res(); })); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);
  ok(((await bladen(p)) || []).length === 0, 'na wissen is Schets leeg');
  // 4. terugzetten
  await p.click('#data-open'); await p.waitForTimeout(400); await p.setInputFiles('#data-restore-file', pad); await p.waitForTimeout(700); await p.click('#restore-yes'); await p.waitForTimeout(1500);
  const na = await bladen(p);
  ok(na && na.reduce((a, x) => a + x.n, 0) === lijnen, 'na terugzetten staan de lijnen weer in IndexedDB (' + (na || []).reduce((a, x) => a + x.n, 0) + ')');
  ok(await p.evaluate(() => localStorage.getItem('schets.v1') !== null && localStorage.getItem('schets.bladen') === null), 'het anker is terug, en de tekening staat niet in localStorage');
  // 5. Schets toont ze
  await p.goto(B + '/zakmes/schets/', { waitUntil:'networkidle' }); await p.waitForTimeout(1500);
  const b2 = p.locator('.oc-start .oc-begin'); ok(!(await b2.count() && await b2.isVisible()), 'Schets opent in je werk, niet op het lege beginscherm');
  const na2 = await bladen(p); ok(na2 && na2.reduce((a, x) => a + x.n, 0) === lijnen, 'Schets heeft de tekening geladen en niets weggegooid'); await p.screenshot({ path:S + '/schets-in-kopie.png' });
  // 6. Ongedaan maken van terugzetten op een toestel met ander werk: het oude werk komt terug
  await p.evaluate(() => new Promise(res => { const r = indexedDB.open('oc-schets', 1); r.onsuccess = () => { const t = r.result.transaction('bladen', 'readwrite'); t.objectStore('bladen').clear(); t.objectStore('bladen').put({ id:'eigen', naam:'Mijn eigen blad', bg:'blanco', tpl:'leeg', items:[], t:1 }); t.oncomplete = () => { r.result.close(); res(); }; }; }));
  await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500); await p.click('#data-open'); await p.waitForTimeout(400); await p.setInputFiles('#data-restore-file', pad); await p.waitForTimeout(700); await p.click('#restore-yes'); await p.waitForTimeout(1200);
  ok(((await bladen(p)) || []).some(x => x.n > 0) && !((await bladen(p)) || []).some(x => x.id === 'eigen'), 'terugzetten vervangt de tekeningen op dit toestel');
  const on = p.locator('.app-toast button, #app-toast button').first(); if (await on.count()) { await on.click(); await p.waitForTimeout(1200); ok(((await bladen(p)) || []).some(x => x.id === 'eigen'), 'Ongedaan maken zet de tekeningen van voordien terug'); } else ok(false, 'de knop Ongedaan maken staat er');
  ok(!js.length, 'geen scriptfouten ' + js.join(' | ')); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
