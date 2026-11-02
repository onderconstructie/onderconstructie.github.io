// Simulaties: (1) worden eenheden even vaak gekozen als hun kans zegt? (2) dekken de intervallen de echte waarde?
const fs = require('fs'), path = require('path');
const K = require('../kern.js');
const deel = process.argv[2] || 'alles';
const verslag = {};

/* ---- 1. Insluitkansen op een klein kader ---- */
if (deel === 'alles' || deel === 'kansen') {
  const rng = K.toeval(7);
  const laag = [], cluster = [], sorteer = [], hulp = [];
  const groottes = [];
  for (let c = 0; c < 30; c++) { const h = ['A', 'B', 'C'][c % 3]; const M = c === 0 ? 400 : c === 4 ? 260 : 10 + Math.floor(rng.uniform() * 70); groottes.push(M);
    for (let k = 0; k < M; k++) { laag.push(h); cluster.push('c' + c); sorteer.push(rng.uniform()); hulp.push(h === 'A' ? rng.uniform() * 10 : rng.uniform() * 3); } }
  const N = laag.length;
  const ontwerpen = {
    aselect: [{ N }, { trappen: 1, methode: 'aselect', n: 150 }],
    systematisch: [{ N, sorteer }, { trappen: 1, methode: 'systematisch', n: 137 }],
    'systematisch per groep': [{ N, laag, sorteer }, { trappen: 1, methode: 'systematisch', n: 101, verdeling: 'evenredig' }],
    'groepen optimaal': [{ N, laag, hulp }, { trappen: 1, methode: 'aselect', n: 160, verdeling: 'optimaal' }],
    'twee trappen aselect': [{ N, laag, cluster }, { trappen: 2, clusters: 9, clusterKeuze: 'aselect', perCluster: 12, clusterVerdeling: 'evenredig' }],
    'twee trappen grootte': [{ N, laag, cluster }, { trappen: 2, clusters: 9, clusterKeuze: 'grootte', perCluster: 12, clusterVerdeling: 'evenredig' }],
    'twee trappen grootte, kadervolgorde': [{ N, laag, cluster }, { trappen: 2, clusters: 6, clusterKeuze: 'grootte', perCluster: 15, clusterVerdeling: 'gelijk', clusterVolgorde: 'kader' }],
  };
  const R = +process.env.HERHAAL || 40000;
  verslag.kansen = {};
  for (const [naam, [kader, o]] of Object.entries(ontwerpen)) {
    const teller = new Float64Array(N), kans = new Float64Array(N).fill(NaN); let kansVast = true, wsomMin = Infinity, wsomMax = -Infinity, wsomGem = 0, nMin = Infinity, nMax = 0;
    for (let r = 0; r < R; r++) {
      const s = K.trek(kader, o, 1000 + r);
      let ws = 0;
      for (const e of s.eenheden) { teller[e.i]++; if (isNaN(kans[e.i])) kans[e.i] = e.p; else if (Math.abs(kans[e.i] - e.p) > 1e-12) kansVast = false; ws += e.w; }
      wsomMin = Math.min(wsomMin, ws); wsomMax = Math.max(wsomMax, ws); wsomGem += ws / R; nMin = Math.min(nMin, s.n); nMax = Math.max(nMax, s.n);
    }
    // grootste afwijking in standaardfouten
    let zMax = 0, chi = 0, df = 0, nooit = 0;
    for (let i = 0; i < N; i++) {
      const p = kans[i];
      if (isNaN(p)) { nooit++; continue; }
      if (p >= 1) { if (teller[i] !== R) zMax = Infinity; continue; }
      const z = (teller[i] / R - p) / Math.sqrt(p * (1 - p) / R); zMax = Math.max(zMax, Math.abs(z)); chi += z * z; df++;
    }
    verslag.kansen[naam] = { herhalingen: R, eenheden: N, kansVast, nooitGekozen: nooit, grootsteZ: +zMax.toFixed(2), chiKwadraatPerVg: +(chi / df).toFixed(3),
      somGewichtenGem: +wsomGem.toFixed(2), somGewichtenMinMax: [+wsomMin.toFixed(1), +wsomMax.toFixed(1)], N, omvang: [nMin, nMax] };
    console.log(naam, JSON.stringify(verslag.kansen[naam]));
  }
  // kansen volgens grootte voor R (sampling::inclusionprobabilities)
  fs.writeFileSync(path.join(__dirname, 'data', 'groottes.json'), JSON.stringify({ groottes, n: [3, 6, 9, 12, 20], kern: [3, 6, 9, 12, 20].map(n => K.kansenVolgensGrootte(groottes, n)) }));
}

