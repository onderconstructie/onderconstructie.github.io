// Beslisscore: vaste testen voor inhoudelijke fouten die testers vonden (gelijke stand, afspraak, tekst naar de Beslissingslog).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
// Een keuze met kenmerken k1..kn, opties A..C en beoordelaars r1..rm; sc[r][k][o] = score
const maak = (naam, sc, beslist) => {
  const R = Object.keys(sc), K = Object.keys(sc[R[0]]), O = Object.keys(sc[R[0]][K[0]]), scores = {};
  R.forEach(r => { scores[r] = {}; K.forEach(k => { scores[r][k] = {}; O.forEach(o => { scores[r][k][o] = { s:sc[r][k][o], r:'' }; }); }); });
  return { id:'K', name:naam, kenmerken:K.map(k => ({ id:k, naam:'Kenmerk ' + k, vraag:'', laag:'', hoog:'' })), opties:O.map(o => ({ id:o, naam:'Optie ' + o })),
    raters:R.map(r => ({ id:r, naam:'Beoordelaar ' + r, indruk:null, gevraagd:true })), scores, orde:{}, beslist, step:'uitslag', besluit:null };
};
const s3 = (a, b, c) => ({ A:a, B:b, C:c });
(async () => { const b = await chromium.launch(); const PE = [];
  // Elke keuze in een eigen, lege browsercontext: geen andere gegevens, niets wissen.
  const open = async k => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e)));
    await p.goto(B + '/beslisscore/', { waitUntil:'domcontentloaded' }); await p.evaluate(k => localStorage.setItem('beslisscore.v1', JSON.stringify({ v:1, keuzes:[k], current:'K' })), k);
    await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); p.ctx = c; return p; };
  const lees = p => p.evaluate(() => ({ kop:(document.querySelector('.win') || {}).innerText || '', regel:(document.querySelector('#decide p') || {}).innerText || '', kies:[...document.querySelectorAll('[data-kies]')].map(x => x.dataset.kies) }));
  const gedeeld = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('oc.share.beslisscore')).lists[0].items[0].note; } catch { return ''; } });
  // 1. Exact A=B=12, C=11,5; afspraak k1: A 5, B 4, C 5. De afspraak kiest tussen A en B: A. C (lager) mag nooit meedoen.
  let p = await open(maak('Een', { r1:{ k1:s3(5, 4, 5), k2:s3(4, 5, 4), k3:s3(3, 3, 3) }, r2:{ k1:s3(5, 4, 5), k2:s3(4, 5, 3), k3:s3(3, 3, 3) } }, 'k1'));
  let r = await lees(p); ok(r.kies.join() === 'A', 'exacte gelijke stand A=B, afspraak k1 tussen A en B: alleen A te kiezen (' + r.kies + ')');
  ok(/afspraak beslist dan Kenmerk k1/.test(r.regel) && !/hoogste totaal beslist/i.test(r.regel), 'regel zegt dat de afspraak beslist (' + r.regel + ')'); await p.ctx.close();
  // 1b. Exact A=B=12, C=11,5 wint op k1: C mag niet via de afspraak gekozen worden
  p = await open(maak('Een b', { r1:{ k1:s3(4, 4, 5), k2:s3(5, 5, 4), k3:s3(3, 3, 3) }, r2:{ k1:s3(4, 4, 5), k2:s3(5, 5, 3), k3:s3(3, 3, 3) } }, 'k1'));
  r = await lees(p); ok(!r.kies.includes('C') && r.kies.join() === 'A,B', 'lagere optie C wint niet via de afspraak bij exacte gelijke stand (' + r.kies + ')');
  ok(/Kies tussen de gelijke opties/.test(r.regel), 'regel: kies tussen de gelijke opties (' + r.regel + ')'); await p.ctx.close();
  // 2. Nipt: A 12, B 11,5, B wint op k2. Kies B: de Beslissingslog mag niet "hoogste totaal" zeggen.
  p = await open(maak('Twee', { r1:{ k1:s3(5, 4, 1), k2:s3(3, 5, 1), k3:s3(4, 3, 1) }, r2:{ k1:s3(5, 4, 1), k2:s3(3, 4, 1), k3:s3(4, 3, 1) } }, 'k2'));
  r = await lees(p); ok(/kleiner dan 1 punt/.test(r.regel) && !/hoogste totaal beslist/i.test(r.regel), 'nipt verschil: regel noemt de afspraak (' + r.regel + ')');
  // 2b. Nipt: de groene hoofdknop volgt de regel (hertest: de regel zei "beslist dan Kenmerk k2", de hoofdknop koos A, het hoogste totaal)
  const hoofd = await p.evaluate(() => { const x = document.querySelector('#decide .btn-pri'); return x ? x.dataset.kies : ''; });
  ok(hoofd === 'B' && r.kies.join() === 'B,A', 'nipt verschil: hoofdknop is B (wint op het afgesproken kenmerk), A blijft te kiezen (' + hoofd + '; ' + r.kies + ')');
  await p.click('[data-kies="B"]'); await p.waitForTimeout(500); let n = await gedeeld(p);
  ok(!/Hoogste totaal/.test(n) && /afspraak besliste Kenmerk k2/.test(n) && /11,5 tegen 12/.test(n), 'Beslissingslog bij afspraak (' + n + ')'); await p.ctx.close();
  // 2c. Exact A=B=C=12, afspraak k1: A 5, B 5, C 3. Alleen A en B te kiezen, en de teksten zeggen dat A en B daar even hoog scoren (hertest d2: C kiesbaar, "geen verschil", "ook op k1")
  p = await open(maak('Drie gelijk', { r1:{ k1:s3(5, 5, 3), k2:s3(3, 4, 5), k3:s3(4, 3, 4) } }, 'k1'));
  r = await lees(p); const noot = await p.evaluate(() => (document.querySelector('.note.amber') || {}).innerText || '');
  ok(r.kies.join() === 'A,B' && /Optie A en Optie B even hoog/.test(r.regel) && /Optie A en Optie B even hoog/.test(noot) && !/geen verschil/.test(noot), 'exact gelijk met drie, C lager op de afspraak: alleen A en B, juiste tekst (' + r.kies + ' | ' + r.regel + ')');
  await p.click('[data-kies="B"]'); await p.waitForTimeout(400); n = await gedeeld(p);
  const vd = (await p.innerText('#verdict')).replace(/\s+/g, ' ');
  ok(/even hoog/.test(n) && !/ook op/.test(n) && /even hoog/.test(vd) && !/ook op/.test(vd), 'beslissing en log: A en B even hoog op het kenmerk, niet "ook op" (' + n + ')'); await p.ctx.close();
  // 2d. Nipt en de hoogste wint ook op de afspraak: de regel zegt dat, zoals de notitie
  p = await open(maak('Nipt twee', { r1:{ k1:s3(5, 4, 1), k2:s3(5, 4, 1), k3:s3(2, 4, 1) }, r2:{ k1:s3(5, 4, 1), k2:s3(5, 4, 1), k3:s3(2, 3, 1) } }, 'k2'));
  r = await lees(p); ok(r.kies.join() === 'A' && /afspraak/.test(r.regel) && !/hoogste totaal beslist/i.test(r.regel), 'nipt, A wint ook op de afspraak: regel noemt de afspraak (' + r.regel + ')'); await p.ctx.close();
  // 3. Drie opties exact gelijk: niet "Allebei"
  p = await open(maak('Drie', { r1:{ k1:s3(3, 4, 5), k2:s3(4, 3, 3), k3:s3(5, 5, 4) } }, 'k3'));
  r = await lees(p); ok(/Alle drie/.test(r.kop) && !/Allebei/.test(r.kop), 'drie gelijke opties: "Alle drie" (' + r.kop.replace(/\s+/g, ' ') + ')'); await p.ctx.close();
  // 4. Exact A=B, B wint op k1: kies B. Log en beslissing zeggen "gelijk", niet "hoogste" of "kleiner dan 1 punt".
  p = await open(maak('Vier', { r1:{ k1:s3(3, 5, 1), k2:s3(5, 3, 1), k3:s3(4, 4, 1) } }, 'k1'));
  r = await lees(p); ok(r.kies.join() === 'B' && /afspraak beslist/.test(r.regel), 'exact gelijk, B wint op k1: alleen B (' + r.kies + ', ' + r.regel + ')');
  await p.click('[data-kies="B"]'); await p.waitForTimeout(500); n = await gedeeld(p);
  ok(/^Gelijke stand in totaal \(12\)\. Volgens de afspraak besliste Kenmerk k1/.test(n), 'Beslissingslog bij gelijke stand met afspraak (' + n + ')');
  const v = (await p.innerText('#verdict')).replace(/\s+/g, ' '); ok(/totalen waren gelijk/.test(v) && !/kleiner dan 1 punt/.test(v), 'beslissing zegt dat de totalen gelijk waren'); await p.ctx.close();
  // 5. Duidelijk hoogste: de gewone zin blijft
  p = await open(maak('Vijf', { r1:{ k1:s3(5, 4, 2), k2:s3(5, 4, 4), k3:s3(5, 4, 3) } }, 'k1'));
  r = await lees(p); ok(/Het hoogste totaal beslist/.test(r.regel) && r.kies.join() === 'A', 'duidelijke winnaar: het hoogste totaal beslist');
  await p.click('[data-kies="A"]'); await p.waitForTimeout(500); n = await gedeeld(p); ok(n === 'Hoogste totaal in de Beslisscore: 15', 'Beslissingslog bij hoogste (' + n + ')'); await p.ctx.close();
  // 6. Exact gelijk zonder winnaar op de afspraak: zelf kiezen, log zegt dat
  p = await open(maak('Zes', { r1:{ k1:s3(4, 4, 1), k2:s3(5, 3, 1), k3:s3(3, 5, 1) } }, 'k1'));
  await p.click('[data-kies="B"]'); await p.waitForTimeout(500); n = await gedeeld(p);
  ok(/^Gelijke stand in totaal \(12\), ook op Kenmerk k1\. Zelf gekozen/.test(n), 'Beslissingslog bij zelf gekozen gelijke stand (' + n + ')'); await p.ctx.close();
  // 7. Hertest e: afwijken bij een exact gelijke stand (A en B 12, de afspraak wijst B aan, toch A): geen "hoewel B het hoogste totaal had (12 tegenover 12)"
  p = await open(maak('Zeven', { r1:{ k1:{ A:4, B:5 }, k2:{ A:4, B:3 }, k3:{ A:4, B:4 } } }, 'k1'));
  await p.click('#dev-open'); await p.click('[data-devo="A"]'); await p.fill('#dev-feit', 'Referentie bevestigt koppeling'); await p.check('#dev-na'); await p.selectOption('#dev-k', 'k3');
  await p.click('#dev-ok'); await p.waitForTimeout(500); n = await gedeeld(p);
  r = await p.evaluate(() => ({ vd:document.querySelector('#verdict').innerText.replace(/\s+/g, ' '), kopie:decisionText(cur()) }));
  const alle = [n, r.vd, r.kopie].join(' | ');
  ok(!/hoogste totaal had|Afwijking van het hoogste totaal|afwijking van het hoogste totaal|12 tegen(over)? 12/i.test(alle), 'exact gelijk en toch afgeweken: geen "hoogste totaal" of "12 tegenover 12" (' + alle.slice(0, 400) + ')');
  ok(/gelijk/.test(n) && /Optie B ging voor/.test(n) && /afspraak/.test(r.vd) && /Optie B/.test(r.kopie), 'de tekst zegt dat de totalen gelijk waren en de afspraak Optie B aanwees (' + n + ')'); await p.ctx.close();
  // 8. Beslissingslog bij een gedeelde winst op de afspraak met drie opties: "A, B en C", niet "A en B en C"
  p = await open(maak('Acht', { r1:{ k1:{ A:2, B:5, C:5, D:5, E:1 }, k2:{ A:5, B:3, C:3, D:3, E:1 }, k3:{ A:5, B:4, C:4, D:4, E:1 } } }, 'k1'));
  await p.click('[data-kies="B"]'); await p.waitForTimeout(500); n = await gedeeld(p);
  ok(/Optie B, Optie C en Optie D even hoog/.test(n) && !/ en [^,.]+ en /.test(n), 'Beslissingslog somt op als "B, C en D" (' + n + ')'); await p.ctx.close();
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
