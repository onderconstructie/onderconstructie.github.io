// De naam van een bewaard bestand draagt de datum van hier, niet die in UTC (REST na de hertest: om 00:30 stond er nog de datum van gisteren).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const VB = '#example, #vb-load, #vb-show, [data-act="example"], #vbLoad, [data-vb="start"], #exampleBtn, #example-btn';
(async () => { const b = await chromium.launch();
  for (const t of (process.argv[2] || 'retro,oefen,beslissingen,klimaat').split(',')) {
    const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels', acceptDownloads:true });
    await c.clock.setFixedTime(new Date('2026-11-16T00:30:00+01:00'));   // in UTC is het nog 15 november
    const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 140)));
    await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' });
    await p.evaluate(sel => { const e = document.querySelector(sel); if (e) { e.hidden = false; e.click(); } }, VB); await p.waitForTimeout(400);
    await p.evaluate(() => { const e = document.querySelector('#vb-eigen, [data-vb="eigen"], [data-act="vb-eigen"]'); if (e) e.click(); }); await p.waitForTimeout(400);
    await p.click('#menu-btn').catch(() => {});
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout:4000 }).catch(() => null), p.click('[data-bestand="bewaar"]', { timeout:2000 }).catch(() => {})]);
    const naam = dl ? dl.suggestedFilename() : '(geen bestand)';
    ok(/2026-11-16/.test(naam) && !E.length, `${t}: bestand om 00:30 heet ${naam}`);
    await c.close();
  }
  // Exportnamen (afbeelding, PDF, tekst) dragen ook de datum van hier (tweede ronde: Takenbord, Risicomatrix, Betrokkenenradar, Sponsorschap, Verhaal, Gedrag)
  { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels', acceptDownloads:true });
    await c.clock.setFixedTime(new Date('2026-11-16T00:30:00+01:00')); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 140)));
    for (const [t, f] of [['kanban', 'exportBaseName()'], ['risico', "ocFileName('x')"], ['stakeholders', "ocFileName('x')"], ['sponsor', 'fileBase()'], ['verhaal', 'fileBase()']]) {
      await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' }); const n = await p.evaluate(f).catch(e => String(e)); ok(/2026-11-16$/.test(n), `${t}: exportnaam om 00:30 is ${n}`); }
    await p.goto(B + '/gedrag/', { waitUntil:'networkidle' }); await p.evaluate(sel => { const e = document.querySelector(sel); if (e) e.click(); }, '[data-act="example"]'); await p.waitForTimeout(500);
    await p.click('#menu-btn').catch(() => {});
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout:15000 }).catch(() => null), p.click('#menu [data-act="png"]', { timeout:2000 }).catch(() => {})]);
    const n = dl ? dl.suggestedFilename() : '(geen bestand)'; ok(/2026-11-16\.png$/.test(n) && !E.length, 'gedrag: afbeelding om 00:30 heet ' + n);
    await c.close(); }
  // Derde ronde (hertest d2): ook deze datums zijn die van hier, om 00:30 op 16 november
  { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.clock.setFixedTime(new Date('2026-11-16T00:30:00+01:00')); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 140)));
    const ev = async (t, f) => { await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' }); return p.evaluate(f).catch(e => String(e)); };
    let r = await ev('impact', 'stamp()'); ok(r === '2026-11-16', 'impact: datum in de exportnaam ' + r);
    r = await ev('project-radar', 'exportName()'); ok(/2026-11-16$/.test(r), 'project-radar: exportnaam ' + r);
    r = await ev('schildpad', '(() => { document.querySelector("[data-act=example], #vb-show, #example").click(); return spPlan(state.procs.find(x => x.id === state.current)).doc; })()');
    ok(/16 november 2026/.test(r), 'schildpad: datum in de tekst onder het diagram (' + String(r).split('\n').pop() + ')');
    r = await ev('sprint', '(() => { document.querySelector("#vb-load, #example, #vb-show, [data-act=example]").click(); return cur().end; })()'); ok(r === '2026-11-27', 'sprint: voorbeeld eindigt 9 werkdagen na vandaag, 27 november (' + r + ')');
    r = await ev('vinkje', '(() => { document.querySelector("#vb-show, #example, #vb-load").click(); return cur().items.map(i => i.when).filter(Boolean).join(); })()'); ok(r === '2026-11-18,2026-11-23', 'vinkje: voorbeelddatums vanaf vandaag (' + r + ')');
    r = await ev('weerstand', '(() => { loadExample(); return state.groups.flatMap(g => (g.scans || []).map(s => s.date)).join(); })()'); ok(r === '2026-10-05,2026-11-16,2026-11-13', 'weerstand: voorbeelddatums vanaf vandaag (' + r + ')');
    ok(!E.length, 'geen fouten in de pagina ' + E.join(' | ')); await c.close(); }
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
