// Skiplink en tablabels: de eerste Tab toont "Naar de inhoud"; Enter zet de focus in de inhoud. De tablabels op gsm zijn 12 px en breken niet af.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['laptop', { width:1440, height:900 }], ['gsm', { width:390, height:844 }], ['smal', { width:320, height:640 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('skip').getBoundingClientRect().bottom <= 0), w + ': de skiplink is onzichtbaar zonder focus');
    await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.activeElement.id === 'skip' && document.activeElement.getBoundingClientRect().top >= 0), w + ': de eerste Tab toont "Naar de inhoud"'); if (w === 'laptop') await p.screenshot({ path:S + '/skiplink.png' });
    await p.keyboard.press('Enter'); ok(await p.evaluate(() => document.activeElement.id === 'inhoud' && !location.hash), w + ': Enter zet de focus in de inhoud, het adres blijft');
    if (w !== 'laptop') { const t = await p.evaluate(() => [...document.querySelectorAll('#tabbar .tab-lbl')].map(e => ({ t:e.textContent, f:parseFloat(getComputedStyle(e).fontSize), regels:Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || 14)), over:e.scrollWidth > e.clientWidth + 1 })));
      ok(t.every(x => x.f >= (w === 'smal' ? 10 : 12) && x.regels === 1 && !x.over), w + ': tablabels ' + t[0].f + ' px, elk op één regel (' + t.map(x => x.t + ':' + x.regels).join(' ') + ')'); await p.screenshot({ path:S + '/tabs-' + w + '.png', clip:{ x:0, y:vp.height - 80, width:vp.width, height:80 } }); }
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
