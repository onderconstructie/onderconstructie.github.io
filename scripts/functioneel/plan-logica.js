// Gebruikerslogica van een plan (v17.40): voortgang per project, één plek in het plan, wat de kern doorgeeft, en de planbalk na herladen.
// BASE=http://127.0.0.1:8975 node scripts/functioneel/plan-logica.js   (de app en alle tools onder één adres)
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970);
const fout = []; let n = 0; const ok = (c, m) => { n++; console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };

(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels', reducedMotion:'reduce' });
  const p = await c.newPage(); p.on('pageerror', e => PE.push(p.url().replace(B, '') + ': ' + String(e).slice(0, 160))); p.on('dialog', d => d.accept());
  const wacht = ms => p.waitForTimeout(ms);
  const frame = re => p.frames().find(f => re.test(f.url()));
  const balk = () => p.evaluate(() => { const e = document.querySelector('.pb-where'); return e && e.getClientRects().length ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const volgende = async () => { await p.locator('#pathbar button:visible:not(.step-btn):has-text("Volgende")').first().click(); await wacht(2200); };
  const thuis = async () => { await p.goto(B + '/', { waitUntil:'networkidle' }); await wacht(1000); };
  const plan = () => p.evaluate(() => { const k = [...document.querySelectorAll('.path[data-path="project"]')].find(e => e.getClientRects().length); if (!k) return null;
    return { stappen:[...k.querySelectorAll('.steps:not(.ook-lijst) > li.step')].map(e => (e.classList.contains('done') ? '✓' : e.classList.contains('next') ? '>' : '·') + e.querySelector('.step-name').textContent),
      hier:[...k.querySelectorAll('.path-bar span')].findIndex(s => s.classList.contains('here')), noot:(k.querySelector('.path-note') || {}).textContent || '' }; });
  const verder = () => p.evaluate(() => { const r = document.querySelector('#resume'); return r ? r.innerText.replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim() : ''; });
  const nogOpen = () => p.evaluate(() => { const r = document.querySelector('#rs-open'); return r && !r.hidden ? r.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const projecten = async () => { await p.locator('[data-tab=projecten]').first().click(); await wacht(900); };
  const stap = async naam => { await thuis(); await projecten(); const k = p.locator('.path[data-path="project"]:visible').first();
    if (!(await k.locator(`.step-btn:visible:has-text("${naam}")`).count())) { await k.locator('.path-head').click(); await wacht(500); }
    await k.locator(`.step-btn:visible:has-text("${naam}")`).first().click(); await wacht(2600); };
  const tikEnTyp = async (f, sel, tekst) => { await f.click(sel); await f.fill(sel, tekst); await wacht(300); };

  // ---------- 1. Welkom, kern invullen ----------
  await p.goto(B + '/', { waitUntil:'networkidle' }); await wacht(600);
  await p.click('#wz-start'); await p.locator('#wz-keuzes >> text=Start een project').first().click(); await p.fill('#wz-naam', 'Nieuwe bib');
  await p.click('.wz-scherm:not([hidden]) .wz-go'); await wacht(300); await p.click('.wz-scherm:not([hidden]) .wz-go'); await wacht(2500);
  let f = frame(/\/opdracht\//);
  await tikEnTyp(f, '#f-waarom', 'Aanvragers wachten drie weken op een beslissing.');
  await tikEnTyp(f, '#f-opleveren', 'Een nieuw onthaal\nEen digitaal aanvraagformulier');
  await tikEnTyp(f, '#f-einddatum', '2027-06-30'); await wacht(1800);
  ok(/stap 1 van 7/i.test(await balk()), 'kern: de planbalk staat er (' + await balk() + ')');
  await thuis(); await projecten(); let P = await plan();
  ok(P && P.stappen[0] === '✓Opdracht: de kern', 'Nieuwe bib: de kern is gedaan (' + (P && P.stappen.slice(0, 3).join(' ')) + ')');

  // ---------- 2. Een tweede project begint bij nul ----------
  await p.evaluate(() => { localStorage.setItem('oc.project', JSON.stringify({ name:'Zwembad', since:Date.now() })); localStorage.setItem('oc-app.projects', JSON.stringify(['Nieuwe bib', 'Zwembad'])); });
  await thuis(); await projecten(); P = await plan();
  ok(P && P.stappen[0] === '>Opdracht: de kern', 'Zwembad: de kern is niet gedaan en is de volgende stap (' + (P && P.stappen.slice(0, 2).join(' ')) + ')');
  await p.locator('[data-tab=start]').first().click(); await wacht(800);
  ok(!/Productboom|Tijdlijn/.test(await verder()), 'Zwembad: Verder waar je was wijst niet naar een stap van de bib (' + (await verder()).slice(0, 60) + ')');
  await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Nieuwe bib', since:1 })));
  await thuis(); await projecten(); P = await plan();
  ok(P && P.stappen[0] === '✓Opdracht: de kern', 'terug naar Nieuwe bib: de kern is weer gedaan');

  // ---------- 3. Eén plek in het plan: Productboom voorbij zonder iets te doen ----------
  await stap('Opdracht: de kern');
  await volgende();   // naar de Productboom
  ok(/Productboom/.test(await balk()), 'Volgende: de Productboom (' + await balk() + ')');
  await volgende();   // de Productboom voorbij, naar de Tijdlijn
  ok(/Tijdlijn/.test(await balk()) && /3 van 7/i.test(await balk()), 'Volgende: de Tijdlijn, stap 3 (' + await balk() + ')');
  await thuis();
  ok(/Stap 3 van 7/.test(await verder()) && /Tijdlijn/.test(await verder()), 'Start: Verder waar je was is de Tijdlijn (' + (await verder()).slice(0, 50) + ')');
  ok(/Productboom/.test(await nogOpen()), 'Start: de Productboom staat bij Nog open (' + await nogOpen() + ')');
  await p.locator('.stile:visible:has-text("Start een project")').first().click(); await wacht(2200);
  ok(/Tijdlijn/.test(await balk()), 'Start: de knop Verder bij Start een project gaat ook naar de Tijdlijn (' + await balk() + ')');
  await thuis(); await projecten(); P = await plan();
  ok(P && P.stappen[2] === '>Tijdlijn' && P.hier === 2, 'stappenplan: de Tijdlijn is de volgende, en daar licht de draad op (' + (P && P.stappen.slice(0, 4).join(' ') + ', hier ' + P.hier) + ')');

  // ---------- 4. De einddatum als mijlpaal in de Tijdlijn, en wat daar vanzelf binnenkwam telt niet als gedaan ----------
  let tl = await p.evaluate(() => localStorage.getItem('tijdlijn.v1') || '');
  ok(/"text":"Project klaar"/.test(tl) && /2027-06-30/.test(tl), 'Tijdlijn: Project klaar op 30 juni 2027 staat erin');
  ok(P && P.stappen[2] === '>Tijdlijn', 'Tijdlijn: wat vanzelf binnenkwam, telt niet als gedaan');
  // de einddatum schuift op in de opdracht: de mijlpaal schuift mee
  await stap('Opdracht: de kern');
  f = frame(/\/opdracht\//); await tikEnTyp(f, '#f-einddatum', '2027-09-15'); await wacht(1500);
  await stap('Tijdlijn');
  tl = await p.evaluate(() => localStorage.getItem('tijdlijn.v1') || '');
  if (process.env.DEBUG) console.log(tl.slice(0, 600), '\nREG', await p.evaluate(() => localStorage.getItem('oc.volg.tijdlijn')), '\nSHARE', await p.evaluate(() => (localStorage.getItem('oc.share.opdracht') || '').slice(0, 500)));
  ok(/"date":"2027-09-15"/.test(tl) && !/2027-06-30/.test(tl) && tl.split('Project klaar').length === 2, 'Tijdlijn: de mijlpaal schoof mee naar 15 september, zonder dubbel en nog altijd als overgenomen (niet als eigen werk)');
  ok(!/"text":"Project klaar"/.test(await p.evaluate(() => localStorage.getItem('oc.share.tijdlijn') || '')), 'Tijdlijn: geeft de meegelopen mijlpaal niet door als haar eigen');
  const opd = await p.evaluate(() => localStorage.getItem('opdracht.v1') || '');
  ok(!/"mijlpalen":\[\{[^\]]*Project klaar/.test(opd), 'Projectopdracht: Project klaar komt niet terug als tussentijdse mijlpaal');

  // ---------- 5. Wat je oplevert, wordt de eerste takken van de Productboom ----------
  await stap('Productboom');
  let mm = await p.evaluate(() => localStorage.getItem('mindmap.v1') || '');
  ok(/"text":"Een nieuw onthaal"/.test(mm) && /"text":"Een digitaal aanvraagformulier"/.test(mm) && !/Eerste deelresultaat/.test(mm), 'Productboom: de twee resultaten uit de opdracht zijn de eerste takken');
  await stap('Opdracht: de kern');
  f = frame(/\/opdracht\//); await tikEnTyp(f, '#f-opleveren', 'Een nieuw onthaal met leeshoek\nEen digitaal aanvraagformulier'); await wacht(1500);
  await stap('Productboom');
  mm = await p.evaluate(() => localStorage.getItem('mindmap.v1') || '');
  ok(/"text":"Een nieuw onthaal met leeshoek"/.test(mm), 'Productboom: de tak liep mee met de opdracht');

  // ---------- 6. Herladen in een stap: de planbalk komt terug; een los geopende tool krijgt hem niet ----------
  await p.reload({ waitUntil:'networkidle' }); await wacht(2500);
  ok(/Productboom|Ideeënkaart/.test(await balk()) && /van 7/i.test(await balk()), 'herladen in een stap: de planbalk staat er weer (' + await balk() + ')');
  await thuis(); await p.evaluate(() => { location.hash = ''; }); await p.goto(B + '/#pestle', { waitUntil:'networkidle' }); await wacht(2000);
  await p.reload({ waitUntil:'networkidle' }); await wacht(2000);
  ok(!(await balk()), 'een tool buiten het plan: na herladen geen planbalk');

  ok(!PE.length, 'geen paginafouten' + (PE.length ? ': ' + PE.slice(0, 3).join(' | ') : ''));
  console.log(`\n${n} controles, fouten: ${fout.length}`); await b.close(); process.exit(fout.length ? 1 : 0);
})();
