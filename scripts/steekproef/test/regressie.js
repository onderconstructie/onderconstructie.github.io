// Regressietests voor de punten uit de onafhankelijke review.
const K = require('../kern.js');
let fouten = 0; const ok = (c, t) => { if (!c) { fouten++; console.log('FOUT:', t); } else console.log('ok  ', t); };
const gooit = (f, t) => { try { f(); ok(false, t + ' (gooit niet)'); } catch (e) { ok(e.voorGebruiker, t + ': ' + e.message.slice(0, 90)); } };

// 2. verdeel: som klopt altijd, grenzen gerespecteerd, en optimaal binnen grenzen
{
  const r = K.toeval(1); let slecht = 0, N = 200000;
  for (let k = 0; k < N; k++) {
    const H = 1 + r.geheel(6), hi = [], lo = [], w = [];
    for (let h = 0; h < H; h++) { hi.push(r.geheel(30)); lo.push(Math.min(hi[h], r.geheel(3))); w.push(r.uniform() < 0.1 ? 0 : r.uniform() * 100); }
    const tot = hi.reduce((a, b) => a + b, 0), min = lo.reduce((a, b) => a + b, 0);
    if (tot < min || tot === 0) continue;
    const n = min + r.geheel(tot - min + 1);
    let x; try { x = K.verdeel(n, w, hi, lo); } catch (e) { slecht++; continue; }
    if (x.reduce((a, b) => a + b, 0) !== n || x.some((v, h) => v < lo[h] || v > hi[h] || !Number.isInteger(v))) slecht++;
  }
  ok(slecht === 0, 'verdeel: 200.000 willekeurige gevallen, som = n en binnen grenzen (' + slecht + ' fout)');
  const v = K.verdeel(6, [10, .1, .1], [3, 100, 100], [2, 2, 2]); ok(v.join() === '2,2,2', 'verdeel(6,[10,.1,.1],[3,100,100],[2,2,2]) = ' + v.join());
}
// 1. m = 1 niet meer toegelaten
gooit(() => K.trek({ N: 100, cluster: Array.from({ length: 100 }, (_, i) => 'c' + (i % 10)) }, { trappen: 2, clusters: 4, clusterKeuze: 'aselect', perCluster: 1 }, 1), 'een per cluster wordt geweigerd');
// 3. steekproefomvang: ontwerpeffect voor de correctie
{ const a = K.steekproefomvang({ marge: 0.05, N: 500, ontwerpeffect: 2 }); ok(a.antwoorden === 304, 'steekproefomvang N=500, deff 2: ' + a.antwoorden + ' (verwacht 303,1 dus 304)');
  const b = K.steekproefomvang({ marge: 0.05, N: 100, ontwerpeffect: 2 }); ok(b.antwoorden <= 100, 'steekproefomvang N=100: ' + b.antwoorden + ' (niet meer dan N)'); }
