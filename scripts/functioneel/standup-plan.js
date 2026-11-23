// Stand-up als eigen kort plan (v17.23): naast Leid een vergadering op de tab Vergaderen, twee stappen (Rondje, Takenbord). Wisselen kan altijd: het zijn twee kaarten.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['laptop', { width:1440, height:900 }], ['gsm', { width:390, height:844 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); const er = []; p.on('pageerror', e => er.push(String(e).slice(0, 140)));
    await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
    await p.click('.tab[data-tab="vergaderen"]'); await p.waitForTimeout(600);
    const k = await p.evaluate(() => [...document.querySelectorAll('#plan-tab .path, .pt-rij .path')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [e.dataset.path, e.querySelector('.path-title').textContent, Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }));
    ok(k.length === 2 && k[0][0] === 'vergadering' && k[1][0] === 'standup' && k[1][1] === 'Doe een stand-up', w + ': twee plannen: Leid een vergadering en Doe een stand-up');
    if (w === 'laptop') ok(k[1][2] > k[0][2] + 300 && Math.abs(k[0][3] - k[1][3]) <= 1 && Math.abs(k[0][4] - k[1][4]) <= 2, w + ': ze staan naast elkaar, even breed en op dezelfde lijn'); await p.screenshot({ path:S + '/standup-' + w + '.png' });
    const stappen = id => p.evaluate(id => stepsOf(id).map(s => s.t.id + (s.t.zoek || '')).join(','), id);
    ok(await stappen('standup') === 'rondje?soort=standup,kanban', w + ': de stand-up telt twee stappen: Rondje en Takenbord (' + await stappen('standup') + ')');
    ok(await stappen('vergadering') === 'agenda,check-in,notities,check-out', w + ': de vergadering houdt haar vier stappen (' + await stappen('vergadering') + ')');
    await p.click('.path[data-path="standup"] .path-start, .path[data-path="standup"] [data-id="rondje"]'); await p.waitForTimeout(2600);
    ok(await p.evaluate(() => current === 'rondje' && !document.querySelector('.app-dlg-back:not([hidden])')) && /2/.test(await p.innerText('#pathbar')), w + ': de kaart start de stand-up meteen bij het Rondje, zonder keuzevenster');
    ok(p.frames().some(f => /\/rondje\/\?soort=standup/.test(f.url())), w + ': het Rondje opent in stand-upstand');
    await p.click('#pathbar .pb-next'); await p.waitForTimeout(2600); ok(await p.evaluate(() => current) === 'kanban', w + ': Volgende brengt je naar het Takenbord');
    await p.click('#close'); await p.waitForTimeout(500); await p.click('.tab[data-tab="vergaderen"]'); await p.waitForTimeout(500);
    await p.click('.path[data-path="vergadering"] .path-start, .path[data-path="vergadering"] [data-id="agenda"]'); await p.waitForTimeout(2600);
    ok(await p.evaluate(() => current === 'agenda' && pathCtx === 'vergadering'), w + ': terwijl de stand-up loopt, start de andere kaart gewoon de vergadering (wisselen kan)');
    await p.click('#close'); await p.waitForTimeout(500); await p.click('.tab[data-tab="start"]'); await p.waitForTimeout(500);
    await p.click('.stile[data-start="vergadering"]'); await p.waitForTimeout(600); if (await p.isVisible('#vg-verder')) { await p.locator('#vg-dlg [data-vv]:not([data-vv="verder"])').first().click(); await p.waitForTimeout(500); }
    ok(await p.isVisible('#vg-kies'), w + ': de tegel op Start vraagt nog welke vergadering'); await p.click('#vg-dlg [data-vg="standup"]'); await p.waitForTimeout(2600);
    ok(await p.evaluate(() => current === 'rondje' && pathCtx === 'standup'), w + ': Stand-up kiezen in dat venster start het stand-upplan');
    ok(!er.length, w + ': geen paginafouten ' + er.join(' | ')); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
