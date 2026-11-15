// Vergaderkost: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e)));
  await p.clock.install({ time:new Date('2026-11-16T09:00:00+01:00') });
  await p.goto(B + '/vergaderkost/', { waitUntil:'networkidle' });
  const zet = (id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); }, [id, v]);
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, sel);
  // 6 mensen, 1 u gepland, 15 min voorbereiding, € 62,5 per uur
  await p.evaluate(() => { for (let i = 0; i < 2; i++) document.getElementById('plus').click(); }); await p.click('.chip[data-min="60"]');
  await p.evaluate(() => { document.getElementById('more').open = true; }); await zet('prep', '15');
  await p.evaluate(() => { const e = document.getElementById('euro-on'); e.checked = true; e.dispatchEvent(new Event('change')); }); await zet('rate', '62,5');
  await p.click('#start'); await p.clock.fastForward(50 * 60000);
  // 1. Het grote getal en de vergelijking eronder rekenen met dezelfde tijd (met voorbereiding: 6 u 30 min)
  const r1 = await p.evaluate(() => { const T = totals(); return { cost:document.getElementById('cost').firstChild.textContent.trim(), cmp:document.getElementById('compare').textContent, eur:document.getElementById('euro').textContent, noot:document.getElementById('prep-note').textContent, all:personTime(T.allMs), cAll:compareText(T.allMs), eAll:euroText(T.allMs) }; });
  ok(r1.cost === r1.all && r1.cmp === r1.cAll && r1.eur.startsWith(r1.eAll), 'na 50 min met 6 mensen: getal, vergelijking en euro tellen samen 6 u 30 min (' + [r1.cost, r1.cmp, r1.eur].join(' | ') + ')');
  ok(r1.noot === 'waarvan 1 u 30 min voorbereiding', 'de voorbereiding staat erbij als deel ervan (' + r1.noot + ')');
  // 2. Over tijd: de teller en de samenvatting tellen dezelfde minuten (15 min 30 s over: 15, niet 16)
  await p.clock.fastForward(25 * 60000 + 30000);
  const live = await txt('#over');
  await p.evaluate(() => document.getElementById('stop').click()); await p.waitForFunction(() => /langer dan gepland|korter|zoals gepland/.test(document.getElementById('stats').innerText), null, { timeout:3000 }).catch(() => {});   // wachten tot de samenvatting er staat (onder last soms later dan 200 ms)   // rechtstreeks: met de nagebootste klok wacht een muisklik soms vergeefs
  const sam = await txt('#stats');
  ok(live === '+15 min over tijd' && /(^| )15 min langer dan gepland/.test(sam), 'over tijd: "' + live + '" en "' + (/\S+ min langer dan gepland/.exec(sam) || [''])[0] + '"');
  // 3. Ongeldige waarden worden gemeld, niet stil genegeerd of op 0 gezet
  await p.click('#again'); await p.waitForTimeout(200);
  await p.evaluate(() => { document.getElementById('more').open = true; });
  await p.fill('#prep', '20'); await p.fill('#prep', '600');
  ok(await p.evaluate(() => st.prep) === 20 && /0 tot 480/.test(await txt('#prep-msg')), 'voorbereiding 600: melding, de vorige 20 min blijft (' + await p.evaluate(() => st.prep) + ' | ' + await txt('#prep-msg') + ')');
  await p.fill('#prep', '30'); ok(await txt('#prep-msg') === '' && await p.evaluate(() => st.prep) === 30, 'een goede waarde haalt de melding weg');
  await p.fill('#own-min', '0');
  ok(/1 tot 600/.test(await txt('#own-msg')), 'eigen duur 0: melding (' + await txt('#own-msg') + ')');
  await p.fill('#own-min', '50'); ok(await txt('#own-msg') === '' && await p.evaluate(() => st.planned) === 50, 'eigen duur 50: geen melding, 50 min gepland');
  await p.fill('#rate', '0');
  ok(/uurtarief van 0/i.test(await txt('#rate-msg')), 'uurtarief 0: melding (' + await txt('#rate-msg') + ')');
  await p.fill('#rate', '1.250'); ok(await p.evaluate(() => st.rate) === 1250 && await txt('#rate-msg') === '', 'uurtarief 1.250: 1250, geen melding');
  // Echt typen buiten de grenzen: "600" voorbereiding passeert 6 en 60. De tool rekende met 60 terwijl het veld 600 toonde (hertest b).
  await p.evaluate(() => { document.getElementById('more').open = true; });
  await p.fill('#prep', '15'); await p.keyboard.press('Tab'); await p.click('#prep'); await p.keyboard.press('Control+A'); await p.keyboard.type('600', { delay:40 });
  let r = await p.evaluate(() => st.prep); ok(r === 15 && /480/.test(await txt('#prep-msg')), 'voorbereiding 600 typen: de tool rekent verder met 15, met een melding (' + r + ')');
  await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  ok(await p.inputValue('#prep') === '15' && /480/.test(await txt('#prep-msg')), 'na het veld: het veld toont 15, waarmee de tool rekent, en de melding blijft (' + await p.inputValue('#prep') + ')');
  await p.click('.chip[data-min="60"]'); await p.click('#own-min'); await p.keyboard.type('6000', { delay:40 });
  r = await p.evaluate(() => st.planned); ok(r === 60, 'eigen duur 6000 typen: de tool rekent verder met 60, niet met 600 (' + r + ')');
  await p.keyboard.press('Tab');
  await p.click('#rate'); await p.keyboard.press('Control+A'); await p.keyboard.type('6x', { delay:40 });
  r = await p.evaluate(() => st.rate); ok(r === 1250, 'uurtarief "6x" typen: de tool rekent verder met 1250, niet met 6 (' + r + ')'); await p.keyboard.press('Tab');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
