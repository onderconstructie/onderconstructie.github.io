/* Rekenkern voor steekproeven: trekken, wegen en schatten. Onder Constructie, EUPL-1.2.
   Alles gebeurt lokaal. Geen afhankelijkheden. Werkt in de browser (window.Kern) en in Node (module.exports). */
(function (root) {
'use strict';
const VERSIE = '1.0';

/* ---------------- Toeval met startgetal ----------------
   Zaaien met een eenvoudige mengfunctie (32 bit), daarna een snelle generator met 128 bit toestand.
   uniform() geeft een getal in [0, 1) met 53 bits precisie. Zelfde startgetal = zelfde reeks. */
function geldigStartgetal(x) { const v = typeof x === 'string' && /^\s*\d+\s*$/.test(x) ? Number(x) : x; return Number.isInteger(v) && v >= 0 && v <= 4294967295 ? v : null; }
function toeval(startgetal) {
  const g = geldigStartgetal(startgetal);
  if (g === null) throw fout('Het startgetal moet een geheel getal zijn tussen 0 en 4294967295.');
  let a = g;
  const meng = () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); t ^= t >>> 15;
    return t >>> 0;
  };
  let s0 = meng(), s1 = meng(), s2 = meng(), s3 = meng();
  if (!(s0 | s1 | s2 | s3)) s0 = 1;
  const rotl = (x, k) => (x << k) | (x >>> (32 - k));
  const volgende = () => {
    const r = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3; s2 ^= t; s3 = rotl(s3, 11);
    return r;
  };
  const uniform = () => ((volgende() >>> 5) * 67108864 + (volgende() >>> 6)) / 9007199254740992;
  return { uniform, geheel: k => Math.floor(uniform() * k) };
}
function nieuwStartgetal() {
  try { const b = new Uint32Array(1); (root.crypto || require('crypto').webcrypto).getRandomValues(b); return 100000 + (b[0] % 900000); }
  catch { return 100000 + Math.floor(Math.random() * 900000); }
}

/* ---------------- Hulp ---------------- */
function groepeer(sleutels, idx) {
  const m = new Map();
  for (const i of idx) { const k = sleutels ? String(sleutels[i]) : ''; let g = m.get(k); if (!g) m.set(k, g = []); g.push(i); }
  return m;
}
const som = a => { let s = 0; for (const x of a) s += x; return s; };
// Een waarde als getal lezen: tekst met decimale komma mag; leeg, null of tekst = ontbrekend (NaN).
function getal(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  if (v == null || typeof v === 'boolean') return NaN;
  let t = String(v).trim().replace(/\s/g, '');
  if (t === '') return NaN;
  if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');   // 1.234,5
  else if (/^[-+]?\d*,\d+$/.test(t)) t = t.replace(',', '.');                                     // 1,5
  else if (/^[-+]?\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, '');                      // 1,234.5
  const x = Number(t);
  return isFinite(x) ? x : NaN;
}
// Vaste volgorde, onafhankelijk van taal of browser: getallen als getal, anders teken per teken.
function vergelijk(a, b) {
  const na = getal(a), nb = getal(b);
  if (!isNaN(na) && !isNaN(nb)) { if (na !== nb) return na - nb; }
  else if (!isNaN(na)) return -1; else if (!isNaN(nb)) return 1;
  const sa = String(a), sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/* ---------------- Verdeling over groepen ----------------
   n eenheden verdelen volgens gewichten, met per groep een minimum en een maximum (de groepsgrootte).
   Groepen die boven hun maximum of onder hun minimum zouden uitkomen, worden vastgezet; de rest wordt
   opnieuw verdeeld. Afronden met de grootste resten, zodat het totaal exact n is. */
function verdeel(n, gewichten, maxima, minima) {
  const H = gewichten.length;
  n = Math.round(n);
  const hi = maxima.map(x => Math.max(0, Math.floor(x)));
  const lo = (minima || new Array(H).fill(0)).map((m, h) => Math.min(Math.max(0, Math.ceil(m)), hi[h]));
  if (n > som(hi)) throw fout('Je vraagt meer eenheden (' + n + ') dan er zijn (' + som(hi) + ').');
  if (n < som(lo)) throw fout('Te weinig voor alle groepen: je hebt er minstens ' + som(lo) + ' nodig.');
  // Groepen zonder gewicht krijgen een heel klein gewicht, zodat ze enkel aanvullen als het niet anders kan.
  let w = gewichten.map(x => (isFinite(x) && x > 0) ? x : 0);
  const wMax = Math.max(...w);
  w = wMax > 0 ? w.map(x => x > 0 ? x : wMax * 1e-9) : w.map(() => 1);
  // Zoek de schaal waarbij de begrensde verdeling precies n geeft (de som stijgt met de schaal).
  const verdeling = l => w.map((x, h) => Math.min(hi[h], Math.max(lo[h], l * x)));
  let a = 0, b = 1;
  while (som(verdeling(b)) < n) b *= 2;
  for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (som(verdeling(m)) < n) a = m; else b = m; }
  const x = verdeling(b);
  // Afronden met de grootste resten, binnen de grenzen.
  const uit = x.map((v, h) => Math.min(hi[h], Math.max(lo[h], Math.floor(v + 1e-9))));
  let rest = n - som(uit);
  const volgorde = x.map((v, h) => h).sort((p, q) => (x[q] - uit[q]) - (x[p] - uit[p]) || p - q);
  while (rest > 0) { let gedaan = false; for (const h of volgorde) { if (rest > 0 && uit[h] < hi[h]) { uit[h]++; rest--; gedaan = true; } } if (!gedaan) break; }
  while (rest < 0) { let gedaan = false; for (const h of volgorde.slice().reverse()) { if (rest < 0 && uit[h] > lo[h]) { uit[h]--; rest++; gedaan = true; } } if (!gedaan) break; }
  if (rest !== 0) throw fout('De verdeling over de groepen lukt niet.');
  return uit;
}

