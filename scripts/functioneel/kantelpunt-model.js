// Logica van het denkmodel in Kantelpunt, los van de pagina. node kantelpunt-model.js [pad naar kantelpunt/index.html]
const fs = require('fs'), path = require('path');
const bron = process.argv[2] || path.join(__dirname, '..', '..', 'kantelpunt', 'index.html');
const tekst = fs.readFileSync(bron, 'utf8'), a = tekst.indexOf('/* kantelpunt-model begin */'), b = tekst.indexOf('/* kantelpunt-model einde */');
if (a < 0 || b < 0) { console.log('FOUT: het model staat niet tussen zijn markeringen in ' + bron); process.exit(1); }
const KP = new Function(tekst.slice(a, b) + '\nreturn KP;')();
let fouten = 0, n = 0;
const ok = (c, wat, extra) => { n++; if (!c) { fouten++; console.log('  FOUT: ' + wat + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); } };
const g = (naam, nn, houding, start) => ({ naam, n: nn, houding, start });
const som = x => x.reduce((p, q) => p + q, 0);

// 1. vaste uitkomst: dezelfde invoer, dezelfde uitkomst
const A = [g('Loket', 20, 'vlot', 3), g('Backoffice', 40, 'kijkt', 0), g('Leiding', 8, 'wacht', 0)];
const r1 = KP.alles(A, 'mix'), r2 = KP.alles(JSON.parse(JSON.stringify(A)), 'mix');
ok(r1.klaar && JSON.stringify(r1.u.k) === JSON.stringify(r2.u.k) && JSON.stringify(r1.u.per) === JSON.stringify(r2.u.per), 'dezelfde invoer geeft dezelfde uitkomst', [r1.u.k, r2.u.k]);
ok(JSON.stringify(r1.start.keuzes.map(k => k.gem)) === JSON.stringify(r2.start.keuzes.map(k => k.gem)), 'ook de startkeuzes zijn vast');
ok(KP.alles(A, 'team').zaad === r1.zaad && JSON.stringify(KP.alles(A, 'team').u.k) !== JSON.stringify(r1.u.k), 'een andere blik rekent met dezelfde mensen, maar geeft een andere uitkomst');

// 2. grenzen: zonder voortrekkers gebeurt er niets, met iedereen als voortrekker valt er niets te rekenen
ok(KP.alles([g('A', 30, 'vlot', 0)], 'mix').reden === 'start', 'zonder voortrekkers: geen uitkomst, wel de reden');
ok(KP.alles([g('A', 30, 'vlot', 30)], 'mix').reden === 'iedereen', 'iedereen voortrekker: geen uitkomst');
ok(KP.alles([], 'mix').reden === 'groepen' && KP.alles([g('A', 1, 'vlot', 1)], 'mix').reden === 'groepen', 'geen of te weinig mensen: geen uitkomst');
const leeg = KP.verloop(KP.schoon([g('A', 50, 'vlot', 0)]), 'mix', KP.rng(1));
ok(leeg.tot === 0, 'een verloop zonder voortrekkers: niemand begint', leeg.tot);

// 3. elk verloop blijft binnen de grenzen: nooit minder dan de voortrekkers, nooit meer dan de groep, niemand haakt af
for (let z = 1; z <= 400; z++) {
  const r = KP.rng(z * 31), G = 1 + Math.floor(r() * 5), gr = [];
  for (let i = 0; i < G; i++) { const nn = 1 + Math.floor(r() * 60); gr.push(g('G' + i, nn, ['vlot', 'kijkt', 'wacht'][Math.floor(r() * 3)], Math.floor(r() * (nn + 1) * (r() < 0.5 ? 0.2 : 1)))); }
  const s = KP.schoon(gr), v = KP.verloop(s, ['team', 'mix', 'iedereen'][z % 3], KP.rng(z), true);
  const S = som(s.map(x => x.start));
  if (!(v.tot >= S && v.tot <= v.N && v.per.every((x, i) => x >= s[i].start && x <= s[i].n))) { ok(false, 'verloop binnen de grenzen', { z, per: v.per, s }); break; }
  if (!v.rondes.every((c, i) => !i || c.every((x, j) => x >= v.rondes[i - 1][j]))) { ok(false, 'niemand haakt af (rondes stijgen)', { z }); break; }
  if (som(v.rondes[v.rondes.length - 1]) !== v.tot || [...v.wanneer].filter(x => x >= 0).length !== v.tot || [...v.wanneer].filter(x => x === 0).length !== S) { ok(false, 'het spoor klopt met de eindstand', { z }); break; }
  if (v.rondes.length > 1 && [...v.wanneer].some(x => x >= v.rondes.length)) { ok(false, 'geen ronde buiten het spoor', { z }); break; }
}
ok(true, '400 willekeurige verlopen binnen de grenzen');

