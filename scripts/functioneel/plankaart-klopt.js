// De kaart van een plan spreekt zichzelf niet tegen (v17.26): de tekst "Stap X van Y", de knoop die brandt
// en het aantal bij Kort zeggen hetzelfde, ook als er door "ja" op de vraag over mensen een stap bij kwam.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const antwoord of ['ja', 'nee']) {
    const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message));
    await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    await p.locator('#stiles .stile').nth(0).click(); await p.waitForTimeout(700); await p.fill('#pn-name', 'Proef'); await p.locator('#pn-form button:has-text("Verder")').click(); await p.waitForTimeout(2500);
    for (const fr of p.frames()) { if (fr === p.mainFrame()) continue; try { const v = fr.locator('textarea:visible, input[type=text]:visible').first(); if (await v.count()) { await v.fill('Een nieuwe website', { timeout:2000 }); await v.blur(); } } catch (e) {} } await p.waitForTimeout(900);
    await p.locator('.pb-next').click(); await p.waitForTimeout(1300); const d = p.locator('#brug-' + antwoord); ok(await d.isVisible(), antwoord + ': de vraag over mensen komt'); await d.click(); await p.waitForTimeout(1800);
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500); await p.evaluate(() => { const t = [...document.querySelectorAll('button')].find(e => /^\s*Projecten\s*$/.test(e.textContent)); if (t) t.click(); }); await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const k = document.querySelector('.path[data-path="project"]'); if (!k) return null; const kn = [...k.querySelectorAll('.path-bar > span')]; const open = k.classList.contains('open'); if (!open) k.querySelector('.path-head').click();
      return { tekst:k.querySelector('.path-note').textContent.trim(), n:kn.length, hier:kn.findIndex(s => s.classList.contains('here')) + 1, voor:kn.filter(s => s.classList.contains('voor')).length, knop:(k.querySelector('.path-next b') || {}).textContent || '' }; });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const k = document.querySelector('.path[data-path="project"]'); const kort = k.querySelector('.rk[data-route="kort"] span'); const st = [...k.querySelectorAll('.steps > .step, ol > .step, .step')].filter(x => x.getClientRects().length && !x.closest('.ook, .stap-over, [data-erbij]') && !x.querySelector('[data-erbij]')); return { kort:kort ? kort.textContent : '', lijst:st.length, n:k.querySelectorAll('.path-bar > span').length }; });
    const x = /^Stap (\d+) van (\d+)$/.exec(m.tekst) || []; const verwacht = antwoord === 'ja' ? 8 : 7;
    ok(!!x.length, antwoord + ': de kaart zegt "Stap X van Y" (' + m.tekst + ')');
    ok(+x[2] === m.n && m.n === verwacht, antwoord + ': Y is het aantal knopen: ' + m.n + ' (verwacht ' + verwacht + ')');
    ok(+x[1] === m.hier && m.voor === m.hier - 1, antwoord + ': de knoop van stap ' + x[1] + ' brandt, de draad loopt tot daar');
    ok(parseInt(r.kort, 10) === m.n, antwoord + ': bij Kort staat hetzelfde aantal (' + r.kort + ')');
    if (antwoord === 'ja') await p.screenshot({ path:S + '/plankaart-klopt.png' });
    ok(!js.length, antwoord + ': geen scriptfouten ' + js.join(' | ')); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
