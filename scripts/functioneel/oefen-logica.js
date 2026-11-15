// Oefen: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  // 1. Wie om 00:30 oefent, oefende vandaag: de lokale datum, niet de UTC-datum van gisteren (denken, oefen)
  await p.clock.install({ time:new Date('2026-11-16T00:30:00+01:00') });
  // Eerst een verhaal in de Verhaalkaart: dan heeft Oefen een spiekbriefje en een startknop
  await p.goto(B + '/verhaal/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.evaluate(() => { state.project = 'Loket'; state.hook = 'Vorige week stond Rita een uur aan te schuiven.'; state.clou = 'Met een afspraak wacht niemand nog.'; state.g = ['Eén', '', 'Drie']; save(); render(); });
  await p.clock.runFor(1000);
  await p.goto(B + '/oefen/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.evaluate(() => { state.project = 'Loket'; save(); render(); });
  await p.click('#vh-start'); await p.clock.runFor(12000); await p.click('#vh-start'); await p.waitForTimeout(200);
  const s = await p.evaluate(() => state.sessies.map(x => x.d));
  ok(s.length === 1 && s[0] === '2026-11-16', 'oefenbeurt om 00:30 op 16 november staat op 16 november (' + s.join(',') + ')');
  ok(/Vandaag/.test(await p.innerText('#oe-sessies')), 'het scherm zegt "Vandaag"');
  // 2. Het voorbeeld: de laatste oefenbeurt is vandaag, ook net na middernacht
  await p.evaluate(() => loadExample()); await p.waitForTimeout(200);
  const v = await p.evaluate(() => state.sessies.map(x => x.d).join(','));
  ok(v === '2026-11-14,2026-11-15,2026-11-16', 'voorbeeld: eergisteren, gisteren en vandaag in lokale tijd (' + v + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
