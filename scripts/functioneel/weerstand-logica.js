// Weerstand: vaste testen voor inhoudelijke fouten die testers vonden (overgenomen scan-signalen zijn geen tweede bron).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/weerstand/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const toon = (naam, a) => p.evaluate(({ naam, a }) => { const g = newGroup(naam); g.scans[0].a = a; state.groups.push(g); state.current = g.id; state.view = 'res'; save(); render();
    return { banners:[...document.querySelectorAll('#view .banner')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' || '), tekst:asText(g) }; }, { naam, a });
  // 1. Alleen de scan ingevuld; wantrouwen komt bij de bronnen alleen uit de scan. Dat is geen tweede bron.
  let r = await toon('Containerpark', { w10:0, w11:0, w12:0, w20:1, w21:1, w22:0, w30:0, w31:1, w32:0, w40:0, w41:0, w42:1, w50:3, w51:3, w52:1 });
  ok(!/dezelfde richting/.test(r.banners), 'alleen overgenomen scan-signalen: geen "Scan en bronnen wijzen in dezelfde richting" (' + r.banners.slice(0, 160) + ')');
  ok(!/dezelfde richting/.test(r.tekst), 'ook niet in de tekst-export');
  // 2. Controle: een bron met eigen antwoorden die met de scan overeenkomt, telt wel
  r = await toon('Loket', { w10:0, w11:0, w12:0, w20:3, w21:3, w22:3, w30:0, w31:0, w32:0, w40:0, w41:0, w42:0, w50:0, w51:0, w52:0, bver0:3, bver1:3 });
  ok(/dezelfde richting: willen en verlies/.test(r.banners), 'eigen antwoorden bij de bron die overeenkomen: wel een sterker signaal (' + r.banners.slice(0, 200) + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
