const { chromium } = require('playwright');
// Vinkje: meerdere lijsten staan als tabbladen naast elkaar (ook op gsm); kiezen, pijltjes en Nieuwe lijst volgen dezelfde weg als de kiezer.
// Draai: PORT=P node vinkje-tabs-logica.js (met de site op die poort). Schermafbeeldingen komen in de huidige map.
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
 for (const [n, w, h] of [['gsm', 390, 844], ['lap', 1280, 800]]) {
  const c = await b.newContext({ viewport:{ width:w, height:h }, serviceWorkers:'block', deviceScaleFactor:2 }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${process.env.PORT}/vinkje/`); await p.waitForTimeout(500);
  // drie lijsten zetten zoals de tool ze bewaart
  const key = await p.evaluate(() => Object.keys(localStorage).find(k => /vink/i.test(k) && !k.startsWith('oc.')) || null);
  await p.evaluate(() => { const L = (n, it) => ({ id:'l' + n.length, name:n, items:it.map((t, i) => ({ id:n + i, text:t, done:i === 0 })) });
    const st = { lists:[L('Verhuis', ['Dozen', 'Huurcontract', 'Elektriciteit']), L('Boodschappen voor het weekend', ['Melk', 'Brood']), L('Werk', ['Mail Jan', 'Verslag', 'Planning', 'Offerte'])], current:'l4', doneOpen:true };
    const meta = document.querySelector('meta[name="oc:opslag"]'); const k = meta.content.split(',')[0].trim(); localStorage.setItem(k, JSON.stringify(st)); });
  await p.reload(); await p.waitForTimeout(700);
  const tabs = await p.$$eval('#tabs [data-tab]', a => a.map(x => [x.textContent.trim(), x.getAttribute('aria-selected')]));
  ok(tabs.length === 3, n + ' drie tabbladen: ' + JSON.stringify(tabs));
  const vis = await p.$eval('#tabs', t => !t.hidden && t.getBoundingClientRect().height > 0);
  ok(vis, n + ' tabbalk zichtbaar');
  await p.screenshot({ path:`${n}-tabs.png` });
  await p.click('#tabs [data-tab="l7"]'); await p.waitForTimeout(300);
  const titel = await p.$eval('#open-items', e => e.textContent);
  ok(/Dozen|Huurcontract/.test(titel) || /Elektriciteit/.test(titel), n + ' klik op Verhuis toont die lijst');
  const sel = await p.$eval('#tabs [aria-selected="true"]', x => x.textContent);
  ok(/Verhuis/.test(sel), n + ' actief tabblad volgt');
  const kies = await p.$eval('.oc-pk-knop', x => x.textContent);
  ok(/Verhuis/.test(kies), n + ' kiezer bovenaan volgt: ' + kies.trim());
  await p.focus('#tabs [aria-selected="true"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  const sel2 = await p.$eval('#tabs [aria-selected="true"]', x => x.textContent);
  ok(/Boodschappen/.test(sel2), n + ' pijltje rechts kiest volgende');
  const h44 = await p.$$eval('#tabs .tab', a => a.every(x => x.getBoundingClientRect().height >= 44));
  ok(h44, n + ' tabbladen ≥ 44px');
  await p.click('#tabs [data-tab-nieuw]'); await p.waitForTimeout(300);
  const nl = await p.evaluate(() => document.querySelectorAll('#tabs [data-tab]').length);
  ok(nl === 4, n + ' Nieuwe lijst maakt een vierde tabblad');
  await p.screenshot({ path:`${n}-nieuw.png` });
  ok(!errs.length, n + ' geen paginafouten ' + errs.join('|'));
  await c.close(); }
 await b.close(); })();
