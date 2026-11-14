// Pluim: kiezen, namen, bewaren, lange namen, afbeelding, wissen en ongedaan maken.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9431);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'nl-BE', acceptDownloads: true }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  await p.goto(B + '/pluim/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const n = await p.evaluate(() => window.pluim.KAARTEN.length);
  ok(n === 12 && (await p.locator('.pl-tegel').count()) === 12, '12 kaartjes om te kiezen');
  ok((await p.getAttribute('.pl-tegel[data-i="0"]', 'aria-checked')) === 'true' && (await p.textContent('#teller')) === 'Kaartje 1 van 12', 'leeg: het eerste kaartje is gekozen');
  await p.click('.pl-tegel[data-i="4"]'); await p.waitForTimeout(200);
  ok((await p.textContent('#teller')) === 'Kaartje 5 van 12', 'tik op een kaartje kiest het');
  await p.click('#volgende'); await p.click('#volgende'); await p.waitForTimeout(150);
  ok((await p.textContent('#teller')) === 'Kaartje 7 van 12', 'volgende bladert verder');
  await p.click('#vorige'); for (let i = 0; i < 6; i++) await p.click('#vorige'); await p.waitForTimeout(150);
  ok((await p.textContent('#teller')) === 'Kaartje 12 van 12', 'vorige vanaf het eerste kaartje gaat naar het laatste');
  await p.focus('.pl-tegel[data-i="11"]'); await p.keyboard.press('Home'); await p.waitForTimeout(150);
  ok((await p.textContent('#teller')) === 'Kaartje 1 van 12' && await p.evaluate(() => document.activeElement.dataset.i === '0'), 'pijltoetsen en Home werken in de keuze');
  await p.fill('#voor', '  Sara\u0007 '); await p.fill('#van', 'Bartel'); await p.waitForTimeout(400);
  let st = await p.evaluate(() => JSON.parse(localStorage.getItem('pluim.v1')));
  ok(st && st.voor === 'Sara' && st.van === 'Bartel' && st.k === 0, 'namen worden schoon bewaard (' + JSON.stringify(st) + ')');
  ok((await p.getAttribute('#kaart', 'aria-label')).includes('Voor Sara.'), 'het kaartje heeft een beschrijving met de namen');
  ok((await p.getAttribute('#voor', 'maxlength')) === '24', 'een naam is hoogstens 24 tekens');
  // de afbeelding
  const maat = await p.evaluate(async () => { const bl = await window.pluim.blob(); const i = await createImageBitmap(bl); return [bl.type, i.width, i.height]; });
  ok(maat[0] === 'image/png' && maat[1] === 1080 && maat[2] === 1350, 'de afbeelding is een png van 1080 op 1350 (' + maat.join(' ') + ')');
  const lang = await p.evaluate(() => { const g = document.createElement('canvas').getContext('2d'); return window.pluim.naamPast(g, 'Wwwwwwwwwwwwwwwwwwwwwwww', 300); });
  ok(lang.endsWith('…') && lang.length < 24, 'een te lange naam wordt netjes ingekort, nooit over de rand');
  const kort = await p.evaluate(() => { const g = document.createElement('canvas').getContext('2d'); return window.pluim.naamPast(g, 'Maximiliaan-Alexander', 560); });
  ok(kort === 'Maximiliaan-Alexander', 'een lange naam met genoeg plaats blijft volledig');
  ok(await p.isVisible('#bewaar'), 'bewaren als afbeelding kan altijd');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#bewaar')]);
  ok(dl && dl.suggestedFilename() === 'pluim-voor-sara.png', 'bewaren geeft pluim-voor-sara.png (' + (dl && dl.suggestedFilename()) + ')');
  // zonder naam bij Voor wie gaat er niets weg
  await p.fill('#voor', ''); await p.waitForTimeout(300); await p.click('#bewaar'); await p.waitForTimeout(300);
  ok(await p.isVisible('#voor-fout') && await p.evaluate(() => document.activeElement.id === 'voor'), 'zonder naam: een melding en de cursor in Voor wie');
  await p.fill('#voor', 'Sara'); await p.waitForTimeout(300);
  ok(!(await p.isVisible('#voor-fout')), 'de melding verdwijnt zodra je een naam typt');
  ok(!(await p.isVisible('#kopieer')) || !(await p.isVisible('#deel')), 'hoogstens twee knoppen');
  // na herladen
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  ok((await p.inputValue('#voor')) === 'Sara' && (await p.inputValue('#van')) === 'Bartel', 'na herladen staan de namen er nog');
  // een kapotte opslag breekt niets
  await p.evaluate(() => localStorage.setItem('pluim.v1', JSON.stringify({ k:99, voor:{ x:1 }, van:'x'.repeat(80) }))); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  ok((await p.textContent('#teller')) === 'Kaartje 1 van 12' && (await p.inputValue('#van')).length === 24, 'vreemde opslag wordt veilig ingelezen');
  // wissen en ongedaan maken
  await p.fill('#voor', 'An'); await p.waitForTimeout(300);
  await p.click('#menu-btn'); await p.click('[data-act="wipe"]'); await p.click('.ocw-yes'); await p.waitForTimeout(300);
  ok((await p.inputValue('#voor')) === '' && await p.evaluate(() => localStorage.getItem('pluim.v1') === null), 'alles wissen maakt de namen leeg');
  await p.click('#toast-btn'); await p.waitForTimeout(300);
  ok((await p.inputValue('#voor')) === 'An', 'ongedaan maken zet de namen terug');
  ok(!E.length, 'geen fouten in de pagina ' + E.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