// 4. zekere clusters: één toevalscluster over = fout; vrijheidsgraden zonder zekere groepen
{
  const cl = [], laag = []; for (let i = 0; i < 400; i++) { cl.push('groot'); } for (let c = 0; c < 10; c++) for (let i = 0; i < 20; i++) cl.push('k' + c);
  const kader = { N: cl.length, cluster: cl };
  gooit(() => K.trek(kader, { trappen: 2, clusters: 2, clusterKeuze: 'grootte', perCluster: 10 }, 5), 'één zekere en één toevalscluster');
  const s = K.trek(kader, { trappen: 2, clusters: 4, clusterKeuze: 'grootte', perCluster: 10 }, 5);
  const E = s.eenheden, D = K.analyseOntwerp({ w: E.map(u => u.w), vLaag: E.map(u => u.vLaag), vPsu: E.map(u => u.vPsu), vN1: E.map(u => u.vN1), vZeker: E.map(u => !!u.zeker) });
  ok(D.vrijheidsgraden === 2, 'vrijheidsgraden 1 zekere + 3 toevalsclusters = ' + D.vrijheidsgraden + ' (verwacht 2)');
}
// 5. ongeldige populatieaantallen
{
  const w = Array(40).fill(10), vPsu = Array.from({ length: 40 }, (_, i) => 'e' + i);
  gooit(() => K.analyseOntwerp({ w, vPsu, vN1: Array(40).fill(30) }), 'N kleiner dan steekproef');
  gooit(() => K.analyseOntwerp({ w, vPsu, vN1: Array(40).fill(0) }), 'N = 0');
  const D = K.analyseOntwerp({ w, vPsu, vN1: Array(40).fill(0.1) }); ok(Math.abs(D.vN1[0] - 400) < 1e-9, 'fractie 0,1 wordt N = 400');
  const y = Array.from({ length: 40 }, (_, i) => i % 3);
  const a = K.schat(D, y), b = K.schat(K.analyseOntwerp({ w, vPsu, vN1: Array(40).fill(400) }), y); ok(Math.abs(a.se - b.se) < 1e-12 && a.se > 0, 'fractie en aantal geven dezelfde foutmarge');
}
// 6. ontwerpeffect met genormaliseerde gewichten
{ const D = K.analyseOntwerp({ w: Array(50).fill(1) }); const a = K.schat(D, Array.from({ length: 50 }, (_, i) => i % 2), { soort: 'aandeel' });
  ok(isFinite(a.ontwerpeffect) && Math.abs(a.ontwerpeffect - 1) < 1e-9, 'ontwerpeffect bij gewichten = 1: ' + a.ontwerpeffect); }
// 7. ontbrekende waarden
{ const D = K.analyseOntwerp({ w: [1, 1, 1, 1] }); ok(K.schat(D, [1, 3, '', null]).schatting === 2, 'leeg en null tellen niet als 0');
  ok(K.schat(D, ['1,5', '2,5', 'x', undefined]).schatting === 2, 'decimale komma gelezen'); }
// 8. aandeel 0 of 1
{ const D = K.analyseOntwerp({ w: Array(30).fill(2) }); const a = K.schat(D, Array(30).fill(0), { soort: 'aandeel' });
  ok(a.onder === 0 && a.boven > 0.08 && a.boven < 0.13, 'aandeel 0 van 30: interval 0 tot ' + a.boven.toFixed(4)); }
// losOp via raken met afhankelijke indelingen
{ const P = K.voorbeeldpopulatie(); const s = K.trek({ N: P.N }, { trappen: 1, methode: 'aselect', n: 500 }, 3); const E = s.eenheden;
  const tel = a => { const t = {}; a.forEach(x => t[x] = (t[x] || 0) + 1); return t; };
  const lg = P.leeftijd.map((l, i) => l + '_' + P.geslacht[i]);
  let D = K.analyseOntwerp({ w: E.map(u => u.w), vN1: E.map(() => P.N) });
  const A = K.raken(D, [E.map(u => P.leeftijd[u.i]), E.map(u => lg[u.i])], [tel(P.leeftijd), tel(lg)]).D;
  const B = K.raken(D, [E.map(u => lg[u.i])], [tel(lg)]).D;
  const y = E.map(u => P.sport[u.i]); const a = K.schat(A, y), b = K.schat(B, y);
  ok(Math.abs(a.se - b.se) < 1e-12 && Math.abs(a.schatting - b.schatting) < 1e-12, 'genestelde indelingen geven dezelfde foutmarge (' + a.se + ' / ' + b.se + ')'); }
// startgetal
gooit(() => K.toeval(1.7), 'startgetal 1,7 geweigerd'); gooit(() => K.toeval('abc'), 'startgetal abc geweigerd');
ok(K.toeval('123').uniform() === K.toeval(123).uniform(), 'startgetal als tekst en als getal gelijk');
// kadervolgorde
{ const cl = ['z', 'z', 'a', 'a', 'm', 'm', 'b', 'b']; const s = K.trek({ N: 8, cluster: cl }, { trappen: 2, clusters: 2, clusterKeuze: 'grootte', perCluster: 2, clusterVolgorde: 'kader' }, 9);
  ok(s.n === 4, 'kadervolgorde werkt (' + s.n + ' eenheden)'); }
console.log(fouten ? fouten + ' FOUTEN' : 'alles in orde'); process.exit(fouten ? 1 : 0);
