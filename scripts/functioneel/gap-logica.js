// Verschillenanalyse: vaste testen voor inhoudelijke fouten die testers vonden (de volgorde volgt de vakken).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/gap/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  // 1. Impact 4 x haalbaarheid 1 (Plannen, product 4) mag niet na impact 2 x haalbaarheid 2 (Laten liggen, product 4) zakken, en Snel meenemen komt voor Laten liggen
  const r = await p.evaluate(() => { const a = cur(); a.question = 'Waarom wachten burgers te lang?'; const mk = (t, i, f) => Object.assign(newGap(t), { impact:i, feas:f });
    a.gaps = [mk('Kleur van de wachtzaal', 2, 2), mk('Wachttijd aan de balie', 4, 1), mk('Uitleg op de website', 1, 3), mk('Online afspraken', 3, 1), mk('Nieuwe balie', 3, 3), mk('Nog te bekijken', 0, 0)]; save(); render(); asideOpen = true; renderAside();
    return { lijst:[...document.querySelectorAll('#aside .rank li')].map(li => li.innerText.replace(/\s+/g, ' ').replace(/^\d+ /, '')), orde:ranked(a).map(g => QUADS[quadOf(g)].order) }; });
  ok(r.orde.every((o, i) => !i || r.orde[i - 1] <= o), 'volgorde volgt de vakken (' + r.orde.join(',') + ')');
  ok(r.lijst.join(' / ') === 'Nieuwe balie Eerst aanpakken / Wachttijd aan de balie Plannen / Online afspraken Plannen / Uitleg op de website Snel meenemen / Kleur van de wachtzaal Laten liggen / Nog te bekijken Nog niet ingeschat', 'lijst "Volgorde": ' + r.lijst.join(' / '));
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
