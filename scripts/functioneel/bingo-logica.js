// Bingo: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/bingo/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  // 1. Twintig eigen buzzwords: de melding zegt hoeveel er echt op de kaart staan (klein, bingo)
  await p.evaluate(() => document.querySelector('[data-thema="eigen"]').click());
  await p.fill('#eigen-in', Array.from({ length:20 }, (_, i) => 'Woord' + (i + 1)).join('\n'));
  await p.click('#eigen-ok'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => bingo.staat()), opKaart = st.kaart.filter(w => /^Woord\d+$/.test(w)).length;
  const t = await p.evaluate(() => (document.querySelector('#toast-text, .toast, #toast') || {}).textContent || '');
  ok(new RegExp('^' + opKaart + ' van je 20 eigen buzzwords op je kaart').test(t), 'melding telt wat op de kaart staat: ' + opKaart + ' van 20 (' + t + ')');
  ok(!/^20 eigen buzzwords op je kaart/.test(t), 'geen "20 eigen buzzwords op je kaart" bij een kaart van ' + st.kaart.length + ' vakjes');
  // 2. Vier volle lijnen: geen "Dubbele bingo!", wel hoeveel rijen
  for (const i of [0, 1, 2, 3, 4, 5, 6]) await p.evaluate(i => bingo.vink(i), i);
  const s4 = (await p.textContent('#status')).replace(/\s+/g, ' '), n4 = (await p.evaluate(() => bingo.staat().gevierd)).length;
  // (hertest b: dat zijn 2 rijen, 1 kolom en 1 diagonaal, niet "4 rijen")
  ok(n4 === 4 && !/Dubbele bingo/.test(s4) && /2 rijen, 1 kolom en 1 diagonaal vol/.test(s4) && !/4 rijen/.test(s4), 'vier volle lijnen: geen "Dubbele bingo", wel "2 rijen, 1 kolom en 1 diagonaal vol" (' + s4 + ')');
  // 3. Precies twee volle rijen blijft "Dubbele bingo!"
  await p.evaluate(() => { [0, 1, 2, 3, 4, 5, 6].forEach(i => bingo.vink(i)); [0, 1, 2, 3, 4, 5].forEach(i => bingo.vink(i)); }); await p.waitForTimeout(100);
  const s2 = (await p.textContent('#status')).replace(/\s+/g, ' ');
  ok(/Dubbele bingo/.test(s2), 'twee volle rijen: "Dubbele bingo!" (' + s2 + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