/* ---------------- Trekkingen binnen een lijst ---------------- */
// Enkelvoudig aselect zonder teruglegging: gedeeltelijk schudden.
function trekAselect(idx, n, rng) {
  const a = idx.slice();
  for (let i = 0; i < n; i++) { const j = i + rng.geheel(a.length - i); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a.slice(0, n);
}
// Systematisch: vaste stap N/n (mag een kommagetal zijn) vanaf een toevallig vertrekpunt. Elke eenheid heeft kans n/N.
function trekSystematisch(geordend, n, rng) {
  const N = geordend.length, k = N / n, r = rng.uniform() * k, uit = [];
  for (let j = 0; j < n; j++) uit.push(geordend[Math.min(N - 1, Math.floor(r + j * k))]);
  return uit;
}
// Kansen volgens grootte: wie zo groot is dat de kans 1 of meer zou zijn, gaat zeker mee (en telt niet meer mee voor de rest).
function kansenVolgensGrootte(grootte, n) {
  const zeker = new Set(); const K = grootte.length;
  if (n >= grootte.filter(x => x > 0).length) { grootte.forEach((x, i) => { if (x > 0) zeker.add(i); }); }
  for (;;) {
    const rest = n - zeker.size; if (rest <= 0) break;
    let X = 0; for (let i = 0; i < K; i++) if (!zeker.has(i)) X += grootte[i];
    let nieuw = 0;
    for (let i = 0; i < K; i++) if (!zeker.has(i) && grootte[i] > 0 && rest * grootte[i] / X >= 1 - 1e-12) { zeker.add(i); nieuw++; }
    if (!nieuw) break;
  }
  const rest = n - zeker.size; let X = 0;
  for (let i = 0; i < K; i++) if (!zeker.has(i)) X += grootte[i];
  return grootte.map((x, i) => zeker.has(i) ? 1 : (rest > 0 && X > 0 ? rest * x / X : 0));
}
// Systematisch met kans volgens grootte, op de (eventueel geschudde) volgorde. Geeft de gekozen posities.
function trekVolgensGrootte(kansen, volgorde, rng) {
  const uit = [];
  const vrij = volgorde.filter(i => kansen[i] > 0 && kansen[i] < 1);
  for (const i of volgorde) if (kansen[i] >= 1) uit.push(i);
  let tot = 0; for (const i of vrij) tot += kansen[i];
  const aantal = Math.round(tot);
  if (aantal > 0) {
    const schaal = aantal / tot; // vangt afrondingsfouten op
    let acc = 0, punt = rng.uniform(), gekozen = 0;
    for (const i of vrij) {
      acc += kansen[i] * schaal;
      if (punt < acc && gekozen < aantal) { uit.push(i); gekozen++; punt += 1; }
    }
  }
  return uit;
}

function fout(tekst) { const e = new Error(tekst); e.voorGebruiker = true; return e; }

/* ---------------- Een steekproef trekken ----------------
   kader: { N, laag: [..] of null, cluster: [..] of null, sorteer: [..] of null, hulp: [getallen] of null }
   ontwerp:
     trappen 1: methode 'aselect' | 'systematisch', n, verdeling 'evenredig' | 'gelijk' | 'optimaal' | 'eigen',
                eigen {laag: n}, spreiding {laag: S} (voor optimaal, anders uit kader.hulp)
     trappen 2: clusters (aantal), clusterKeuze 'aselect' | 'grootte', perCluster (m),
                clusterVerdeling 'evenredig' | 'gelijk' | 'eigen', eigenClusters {laag: k}, clusterVolgorde 'toeval' | 'kader'
     eindig: true = rekening houden met de grootte van de populatie in de foutmarge (waar dat kan)
   Resultaat: eenheden (in kadervolgorde) met kansen, gewicht en ontwerpkolommen voor de foutmarge. */
function trek(kader, ontwerp, startgetal) {
  const rng = toeval(startgetal);
  const N = kader.N, alle = Array.from({ length: N }, (_, i) => i);
  const lagen = groepeer(kader.laag, alle);
  const laagNamen = [...lagen.keys()].sort(vergelijk);
  const eindig = ontwerp.eindig !== false;
  const waarschuwingen = [], eenheden = [], perLaag = [];

  if ((ontwerp.trappen || 1) === 1) {
    const Nh = laagNamen.map(h => lagen.get(h).length);
    let n_h;
    const minima = Nh.map(x => Math.min(2, x));
    if (ontwerp.verdeling === 'eigen') {
      n_h = laagNamen.map((h, k) => Math.round(+((ontwerp.eigen || {})[h]) || 0));
      n_h.forEach((x, k) => { if (x > Nh[k]) throw fout('Groep ' + laagNamen[k] + ' telt maar ' + Nh[k] + ' eenheden.'); if (x < minima[k]) throw fout('Groep ' + laagNamen[k] + ' heeft minstens ' + minima[k] + ' eenheden nodig.'); });
    } else {
      let gew = Nh.slice();
      if (ontwerp.verdeling === 'gelijk') gew = Nh.map(() => 1);
      if (ontwerp.verdeling === 'optimaal') {
        const S = laagNamen.map(h => {
          if (ontwerp.spreiding && isFinite(+ontwerp.spreiding[h])) return +ontwerp.spreiding[h];
          if (kader.hulp) { const v = lagen.get(h).map(i => getal(kader.hulp[i])).filter(x => !isNaN(x)); return sd(v); }
          return NaN;
        });
        if (S.some(s => !isFinite(s))) throw fout('Voor de beste verdeling heb je per groep een spreiding nodig.');
        if (S.every(s => s === 0)) { waarschuwingen.push('Geen spreiding in de groepen: evenredig verdeeld.'); }
        else gew = Nh.map((x, k) => x * S[k]);
      }
      n_h = verdeel(Math.round(ontwerp.n), gew, Nh, minima);
    }
    laagNamen.forEach((h, k) => {
      let lijst = lagen.get(h);
      if (ontwerp.methode === 'systematisch' && kader.sorteer) { const rang = rangen(kader.sorteer); lijst = lijst.slice().sort((a, b) => rang[a] - rang[b] || a - b); }
      const gekozen = n_h[k] === 0 ? [] : (ontwerp.methode === 'systematisch' ? trekSystematisch(lijst, n_h[k], rng) : trekAselect(lijst, n_h[k], rng));
      const p = n_h[k] / Nh[k];
      for (const i of gekozen) eenheden.push({ i, laag: h, cluster: null, p1: p, p2: 1, p, w: 1 / p,
        vLaag: h, vPsu: 'e' + i, vN1: eindig ? Nh[k] : Infinity, vSsu: null, vN2: null });
      perLaag.push({ laag: h, N: Nh[k], n: n_h[k], kans: p });
    });
  } else {
    if (!kader.cluster) throw fout('Kies welke kolom de clusters aanduidt.');
    const m = Math.round(ontwerp.perCluster);
    if (!(m >= 2)) throw fout('Trek minstens 2 eenheden per cluster. Met 1 per cluster kan je de onzekerheid binnen de clusters niet schatten en wordt de foutmarge te klein.');
    // clusters per laag; een cluster mag maar in één laag zitten
    const clusterLaag = new Map();
    for (let i = 0; i < N; i++) {
      const c = String(kader.cluster[i]), h = kader.laag ? String(kader.laag[i]) : '';
      const al = clusterLaag.get(c);
      if (al === undefined) clusterLaag.set(c, h);
      else if (al !== h) throw fout('Cluster ' + c + ' zit in meer dan één groep. Een cluster moet volledig binnen één groep vallen.');
    }
    const leden = groepeer(kader.cluster, alle);
    const perLaagClusters = new Map(laagNamen.map(h => [h, []]));
    for (const [c, h] of clusterLaag) perLaagClusters.get(h).push(c);
    const eerste = new Map(); for (let i = N - 1; i >= 0; i--) eerste.set(String(kader.cluster[i]), i);
    for (const h of laagNamen) perLaagClusters.get(h).sort(ontwerp.clusterVolgorde === 'kader' ? (a, b) => eerste.get(a) - eerste.get(b) : vergelijk);
    const Kh = laagNamen.map(h => perLaagClusters.get(h).length);
    const Nh = laagNamen.map(h => lagen.get(h).length);
    let k_h;
    const minima = Kh.map(x => Math.min(2, x));
    if (ontwerp.clusterVerdeling === 'eigen') {
      k_h = laagNamen.map(h => Math.round(+((ontwerp.eigenClusters || {})[h]) || 0));
      k_h.forEach((x, k) => { if (x > Kh[k]) throw fout('Groep ' + laagNamen[k] + ' telt maar ' + Kh[k] + ' clusters.'); if (x < minima[k]) throw fout('Groep ' + laagNamen[k] + ' heeft minstens ' + minima[k] + ' clusters nodig.'); });
    } else {
      k_h = verdeel(Math.round(ontwerp.clusters), ontwerp.clusterVerdeling === 'gelijk' ? Kh.map(() => 1) : Nh, Kh, minima);
    }
    laagNamen.forEach((h, k) => {
      const cl = perLaagClusters.get(h), M = cl.map(c => leden.get(c).length);
      let p1, gekozen, zeker;
      if (ontwerp.clusterKeuze === 'grootte') {
        p1 = kansenVolgensGrootte(M, k_h[k]);
        const nZeker = p1.filter(x => x >= 1).length, nVrij = k_h[k] - nZeker, beschikbaar = cl.length - nZeker;
        if (nVrij === 1 && beschikbaar > 1) throw fout((h ? 'Groep ' + h + ': ' : '') + nZeker + (nZeker === 1 ? ' cluster gaat' : ' clusters gaan') + ' zeker mee omdat ' + (nZeker === 1 ? 'hij zo groot is' : 'ze zo groot zijn') + '. Dan blijft er maar 1 cluster over die bij toeval gekozen wordt, en zo kan je de foutmarge niet schatten. Kies er minstens 1 meer (' + (k_h[k] + 1) + ').');
        if (nVrij >= 2 && nVrij / beschikbaar > 0.2) waarschuwingen.push((h ? 'In ' + h + ' trek je ' : 'Je trekt ') + Math.round(100 * nVrij / beschikbaar) + '% van de clusters. De foutmarge wordt dan berekend alsof met teruglegging getrokken werd en valt wat te ruim uit (aan de voorzichtige kant).');
        let volgorde = cl.map((_, j) => j);
        if (ontwerp.clusterVolgorde !== 'kader') volgorde = trekAselect(volgorde, volgorde.length, rng);
        gekozen = trekVolgensGrootte(p1, volgorde, rng).sort((a, b) => a - b);
        zeker = p1.filter(x => x >= 1).length;
      } else {
        p1 = M.map(() => k_h[k] / Kh[k]);
        gekozen = trekAselect(cl.map((_, j) => j), k_h[k], rng).sort((a, b) => a - b);
        zeker = 0;
      }
      let nTrek = 0, alles = 0;
      for (const j of gekozen) {
        const c = cl[j], lid = leden.get(c), Mj = lid.length;
        const mj = Math.min(m, Mj); if (mj < m) alles++;
        const p2 = mj / Mj;
        const binnen = trekAselect(lid, mj, rng);
        for (const i of binnen) {
          const e = { i, laag: h, cluster: c, p1: p1[j], p2, p: p1[j] * p2, w: 1 / (p1[j] * p2) };
          if (ontwerp.clusterKeuze === 'grootte') {
            if (p1[j] >= 1) Object.assign(e, { vLaag: h + ' · ' + c, vPsu: 'e' + i, vN1: eindig ? Mj : Infinity, vSsu: null, vN2: null, zeker: true });
            else Object.assign(e, { vLaag: h, vPsu: 'c' + c, vN1: Infinity, vSsu: null, vN2: null });
          } else {
            Object.assign(e, eindig ? { vLaag: h, vPsu: 'c' + c, vN1: Kh[k], vSsu: 'e' + i, vN2: Mj }
                                    : { vLaag: h, vPsu: 'c' + c, vN1: Infinity, vSsu: null, vN2: null });
          }
          eenheden.push(e); nTrek++;
        }
      }
      perLaag.push({ laag: h, N: Nh[k], clustersInLaag: Kh[k], clusters: k_h[k], zeker, n: nTrek, kleineClusters: alles });
      if (alles) waarschuwingen.push(alles + (alles === 1 ? ' cluster' : ' clusters') + (h ? ' in ' + h : '') + ' telt minder dan ' + m + ' eenheden: daar gaat iedereen mee.');
    });
  }
  eenheden.sort((a, b) => a.i - b.i);
  return { versie: VERSIE, startgetal, ontwerp: JSON.parse(JSON.stringify(ontwerp)), N, n: eenheden.length, eenheden, perLaag, waarschuwingen };
}

// Volgorde voor systematisch trekken: elke waarde krijgt eenmaal een rang (getallen als getal, tekst alfabetisch).
const rangCache = new WeakMap();
function rangen(waarden) {
  if (rangCache.has(waarden)) return rangCache.get(waarden);
  const uniek = [...new Set(waarden)].sort(vergelijk), plaats = new Map(uniek.map((v, k) => [v, k]));
  const r = Int32Array.from(waarden, v => plaats.get(v));
  rangCache.set(waarden, r); return r;
}
function sd(v) {
  const n = v.length; if (n < 2) return 0;
  const g = som(v) / n; let s = 0; for (const x of v) s += (x - g) * (x - g);
  return Math.sqrt(s / (n - 1));
}

/* ---------------- Ontwerp voor de analyse ----------------
   rijen: arrays van gelijke lengte. w = gewicht; vLaag, vPsu = groep en cluster voor de foutmarge;
   vN1 = aantal clusters (of eenheden) in de groep in de populatie (Infinity = niet gekend / met teruglegging);
   vSsu, vN2 = tweede trap (optioneel). */
function analyseOntwerp(o) {
  const n = o.w.length;
  const w = Float64Array.from(o.w, x => getal(x));
  if (w.some(x => isNaN(x) || x < 0)) throw fout('Elk gewicht moet een getal zijn van 0 of meer.');
  const D = { n, w, vLaag: (o.vLaag || new Array(n).fill('')).map(x => x == null ? '' : String(x)),
    vPsu: o.vPsu ? o.vPsu.map((x, i) => x == null || x === '' ? 'e' + i : String(x)) : Array.from({ length: n }, (_, i) => 'e' + i),
    vN1: (o.vN1 || new Array(n).fill(Infinity)).map(leesN), vSsu: o.vSsu || null, vN2: o.vN2 ? o.vN2.map(leesN) : null,
    vZeker: o.vZeker ? o.vZeker.map(x => x === true || x === 1 || x === '1' || x === 'ja') : new Array(n).fill(false),
    kalibratie: [], meldingen: [] };
  if (D.vSsu) D.vSsu = D.vSsu.map(x => x == null || x === '' ? null : String(x));
  // Per groep: aantal clusters in de steekproef; N moet minstens zo groot zijn (of een fractie tussen 0 en 1 zijn).
  const perLaag = new Map();
  for (let i = 0; i < n; i++) {
    const h = D.vLaag[i]; let L = perLaag.get(h); if (!L) perLaag.set(h, L = { psu: new Map(), N: new Set(), zeker: false });
    const c = D.vPsu[i]; if (!L.psu.has(c)) L.psu.set(c, []); L.psu.get(c).push(i); L.N.add(D.vN1[i]); if (D.vZeker[i]) L.zeker = true;
  }
  for (const [h, L] of perLaag) {
    if (L.N.size > 1) throw fout('In groep ' + (h || '(zonder naam)') + ' staan verschillende populatieaantallen. Per groep moet dat één getal zijn.');
    let N = [...L.N][0]; const k = L.psu.size;
    if (N > 0 && N <= 1 && N !== Infinity) { N = k / N; for (const r of L.psu.values()) for (const i of r) D.vN1[i] = N; }   // fractie
    if (N !== Infinity && N < k - 1e-9) throw fout('Groep ' + (h || '(zonder naam)') + ': de populatie telt ' + N + ', maar de steekproef heeft er al ' + k + '. Kijk de kolom met het populatieaantal na.');
    if (!(N > 0)) throw fout('Groep ' + (h || '(zonder naam)') + ': het populatieaantal moet groter zijn dan 0.');
    // tweede trap: elke cluster moet minstens 2 eenheden hebben, anders is de spreiding binnen niet te schatten
    if (D.vSsu && D.vN2 && N !== Infinity) {
      let eenzaam = 0;
      for (const r of L.psu.values()) {
        const sub = new Set(r.map(i => D.vSsu[i])), N2 = new Set(r.map(i => D.vN2[i]));
        if (N2.size > 1) throw fout('Binnen één cluster staan verschillende aantallen voor de tweede trap.');
        let M = [...N2][0]; if (M > 0 && M <= 1) { M = sub.size / M; for (const i of r) D.vN2[i] = M; }
        if (M !== Infinity && M < sub.size - 1e-9) throw fout('Een cluster telt volgens het bestand ' + M + ' eenheden, maar er zitten er al ' + sub.size + ' in de steekproef.');
        if (sub.size < 2 && M > 1) eenzaam++;
      }
      if (eenzaam) {
        for (const r of L.psu.values()) for (const i of r) D.vN1[i] = Infinity;
        D.meldingen.push('In ' + (h ? 'groep ' + h : 'de steekproef') + ' heeft ' + eenzaam + (eenzaam === 1 ? ' cluster' : ' clusters') + ' maar één antwoord. Daar rekent de foutmarge alsof met teruglegging getrokken werd (voorzichtig).');
      }
    }
  }
  // Vrijheidsgraden: clusters min groepen, zonder de groepen die bestaan uit één zekere cluster
  // (daar heeft de foutmarge veel eenheden, maar dat zegt niets over de onzekerheid tussen clusters).
  let k = 0, H = 0, kZ = 0, HZ = 0;
  for (const L of perLaag.values()) { if (L.zeker) { kZ += L.psu.size; HZ++; } else { k += L.psu.size; H++; } }
  D.vrijheidsgraden = H > 0 && k - H >= 1 ? k - H : Math.max(1, k + kZ - H - HZ);
  D.aantalLagen = perLaag.size; D.aantalClusters = k + kZ;
  for (const [h, L] of perLaag) if (!L.zeker && L.psu.size === 1 && [...L.N][0] !== 1)
    D.meldingen.push('In ' + (h ? 'groep ' + h : 'de steekproef') + ' zit maar één cluster. De foutmarge vergelijkt die met het gemiddelde over alle groepen (benadering).');
  D.eindig = [...perLaag.values()].some(L => [...L.N][0] !== Infinity);
  return D;
}
function leesN(x) { if (x === Infinity || x === 'Inf' || x === 'Infinity' || x === '' || x == null) return Infinity; const v = getal(x); return isNaN(v) ? Infinity : v; }

/* ---------------- Foutmarge (variantie) ----------------
   Zelfde aanpak als de gangbare software voor complexe steekproeven: lineariseren, dan per groep de spreiding
   tussen de clustertotalen, met eindige-populatiecorrectie waar gekend, en een tweede trap waar die er is.
   Een groep met maar één cluster: centreren op het gemiddelde over alle groepen. */
function eenTrap(z, rijen, laag, psu, N1) {
  const perLaag = new Map();
  for (const i of rijen) {
    const h = String(laag[i]); let L = perLaag.get(h); if (!L) perLaag.set(h, L = { psu: new Map(), N: N1 ? N1[i] : Infinity, rijen: [] });
    const c = String(psu[i]); L.psu.set(c, (L.psu.get(c) || 0) + z[i]); L.rijen.push(i);
  }
  let totaalPsu = 0, totaalZ = 0;
  for (const L of perLaag.values()) { totaalPsu += L.psu.size; for (const t of L.psu.values()) totaalZ += t; }
  const hercentreer = totaalZ / totaalPsu;
  let v = 0, eenzaam = 0;
  for (const L of perLaag.values()) {
    const nh = L.psu.size, N = +L.N;
    const f = (N === Infinity || !isFinite(N)) ? 1 : (N - nh) / N;
    if (f < 1e-7) continue;
    const t = [...L.psu.values()];
    let midden, schaal;
    if (nh > 1) { midden = som(t) / nh; schaal = f * nh / (nh - 1); }
    else { midden = hercentreer; schaal = f; eenzaam++; }
    for (const x of t) v += schaal * (x - midden) * (x - midden);
  }
  return { v, perLaag, eenzaam };
}
const EEN = new Proxy({}, { get: () => '' }); // één groep binnen een cluster
function variantie(z, D) {
  z = residu(z, D);
  const alle = Array.from({ length: D.n }, (_, i) => i);
  const r1 = eenTrap(z, alle, D.vLaag, D.vPsu, D.vN1);
  let v = r1.v;
  if (D.vSsu && D.vN2) {
    for (const L of r1.perLaag.values()) {
      const N = +L.N; if (!isFinite(N)) continue;
      const fractie = L.psu.size / N;
      const perPsu = groepeer(D.vPsu, L.rijen);
      for (const rij of perPsu.values()) {
        if (D.vSsu[rij[0]] == null) continue;
        v += fractie * eenTrap(z, rij, EEN, D.vSsu, D.vN2).v;
      }
    }
  }
  return { v, eenzaam: r1.eenzaam };
}

/* ---------------- Ophogen naar gekende totalen ----------------
   Elke stap bewaart wat nodig is om de foutmarge correct te houden: de gewichten ervoor en erna, en de groepen.
   Voor de foutmarge gebruiken we de residuen van een gewogen regressie op de groepsindicatoren
   (zo wordt het voordeel van de gekende totalen meegerekend). */
function modelMatrix(cats) {
  // eerste variabele: alle niveaus; volgende: eerste niveau weg (zelfde ruimte, volle rang)
  const kol = [];
  cats.forEach((c, v) => {
    const niv = [...new Set(c.map(String))].sort(vergelijk);
    (v === 0 ? niv : niv.slice(1)).forEach(l => kol.push({ v, l }));
  });
  return kol;
}
function residu(z, D) {
  for (const st of D.kalibratie) {
    const n = D.n, kol = st.kol, p = kol.length, wv = st.voor, wn = st.na;
    const X = i => kol.map(k => String(st.cats[k.v][i]) === k.l ? 1 : 0);
    const A = Array.from({ length: p }, () => new Float64Array(p)), b = new Float64Array(p);
    const rijX = [];
    for (let i = 0; i < n; i++) {
      const x = X(i); rijX.push(x);
      if (wn[i] === 0) continue;
      const g = wn[i] / wv[i];
      for (let a = 0; a < p; a++) if (x[a]) { b[a] += z[i] / g; for (let c = 0; c < p; c++) if (x[c]) A[a][c] += wv[i]; }
    }
    const B = losOp(A, b);
    const uit = new Float64Array(n);
    for (let i = 0; i < n; i++) { let xb = 0; for (let a = 0; a < p; a++) if (rijX[i][a]) xb += B[a]; uit[i] = z[i] - wn[i] * xb; }
    z = uit;
  }
  return z;
}
// Symmetrisch stelsel oplossen (eliminatie met spilkeuze). Kolommen zonder informatie krijgen 0.
function losOp(A, b) {
  // Elimineren met spilkeuze per kolom; kolommen zonder spil (afhankelijk) krijgen 0.
  const p = b.length, M = A.map((r, i) => [...r, b[i]]);
  let schaal = 0; for (const r of A) for (const x of r) schaal = Math.max(schaal, Math.abs(x));
  const eps = 1e-11 * Math.max(1, schaal), spilRij = new Array(p).fill(-1);
  let rij = 0;
  for (let c = 0; c < p && rij < p; c++) {
    let best = rij; for (let r = rij + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r;
    if (Math.abs(M[best][c]) <= eps) continue;
    [M[rij], M[best]] = [M[best], M[rij]];
    const d = M[rij][c]; for (let k = c; k <= p; k++) M[rij][k] /= d;
    for (let r = 0; r < p; r++) if (r !== rij) { const f = M[r][c]; if (f) for (let k = c; k <= p; k++) M[r][k] -= f * M[rij][k]; }
    spilRij[c] = rij; rij++;
  }
  return spilRij.map(r => r >= 0 ? M[r][p] : 0);
}

// Correctie voor wie niet antwoordde, per klasse: gewicht × (alle gewichten in de klasse) / (gewichten van wie antwoordde).
// status: 'ja' (antwoordde), 'nee' (antwoordde niet), 'buiten' (hoort niet bij de doelgroep: krijgt geen deel).
function corrigeerNonrespons(w, status, klasse) {
  const n = w.length, k = klasse || new Array(n).fill('');
  const tot = new Map(), resp = new Map(), aantal = new Map();
  for (let i = 0; i < n; i++) {
    if (status[i] === 'buiten') continue;
    const c = String(k[i]);
    tot.set(c, (tot.get(c) || 0) + w[i]);
    if (!aantal.has(c)) aantal.set(c, { ja: 0, nee: 0 });
    if (status[i] === 'ja') { resp.set(c, (resp.get(c) || 0) + w[i]); aantal.get(c).ja++; } else aantal.get(c).nee++;
  }
  const factor = new Map(); const leeg = [];
  for (const [c, t] of tot) { const r = resp.get(c) || 0; if (r === 0) leeg.push(c); factor.set(c, r > 0 ? t / r : NaN); }
  if (leeg.length) throw fout('In ' + (leeg.length === 1 ? 'klasse ' + leeg[0] : leeg.length + ' klassen') + ' antwoordde niemand. Voeg klassen samen.');
  const nieuw = w.map((x, i) => status[i] === 'ja' ? x * factor.get(String(k[i])) : 0);
  const klassen = [...factor.keys()].sort(vergelijk).map(c => ({ klasse: c, factor: factor.get(c), ...aantal.get(c) }));
  return { w: nieuw, klassen };
}

// Ophogen naar gekende totalen voor één indeling (eventueel een kruising): gewicht × totaal / som gewichten.
function ophogen(D, cat, totalen) {
  return rakenIntern(D, [cat], [totalen], { maxIter: 1 });
}
// Ophogen naar de totalen van meerdere indelingen tegelijk (iteratief aanpassen tot alles klopt).
function raken(D, cats, totalen, opties) { return rakenIntern(D, cats, totalen, opties || {}); }
function rakenIntern(D, cats, totalen, opties) {
  const n = D.n, voor = Float64Array.from(D.w), w = Float64Array.from(D.w);
  const maxIter = opties.maxIter || 100, tol = opties.tol || 1e-10;
  const T = totalen.map(t => Object.values(t).reduce((a, b) => a + (+b), 0));
  if (T.some(t => Math.abs(t - T[0]) > 1e-6 * Math.max(1, T[0]))) throw fout('De totalen van de indelingen zijn niet gelijk (' + T.map(x => fmt(x)).join(' en ') + '). Ze moeten allemaal op dezelfde populatie slaan.');
  cats.forEach((c, v) => {
    const inSteek = new Set(); for (let i = 0; i < n; i++) if (w[i] > 0) inSteek.add(String(c[i]));
    for (const l of inSteek) if (!(l in totalen[v])) throw fout('Voor "' + l + '" ontbreekt een totaal.');
    for (const l of Object.keys(totalen[v])) if (+totalen[v][l] > 0 && !inSteek.has(l)) throw fout('Niemand in de steekproef valt onder "' + l + '". Voeg die groep samen met een andere.');
  });
  let iter = 0, afwijking = Infinity;
  for (iter = 1; iter <= maxIter; iter++) {
    cats.forEach((c, v) => {
      const s = {}; for (let i = 0; i < n; i++) if (w[i] > 0) { const l = String(c[i]); s[l] = (s[l] || 0) + w[i]; }
      for (let i = 0; i < n; i++) if (w[i] > 0) w[i] *= (+totalen[v][String(c[i])]) / s[String(c[i])];
    });
    afwijking = 0;
    cats.forEach((c, v) => {
      const s = {}; for (let i = 0; i < n; i++) if (w[i] > 0) { const l = String(c[i]); s[l] = (s[l] || 0) + w[i]; }
      for (const l in s) afwijking = Math.max(afwijking, Math.abs(s[l] - totalen[v][l]) / Math.max(1, +totalen[v][l]));
    });
    if (afwijking < tol) break;
  }
  const kol = modelMatrix(cats);
  const nieuw = Object.assign({}, D, { w, kalibratie: D.kalibratie.concat([{ cats, kol, voor, na: w }]) });
  return { D: nieuw, iteraties: Math.min(iter, maxIter), geconvergeerd: afwijking < Math.max(tol, 1e-8), afwijking };
}

/* ---------------- Schatten ---------------- */
// soort: 'gemiddelde' | 'aandeel' | 'totaal'. y: getallen (NaN = ontbreekt). domein: booleans of null.
function schat(D, y, opties) {
  const o = Object.assign({ soort: 'gemiddelde', domein: null, zekerheid: 0.95, ontwerpeffect: true }, opties);
  const n = D.n, w = D.w;
  y = Array.from(y, getal);
  const geldig = i => !isNaN(y[i]) && (!o.domein || o.domein[i]);
  if (o.soort === 'aandeel') for (let i = 0; i < n; i++) if (geldig(i) && y[i] !== 0 && y[i] !== 1) throw fout('Voor een aandeel moet elke waarde 0 of 1 zijn.');
  let W = 0, S = 0, nObs = 0;
  for (let i = 0; i < n; i++) if (geldig(i)) { W += w[i]; S += w[i] * y[i]; if (w[i] !== 0) nObs++; }
  if (nObs === 0) return { n: 0, schatting: NaN };
  const z = new Float64Array(n);
  let schatting;
  if (o.soort === 'totaal') { schatting = S; for (let i = 0; i < n; i++) if (geldig(i)) z[i] = w[i] * y[i]; }
  else { schatting = S / W; for (let i = 0; i < n; i++) if (geldig(i)) z[i] = w[i] * (y[i] - schatting) / W; }
  const { v, eenzaam } = variantie(z, D);
  const se = Math.sqrt(Math.max(0, v));
  const df = D.vrijheidsgraden, t = tKwantiel(1 - (1 - o.zekerheid) / 2, df);
  let onder = schatting - t * se, boven = schatting + t * se, uitRand = false;
  if (o.soort === 'aandeel') {
    if (schatting > 0 && schatting < 1) {
      const l = Math.log(schatting / (1 - schatting)), sl = se / (schatting * (1 - schatting));
      onder = 1 / (1 + Math.exp(-(l - t * sl))); boven = 1 / (1 + Math.exp(-(l + t * sl)));
    } else {
      // Iedereen of niemand: een eenzijdig interval op basis van de effectieve omvang (gewogen aantal antwoorden).
      let s1 = 0, s2 = 0; for (let i = 0; i < n; i++) if (geldig(i)) { s1 += w[i]; s2 += w[i] * w[i]; }
      const nEff = Math.max(1, s1 * s1 / s2), grens = 1 - Math.pow((1 - o.zekerheid) / 2, 1 / nEff);
      if (schatting === 0) { onder = 0; boven = grens; } else { onder = 1 - grens; boven = 1; }
      uitRand = true;
    }
  }
  const uit = { schatting, se, marge: t * se, onder, boven, df, t, n: nObs, gewichtSom: W, cv: schatting !== 0 ? se / Math.abs(schatting) : NaN, eenzaam, randInterval: uitRand };
  if (o.ontwerpeffect && nObs > 1) {
    // vergelijking met een gewone aselecte steekproef van dezelfde omvang (zonder teruglegging)
    const gem = S / W; let q = 0;
    for (let i = 0; i < n; i++) if (geldig(i)) q += w[i] * (y[i] - gem) * (y[i] - gem);
    const s2 = q / W * nObs / (nObs - 1);
    // Zonder gekende populatie (gewichten tellen niet op tot meer dan het aantal antwoorden) of zonder eindige
    // correctie in het ontwerp: vergelijken met een aselecte steekproef met teruglegging.
    const metCorrectie = D.eindig && W > nObs * 1.0001;
    let vsrs = metCorrectie ? s2 * (W - nObs) / (W * nObs) : s2 / nObs;
    uit.ontwerpeffectSoort = metCorrectie ? 'zonder teruglegging' : 'met teruglegging';
    if (o.soort === 'totaal') vsrs *= W * W;
    uit.ontwerpeffect = vsrs > 0 ? v / vsrs : NaN;
    uit.effectieveN = uit.ontwerpeffect > 0 ? nObs / uit.ontwerpeffect : NaN;
  }
  return uit;
}

// Effect van ongelijke gewichten: n × som(w²) / (som w)². 1 = gelijke gewichten.
function gewichtenOverzicht(w) {
  const v = Array.from(w).filter(x => x > 0); const n = v.length;
  if (!n) return null;
  const s = som(v), s2 = som(v.map(x => x * x)), gem = s / n;
  const sorted = v.slice().sort((a, b) => a - b);
  return { n, som: s, min: sorted[0], max: sorted[n - 1], gemiddelde: gem, mediaan: n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    verhouding: sorted[n - 1] / sorted[0], effect: n * s2 / (s * s), effectieveN: s * s / s2 };
}

// Hoe groot moet de steekproef zijn voor een aandeel, met een gewenste foutmarge (in procentpunten / 100)?
function steekproefomvang({ marge, p = 0.5, N = Infinity, ontwerpeffect = 1, respons = 1, zekerheid = 0.95 }) {
  const z = normKwantiel(1 - (1 - zekerheid) / 2);
  const n0 = z * z * p * (1 - p) / (marge * marge);
  const nd = n0 * ontwerpeffect;
  const nEindig = isFinite(N) ? nd / (1 + (nd - 1) / N) : nd;
  const antwoorden = Math.ceil(nEindig - 1e-9);
  return { z, n0, nEindig, antwoorden, aanschrijven: Math.ceil(antwoorden / respons - 1e-9) };
}

/* ---------------- Verdelingen ---------------- */
function normKwantiel(p) {
  // rationale benadering met één verfijningsstap (fout < 1e-15)
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425; let q, r, x;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= 1 - pl) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const e = 0.5 * erfc(-x / Math.SQRT2) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}
function erfc(x) {
  // complementaire foutfunctie: reeks voor kleine waarden, kettingbreuk voor grote
  const z = Math.abs(x);
  let r;
  if (z < 2) { // reeks voor erf
    let s = z, t = z, k = 0; const z2 = z * z;
    do { k++; t *= -z2 / k; const d = t / (2 * k + 1); s += d; if (Math.abs(d) < 1e-17 * Math.abs(s)) break; } while (k < 200);
    r = 1 - 2 / Math.sqrt(Math.PI) * s;
  } else { // kettingbreuk
    let f = 0; for (let k = 60; k >= 1; k--) f = k / 2 / (z + f);
    r = Math.exp(-z * z) / Math.sqrt(Math.PI) / (z + f);
  }
  return x >= 0 ? r : 2 - r;
}
function lnGamma(x) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1; let a = c[0]; const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function betaRegularized(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (x, a, b) => {
    const TINY = 1e-300; let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < TINY) d = TINY; d = 1 / d; let h = d;
    for (let m = 1; m <= 1000; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
      aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * cf(x, a, b) / a : 1 - bt * cf(1 - x, b, a) / b;
}
function tVerdeling(t, df) { // P(T <= t)
  if (!isFinite(df)) return 0.5 * erfc(-t / Math.SQRT2);
  const x = df / (df + t * t), p = 0.5 * betaRegularized(x, df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}
function tKwantiel(p, df) {
  if (!isFinite(df) || df > 1e7) return normKwantiel(p);
  let lo = -1e3, hi = 1e3, x = normKwantiel(p);
  for (let k = 0; k < 200; k++) { // halveren, versneld met de helling
    const F = tVerdeling(x, df) - p;
    if (Math.abs(F) < 1e-15) break;
    if (F > 0) hi = x; else lo = x;
    const dens = Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - (df + 1) / 2 * Math.log(1 + x * x / df));
    let nx = x - F / dens; if (!(nx > lo && nx < hi)) nx = (lo + hi) / 2;
    if (Math.abs(nx - x) < 1e-14 * Math.max(1, Math.abs(x))) { x = nx; break; }
    x = nx;
  }
  return x;
}

function fmt(x) { return (Math.round(x * 100) / 100).toLocaleString('nl-BE'); }

/* ---------------- Voorbeeldpopulatie (fictief) ----------------
   Vijf regio's, zestig gemeenten van verschillende grootte, volwassen inwoners met leeftijd en geslacht.
   Sport (wekelijks ja/nee) hangt af van leeftijd en verschilt tussen gemeenten (zo ontstaat een clustereffect).
   Uren vrijwilligerswerk per maand: veel nullen, een paar uitschieters. Kans om te antwoorden: jongeren en mannen
   minder. Die kans hangt alleen af van kenmerken die je kent (leeftijd, geslacht), zodat wegen de vertekening kan
   wegwerken. In het echt hangt antwoorden soms ook samen met het onderwerp zelf; dan helpt wegen maar gedeeltelijk. */
function voorbeeldpopulatie(startgetal) {
  const rng = toeval(startgetal == null ? 20261102 : startgetal);
  const norm = () => { let u = 0, v = 0; while (u === 0) u = rng.uniform(); v = rng.uniform(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const regios = ['Noord', 'Oost', 'Zuid', 'West', 'Midden'];
  const regioEffect = { Noord: 0.15, Oost: -0.1, Zuid: -0.25, West: 0.05, Midden: 0.3 };
  const leeftijden = ['18-34', '35-49', '50-64', '65+'];
  const leeftijdEffect = { '18-34': 0.5, '35-49': 0.1, '50-64': -0.25, '65+': -0.7 };
  const responsBasis = { '18-34': 0.32, '35-49': 0.45, '50-64': 0.58, '65+': 0.68 };
  const kol = { id: [], regio: [], gemeente: [], leeftijd: [], geslacht: [], sport: [], vrijwilliger: [], respons: [] };
  let id = 0;
  regios.forEach((r, ri) => {
    for (let g = 1; g <= 12; g++) {
      const grootte = Math.max(250, Math.round(Math.exp(7.1 + 0.75 * norm())));
      const gemEffect = 0.35 * norm(), gemVrijw = 0.4 * norm();
      const naam = r + ' ' + String(g).padStart(2, '0');
      const stad = rng.uniform() < 0.5;
      for (let k = 0; k < grootte; k++) {
        const u = rng.uniform();
        const lt = u < 0.27 ? '18-34' : u < 0.52 ? '35-49' : u < 0.77 ? '50-64' : '65+';
        const gs = rng.uniform() < 0.49 ? 'man' : 'vrouw';
        const eta = -0.1 + leeftijdEffect[lt] + regioEffect[r] + gemEffect + (gs === 'man' ? 0.1 : -0.1);
        const sport = rng.uniform() < 1 / (1 + Math.exp(-eta)) ? 1 : 0;
        const doetMee = rng.uniform() < 1 / (1 + Math.exp(-(-1.3 + (lt === '65+' ? 0.5 : lt === '50-64' ? 0.3 : 0) + gemVrijw)));
        const uren = doetMee ? Math.round(Math.exp(1.6 + 0.8 * norm()) * 2) / 2 : 0;
        const pr = responsBasis[lt] + (gs === 'man' ? -0.04 : 0.04);
        kol.id.push(++id); kol.regio.push(r); kol.gemeente.push(naam); kol.leeftijd.push(lt); kol.geslacht.push(gs);
        kol.sport.push(sport); kol.vrijwilliger.push(uren); kol.respons.push(pr);
      }
    }
  });
  kol.N = id;
  return kol;
}

const Kern = { VERSIE, toeval, getal, geldigStartgetal, nieuwStartgetal, verdeel, trek, kansenVolgensGrootte, analyseOntwerp, variantie, schat, corrigeerNonrespons,
  ophogen, raken, gewichtenOverzicht, steekproefomvang, tKwantiel, normKwantiel, tVerdeling, voorbeeldpopulatie, sd };
if (typeof module === 'object' && module.exports) module.exports = Kern; else root.Kern = Kern;
})(typeof self !== 'undefined' ? self : this);
