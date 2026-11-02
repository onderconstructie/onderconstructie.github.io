// Trekt steekproeven met de kern, schrijft ze weg voor R en bewaart de schattingen van de kern.
const fs = require('fs'), path = require('path');
const K = require('../kern.js');
const uit = path.join(__dirname, 'data'); fs.mkdirSync(uit, { recursive: true });
const P = K.voorbeeldpopulatie();
const N = P.N;
const lg = P.leeftijd.map((l, i) => l + '_' + P.geslacht[i]);

// populatie voor R (totalen)
let csv = 'id,regio,gemeente,leeftijd,geslacht,lg,sport,vrijwilliger\n';
for (let i = 0; i < N; i++) csv += [P.id[i], P.regio[i], P.gemeente[i], P.leeftijd[i], P.geslacht[i], lg[i], P.sport[i], P.vrijwilliger[i]].join(',') + '\n';
fs.writeFileSync(path.join(uit, 'populatie.csv'), csv);

const totaal = arr => { const t = {}; arr.forEach(x => t[x] = (t[x] || 0) + 1); return t; };
const T = { regio: totaal(P.regio), leeftijd: totaal(P.leeftijd), lg: totaal(lg) };

const ontwerpen = {
  D1: { kader: { N }, o: { trappen: 1, methode: 'aselect', n: 800, verdeling: 'evenredig' } },
  D2: { kader: { N, laag: P.regio, hulp: P.vrijwilliger }, o: { trappen: 1, methode: 'aselect', n: 1000, verdeling: 'optimaal' } },
  D3: { kader: { N, sorteer: P.leeftijd }, o: { trappen: 1, methode: 'systematisch', n: 700 } },
  D3b: { kader: { N, laag: P.regio }, o: { trappen: 1, methode: 'aselect', n: 600, verdeling: 'gelijk', eindig: false } },
  D4: { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'aselect', perCluster: 25, clusterVerdeling: 'evenredig' } },
  D5: { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 22, clusterKeuze: 'grootte', perCluster: 30, clusterVerdeling: 'evenredig' } },
  D6: { kader: { N, cluster: P.gemeente }, o: { trappen: 2, clusters: 15, clusterKeuze: 'grootte', perCluster: 40, clusterVerdeling: 'evenredig' }, nr: true, rake: true },
  D7: { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'aselect', perCluster: 25, clusterVerdeling: 'evenredig' }, post: true },
  D8: { kader: { N, laag: P.regio }, o: { trappen: 1, methode: 'aselect', n: 900, verdeling: 'evenredig' }, nr: true, rake: true },
};

const resultaten = {};
for (const [naam, d] of Object.entries(ontwerpen)) {
  const s = K.trek(d.kader, d.o, 4242 + naam.length * 7 + naam.charCodeAt(1));
  let e = s.eenheden;
  // respons simuleren (vast startgetal), en klassecorrectie per leeftijd
  let status = e.map(() => 'ja');
  if (d.nr) { const r = K.toeval(99); status = e.map(u => r.uniform() < P.respons[u.i] ? 'ja' : 'nee'); }
  // wegschrijven: volledige steekproef met status
  let c = 'i,regio,gemeente,leeftijd,geslacht,lg,sport,vrijwilliger,w,vLaag,vPsu,vN1,vSsu,vN2,status,zeker\n';
  e.forEach((u, k) => { const i = u.i; c += [i, P.regio[i], P.gemeente[i], P.leeftijd[i], P.geslacht[i], lg[i], P.sport[i], P.vrijwilliger[i], u.w.toPrecision(17),
    JSON.stringify(u.vLaag), u.vPsu, isFinite(u.vN1) ? u.vN1 : 'Inf', u.vSsu || '', u.vN2 || '', status[k], u.zeker ? 1 : 0].join(',') + '\n'; });
  fs.writeFileSync(path.join(uit, naam + '.csv'), c);

  let w = e.map(u => u.w), rij = e.map((_, k) => k);
  if (d.nr) {
    const nr = K.corrigeerNonrespons(w, status, e.map(u => P.leeftijd[u.i]));
    rij = rij.filter(k => status[k] === 'ja'); w = rij.map(k => nr.w[k]);
  }
  const E = rij.map(k => e[k]);
  let D = K.analyseOntwerp({ w, vLaag: E.map(u => u.vLaag), vPsu: E.map(u => u.vPsu), vN1: E.map(u => u.vN1), vZeker: E.map(u => !!u.zeker),
    vSsu: E.some(u => u.vSsu) ? E.map(u => u.vSsu) : null, vN2: E.some(u => u.vN2) ? E.map(u => u.vN2) : null });
  let kal = null;
  if (d.rake) { const r = K.raken(D, [E.map(u => P.regio[u.i]), E.map(u => lg[u.i])], [T.regio, T.lg]); D = r.D; kal = { iter: r.iteraties, ok: r.geconvergeerd }; }
  if (d.post) { const r = K.ophogen(D, E.map(u => P.leeftijd[u.i]), T.leeftijd); D = r.D; }
  const y = k => E.map(u => P[k][u.i]);
  const res = {
    n: E.length, df: D.vrijheidsgraden, kal,
    sport: K.schat(D, y('sport'), { soort: 'aandeel' }),
    vrijw: K.schat(D, y('vrijwilliger'), { soort: 'gemiddelde' }),
    vrijwTot: K.schat(D, y('vrijwilliger'), { soort: 'totaal' }),
    regio: {}, wsum: D.w.reduce((a, b) => a + b, 0),
    waarschuwingen: s.waarschuwingen, perLaag: s.perLaag,
  };
  for (const r of Object.keys(T.regio)) res.regio[r] = K.schat(D, y('vrijwilliger'), { soort: 'gemiddelde', domein: E.map(u => P.regio[u.i] === r) });
  resultaten[naam] = res;
  fs.writeFileSync(path.join(uit, naam + '.w.csv'), 'w\n' + Array.from(D.w).map(x => x.toPrecision(17)).join('\n') + '\n');
}
fs.writeFileSync(path.join(uit, 'kern.json'), JSON.stringify(resultaten, null, 1));
fs.writeFileSync(path.join(uit, 'ontwerpen.json'), JSON.stringify(Object.fromEntries(Object.entries(ontwerpen).map(([k, d]) => [k, { nr: !!d.nr, rake: !!d.rake, post: !!d.post, strata: !!d.kader.laag, twee: d.o.trappen === 2, pps: d.o.clusterKeuze === 'grootte', eindig: d.o.eindig !== false }]))));
for (const [k, r] of Object.entries(resultaten)) console.log(k, 'n', r.n, 'df', r.df, 'sport', r.sport.schatting.toFixed(4), '±', r.sport.se.toFixed(4), 'deff', r.sport.ontwerpeffect.toFixed(3), r.kal ? JSON.stringify(r.kal) : '', r.waarschuwingen.join(' | '));