/* ---- 2. Dekking van de intervallen op de voorbeeldpopulatie ---- */
if (deel === 'alles' || deel === 'dekking') {
  const P = K.voorbeeldpopulatie(); const N = P.N;
  const echt = { sport: P.sport.reduce((a, b) => a + b) / N, vrijw: P.vrijwilliger.reduce((a, b) => a + b) / N };
  const lg = P.leeftijd.map((l, i) => l + '_' + P.geslacht[i]);
  const tel = a => { const t = {}; a.forEach(x => t[x] = (t[x] || 0) + 1); return t; };
  const T = { regio: tel(P.regio), lg: tel(lg), leeftijd: tel(P.leeftijd) };
  const ontwerpen = {
    'aselect n=600': { kader: { N }, o: { trappen: 1, methode: 'aselect', n: 600 } },
    'groepen evenredig n=600': { kader: { N, laag: P.regio }, o: { trappen: 1, methode: 'aselect', n: 600, verdeling: 'evenredig' } },
    'systematisch op leeftijd n=600': { kader: { N, sorteer: P.leeftijd }, o: { trappen: 1, methode: 'systematisch', n: 600 } },
    'twee trappen aselect 20x30': { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'aselect', perCluster: 30, clusterVerdeling: 'evenredig' } },
    'twee trappen grootte 20x30': { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'grootte', perCluster: 30, clusterVerdeling: 'evenredig' } },
    'twee trappen grootte 20x30 + ophogen naar regio en leeftijd x geslacht': { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'grootte', perCluster: 30, clusterVerdeling: 'evenredig' }, rake: true },
    'twee trappen grootte 20x40, non-respons, correctie per leeftijd': { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'grootte', perCluster: 40, clusterVerdeling: 'evenredig' }, nr: true },
    'twee trappen grootte 20x40, non-respons, zonder correctie': { kader: { N, laag: P.regio, cluster: P.gemeente }, o: { trappen: 2, clusters: 20, clusterKeuze: 'grootte', perCluster: 40, clusterVerdeling: 'evenredig' }, nr: true, geenCorrectie: true },
  };
  const R = +process.env.HERHAAL || 2000;
  verslag.dekking = { echt, herhalingen: R, ontwerpen: {} };
  for (const [naam, d] of Object.entries(ontwerpen)) {
    if (process.env.FILTER && !naam.includes(process.env.FILTER)) continue;
    const st = { sport: [], sportSe: [], sportIn: 0, vrijw: [], vrijwSe: [], vrijwIn: 0 };
    for (let r = 0; r < R; r++) {
      const s = K.trek(d.kader, d.o, 50000 + r);
      let e = s.eenheden, w = e.map(u => u.w);
      if (d.nr) {
        const rr = K.toeval(900000 + r); const status = e.map(u => rr.uniform() < P.respons[u.i] ? 'ja' : 'nee');
        if (d.geenCorrectie) { const keep = e.map((_, k) => status[k] === 'ja'); e = e.filter((_, k) => keep[k]); w = e.map(u => u.w); }
        else { const c = K.corrigeerNonrespons(w, status, e.map(u => P.leeftijd[u.i])); const keep = status.map(x => x === 'ja'); w = c.w.filter((_, k) => keep[k]); e = e.filter((_, k) => keep[k]); }
      }
      let D = K.analyseOntwerp({ w, vLaag: e.map(u => u.vLaag), vPsu: e.map(u => u.vPsu), vN1: e.map(u => u.vN1), vZeker: e.map(u => !!u.zeker),
        vSsu: e.some(u => u.vSsu) ? e.map(u => u.vSsu) : null, vN2: e.some(u => u.vN2) ? e.map(u => u.vN2) : null });
      if (d.rake) D = K.raken(D, [e.map(u => P.regio[u.i]), e.map(u => lg[u.i])], [T.regio, T.lg]).D;
      const a = K.schat(D, e.map(u => P.sport[u.i]), { soort: 'aandeel', ontwerpeffect: false });
      const b = K.schat(D, e.map(u => P.vrijwilliger[u.i]), { soort: 'gemiddelde', ontwerpeffect: false });
      st.sport.push(a.schatting); st.sportSe.push(a.se); if (a.onder <= echt.sport && echt.sport <= a.boven) st.sportIn++;
      st.vrijw.push(b.schatting); st.vrijwSe.push(b.se); if (b.onder <= echt.vrijw && echt.vrijw <= b.boven) st.vrijwIn++;
    }
    const gem = a => a.reduce((x, y) => x + y, 0) / a.length;
    const sdv = a => { const g = gem(a); return Math.sqrt(a.reduce((x, y) => x + (y - g) * (y - g), 0) / (a.length - 1)); };
    const rms = a => Math.sqrt(gem(a.map(x => x * x)));
    const o = {
      sport: { gemiddeldeSchatting: +gem(st.sport).toFixed(4), vertekening: +(gem(st.sport) - echt.sport).toFixed(4), echteSpreiding: +sdv(st.sport).toFixed(4), geschatteSpreiding: +rms(st.sportSe).toFixed(4), dekking95: +(st.sportIn / R).toFixed(3) },
      vrijw: { gemiddeldeSchatting: +gem(st.vrijw).toFixed(4), vertekening: +(gem(st.vrijw) - echt.vrijw).toFixed(4), echteSpreiding: +sdv(st.vrijw).toFixed(4), geschatteSpreiding: +rms(st.vrijwSe).toFixed(4), dekking95: +(st.vrijwIn / R).toFixed(3) },
    };
    verslag.dekking.ontwerpen[naam] = o;
    console.log(naam, JSON.stringify(o));
  }
}
fs.writeFileSync(path.join(__dirname, 'data', 'sim-' + deel + '.json'), JSON.stringify(verslag, null, 1));
