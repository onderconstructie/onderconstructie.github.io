// Sprintplanning: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const sp = (team, stories, extra = {}) => ({ v:1, current:'s1', sprints:[Object.assign({ id:'s1', name:'Sprint 3 · Premieloket', days:10, buffer:20, team, stories }, extra)] });
(async () => { const b = await chromium.launch(); const PE = [];
  // Elke toets een eigen, lege context (geen localStorage.clear), met een vaste datum
  const open = async (data) => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.clock.setFixedTime(new Date('2026-11-15T10:00:00+01:00'));
    await c.addInitScript(d => { try { if (!sessionStorage.getItem('t-klaar')) { sessionStorage.setItem('t-klaar', '1'); localStorage.setItem('sprint.v1', d); } } catch {} }, JSON.stringify(data));
    const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e))); await p.goto(B + '/sprint/', { waitUntil:'networkidle' }); await p.waitForTimeout(300); return p; };
  const dagen = p => p.evaluate(() => cur().team.map(m => m.name + '=' + m.days).join(' '));
  // 1. Werkdagen typen: de teamleden schuiven niet mee met tussenwaarden ("2" op weg naar "20")
  let p = await open(sp([{ id:'a', name:'An', days:10, pct:100 }, { id:'b', name:'Bert', days:2, pct:100 }, { id:'c', name:'Cas', days:5, pct:100 }], []));
  await p.click('#sp-days'); await p.keyboard.press('Control+A'); await p.keyboard.type('20'); await p.waitForTimeout(150);
  ok(await dagen(p) === 'An=10 Bert=2 Cas=5', 'tijdens het typen blijven de teamleden staan (' + await dagen(p) + ')');
  await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  ok(await dagen(p) === 'An=20 Bert=2 Cas=5', 'na het typen van 20: alleen wie de hele sprint was, volgt (' + await dagen(p) + ')');
  await p.click('#sp-days'); await p.keyboard.press('Control+A'); await p.keyboard.type('15'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  ok(await dagen(p) === 'An=15 Bert=2 Cas=5', 'daarna 15: Bert blijft 2 (' + await dagen(p) + ')');
  await p.click('#sp-days'); await p.keyboard.press('Control+A'); await p.keyboard.type('4'); await p.keyboard.press('Tab'); await p.waitForTimeout(150);
  ok(await dagen(p) === 'An=4 Bert=2 Cas=4', 'korter dan iemands dagen: die krijgt het nieuwe maximum (' + await dagen(p) + ')');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('sprint.v1')).sprints[0].team.map(m => m.days).join()) === '4,2,4', 'zo staat het ook bewaard');
  // 2. Taal: ½ halve dag, niet ½ halve dagen
  ok(await p.evaluate(() => [hd(0.5), hd(1), hd(3)].join('|')) === '½ halve dag|1 halve dag|3 halve dagen', 'enkelvoud bij ½ en 1 (' + await p.evaluate(() => hd(0.5)) + ')');
  // 3. Volgende sprint: feestdagen tellen niet mee (zelfde Belgische feestdagen als de Tijdlijn)
  ok(await p.evaluate(() => plusWerkdagen('2026-11-06', 5)) === '2026-11-16', '5 werkdagen na vr 6 nov 2026: 11 november telt niet, dus ma 16 nov (' + await p.evaluate(() => plusWerkdagen('2026-11-06', 5)) + ')');
  ok(await p.evaluate(() => plusWerkdagen('2027-03-26', 3)) === '2027-04-01', 'Paasmaandag 29 maart 2027 telt niet (' + await p.evaluate(() => plusWerkdagen('2027-03-26', 3)) + ')');
  p = await open(sp([{ id:'a', name:'An', days:10, pct:100 }], [{ id:'x1', title:'Te groot', note:'', est:13, rounds:1 }, { id:'x2', title:'Past', note:'', est:5, rounds:1 }], { end:'2026-12-18' }));
  await p.evaluate(() => { cur().team[0].days = 1; render(); }); await p.click('#next-sprint'); await p.waitForTimeout(300);
  const e3 = await p.evaluate(() => cur().end);
  ok(e3 === '2027-01-05', 'volgende sprint na vr 18 dec 2026 (10 werkdagen): Kerstmis en Nieuwjaar tellen niet, einde di 5 jan 2027 (' + e3 + ')');
  // 4. Zet in Takenbord: de laatste dag van de sprint gaat mee in het pakket
  p = await open(sp([{ id:'a', name:'An', days:10, pct:100 }], [{ id:'x1', title:'Formulier herschrijven', note:'', est:8, rounds:1 }], { end:'2026-11-27' }));
  // niet doorgaan naar Takenbord: dat neemt het pakket meteen weg
  await p.evaluate(() => document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href*="kanban"]'); if (a) e.preventDefault(); }, true));
  await p.click('#to-board'); await p.waitForTimeout(400);
  const pak = await p.evaluate(() => JSON.parse(localStorage.getItem('oc.naar.kanban') || 'null'));
  ok(pak && pak.sprint && pak.sprint.end === '2026-11-27', 'het pakket voor Takenbord heeft sprint.end = 2026-11-27 (' + JSON.stringify(pak && pak.sprint) + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
