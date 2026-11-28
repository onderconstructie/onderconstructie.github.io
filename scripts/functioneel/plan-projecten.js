// Een plan met meer projecten (v17.40, na de onafhankelijke controle): wisselen, hernoemen, de overgang voor wie al werk had,
// "Project klaar" per project in de Tijdlijn, een datum die alleen in zijn eigen project meeschuift, en Begin of Verder per project.
// BASE=http://127.0.0.1:8975 node scripts/functioneel/plan-projecten.js
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 8970);
const fout = []; let n = 0; const ok = (c, m) => { n++; console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };

(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels', reducedMotion:'reduce' });
  const p = await c.newPage(); p.on('pageerror', e => PE.push(p.url().replace(B, '') + ': ' + String(e).slice(0, 160))); p.on('dialog', d => d.accept());
  const wacht = ms => p.waitForTimeout(ms);
  const frame = re => p.frames().find(f => re.test(f.url()));
  const thuis = async () => { await p.goto(B + '/', { waitUntil:'networkidle' }); await wacht(1000); };
  const projecten = async () => { await p.locator('[data-tab=projecten]').first().click(); await wacht(900); };
  const plan = () => p.evaluate(() => { const k = [...document.querySelectorAll('.path[data-path="project"]')].find(e => e.getClientRects().length); if (!k) return null;
    return [...k.querySelectorAll('.steps:not(.ook-lijst) > li.step')].map(e => (e.classList.contains('done') ? '✓' : e.classList.contains('next') ? '>' : '·') + e.querySelector('.step-name').textContent).slice(0, 3).join(' '); });
  const stap = async naam => { await thuis(); await projecten(); const k = p.locator('.path[data-path="project"]:visible').first();
    if (!(await k.locator(`.step-btn:visible:has-text("${naam}")`).count())) { await k.locator('.path-head').click(); await wacht(500); }
    await k.locator(`.step-btn:visible:has-text("${naam}")`).first().click(); await wacht(2600); };
  const begin = async f => { if (await f.locator('#begin-btn').isVisible().catch(() => false)) { await f.click('#begin-btn'); await wacht(800); } };   // de lege opdracht: Begin met de opdracht (een klik, geen werk)
  const typ = async (f, sel, tekst) => { await f.click(sel); await f.fill(sel, tekst); await wacht(300); };
  const project = async naam => { await p.evaluate(n => projOpslaan(n), naam); await wacht(400); };
  const kern = async (einde, lever) => { const f = frame(/\/opdracht\//); await begin(f); await typ(f, '#f-waarom', 'Waarom ' + einde); if (lever) await typ(f, '#f-opleveren', lever); await typ(f, '#f-einddatum', einde); await wacht(2000); };
  const tijdlijn = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('tijdlijn.v1')).lists.filter(l => !l.voorbeeld).map(l => l.name + ':' + l.items.map(i => i.text + '@' + i.date).join(',')).join(' | '); } catch { return ''; } });

  // Alfa: de kern invullen via het plan
  await p.goto(B + '/', { waitUntil:'networkidle' }); await wacht(600);
  await p.click('#wz-start'); await p.locator('#wz-keuzes >> text=Start een project').first().click(); await p.fill('#wz-naam', 'Alfa');
  await p.click('.wz-scherm:not([hidden]) .wz-go'); await wacht(300); await p.click('.wz-scherm:not([hidden]) .wz-go'); await wacht(2600);
  await kern('2027-06-30');
  await thuis(); await projecten(); ok(/^✓Opdracht: de kern/.test(await plan()), 'Alfa: de kern is gedaan (' + await plan() + ')');

  // 1. Wisselen naar een nieuw project Gamma; de opdracht openen en er alleen in tikken: geen vinkje voor Gamma
  await project('Gamma'); await stap('Opdracht: de kern');
  const fg = frame(/\/opdracht\//); await begin(fg); await fg.click('#f-waarom'); await wacht(1800);
  await thuis(); await projecten(); ok(/^>Opdracht: de kern/.test(await plan()), 'Gamma: tikken zonder te typen geeft geen vinkje (' + await plan() + ')');
  await p.reload({ waitUntil:'networkidle' }); await wacht(1200); await projecten();
  ok(/^>Opdracht: de kern/.test(await plan()), 'Gamma: ook na herladen geen vinkje (' + await plan() + ')');
  // een gloednieuw project: de tegel en het stappenplan zeggen allebei Begin
  await project('Delta'); await thuis();
  { const t = await p.evaluate(() => [...document.querySelectorAll('.stile[data-start="project"], .sd-k[data-start="project"]')].filter(e => e.getClientRects().length).map(e => e.innerText.replace(/\s+/g, ' ')).join(' | '));
    await projecten(); const k = await p.evaluate(() => { const e = [...document.querySelectorAll('.path[data-path="project"] .path-note')].find(x => x.getClientRects().length); return e ? e.textContent : ''; });
    ok(t && !/Verder/.test(t) && !/Stap \d/.test(k), 'Delta (nieuw): de tegel zegt niet Verder en het plan toont geen stap (' + t + ' / ' + k + ')'); }


  // 2. Hernoemen: Alfa heet voortaan Alfa Mechelen; de voortgang gaat mee
  await project('Alfa'); await p.evaluate(() => projOpslaan('Alfa Mechelen', true)); await wacht(600);
  await thuis(); await projecten(); ok(/^✓Opdracht: de kern/.test(await plan()), 'hernoemd: de kern blijft gedaan (' + await plan() + ')');

  // 3. "Project klaar" per project: Gamma met een einddatum krijgt zijn eigen mijlpaal in de Tijdlijn
  await project('Gamma'); await stap('Opdracht: de kern'); await kern('2027-06-30');
  await stap('Tijdlijn'); let tl = await tijdlijn();
  ok(/Gamma:Project klaar@2027-06-30/.test(tl), 'Gamma: Project klaar staat in de Tijdlijn van Gamma (' + tl + ')');

  // 4. Een datum schuift alleen in zijn eigen project: Gamma naar 1 oktober, Alfa blijft 30 juni
  await project('Alfa Mechelen'); await stap('Tijdlijn'); tl = await tijdlijn();
  ok(/Alfa[^|]*:Project klaar@2027-06-30/.test(tl), 'Alfa: Project klaar staat ook in de Tijdlijn van Alfa (' + tl + ')');
  await project('Gamma'); await stap('Opdracht: de kern'); { const f = frame(/\/opdracht\//); await typ(f, '#f-einddatum', '2027-10-01'); await wacht(1800); }
  await stap('Tijdlijn'); tl = await tijdlijn();
  ok(/Gamma:Project klaar@2027-10-01/.test(tl) && /Alfa[^|]*:Project klaar@2027-06-30/.test(tl), 'de datum schoof alleen in Gamma mee (' + tl + ')');

  // 5. De overgang voor wie al werk had: geen werk-pp, twee projecten met werk; de opdracht openen in Gamma laat Alfa gedaan
  await p.evaluate(() => { localStorage.removeItem('oc-app.werk-pp'); });
  await project('Gamma'); await stap('Opdracht: de kern'); { const f = frame(/\/opdracht\//); await begin(f); await f.click('#f-waarom'); await wacht(1500); }
  await project('Alfa Mechelen'); await thuis(); await projecten();
  ok(/^✓Opdracht: de kern/.test(await plan()), 'overgang: Alfa blijft gedaan nadat Gamma de opdracht opende (' + await plan() + ')');
  await project('Gamma'); await thuis(); await projecten();
  ok(/^✓Opdracht: de kern/.test(await plan()), 'overgang: Gamma is ook gedaan (' + await plan() + ')');

  // 6. Snel na je laatste invoer een nieuw project maken (na de tweede controle): het nieuwe project krijgt geen vinkje
  await project('Alfa Mechelen'); await stap('Opdracht: de kern');
  { const f = frame(/\/opdracht\//); await f.click('#f-opdrachtgever'); await f.fill('#f-opdrachtgever', 'Schepen van cultuur'); await wacht(300); }
  await thuis(); await project('Epsilon'); await stap('Opdracht: de kern'); await wacht(3000);
  await thuis(); await projecten(); ok(/^>Opdracht: de kern/.test(await plan()), 'Epsilon, kort na werk in Alfa gemaakt: geen vinkje (' + await plan() + ')');

  // 7. Werk met alleen knoppen telt ook (na de tweede controle): RACI, Maak er mijn eigen van, een cel aanduiden
  { const q = await c.newPage(); await q.goto(B + '/raci/', { waitUntil:'networkidle' }); await q.waitForTimeout(1000);
    await q.click('text=Voorbeeld bekijken'); await q.waitForTimeout(800);
    const eigen = q.locator('button:visible:has-text("Maak er mijn eigen van")'); if (await eigen.count()) { await eigen.first().click(); await q.waitForTimeout(2000); }
    await q.locator('button.cell:visible').nth(1).click(); await q.waitForTimeout(500);
    const k = q.locator('button.kies-o:visible').first(); if (await k.count()) await k.click(); await q.waitForTimeout(2500);
    const w = await q.evaluate(() => JSON.parse(localStorage.getItem('oc-app.werk-pp') || '{}').raci || []);
    ok(w.includes('Epsilon'), 'RACI: werk met alleen knoppen telt voor het project (' + JSON.stringify(w) + ')'); await q.close(); }

  // 8. Een andere weergave kiezen is geen werk (na de derde controle): Alle vakken in een nieuwe opdracht
  await project('Zeta'); await stap('Opdracht: de kern');
  { const f = frame(/\/opdracht\//); await begin(f); await f.click('[data-zicht="alles"]'); await wacht(2500); }
  await thuis(); await projecten(); ok(/^>Opdracht: de kern/.test(await plan()), 'Zeta: Alle vakken kiezen geeft geen vinkje (' + await plan() + ')');

  if (process.env.DEBUG) console.log('WERK', await p.evaluate(() => localStorage.getItem('oc-app.werk-pp')), '\nREG', await p.evaluate(() => localStorage.getItem('oc-app.projecten-tools')));
  ok(!PE.length, 'geen paginafouten' + (PE.length ? ': ' + PE.slice(0, 3).join(' | ') : ''));
  console.log(`\n${n} controles, fouten: ${fout.length}`); await b.close(); process.exit(fout.length ? 1 : 0);
})();
