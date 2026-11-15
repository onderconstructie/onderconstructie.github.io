// Een ander tabblad wist alles (storage-event zonder sleutel): de tool toont netjes de melding en laadt opnieuw, zonder paginafouten.
// Hertest b: Meetplan, Opdracht, Vergaderkost en Tijdlijn gaven een TypeError, omdat hun eigen luisteraars nog tekenden op een vervangen pagina.
// Het wissen bootsen we na met het event zelf (de test wist niets).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const VB = '#example, #vb-load, #vb-show, [data-act="example"], #vbLoad, [data-vb="start"], #exampleBtn, #example-btn';
(async () => { const b = await chromium.launch();
  for (const t of (process.argv[2] || 'meetplan,opdracht,vergaderkost,tijdlijn,systeemkaart').split(',')) {
    for (const vb of [false, true]) {
      const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); const p = await c.newPage(); const E = [];
      p.on('pageerror', e => E.push(String(e).slice(0, 160)));
      await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
      if (vb) { await p.evaluate(sel => { const e = document.querySelector(sel); if (e) { e.hidden = false; e.click(); } }, VB); await p.waitForTimeout(500); }
      await p.evaluate(() => { dispatchEvent(new StorageEvent('storage', { key:null })); dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
      await p.setViewportSize({ width:900, height:900 }); await p.waitForTimeout(250);
      const melding = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
      await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(700);
      ok(!E.length && /laadt opnieuw/.test(melding), `${t}${vb ? ' met voorbeeld' : ''}: alles gewist in een ander tabblad, de melding en geen paginafout (${E.join(' | ') || melding.slice(0, 60)})`);
      await c.close();
    }
  }
  // Systeemkaart met het voorbeeld open: de kaart tekent kort na een wijziging een beeld voor de export (na 900 ms). Viel dat net na het wissen, dan TypeError in tekenKaart (hertest d2).
  if (!process.argv[2] || process.argv[2].split(',').includes('systeemkaart')) for (let i = 0; i < 3; i++) {
    const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 160)));
    await p.goto(B + '/systeemkaart/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
    await p.evaluate(() => window.systeem.laadVoorbeeld(true)); await p.waitForTimeout(500 + i * 150);
    await p.evaluate(() => dispatchEvent(new StorageEvent('storage', { key:null }))); await p.waitForTimeout(1500);
    ok(!E.length, `systeemkaart met voorbeeld (${i + 1}): alles gewist in een ander tabblad, geen paginafout (${E.join(' | ') || 'geen'})`);
    await c.close();
  }
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
