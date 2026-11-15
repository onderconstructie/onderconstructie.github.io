// Agenda: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.clock.install({ time:new Date('2026-11-16T09:55:00+01:00') });
  await p.goto(B + '/agenda/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.click('#example'); await p.waitForTimeout(300);
  // 1. Over middernacht: 23:30 tot 01:05 is de volgende dag (denken, agenda)
  await p.fill('#begin', '23:30'); await p.dispatchEvent('#begin', 'change'); await p.waitForTimeout(200);
  const som = await p.innerText('#som'), kop = (await p.evaluate(() => agendaTekst(cur()))).split('\n')[1];
  ok(/01:05 de volgende dag/.test(som), 'einde na middernacht zegt "volgende dag" (' + som.replace(/\s+/g, ' ') + ')');
  ok(/tot 01:05 de volgende dag/.test(kop), 'de tekst voor de uitnodiging zegt "volgende dag" (' + kop + ')');
  await p.fill('#begin', '10:00'); await p.dispatchEvent('#begin', 'change'); await p.waitForTimeout(200);
  ok(!/volgende dag/.test(await p.innerText('#som')), 'een gewone vergadering zegt niets over de volgende dag');
  // 2. Gepland tegenover echt: zes punten van 40 seconden. De rijen tellen op tot het totaal, en het totaal is de echte duur (4 min)
  await p.click('#vb-eigen'); await p.waitForTimeout(200);
  await p.click('#start-btn'); await p.waitForTimeout(200);
  for (let i = 0; i < 6; i++) { await p.clock.runFor(40000); await p.click('#volgend'); await p.waitForTimeout(150); }
  const na = await p.evaluate(() => {
    const getal = s => { s = s.replace(/ /g, ' '); const u = /(\d+) u/.exec(s), m = /(\d+) min/.exec(s); return (u ? +u[1] * 60 : 0) + (m ? +m[1] : 0); };
    const vs = s => s.trim() === '0' ? 0 : (s.trim()[0] === '+' ? 1 : -1) * +s.replace(/[^\d]/g, '');
    const rows = [...document.querySelectorAll('#na-tabel tbody tr')].map(r => ({ echt:getal(r.cells[2].textContent), v:vs(r.cells[3].textContent) }));
    const f = document.querySelector('#na-tabel tfoot tr').cells;
    return { rows, tot:getal(f[2].textContent), vTot:vs(f[3].textContent), sub:$('na-sub').textContent.replace(/ /g, ' '), tekst:verloopTekst(cur()).replace(/ /g, ' ') };
  });
  const somRij = na.rows.reduce((t, r) => t + r.echt, 0), somV = na.rows.reduce((t, r) => t + r.v, 0);
  ok(somRij === na.tot, 'de echte minuten in de rijen tellen op tot het totaal (' + na.rows.map(r => r.echt).join('+') + ' = ' + somRij + ', totaal ' + na.tot + ')');
  ok(na.tot === 4, 'het totaal is de echte duur: 4 min (' + na.tot + ')');
  ok(somV === na.vTot, 'de verschillen in de rijen tellen op tot het totale verschil (' + somV + ' en ' + na.vTot + ')');
  ok(/· 4 min/.test(na.sub), 'de kop zegt dezelfde duur als het totaal (' + na.sub + ')');
  const tR = [...na.tekst.matchAll(/^\d+\. .*echt (\d+) min/gm)].map(m => +m[1]), tT = /Totaal: gepland .*, echt (\d+) min/.exec(na.tekst);
  ok(tT && tR.reduce((a, x) => a + x, 0) === +tT[1], 'ook in de gekopieerde tekst tellen de rijen op tot het totaal (' + tR.join('+') + ' en ' + (tT && tT[1]) + ')');
  // 3. Gepland tegenover echt over middernacht: begonnen om 23:30, afgerond om 00:20 is de volgende dag (REST na hertest)
  const mn = await p.evaluate(() => { const a = cur(), s = new Date(2026, 10, 16, 23, 30).getTime(), e = new Date(2026, 10, 17, 0, 20).getTime();
    a.loop = { start:s, eind:e, cur:null, t:Object.fromEntries(a.punten.map((x, i) => [x.id, { s:s + i * 6e4, e:s + (i + 1) * 6e4 }])) }; renderNa();
    return { sub:$('na-sub').textContent.replace(/\u202f/g, ' '), tekst:verloopTekst(a).split('\n')[1] }; });
  ok(/tot 00:20 de volgende dag/.test(mn.sub) && /tot 00:20 de volgende dag/.test(mn.tekst), 'over middernacht: "tot 00:20 de volgende dag" op het scherm en in de tekst (' + mn.sub + ' | ' + mn.tekst + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
