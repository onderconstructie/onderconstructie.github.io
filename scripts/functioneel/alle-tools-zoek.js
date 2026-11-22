// In Alle tools kun je zoeken, rechtsboven zoals op Start: op de gsm een loep die een veld opent, breder meteen een veld.
// Het zoekt met dezelfde logica als op Start, binnen de gekozen pil, en de tellers op de pillen volgen mee.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  for (const [w, h, naam] of [[390, 844, 'gsm'], [1366, 900, 'laptop']]) {
    const c = await b.newContext({ viewport:{ width:w, height:h }, serviceWorkers:'block', hasTouch:naam === 'gsm' }), p = await c.newPage();
    p.on('pageerror', e => ok(false, naam + ': paginafout ' + e.message));
    await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); } catch {} });
    await p.goto(BASE + '/'); await p.waitForTimeout(1300);
    await p.evaluate(() => document.getElementById('at-open').click()); await p.waitForTimeout(600);
    const alle = await p.locator('.at-row').count();
    if (naam === 'gsm') {
      ok(await p.locator('#at-zk').isVisible() && !(await p.locator('#at-q').isVisible()), 'gsm: een loep rechtsboven, het veld is nog dicht');
      ok(await p.evaluate(() => { const r = document.getElementById('at-zk').getBoundingClientRect(); return r.right > innerWidth - 40 && r.top < 80 && r.width >= 44 && r.height >= 44; }), 'gsm: de loep staat rechtsboven en is 44 px');
      await p.locator('#at-zk').click(); await p.waitForTimeout(250);
      ok(await p.evaluate(() => document.activeElement.id === 'at-q'), 'gsm: een tik op de loep opent het veld en zet de cursor erin');
    } else {
      ok(await p.locator('#at-q').isVisible() && !(await p.locator('#at-zk').isVisible()), 'laptop: het zoekveld staat meteen in de kop');
      ok(await p.evaluate(() => { const q = document.getElementById('at-q').getBoundingClientRect(), d = document.getElementById('at').getBoundingClientRect(); return q.left > d.left + d.width / 2 && q.top < d.top + 80; }), 'laptop: rechtsboven in het venster');
    }
    await p.locator('#at-q').fill('risico'); await p.waitForTimeout(250);
    const namen = await p.locator('.at-row .at-t').allInnerTexts(), start = await p.evaluate(() => searchTools('risico').map(t => t.title).sort());
    ok(namen.length > 0 && namen.length < alle && JSON.stringify(namen.map(x => x.trim()).sort()) === JSON.stringify(start), naam + ': zoekt hetzelfde als op Start (' + namen.length + ' tools)');
    ok((await p.locator('#at-n').innerText()).includes(namen.length + ' tool') && (await p.locator('#at-n').innerText()).includes('gevonden'), naam + ': de kop zegt hoeveel er gevonden zijn');
    ok((await p.locator('.at-pil[data-cat="alle"] .at-pil-n').innerText()).trim() === String(namen.length), naam + ': de teller op de pil volgt mee');
    await p.locator('#at-q').fill('zzzqqq'); await p.waitForTimeout(200);
    ok((await p.locator('.at-leeg').innerText()).includes('zzzqqq'), naam + ': niets gevonden, met het woord erbij');
    await p.locator('#at-q').press('Escape'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.getElementById('at').open && !document.getElementById('at-q').value) && await p.locator('.at-row').count() === alle, naam + ': Esc wist eerst het woord, het overzicht blijft open');
    await p.locator('.at-md[data-modus="fase"]').click(); await p.waitForTimeout(300); await p.locator('#at-q').fill('retro'); await p.waitForTimeout(300);
    ok(await p.locator('#at-lijst').isVisible() && await p.locator('.at-row').count() > 0, naam + ': wie zoekt in de weergave Fase, krijgt de lijst');
    await p.locator('.at-row').first().click(); await p.waitForTimeout(900);
    ok(await p.evaluate(() => !document.getElementById('at').open), naam + ': een tik op een gevonden tool opent ze');
    await p.goto(BASE + '/'); await p.waitForTimeout(1000); await p.evaluate(() => document.getElementById('at-open').click()); await p.waitForTimeout(500);
    await p.locator('.at-md[data-modus="deel"]').click(); await p.waitForTimeout(300);   // de weergave Fase was bewaard
    ok(!(await p.locator('#at-q').inputValue()) && await p.locator('.at-row').count() === alle, naam + ': opnieuw geopend staat het zoekveld leeg');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), naam + ': niets loopt buiten het scherm');
    await c.close();
  }
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
