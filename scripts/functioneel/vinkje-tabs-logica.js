const { chromium } = require('playwright');
// Vinkje: meerdere lijsten staan als tabbladen naast elkaar (ook op gsm). Het actieve tabblad is de kiezer zelf (geen dubbele keuze bovenaan).
// Kiezen, pijltjes en Nieuwe lijst volgen dezelfde weg als de kiezer. "Deel als lijst" geeft platte tekst voor een chat.
// Draai: PORT=P node vinkje-tabs-logica.js (met de site op die poort). Schermafbeeldingen komen in de huidige map.
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
 for (const [n, w, h] of [['gsm', 390, 844], ['lap', 1280, 800]]) {
  const c = await b.newContext({ viewport:{ width:w, height:h }, serviceWorkers:'block', deviceScaleFactor:2, permissions:['clipboard-read', 'clipboard-write'] }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${process.env.PORT}/vinkje/`); await p.waitForTimeout(500);
  await p.evaluate(() => { const L = (id, n, it) => ({ id, name:n, items:it.map((t, i) => ({ id:id + i, text:t, done:i === 0 })) });
    const st = { lists:[L('a', 'Verhuis', ['Dozen', 'Huurcontract', 'Elektriciteit']), L('b', 'Boodschappen voor het weekend', ['Melk', 'Brood']), L('c', 'Werk', ['Mail Jan', 'Verslag', 'Planning', 'Offerte'])], current:'c', doneOpen:true };
    st.lists[2].items[2].who = 'Jan'; st.lists[2].items[2].when = '2026-11-20';
    const k = document.querySelector('meta[name="oc:opslag"]').content.split(',')[0].trim(); localStorage.setItem(k, JSON.stringify(st)); });
  await p.reload(); await p.waitForTimeout(700);
  const rij = await p.$$eval('#tabs > *', a => a.map(x => x.matches('.oc-pk') ? 'KIEZER:' + x.querySelector('.oc-pk-naam').textContent : x.textContent.trim()));
  ok(rij.length === 4 && rij[2] === 'KIEZER:Werk', n + ' rij: 2 tabbladen, de kiezer als actief tabblad op zijn plaats, Nieuwe lijst: ' + JSON.stringify(rij));
  const dubbel = await p.evaluate(() => document.querySelectorAll('.oc-pk-knop').length === 1 && !document.querySelector('header .oc-pk'));
  ok(dubbel, n + ' geen tweede keuze bovenaan');
  const groen = await p.$eval('#tabs .oc-pk-knop', x => getComputedStyle(x).backgroundColor);
  ok(groen === 'rgb(4, 120, 87)', n + ' actief tabblad groen: ' + groen);
  const kaart = await p.$eval('#card', x => getComputedStyle(x).backgroundColor);
  ok(kaart === 'rgb(245, 252, 248)', n + ' lijst zeer licht groen: ' + kaart);
  await p.screenshot({ path:`${n}-tabs.png` });
  await p.click('#tabs [data-tab="a"]'); await p.waitForTimeout(300);
  ok(/Huurcontract/.test(await p.$eval('#open-items', e => e.textContent)), n + ' klik op Verhuis toont die lijst');
  ok(/Verhuis/.test(await p.$eval('#tabs .oc-pk-naam', x => x.textContent)), n + ' het actieve tabblad volgt');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250);
  ok(/Boodschappen/.test(await p.$eval('#tabs .oc-pk-naam', x => x.textContent)), n + ' pijltje rechts kiest de volgende');
  await p.click('#tabs .oc-pk-knop'); await p.waitForTimeout(250);
  ok(await p.$eval('#tabs .oc-pk-menu', m => !m.hidden), n + ' tik op het actieve tabblad opent hernoemen en wissen');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(await p.$$eval('#tabs .tab, #tabs .oc-pk-knop', a => a.every(x => x.getBoundingClientRect().height >= 44)), n + ' tabbladen minstens 44 px');
  await p.click('#tabs [data-tab="c"]'); await p.waitForTimeout(250);
  await p.click('#deel-lijst'); await p.waitForTimeout(400);
  const t = n === 'lap' ? await p.evaluate(() => navigator.clipboard.readText()) : await p.evaluate(() => lijstAlsTekst(cur()));
  ok(t.startsWith('Werk\n☐ Verslag\n☐ Planning (Jan, vr 20 nov)\n☐ Offerte\n\nAl gedaan:\n✓ Mail Jan'), n + ' deel als lijst: ' + JSON.stringify(t));
  await p.click('#tabs [data-tab-nieuw]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => state.lists.length === 4), n + ' Nieuwe lijst maakt een vierde lijst');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.evaluate(() => { state.lists = [state.lists[0]]; state.current = state.lists[0].id; save(); render(); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => $('tabs').hidden && !!document.querySelector('header .oc-pk')), n + ' één lijst: geen tabbladen, de kiezer terug bovenaan');
  ok(!errs.length, n + ' geen paginafouten ' + errs.join('|'));
  await c.close(); }
 await b.close(); })();