// 4. de richting klopt: wie vlot meedoet kantelt, wie wacht blijft hangen
const vlot = KP.alles([g('A', 60, 'vlot', 6)], 'mix'), wacht = KP.alles([g('A', 60, 'wacht', 6)], 'mix');
ok(vlot.u.deel.aan >= 0.9, 'een vlotte groep met 1 op 10 voortrekkers slaat bijna altijd aan', vlot.u.deel);
ok(wacht.u.deel.hangt >= 0.9, 'een afwachtende groep met 1 op 10 voortrekkers blijft bijna altijd hangen', wacht.u.deel);
// meer voortrekkers: nooit duidelijk slechter
let vorig = -1, stijgt = true; for (const s of [2, 5, 10, 20, 35, 50]) { const u = KP.alles([g('A', 60, 'kijkt', s)], 'mix').u; if (u.gem < vorig - 0.03) stijgt = false; vorig = u.gem; }
ok(stijgt, 'meer voortrekkers geeft nooit duidelijk minder meedoeners');
// er bestaat een kantelzone: ergens tussen weinig en veel voortrekkers is de uitkomst gemengd
const zone = [6, 9, 12, 15, 18, 21, 24].map(s => KP.alles([g('A', 60, 'kijkt', s)], 'mix').u.deel);
ok(zone.some(d => d.aan > 0.1 && d.aan < 0.9) && zone[0].aan < 0.2 && zone[zone.length - 1].aan > 0.8, 'er is een kantelzone tussen te weinig en genoeg voortrekkers', zone.map(d => +d.aan.toFixed(2)));

// 5. silo's: voortrekkers in één team bereiken een ander team makkelijker als mensen over de teams heen kijken
const silo = [g('Team A', 30, 'vlot', 6), g('Team B', 30, 'kijkt', 0)];
const b3 = KP.blikken(KP.schoon(silo), 77);
ok(b3.iedereen.gem !== b3.team.gem, 'de blik maakt een verschil', b3);
const perTeam = KP.reken(KP.schoon(silo), 'team', 300, 5).per, perIed = KP.reken(KP.schoon(silo), 'iedereen', 300, 5).per;
ok(perTeam[0] >= perIed[0] - 0.02, 'kijkt men naar het eigen team, dan kantelt het team van de voortrekkers minstens even vlot', [perTeam, perIed]);

// 6. waar begin je best: dat hangt af van naar wie mensen kijken
//    Kijken ze vooral naar het eigen team, dan moet je beginnen waar het vlot gaat: anders ziet niemand het.
//    Kijken ze ook over de teams heen, dan kantelt de vlotte groep vanzelf mee en tellen voortrekkers het zwaarst waar het moeilijk is.
const tweeG = KP.schoon([g('Vlot', 30, 'vlot', 5), g('Wacht', 30, 'wacht', 0)]);
const kzTeam = KP.startKeuzes(tweeG, 'team', 9), kz = KP.startKeuzes(tweeG, 'mix', 9);
ok(kzTeam && kzTeam.keuzes.length === 3 && kzTeam.beste.naam !== 'Wacht' && kzTeam.keuzes.find(k => k.naam === 'Vlot').gem > kzTeam.keuzes.find(k => k.naam === 'Wacht').gem + 0.3, 'in gesloten teams loopt beginnen bij de afwachtende groep dood, bij de vlotte groep niet', kzTeam && kzTeam.keuzes.map(k => [k.naam || k.soort, +k.gem.toFixed(2)]));
ok(kz.beste.naam === 'Wacht' && kz.keuzes.find(k => k.naam === 'Vlot').gem >= 0.45, 'kijken mensen over de teams heen, dan tellen voortrekkers het zwaarst in de afwachtende groep, en de vlotte groep kantelt toch', kz.keuzes.map(k => [k.naam || k.soort, +k.gem.toFixed(2)]));
ok(kz.keuzes.every(k => som(k.start) <= kz.S && k.start.every((x, i) => x <= [30, 30][i])), 'geen keuze gebruikt meer voortrekkers dan je hebt of dan er mensen zijn');
const kl = KP.startKeuzes(KP.schoon([g('Klein', 3, 'vlot', 0), g('Groot', 80, 'kijkt', 10)]), 'mix', 9);
ok(kl.keuzes.find(k => k.naam === 'Klein').past === 3 && som(kl.keuzes.find(k => k.soort === 'gespreid').start) === 10, 'een kleine groep krijgt hooguit haar eigen aantal, gespreid verdeelt ze allemaal', kl.keuzes.map(k => k.start));
ok(KP.startKeuzes(KP.schoon([g('A', 30, 'vlot', 5)]), 'mix', 9) === null, 'met één groep valt er niets te kiezen');

