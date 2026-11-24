// De wijzer naar het plan staat ook in RACI, Retro en Project Realisme Monitor (v17.31): los geopend toon je dat de tool een stap van een plan is.
// Eén tik: de stappenbalk met Volgende. In het plan zelf: geen wijzer. Meer plannen: het plan dat je al begon, anders het eerste.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['laptop', { width:1440, height:900 }]]) for (const [id, pad, plan, naam] of [['raci', '/raci/', 'project', 'Start een project'], ['retro', '/retro/', 'project', 'Start een project'], ['project-realisme', '/project-realisme/', 'project', 'Start een project']]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message)); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
    const fr = () => p.frames().find(f => f !== p.mainFrame() && f.url().includes(pad));
    // 1. rechtstreeks, buiten de app (zoals vanuit een LinkedIn-link)
    await p.goto(B + pad, { waitUntil:'networkidle' }); await p.waitForTimeout(700);
    const m = await p.evaluate(() => { const e = document.getElementById('oc-volgplan'); const r = e.getBoundingClientRect(); return { zie:!e.hidden && r.height > 30, t:e.innerText.replace(/\s+/g, ' '), href:e.getAttribute('href'), binnen:r.left >= 0 && r.right <= innerWidth + 0.5, breed:document.documentElement.scrollWidth <= innerWidth + 1 }; });
    ok(m.zie && m.t.includes('Een stap van ' + naam) && m.href === '/?plan=' + plan + '#' + id, w + ' ' + id + ': rechtstreeks geopend staat de wijzer er (' + m.t.slice(0, 60) + ')');
    ok(m.binnen && m.breed, w + ' ' + id + ': de wijzer past in beeld, geen zijwaarts scrollen');
    if (w === 'gsm') await p.screenshot({ path:S + '/volgplan-' + id + '.png' });
    await p.click('#oc-volgplan'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1800);
    const dlg = p.locator('#pn-form button:has-text("Verder")'); if (await dlg.isVisible().catch(() => false)) { await p.fill('#pn-name', 'Proef'); await dlg.click(); await p.waitForTimeout(1500); } await p.waitForTimeout(1500);
    const s1 = await p.evaluate(() => ({ cur:typeof current !== 'undefined' ? current : '', balk:!document.getElementById('pathbar').hidden, plan:document.getElementById('pathbar').dataset.path || '', t:document.getElementById('pathbar').innerText.replace(/\s+/g, ' ') }));
    ok(s1.cur === id && s1.balk && s1.plan === plan, w + ' ' + id + ': één tik en je staat in het plan, met de stappenbalk (' + s1.t.slice(0, 70) + ')');
    ok(fr() && await fr().isHidden('#oc-volgplan'), w + ' ' + id + ': in het plan zelf is de wijzer weg');
    ok(!js.length, w + ' ' + id + ': geen scriptfouten ' + js.join(' | ')); await c.close(); }
  // 2. wie al een procesplan begon, wordt naar dat plan gewezen (RACI en Retro horen bij meer plannen)
  { const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('oc-app.paths-started', JSON.stringify(['proces'])); });
    await p.goto(B + '/raci/', { waitUntil:'networkidle' }); await p.waitForTimeout(600); const m = await p.evaluate(() => { const e = document.getElementById('oc-volgplan'); return { t:e.innerText.replace(/\s+/g, ' '), href:e.getAttribute('href') }; });
    ok(/Een stap van Verbeter een proces/.test(m.t) && m.href === '/?plan=proces#raci', 'met een lopend procesplan wijst RACI naar dat plan (' + m.t.slice(0, 50) + ')'); await c.close(); }
  // 3. een lopend kort projectplan: de Realisme Monitor zit er niet in; de wijzer verandert je route niet
  { const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('oc-app.paths-started', JSON.stringify(['project'])); localStorage.setItem('oc-app.route', JSON.stringify({ project:'kort' })); });
    await p.goto(B + '/?plan=project#project-realisme', { waitUntil:'networkidle' }); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => current === 'project-realisme' && (store.get('route', {}) || {}).project === 'kort'), 'lopend kort plan: de tool opent, je route blijft Kort'); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
