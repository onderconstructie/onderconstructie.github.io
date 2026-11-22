// Wat de privacypagina belooft, moet kloppen: elke tool linkt naar Privacy en disclaimer, Alles wissen ruimt ook de tekeningen van Schets op
// (na de bedenktijd of bij sluiten, niet bij Ongedaan maken), en een video in de Cockpit is een link: er laadt niets van buiten.
const { chromium } = require('playwright'); const fs = require('fs'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const t = JSON.parse(fs.readFileSync(__dirname + '/../../tools.json', 'utf8')); const paden = (Array.isArray(t) ? t : t.tools).map(x => x.path);
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' }); const p = await c.newPage();
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
  // 1. elke tool: de link staat er, is zichtbaar en steekt niet uit (Schets: in het infovenster, samen met het citaat)
  const mis = [];
  for (const pad of paden) { await p.goto(B + pad, { waitUntil:'domcontentloaded' });
    const r = await p.evaluate(() => { const a = document.querySelector('.oc-voorw a'); if (!a) return 'geen link'; const q = a.getBoundingClientRect(); return a.getAttribute('href') !== '/privacy/' ? 'verkeerd adres' : a.closest('#info') ? '' : !a.getClientRects().length ? 'onzichtbaar' : (q.left < 0 || q.right > innerWidth + 1) ? 'steekt uit' : q.height < 24 ? 'te klein' : ''; });
    if (r) mis.push(pad + ' ' + r); }
  ok(!mis.length, paden.length + ' tools linken naar Privacy en disclaimer' + (mis.length ? ': ' + mis.join(', ') : ''));
  await p.goto(B + '/opdracht/', { waitUntil:'networkidle' }); await p.locator('.oc-voorw').scrollIntoViewIfNeeded(); await p.screenshot({ path:S + '/voorw-gsm.png' });
  // 2. Cockpit: video is een link, geen speler, geen aanvraag naar buiten
  const ext = []; p.on('request', r => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:)/.test(r.url())) ext.push(r.url()); });
  await p.goto(B + '/cockpit/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
  await p.evaluate(() => window.cockpit.voegToe({ soort:'video', url:'https://www.youtube.com/watch?v=abcdefghijk', titel:'Proef' })); await p.waitForTimeout(500);
  ok(await p.locator('.video-link').count() === 1 && await p.locator('[data-speel], .blok iframe, .blok video').count() === 0, 'Cockpit: een video is een link, zonder speler');
  ok(/youtube\.com\/watch/.test(await p.getAttribute('.video-link', 'href')) && (await p.getAttribute('.video-link', 'target')) === '_blank', 'de link opent de video op haar eigen site, in een nieuw venster');
  ok(!ext.length && !/youtube-nocookie|player\.vimeo/.test(await p.content()), 'er laadt niets van buiten en er staat geen spelersadres meer in de pagina');
  await p.locator('.video-link').scrollIntoViewIfNeeded(); await p.screenshot({ path:S + '/cockpit-video.png' });
  // 3. Alles wissen: Schets-tekeningen weg na de bedenktijd; bij Ongedaan maken blijven ze
  const maakDb = () => p.evaluate(() => new Promise(r => { const q = indexedDB.open('oc-schets', 1); q.onupgradeneeded = () => q.result.createObjectStore('x'); q.onsuccess = () => { q.result.close(); r(); }; }));
  const heeftDb = () => p.evaluate(async () => (await indexedDB.databases()).some(d => d.name === 'oc-schets'));
  const wis = async () => { await p.goto(B + '/', { waitUntil:'networkidle' }); await p.evaluate(() => localStorage.setItem('raci.v1', '{"proef":1}')); await maakDb(); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(500);
    await p.click('#data-open'); await p.click('#shared-exit'); await p.waitForTimeout(300);
    await p.evaluate(() => { const k = document.querySelector('#exit-sheet input[type=checkbox]:checked'); if (k) k.click(); });
    await p.evaluate(() => [...document.querySelectorAll('#exit-sheet button')].find(x => /Alles wissen/.test(x.textContent)).click()); await p.waitForTimeout(300);
    if (await p.isVisible('#exit-go')) await p.click('#exit-go'); await p.waitForSelector('#gw-undo', { timeout:8000 }); };
  await wis(); ok(await heeftDb(), 'tijdens de bedenktijd staan de tekeningen er nog');
  await p.click('#gw-undo'); await p.waitForLoadState('networkidle'); ok(await heeftDb() && await p.evaluate(() => localStorage.getItem('raci.v1')) === '{"proef":1}', 'Ongedaan maken: je werk en de tekeningen van Schets staan er nog');
  await wis(); await p.goto(B + '/privacy/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
  ok(!(await heeftDb()), 'wissen en het venster verlaten: de tekeningen van Schets zijn weg');
  ok(/Je gegevens/.test(await p.textContent('main')) && /Iets van dit toestel wissen/.test(await p.textContent('main')) && !/kies Wissen en dan/.test(await p.textContent('main')), 'de privacypagina beschrijft de juiste weg naar wissen');
  await wis(); await p.waitForFunction(() => !document.getElementById('gw-undo'), null, { timeout:40000 }); await p.waitForTimeout(600);
  ok(!(await heeftDb()), 'na 30 seconden zonder Ongedaan maken: de tekeningen van Schets zijn weg');
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