// 7. invoer opschonen
const s = KP.schoon([g(' Loket ', '12', 'vlot', 40), g('Leeg', 0, 'kijkt', 0), g('X', -5, 'onzin', 2), g('Y', 9999, 'onzin', 3.6), null && 0].filter(Boolean));
ok(s.length === 2 && s[0].naam === 'Loket' && s[0].n === 12 && s[0].start === 12 && s[1].n === KP.MAX_MENSEN && s[1].houding === 'kijkt' && s[1].start === 4, 'invoer wordt binnen de grenzen gezet', s);
ok(KP.schoon(Array.from({ length: 12 }, (_, i) => g('G' + i, 5, 'vlot', 1))).length === KP.MAX_GROEPEN, 'hooguit zes groepen');

// 8. woorden en klassen
ok(['bijna altijd', 'meestal', 'soms', 'zelden', 'bijna nooit'].join() === [0.95, 0.7, 0.5, 0.2, 0.05].map(KP.vaak).join(), 'de woorden volgen de frequentie');
ok(KP.klasse(80, 100, 5) === 'aan' && KP.klasse(10, 100, 5) === 'hangt' && KP.klasse(50, 100, 5) === 'half' && KP.klasse(5, 100, 5) === 'hangt', 'de drie uitkomsten');
ok(r1.u.k.aan + r1.u.k.half + r1.u.k.hangt === r1.u.runs && r1.u.ver.length === r1.u.runs && r1.u.runs === 1000, 'elk verloop valt in precies één uitkomst');

// 9. het getoonde verloop past bij de vaakste uitkomst
const vk = Object.keys(r1.u.k).sort((x, y) => r1.u.k[y] - r1.u.k[x])[0], t = KP.toon(r1.groepen, 'mix', r1.zaad, 0, vk);
ok(t.klasse === vk && t.wanneer && t.rondes.length >= 1, 'het eerste getoonde verloop heeft de vaakste uitkomst', [vk, t.klasse]);
ok(JSON.stringify(KP.toon(r1.groepen, 'mix', r1.zaad, 2).per) === JSON.stringify(KP.toon(r1.groepen, 'mix', r1.zaad, 2).per), 'een getoond verloop is te herhalen');

// 9b. het snelle verloop geeft exact hetzelfde als het verloop persoon per persoon (1500 willekeurige gevallen)
{ const R = KP.rng(12345), H = ['vlot', 'kijkt', 'wacht'], B = ['team', 'mix', 'iedereen']; let anders = 0;
  for (let i = 0; i < 1500; i++) { const G = 1 + Math.floor(R() * 6), gr = []; for (let j = 0; j < G; j++) { const nn = 1 + Math.floor(R() * (i % 10 ? 60 : 500)); gr.push({ naam: '', n: nn, start: Math.floor(R() * R() * (nn + 1)), houding: H[Math.floor(R() * 3)] }); }
    const z = Math.floor(R() * 2 ** 32), a = KP.verloop(gr, B[i % 3], KP.rng(z)).per, s = KP.maakSnel(gr); s.trek(KP.rng(z)); if (a.join() !== s.loop(B[i % 3]).join()) anders++; }
  ok(anders === 0, 'snel en traag verloop geven exact dezelfde eindstand', anders); }
