// De kring per fase staat niet meer bij Projecten maar in het venster Alle tools (Onderdeel | Fase), met een eigen knop naast zoeken.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 9281); const S = process.env.SHOTS || 'shots';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const vp of [{ width:390, height:844, mob:true }, { width:1366, height:800, mob:false }]) {
    console.log('\n== ' + vp.width + ' ==');
    const c = await b.newContext({ viewport:{ width:vp.width, height:vp.height }, hasTouch:vp.mob, isMobile:vp.mob, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.addInitScript(() => { localStorage.setItem('oc-app.welkom-weg', '1'); if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('oc-app.view', '"plan"'); localStorage.setItem('oc-app.at-modus', '"doen"'); } });
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(800);
    // Projecten: alleen Stappenplan en Per onderwerp; een bewaarde keuze 'fase' wordt Stappenplan
    await p.click('.tab[data-tab="projecten"]'); await p.waitForTimeout(500);
    ok(!(await p.isVisible('#viewsw')) && await p.isVisible('#plan-keuze .path') && await p.isVisible('#groups .group') && !(await p.$('#home #cycle')), 'Projecten: geen schakelaar en geen kring; de plannen staan boven de onderwerpen');
    const volg = await p.evaluate(() => document.querySelector('#plan-keuze').getBoundingClientRect().bottom <= document.querySelector('#groups .group').getBoundingClientRect().top); ok(volg, 'de onderwerpen staan onder de plannen');
    await p.screenshot({ path:S + '/projecten-' + vp.width + '.png' });
    // de knop naast zoeken opent Alle tools per fase
    ok(await p.isVisible('#fase-open'), 'knop Alle tools per fase staat in de kop');
    const kop = await p.evaluate(() => { const r = document.getElementById('fase-open').getBoundingClientRect(), z = document.querySelector('.site-title').getBoundingClientRect(); return r.left >= z.right && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; }); ok(kop, 'de knop past in de kop, naast de titel, niets loopt over');
    await p.click('#fase-open'); await p.waitForTimeout(500);
    ok(await p.isVisible('#at-fase #cy-wheel') && !(await p.isVisible('#at-lijst')) && !(await p.isVisible('#at-pillen')), 'venster open met de kring, zonder A-Z-lijst en pillen');
    const md = await p.$$eval('.at-md', xs => xs.map(x => x.textContent + ':' + x.getAttribute('aria-pressed'))); ok(md.join() === 'Onderdeel:false,Fase:true', 'schakelaar Onderdeel | Fase (' + md + ')');
    // elke tool staat juist één keer per fase, en elke tool staat ergens
    const d = await p.evaluate(() => { const uit = {}, gezien = new Set(); for (const ph of PHASES) { setPhase(ph.id); const ids = [...document.querySelectorAll('#cy-list .row')].map(x => x.dataset.id + (x.dataset.zoek || '')); uit[ph.id] = { n:ids.length, dubbel:ids.length - new Set(ids).size, koppen:[...document.querySelectorAll('#cy-list .cy-kop')].map(x => x.textContent), tel:document.querySelector(`.cy-st[data-phase-pick="${ph.id}"] .cy-n`).textContent }; ids.forEach(i => gezien.add(i.replace(/\?.*/, ''))); }
      const los = [...document.querySelectorAll('#cy-always [data-id]')].map(x => x.dataset.id); los.forEach(i => gezien.add(i)); setPhase('plan');
      return { uit, los, ontbreekt:TOOLS.filter(t => !gezien.has(t.id)).map(t => t.id), losEnFase:los.filter(i => PHASES.some(ph => inFase(byId[i], ph.id))), totaal:TOOLS.length }; });
    for (const k of Object.keys(d.uit)) { console.log('   ', k, d.uit[k].n, 'tools |', d.uit[k].koppen.join(' · ')); ok(d.uit[k].dubbel === 0, k + ': geen tool dubbel in de fase'); ok(+d.uit[k].tel === d.uit[k].n || +d.uit[k].tel === d.uit[k].n - 0, k + ': het cijfer op de kring is het aantal tools (' + d.uit[k].tel + ')'); ok(d.uit[k].koppen[0].startsWith('Eerst nodig'), k + ': begint met Eerst nodig'); }
    console.log('    altijd bij de hand:', d.los.length, d.los.join(' '));
    ok(!d.ontbreekt.length, 'alle ' + d.totaal + ' tools staan in een fase of bij Altijd bij de hand (ontbreekt: ' + d.ontbreekt + ')'); ok(!d.losEnFase.length, 'geen tool tegelijk in een fase en bij Altijd bij de hand');
    ok(d.uit.plan.koppen[1].startsWith('Afbakenen') && d.uit.plan.koppen.some(k => k.startsWith('Meekrijgen')) && d.uit.do.koppen[1].startsWith('Overleggen') && d.uit.do.koppen.some(k => k.startsWith('Vastleggen')), 'activiteiten staan als kopjes onder hun fase');
    await p.screenshot({ path:S + '/fase-plan-' + vp.width + '.png' });
    await p.click('.cy-st[data-phase-pick="do"]'); await p.waitForTimeout(800); ok((await p.textContent('#cy-list-h')).startsWith('Doen'), 'tik op Doen: de lijst wisselt'); await p.screenshot({ path:S + '/fase-doen-' + vp.width + '.png' });
    const over = await p.evaluate(() => { const a = document.getElementById('at-fase'); return a.scrollWidth - a.clientWidth; }); ok(over <= 1, 'niets loopt zijwaarts over in het venster (' + over + ')');
    await p.evaluate(() => { const a = document.getElementById('at-fase'); a.scrollTop = a.scrollHeight; }); await p.waitForTimeout(200); await p.screenshot({ path:S + '/fase-altijd-' + vp.width + '.png' });
    // een tool openen en terugkeren
    await p.evaluate(() => document.querySelector('#cy-list .row[data-id="kanban"]').click()); await p.waitForTimeout(1500);
    ok(!(await p.evaluate(() => document.getElementById('at').open)) && await p.evaluate(() => document.getElementById('viewer').classList.contains('open')), 'een tool uit de fase opent, het venster sluit');
    await p.goBack(); await p.waitForTimeout(800); ok(await p.evaluate(() => document.getElementById('at').open) && await p.isVisible('#at-fase'), 'terug: het venster staat weer open, per fase');
    // naar Onderdeel en terug; de keuze wordt onthouden
    await p.click('.at-md[data-modus="deel"]'); await p.waitForTimeout(300); ok(await p.isVisible('#at-lijst .at-row') && await p.isVisible('#at-pillen') && !(await p.isVisible('#at-fase')), 'Onderdeel: de A-Z-lijst met pillen'); await p.screenshot({ path:S + '/onderdeel-' + vp.width + '.png' });
    ok(!(await p.$('.at-md[data-modus="doen"]')), 'geen aparte schakelaar Activiteit meer');
    if (!vp.mob) { await p.click('.at-md[data-modus="fase"]'); await p.evaluate(() => setPhase('plan')); await p.keyboard.press('Tab'); const f1 = await p.evaluate(() => document.activeElement.className); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); const f2 = await p.evaluate(() => document.activeElement.dataset.phasePick + '|' + phase); ok(/cy-st/.test(f1) && f2 === 'do|do', 'toetsenbord: Tab naar de kring, pijltje kiest de volgende fase (' + f1 + ' ' + f2 + ')'); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); ok(!(await p.evaluate(() => document.getElementById('at').open)), 'Esc sluit');
    ok(!E.length, 'geen paginafouten ' + E); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
