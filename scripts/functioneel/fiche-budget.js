// De Projectopdracht neemt het budget over uit Projectbudget: vaste regels, zoals bij Tijdlijn en RACI.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9421);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  await p.goto(B + '/opdracht/?toon=alles', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const zetBudget = (items, extra) => p.evaluate(([items, extra]) => { localStorage.setItem('projectbudget.v1', JSON.stringify({ lists: [Object.assign({ id: 'b1', name: 'Testproject', items, jaren: 3, marge: 10, vo: false, vast: [] }, extra || {})], current: 'b1' })); }, [items, extra]);
  const A = [{ id: 'a', name: 'Bouw', soort: 'eenmalig', aard: 'extern', bedrag: 100000 }, { id: 'b', name: 'Licentie', soort: 'jaarlijks', aard: 'licentie', bedrag: 10000 }];
  await zetBudget(A);
  // een opdracht waar je nog niet aan begon: er wordt niets ingevuld
  await p.evaluate(() => { cur().name = 'Testproject'; groeiNu(); });
  ok((await p.evaluate(() => cur().budget)) === '', 'nog niet begonnen: het budget blijft leeg');
  await p.evaluate(() => { cur().waarom = 'We willen sneller beslissen.'; save(); groeiNu(); });
  let v = await p.evaluate(() => cur().budget);
  ok(v === '€ 143.000 over 3 jaar, met 10% marge', 'begonnen: het budget komt uit Projectbudget (100.000 + 3 × 10.000, plus 10%): ' + v);
  await p.evaluate(() => render()); await p.waitForTimeout(300);
  ok(/Komt uit je Projectbudget/.test(await p.innerText('[data-bron="budget"]')) && /Bewerk in het Projectbudget/.test(await p.innerText('[data-bron="budget"]')), 'bij het vak staat waar het vandaan komt, met "het Projectbudget"');
  // het budget verandert in de bron: de fiche volgt
  await zetBudget(A.concat([{ id: 'c', name: 'Opleiding', soort: 'eenmalig', aard: 'ander', bedrag: 10000 }])); await p.evaluate(() => groeiNu());
  v = await p.evaluate(() => cur().budget); ok(v === '€ 154.000 over 3 jaar, met 10% marge', 'de bron verandert: het vak volgt (' + v + ')');
  // zelf iets anders geschreven: eerst vragen
  await p.evaluate(() => { cur().budget = '€ 200.000 afgesproken'; save(); }); await zetBudget(A, { marge: 0 }); await p.evaluate(() => { groeiNu(); render(); }); await p.waitForTimeout(300);
  ok((await p.evaluate(() => cur().budget)) === '€ 200.000 afgesproken', 'zelf iets anders geschreven: de tool overschrijft het niet');
  const t = await p.innerText('[data-bron="budget"]');
  ok(/Het Projectbudget heeft iets anders/.test(t) && /€ 130\.000 over 3 jaar/.test(t) && /Werk bij uit het Projectbudget/.test(t) && /Laat zo/.test(t), 'de tool vraagt het eerst: ' + t.replace(/\n+/g, ' / '));
  await p.click('[data-bron="budget"] [data-bron-neem]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => cur().budget)) === '€ 130.000 over 3 jaar', 'Werk bij: het budget van de bron staat erin, zonder marge als die 0 is');
  // een leeg budget of een voorbeeld telt niet
  await zetBudget([]); ok(await p.evaluate(() => BRON.budget.lees(cur()) === null), 'een leeg budget geeft niets door');
  await zetBudget(A, { voorbeeld: true }); ok(await p.evaluate(() => BRON.budget.lees(cur()) === null), 'het voorbeeld van Projectbudget geeft niets door');
  ok(E.length === 0, 'geen scriptfouten ' + E.join(' | '));
  await b.close(); console.log(fout.length ? '\n' + fout.length + ' FOUT' : '\nalles ok'); process.exit(fout.length ? 1 : 0); })();