// 9c. narekenen met de wiskunde: één grote groep waar iedereen iedereen ziet eindigt in het kleinste vaste punt van x = s + (1-s)·F(x)
{ const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const F = (x, mu) => x < 0.02 ? 0 : x >= 0.98 ? 1 : 0.5 * (1 + erf((x - mu) / 0.15 / Math.SQRT2)); let grootste = 0;
  for (const [h, s] of [['vlot', 0.02], ['kijkt', 0.05], ['kijkt', 0.15], ['wacht', 0.3], ['wacht', 0.45]]) { let x = s; for (let i = 0; i < 5000; i++) x = s + (1 - s) * F(x, KP.HOUDING[h]);
    const u = KP.reken(Array.from({ length: 4 }, () => ({ naam: '', n: 500, start: Math.round(500 * s), houding: h })), 'iedereen', 300, 99); grootste = Math.max(grootste, Math.abs(u.gem - x)); }
  ok(grootste < 0.01, 'het model komt uit waar de wiskunde het zegt (grootste afwijking onder 1 procentpunt)', grootste); }
// 9d. het kantelpunt: zoeken in twee helften vindt hetzelfde als alle aantallen aflopen, en eronder slaat het niet meestal aan
{ const gr = KP.schoon([g('A', 20, 'vlot', 5), g('B', 30, 'kijkt', 0), g('C', 15, 'kijkt', 0)]); let allesOk = true;
  for (const blik of ['team', 'mix', 'iedereen']) { const k = KP.kantel(gr, blik, 4242); let eerste = -1;
    for (let T = 1; T < 65 && eerste < 0; T++) if (KP.reken(gr.map((x, i, a) => Object.assign({}, x, { start: KP.verdeel(a, T)[i] })), blik, 400, 4242).deel.aan >= KP.MEESTAL) eerste = T;
    if (k.nodig !== eerste || k.start.reduce((a, b) => a + b, 0) !== k.nodig || k.start.some((x, i) => x > gr[i].n)) allesOk = false; }
  ok(allesOk, 'het kantelpunt klopt met het aflopen van alle aantallen, en de verdeling past in de groepen');
  ok(KP.verdeel(gr, 5).join() === '5,0,0' && KP.verdeel(gr, 25).join() === '20,3,2' && KP.verdeel(gr, 999).join() === '20,30,15', 'verdelen: eerst zoals nu, dan naar grootte, nooit meer dan er mensen zijn', [KP.verdeel(gr, 25), KP.verdeel(gr, 999)]); }
// 9e. gelijke groepen: geen valse winnaar. Drie dezelfde groepen staan samen bovenaan.
{ const s = KP.alles([g('A', 30, 'kijkt', 5), g('B', 30, 'kijkt', 2), g('C', 30, 'kijkt', 0)], 'mix').start;
  ok(s.top.filter(o => o.soort === 'groep').length === 3, 'drie gelijke groepen tellen als even goed', s.top.map(o => o.soort + (o.gi ?? '')));
  const d = KP.alles([g('A', 24, 'kijkt', 5), g('B', 40, 'kijkt', 2), g('C', 6, 'vlot', 2)], 'mix').start; ok(d.top.length >= 1 && d.top[0] === d.beste && d.keuzes.every(o => o.ver === undefined), 'de beste plaats staat altijd bij de top'); }
// 10. snelheid: de grootste invoer blijft werkbaar
const groot = Array.from({ length: 6 }, (_, i) => g('G' + i, 500, ['vlot', 'kijkt', 'wacht'][i % 3], 20)); const t0 = Date.now(); KP.alles(groot, 'mix'); const ms = Date.now() - t0;
ok(ms < 1500, 'zes groepen van 500 mensen rekenen binnen anderhalve seconde', ms);
console.log(`${fouten ? 'FOUT' : 'ok  '} Kantelpunt-model: ${n} controles, ${fouten} fouten (grootste invoer: ${ms} ms)`);
process.exit(fouten ? 1 : 0);
