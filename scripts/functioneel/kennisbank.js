// Kennisbank: blokken, tags, verbanden, verwijzingen, zoeken en filteren, kaart, rapport, ophalen uit andere tools, bewaren.
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9421);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'nl-BE', acceptDownloads: true }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  await p.goto(B + '/kennisbank/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  ok(await p.isVisible('#ocStart'), 'leeg: de startkaart staat er');
  await p.click('#ocStart .oc-begin'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const voeg = async (t, x, g) => { await p.fill('#name', t); await p.fill('#tekst', x); await p.fill('#tags', g); await p.click('#submit'); await p.waitForTimeout(250); };
  await voeg('Loket blijft open', 'Besloten door de stuurgroep.', 'Besluit, #Loket, loket');
  await voeg('Les over testen', 'Test met echte lezers. Zie [[Loket blijft open]].', 'leerpunt');
  await voeg('Opleiding loket', 'Eén blad volstaat.', 'loket; opleiding');
  await voeg('Los blok', '', '');
  const n = () => p.locator('.kb-blok').count();
  ok(await n() === 4, 'vier blokken toegevoegd');
  const st = await p.evaluate(() => cur().items.map(i => i.titel + ':' + i.tags.join('+')));
  ok(st.includes('Loket blijft open:besluit+loket') && st.includes('Opleiding loket:loket+opleiding'), 'tags: kleine letters, zonder #, geen dubbels, komma of puntkomma (' + st.join(' | ') + ')');
  const samen = t => p.evaluate(t => { const l = cur(), it = l.items.find(i => i.titel === t); return samen(l, it).map(x => x.o.titel + (x.link ? '*' : '')); }, t);
  ok((await samen('Loket blijft open')).join() === 'Les over testen*,Opleiding loket', 'verband: eerst de verwijzing, dan de gedeelde tag');
  ok((await samen('Les over testen')).join() === 'Loket blijft open*', 'een verwijzing werkt in beide richtingen');
  ok((await samen('Los blok')).length === 0, 'geen tag en geen verwijzing: geen verband (niets geraden)');
  await p.fill('#name', 'loket BLIJFT open'); await p.click('#submit'); await p.waitForTimeout(200);
  ok(await p.isVisible('#fout') && await n() === 4, 'een tweede blok met dezelfde titel wordt geweigerd'); await p.fill('#name', '');
  // titel wijzigen: de verwijzing volgt
  await p.click('.kb-blok:has(h3:text-is("Loket blijft open")) h3'); await p.waitForTimeout(300); await p.fill('#name', 'Het loket blijft open'); await p.click('#submit'); await p.waitForTimeout(300);
  ok(/\[\[Het loket blijft open\]\]/.test(await p.evaluate(() => cur().items.find(i => i.titel === 'Les over testen').tekst)), 'nieuwe titel: de verwijzing in het andere blok volgt mee');
  // filter en zoeken
  await p.click('#filter [data-tag="loket"]'); await p.waitForTimeout(200); ok(await n() === 2 && /2 van 4/.test(await p.textContent('#count')), 'filter op tag loket: 2 van 4');
  await p.click('#filter [data-tag="loket"]'); await p.fill('#zoek', 'echte lezers'); await p.waitForTimeout(200); ok(await n() === 1, 'zoeken in de tekst: 1 blok');
  await p.fill('#zoek', 'xyzq'); await p.waitForTimeout(200); ok(/Niets gevonden/.test(await p.innerText('#list')), 'niets gevonden: een duidelijke melding');
  await p.fill('#zoek', ''); await p.waitForTimeout(200);
  // springen naar een blok dat samenhangt
  await p.click('.kb-blok:has(h3:text-is("Les over testen")) [data-naar]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => document.activeElement && /Het loket blijft open/.test(document.activeElement.innerText)), 'tik op "hangt samen met": je springt naar dat blok');
  // kaart
  await p.click('[data-weergave="kaart"]'); await p.waitForTimeout(300);
  const k = await p.evaluate(() => ({ knopen: document.querySelectorAll('#kaart .knoop').length, hubs: document.querySelectorAll('#kaart .hub').length, lijnen: document.querySelectorAll('#kaart .lijn:not(.sterk)').length, sterk: document.querySelectorAll('#kaart .lijn.sterk').length, breed: document.documentElement.scrollWidth - innerWidth, klein: [...document.querySelectorAll('#kaart text')].filter(t => parseFloat(getComputedStyle(t).fontSize) < 13).length }));
  ok(k.knopen === 4 && k.hubs === 4 && k.lijnen === 5 && k.sterk === 1, 'kaart: 4 blokken, 4 tags, 5 lijnen naar tags en 1 verwijzing (' + JSON.stringify(k) + ')');
  ok(k.breed <= 0 && k.klein === 0, 'kaart past op een gsm, tekst minstens 13 px');
  await p.click('#kaart .hub[data-tag="loket"]'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelectorAll('#kaart .knoop').length) === 2, 'tik op een tag in de kaart: filter');
  await p.click('#kaart .knoop'); await p.waitForTimeout(400); ok(await p.isVisible('#list') && await n() === 2, 'tik op een blok in de kaart: je gaat naar de lijst');
  // rapport van wat je ziet
  const dl = async (sel, ext) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 25000 }).catch(() => null), p.evaluate(s => document.querySelector(s).click(), sel)]); if (!d) return null; const f = path.join(os.tmpdir(), 'oc-kennisbank-test.' + ext); await d.saveAs(f); const u = fs.readFileSync(f); fs.unlinkSync(f); return { naam: d.suggestedFilename(), u }; };
  const csv = await dl('#menu [data-act="csv"]', 'csv'); const ct = csv ? csv.u.toString('utf8') : '';
  ok(csv && /kennisbank-.*loket/.test(csv.naam) && /Het loket blijft open/.test(ct) && /Opleiding loket/.test(ct) && !/Los blok/.test(ct), 'CSV bevat alleen wat je ziet (tag loket)');
  const odt = await dl('.kb-exp [data-oc-odt]', 'odt'); ok(odt && /\.odt$/.test(odt.naam) && odt.u.toString('utf8').includes('Hangt samen met: Les over testen'), 'tekstdocument met de verbanden als tekst');
  const pdf = await dl('.kb-exp [data-exp="pdf"]', 'pdf'); ok(pdf && pdf.u.slice(0, 4).toString() === '%PDF', 'PDF gedownload');
  // verwijderen, ongedaan, bewaren
  await p.click('#filter [data-tag="loket"]'); await p.click('.kb-blok:has(h3:text-is("Los blok")) .del'); await p.waitForTimeout(250); ok(await n() === 3, 'blok verwijderd');
  await p.click('#toast-btn'); await p.waitForTimeout(250); ok(await n() === 4, 'Ongedaan zet het terug');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); ok(await n() === 4, 'na herladen staat alles er nog');
  // ophalen uit andere tools: een beslissing die een andere tool klaarlegde
  await p.evaluate(() => ocShare.publish('beslissingen', 'Beslissingslog', [{ name: cur().name, items: [{ type: 'besluit', text: 'We starten in januari', note: 'Beslist door de stuurgroep' }, { type: 'taak', text: 'Dit is een taak' }] }]));
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  ok(await p.isVisible('#oc-imp'), 'er ligt iets klaar: de knop "Haal uit je andere tools" verschijnt');
  await p.click('#oc-imp'); await p.waitForTimeout(500);
  const kies = await p.evaluate(() => [...document.querySelectorAll('.ocs-item')].map(x => x.innerText.trim().slice(0, 40)));
  ok(kies.length === 1 && /We starten in januari/.test(kies[0]), 'de kiezer toont de beslissing, niet de taak (' + kies.join(' | ') + ')');
  await p.click('.ocs-item input'); await p.evaluate(() => { const k = [...document.querySelectorAll('.ocs button, [class^="ocs"] button')].find(x => /overnemen|neem/i.test(x.innerText) && !x.disabled); k && k.click(); }); await p.waitForTimeout(500);
  const nw = await p.evaluate(() => { const i = cur().items.find(x => x.titel === 'We starten in januari'); return i ? i.tags.join() + '|' + i.bron + '|' + i.tekst : ''; });
  ok(nw === 'besluit|Beslissingslog|Beslist door de stuurgroep', 'het wordt een blok met tag besluit en de bron erbij (' + nw + ')');
  // voorbeeld en vormgeving
  await p.evaluate(() => loadExample()); await p.waitForTimeout(400);
  const r = await p.evaluate(() => ({ n: document.querySelectorAll('.kb-blok').length, breed: document.documentElement.scrollWidth - innerWidth, klein: [...document.querySelectorAll('main button:not(.kb-sug button):not(.samen button), main input, main textarea')].filter(e => e.offsetWidth && e.getBoundingClientRect().height < 43.5).map(e => (e.id || e.className) + ':' + Math.round(e.getBoundingClientRect().height)) }));
  ok(r.n === 8 && await p.isVisible('#vb-bar'), 'voorbeeld met 8 blokken'); ok(r.breed <= 0, 'niets valt buiten het scherm op een gsm'); ok(r.klein.length === 0, 'knoppen en velden minstens 44 px hoog ' + r.klein.join(', '));
  ok(E.length === 0, 'geen scriptfouten ' + E.join(' | '));
  await b.close(); console.log(fout.length ? '\n' + fout.length + ' FOUT' : '\nalles ok'); process.exit(fout.length ? 1 : 0); })();
