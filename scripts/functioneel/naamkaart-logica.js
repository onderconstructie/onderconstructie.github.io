// Hernoemen en wisselen (hertest e): hernoem je in de app Alfa naar "Alfa twee", wissel je naar Beta en terug, dan toont elke tool het werk van Alfa.
// De app houdt een blijvende naamkaart bij (oc.project.namen) en geeft de vorige namen mee bij elke wissel. Veilige regel: een vorige naam
// krijgt geen nieuw project (dan zou werk dat nog onder "Alfa" staat bij een ander project komen); een tabblad met de oude naam hoort bij Alfa twee.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const TOOLS = (process.argv[2] || 'opdracht,risico,kanban,retro,klimaat,impact,stakeholders,veranderprofiel').split(',');
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1200, height:900 }, serviceWorkers:'block' });
  await c.addInitScript(() => { localStorage.setItem('oc.welkom', '1'); });
  const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e).slice(0, 150))); p.on('dialog', d => d.accept().catch(() => {}));
  const ga = async pad => { await p.goto(B + pad, { waitUntil:'networkidle' }); await p.waitForTimeout(450); };
  const leeg = () => p.evaluate(() => [...document.querySelectorAll('.oc-start, #vb-start, #startBar, .empty-board')].some(x => !x.closest('[hidden]') && x.getClientRects().length));
  const app = () => p.evaluate(() => JSON.parse(localStorage.getItem('oc.project') || 'null'));
  // 1. In de app: project Alfa, in elke tool een voorbeeld als eigen werk
  await ga('/'); await p.evaluate(() => projOpslaan('Alfa', false)); await p.waitForTimeout(200);
  const zicht = async (L, tekst) => { for (const x of L) { const l = p.locator(x + ':visible').first(); if (await l.count()) { await l.click(); await p.waitForTimeout(800); return true; } }
    const k = p.locator('button:visible', { hasText: tekst }).first(); if (await k.count()) { await k.click(); await p.waitForTimeout(800); return true; } return false; };
  for (const t of TOOLS) { await ga('/' + t + '/'); await zicht(['#vb-load', '#example', '#vb-show', '[data-act="example"]', '#vbLoad', '[data-vb="start"]', '.oc-vb'], /voorbeeld bekijken|^voorbeeld$|bekijk een voorbeeld/i); await zicht(['#vb-eigen', '[data-act="vb-eigen"]', '#vbEigen', '[data-vb="eigen"]'], /maak (er )?mijn eigen/i);
    ok(!await leeg(), `${t}: Alfa heeft werk`); }
  // 2. Hernoemen in de app, weg naar Beta en terug, zonder de tools tussendoor te openen
  await ga('/'); await p.evaluate(() => projOpslaan('Alfa twee', true)); await p.waitForTimeout(300);
  await p.evaluate(() => projWissel('Beta')); await p.waitForTimeout(200); await p.evaluate(() => projWissel('Alfa twee')); await p.waitForTimeout(200);
  let a = await app(); ok(a.name === 'Alfa twee' && (a.oud || []).includes('Alfa'), 'na wisselen weg en terug kent de app de vorige naam nog (' + JSON.stringify(a) + ')');
  for (const t of TOOLS) { await ga('/' + t + '/'); const l = await leeg(); ok(!l, `${t}: Alfa twee toont het werk van Alfa`); }
  // 3. Ook als de app oc.project zonder oud schrijft (oudere app of een wissel vanuit een tool): de tools vinden het via de naamkaart
  await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Beta', since:Date.now() })));
  await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Alfa twee', since:Date.now() + 5 })));
  for (const t of TOOLS.slice(0, 3)) { await ga('/' + t + '/'); ok(!await leeg(), `${t}: ook zonder oud in oc.project vindt de tool het werk`); }
  // 4. Veilig: een nieuw project met de oude naam "Alfa" mag niet (het werk dat nog "Alfa" heet, hoort bij Alfa twee)
  await ga('/'); await p.evaluate(() => projOpslaan('Alfa', false)); await p.waitForTimeout(300);
  a = await app(); ok(a.name === 'Alfa twee', 'een nieuw project "Alfa" wordt geweigerd: het project blijft Alfa twee (' + a.name + ')');
  // wisselen naar de oude naam (bv. een oud knopje) gaat naar het project dat die naam had
  await p.evaluate(() => projWissel('Beta')); await p.evaluate(() => projWissel('Alfa')); a = await app();
  ok(a.name === 'Alfa twee', 'wisselen naar "Alfa" gaat naar Alfa twee (' + a.name + ')');
  // 5. Wisselen vanuit een tool: in de app naar Beta, in opdracht via de projectkiezer terug naar Alfa twee; de andere tools volgen met het werk
  await ga('/'); await p.evaluate(() => projWissel('Beta')); await ga('/opdracht/');
  await p.evaluate(() => ocPk.knop.click()); await p.waitForTimeout(300);
  // het tabblad draagt hier nog de oude naam "Alfa" (opdracht was na het hernoemen niet open): kiezen moet naar Alfa twee gaan, niet naar een nieuw project "Alfa"
  const tab = p.locator('.oc-pk-item:visible', { hasText: /^\s*Alfa( twee)?\s*$/ }).first(); ok(await tab.count() > 0, 'opdracht: tabblad van Alfa in de projectkiezer');
  if (await tab.count()) { await tab.click(); await p.waitForTimeout(500); }
  a = await app(); ok(a.name === 'Alfa twee' && (a.oud || []).includes('Alfa'), 'wissel vanuit een tool geeft de vorige naam mee (' + JSON.stringify(a) + ')');
  for (const t of ['risico', 'kanban', 'retro']) { await ga('/' + t + '/'); ok(!await leeg(), `${t}: na een wissel vanuit opdracht toont Alfa twee het werk`); }
  // 6. Hertest f: Gedrag en Weerstand na hernoemen in de app (Gamma -> "Gamma twee"): het werk komt mee en het open gedrag of de open doelgroep blijft open
  await ga('/'); await p.evaluate(() => projOpslaan('Gamma', false)); await p.waitForTimeout(200);
  const vbEig = async () => { await zicht(['#vb-load', '#example', '#vb-show', '[data-act="example"]', '#vbLoad', '[data-vb="start"]', '.oc-vb'], /voorbeeld bekijken|^voorbeeld$|bekijk een voorbeeld/i); await zicht(['#vb-eigen', '[data-act="vb-eigen"]', '#vbEigen', '[data-vb="eigen"]'], /maak (er )?mijn eigen/i); };
  await ga('/gedrag/'); await vbEig(); await ga('/gedrag/'); const g0 = await p.evaluate(() => ({ wie:cur().wie, n:state.units.filter(u => !u.voorbeeld).length }));
  await ga('/weerstand/'); await vbEig(); await ga('/weerstand/'); const w0 = await p.evaluate(() => cur().name);
  await ga('/'); await p.evaluate(() => projOpslaan('Gamma twee', true)); await p.waitForTimeout(300);
  await ga('/gedrag/'); let g1 = await p.evaluate(() => ({ pr:cur().project, wie:cur().wie, n:state.units.filter(u => !u.voorbeeld).length }));
  ok(g1.pr === 'Gamma twee' && g1.wie === g0.wie && g0.wie && g1.n === g0.n, 'gedrag: na hernoemen het gedrag van het project, geen leeg "Nieuw gedrag" (' + JSON.stringify(g1) + ')');
  await ga('/weerstand/'); const w1 = await p.evaluate(() => cur().name + ' [' + cur().project + ']');
  ok(w1 === w0 + ' [Gamma twee]', 'weerstand: na hernoemen blijft de open doelgroep open (' + w1 + ', was ' + w0 + ')');
  // 7. Hertest f: hernoemen naar de naam van een ander bestaand project (Beta) mag niet, in de app en in de projectkiezer van een tool
  await ga('/'); await p.evaluate(() => projOpslaan('Gamma twee', true)); await p.evaluate(() => projOpslaan('Beta', true)); await p.waitForTimeout(300);
  let kaart = await p.evaluate(() => JSON.parse(localStorage.getItem('oc.project.namen') || '{}'));
  a = await app(); ok(a.name === 'Gamma twee' && !(kaart.Beta || []).length, 'app: hernoemen naar "Beta" geweigerd, geen vermenging in de naamkaart (' + a.name + ', ' + JSON.stringify(kaart.Beta || []) + ')');
  const melding = await p.evaluate(() => [...document.querySelectorAll('[role=status],[aria-live]')].map(e => e.innerText).join(' '));
  ok(/Beta is al een ander project/.test(melding), 'app: de melding zegt waarom');
  await ga('/risico/'); await p.evaluate(() => ocPk.knop.click()); await p.waitForTimeout(200); await p.click('[data-pk="hernoem"]');
  await p.fill('.oc-pk-veld', 'Beta'); await p.press('.oc-pk-veld', 'Enter'); await p.waitForTimeout(600);
  const fr = await p.evaluate(() => ({ open:!!document.querySelector('.oc-pk-veld'), fout:(document.querySelector('.oc-pk-fout:not([hidden])') || {}).textContent || '' }));
  a = await app(); kaart = await p.evaluate(() => JSON.parse(localStorage.getItem('oc.project.namen') || '{}'));
  ok(fr.open && /Beta is al een ander project/.test(fr.fout) && a.name === 'Gamma twee' && !(kaart.Beta || []).length, 'risico: hernoemen naar "Beta" in de projectkiezer geweigerd met de reden (' + JSON.stringify(fr) + ', app ' + a.name + ')');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => ocPk.knop.click()); await p.waitForTimeout(200); await p.click('[data-pk="hernoem"]'); await p.fill('.oc-pk-veld', 'Alfa'); await p.press('.oc-pk-veld', 'Enter'); await p.waitForTimeout(500);
  const fr2 = await p.evaluate(() => (document.querySelector('.oc-pk-fout:not([hidden])') || {}).textContent || '');
  ok(/Alfa was vroeger de naam van Alfa twee/.test(fr2), 'risico: hernoemen naar een vroegere naam van een ander project geweigerd (' + fr2 + ')'); await p.keyboard.press('Escape');
  // 8. Hertest f: migratie van v16.51: oc.project.oud zonder naamkaart. De app vult de naamkaart, en ook een tool als je de app niet opent.
  for (const pad of ['/', '/risico/']) {
    await p.evaluate(() => { localStorage.removeItem('oc.project.namen'); localStorage.setItem('oc.project', JSON.stringify({ name:'Omega', since:Date.now(), oud:['Oud omega'] })); });
    await ga(pad); kaart = await p.evaluate(() => JSON.parse(localStorage.getItem('oc.project.namen') || '{}'));
    ok(JSON.stringify(kaart.Omega) === '["Oud omega"]', `migratie via ${pad}: de naamkaart krijgt de vorige naam uit oc.project.oud (${JSON.stringify(kaart)})`);
  }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
