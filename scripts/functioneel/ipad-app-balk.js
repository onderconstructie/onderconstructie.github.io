// Geïnstalleerde app op iPad (stand binnenrol, hier aangezet met ?binnenrol=1): het startscherm rolt zelf en de tabbalk blijft onderaan staan.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['staand', { width:820, height:1180 }], ['liggend', { width:1180, height:820 }]]) {
    const c = await b.newContext({ viewport:vp, hasTouch:true, serviceWorkers:'block' }); const p = await c.newPage(); const er = []; p.on('pageerror', e => er.push(String(e).slice(0, 120)));
    await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('raci.v1', '{"proef":1}'); });
    await p.goto(B + '/?binnenrol=1', { waitUntil:'networkidle' }); await p.evaluate(() => { store.set('paths-started', ['project']); ['adem', 'opdracht', 'raci', 'kanban'].forEach(x => logUse(x)); store.set('favs', ['opdracht', 'kanban']); }); await p.goto(B + '/?binnenrol=1', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    const balk = () => p.evaluate(() => { const r = document.getElementById('tabbar').getBoundingClientRect(); return [Math.round(r.top), Math.round(innerHeight - r.bottom), Math.round(r.height)]; });
    ok(await p.evaluate(() => document.documentElement.classList.contains('binnenrol')), w + ': de stand staat aan');
    let m = await balk(); ok(m[1] === 0 && m[2] > 40, w + ': de tabbalk staat onderaan (' + m.join(', ') + ')');
    await p.click('.tab[data-tab="projecten"]'); await p.waitForTimeout(500);
    const kan = await p.evaluate(() => { const h = document.getElementById('home'); return h.scrollHeight - h.clientHeight; }); ok(kan > 200, w + ': het startscherm rolt zelf (' + kan + ' px te rollen)');
    for (const y of [300, 99999]) { await p.evaluate(y => document.getElementById('home').scrollTo(0, y), y); await p.waitForTimeout(200); m = await balk(); ok(m[1] === 0, w + ': na rollen naar ' + (y > 9000 ? 'het einde' : y) + ' staat de balk nog onderaan (' + m.join(', ') + ')'); }
    ok(await p.evaluate(() => scrollY === 0 && document.documentElement.scrollHeight <= innerHeight + 1), w + ': de pagina zelf rolt niet');
    ok(await p.evaluate(() => { const f = document.querySelector('.ft').getBoundingClientRect(), t = document.getElementById('tabbar').getBoundingClientRect(); return f.bottom <= t.top + 1; }), w + ': helemaal onderaan staat de voet boven de balk, niet eronder'); await p.screenshot({ path:S + '/ipad-app-' + w + '.png' });
    await p.click('.tab[data-tab="start"]'); await p.waitForTimeout(600); ok(await p.evaluate(() => document.getElementById('home').scrollTop) === 0, w + ': een andere tab begint bovenaan');
    await p.evaluate(() => document.getElementById('home').scrollTo(0, 400)); await p.click('.tab[data-tab="start"]'); await p.waitForTimeout(900); ok(await p.evaluate(() => document.getElementById('home').scrollTop) < 5, w + ': nog eens op Start tikken rolt terug naar boven');
    await p.evaluate(() => openTool('adem')); await p.waitForTimeout(2000); ok(await p.evaluate(() => document.getElementById('viewer').classList.contains('open') && getComputedStyle(document.getElementById('tabbar')).visibility === 'hidden'), w + ': een tool opent over het volle scherm, zonder tabbalk');
    await p.click('#close'); await p.waitForTimeout(500); m = await balk(); ok(m[1] === 0 && await p.evaluate(() => getComputedStyle(document.getElementById('tabbar')).visibility !== 'hidden'), w + ': terug op Start staat de balk er weer');
    await p.click('#data-open').catch(() => {}); await p.waitForTimeout(400); ok(await p.isVisible('#shared-exit'), w + ': een venster (Je gegevens) opent normaal'); await p.keyboard.press('Escape');
    ok(!er.length, w + ': geen paginafouten ' + er.join(' | '));
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
