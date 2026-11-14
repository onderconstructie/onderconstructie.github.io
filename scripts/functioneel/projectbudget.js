// Projectbudget: rekenen, invoer, vastleggen en terugnemen, aankoopprocedure, exports, bewaren.
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9421);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'nl-BE', acceptDownloads: true }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  const tot = () => p.evaluate(() => [...document.querySelectorAll('.bg-cijfers b')].map(x => x.textContent));
  await p.goto(B + '/projectbudget/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(await p.isVisible('#ocStart'), 'leeg: de startkaart staat er');
  await p.click('#ocStart .oc-begin'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const voeg = async (naam, soort, aard, v) => { await p.fill('#name', naam); await p.click(`#soort [data-soort="${soort}"]`); await p.selectOption('#aard', aard);
    if (aard === 'mensen') { await p.fill('#dagen', v[0]); await p.fill('#dagprijs', v[1]); } else await p.fill('#bedrag', v); await p.click('#submit'); await p.waitForTimeout(250); };
  await voeg('Ontwikkeling', 'eenmalig', 'extern', '100.000');
  await voeg('Projectleider', 'eenmalig', 'mensen', ['10', '500']);
  await voeg('Licentie', 'jaarlijks', 'licentie', '12 000,50');
  let t = await tot();
  ok(t[0] === '€ 105.000' && t[1] === '€ 12.001', 'eenmalig 105.000 en elk jaar 12.001 (' + t.join(' | ') + ')');
  // 105000 + 12000,5 × 3 = 141001,5; + 10% = 155101,65
  ok(t[2] === '€ 155.102', 'totaal over 3 jaar met 10% marge = 155.102 (' + t[2] + ')');
  await p.click('#jaar-plus'); await p.click('#marge [data-marge="0"]'); await p.waitForTimeout(200); t = await tot();
  ok(t[2] === '€ 153.002', '4 jaar zonder marge = 153.002 (' + t[2] + ')');
  await p.fill('#name', 'Fout'); await p.selectOption('#aard', 'extern'); await p.fill('#bedrag', 'veel'); await p.click('#submit'); await p.waitForTimeout(200);
  ok(await p.isVisible('#fout') && (await p.locator('.bg-post').count()) === 3, 'een bedrag dat geen getal is, wordt geweigerd met een melding');
  await p.fill('#bedrag', '-5'); await p.click('#submit'); await p.waitForTimeout(200);
  ok((await p.locator('.bg-post').count()) === 3, 'een negatief bedrag wordt geweigerd');
  await p.fill('#name', ''); await p.fill('#bedrag', '');
  // aanpassen
  await p.click('.bg-post:has-text("Ontwikkeling") .pn'); await p.waitForTimeout(300);
  ok((await p.inputValue('#bedrag')) === '100000' && (await p.textContent('#submit-text')) === 'Klaar', 'tik op een kost: het formulier toont ze om aan te passen');
  await p.fill('#bedrag', '80000'); await p.click('#submit'); await p.waitForTimeout(250); t = await tot();
  ok(t[0] === '€ 85.000', 'aangepast: eenmalig 85.000 (' + t[0] + ')');
  // vastleggen, wijzigen, terugnemen
  await p.click('#vast'); await p.waitForTimeout(300);
  ok(await p.isVisible('#evo-card') && /geen verschil/.test(await p.innerText('#evo-card')), 'vastgelegd: de evolutie toont geen verschil');
  await voeg('Opleiding', 'eenmalig', 'ander', '5000'); 
  ok(/\+ € 5\.000/.test(await p.innerText('#evo-card')), 'na een nieuwe kost: + € 5.000 tegenover de vastgelegde raming');
  await p.click('#evo-card [data-terug]'); await p.waitForTimeout(300); t = await tot();
  ok(t[0] === '€ 85.000' && (await p.locator('.bg-post').count()) === 3, 'Neem terug: de raming van toen staat er weer');
  await p.click('#toast-btn'); await p.waitForTimeout(300);
  ok((await p.locator('.bg-post').count()) === 4, 'Ongedaan: de vier kosten zijn terug');
  // verwijderen met ongedaan
  await p.click('.bg-post:has-text("Opleiding") .del'); await p.waitForTimeout(250); ok((await p.locator('.bg-post').count()) === 3, 'kost verwijderd');
  await p.click('#toast-btn'); await p.waitForTimeout(250); ok((await p.locator('.bg-post').count()) === 4, 'Ongedaan zet ze terug');
  // Vlaamse overheid
  ok(await p.isHidden('#vo-card'), 'de aankoopprocedure staat standaard uit');
  await p.click('#vo'); await p.waitForTimeout(300);
  const vo = await p.innerText('#vo-card');
  ok(/Ontwikkeling\s*€ 80\.000\s*Onderhandelingsprocedure zonder voorafgaande bekendmaking/.test(vo), '80.000: onderhandelingsprocedure zonder voorafgaande bekendmaking');
  ok(/Licentie\s*€ 48\.002\s*Onderhandelingsprocedure zonder/.test(vo) && /per jaar, over 4 jaar/.test(vo), 'een kost van elk jaar telt over de looptijd (12.000,50 × 4)');
  ok(/Opleiding\s*€ 5\.000\s*Opdracht van beperkte waarde/.test(vo) && !/Projectleider/.test(vo), '5.000: beperkte waarde; eigen mensen tellen niet mee');
  ok(/opsplitsen mag niet/i.test(vo) && /geen advies/.test(vo) && /2026-2027/.test(vo), 'waarschuwing over opsplitsen, geen advies, en de geldigheid staan erbij');
  const dr = await p.evaluate(() => [29999, 30000, 139999, 140000, 215999, 216000].map(w => voProcedure(w).naam.slice(0, 22)));
  ok(dr[0] !== dr[1] && dr[1] === dr[2] && dr[2] !== dr[3] && dr[3] === dr[4] && dr[4] !== dr[5], 'drempels: lager dan 30.000, 140.000 en 216.000');
  // bewaren
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); t = await tot();
  ok(t[0] === '€ 90.000' && (await p.locator('.bg-post').count()) === 4 && await p.isVisible('#vo-card'), 'na herladen staat alles er nog');
  // exports
  const dl = async (sel, ext) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 25000 }).catch(() => null), p.evaluate(s => document.querySelector(s).click(), sel)]); if (!d) return null; const f = path.join(os.tmpdir(), 'oc-projectbudget-test.' + ext); await d.saveAs(f); const u = fs.readFileSync(f); fs.unlinkSync(f); return { naam: d.suggestedFilename(), u }; };
  const csv = await dl('#menu [data-act="csv"]', 'csv');
  ok(csv && /^projectbudget-.*\.csv$/.test(csv.naam) && /Elk jaar;Licenties en abonnementen;Licentie;;;12000,5/.test(csv.u.toString('utf8')) && /Totaal over 4 jaar;;;138002/.test(csv.u.toString('utf8')), 'CSV met de kosten en het totaal');
  const pdf = await dl('.bg-exp [data-exp="pdf"]', 'pdf'); ok(pdf && pdf.u.slice(0, 4).toString() === '%PDF', 'PDF gedownload');
  const png = await dl('.bg-exp [data-exp="png"]', 'png'); ok(png && png.u[1] === 0x50 && png.u[2] === 0x4e, 'afbeelding gedownload');
  const odt = await dl('.bg-exp [data-oc-odt]', 'odt'); ok(odt && /\.odt$/.test(odt.naam) && odt.u.toString('utf8').includes('Onderhandelingsprocedure zonder voorafgaande bekendmaking'), 'tekstdocument met de aankoopprocedure als tekst');
  // voorbeeld
  await p.evaluate(() => loadExample()); await p.waitForTimeout(400); t = await tot();
  ok(await p.isHidden('#vo-card'), 'voorbeeld: de aankoopprocedure staat uit, het is een keuze');
  ok(t[2] === '€ 448.800' && await p.isVisible('#vb-bar'), 'voorbeeld: totaal 448.800, afgerond het budget van de Projectopdracht');
  const r = await p.evaluate(() => ({ breed: document.documentElement.scrollWidth - innerWidth, klein: [...document.querySelectorAll('main button, main select, main input')].filter(e => e.offsetWidth && (e.getBoundingClientRect().height < 43.5)).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)) }));
  ok(r.breed <= 0, 'niets valt buiten het scherm op een gsm'); ok(r.klein.length === 0, 'alle knoppen en velden minstens 44 px hoog ' + r.klein.join(', '));
  ok(E.length === 0, 'geen scriptfouten ' + E.join(' | '));
  await b.close(); console.log(fout.length ? '\n' + fout.length + ' FOUT' : '\nalles ok'); process.exit(fout.length ? 1 : 0); })();
