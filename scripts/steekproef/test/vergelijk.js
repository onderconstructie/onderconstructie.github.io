// Vergelijkt de schattingen van de kern met die van R (survey). Relatief verschil per getal.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'data');
const J = JSON.parse(fs.readFileSync(path.join(dir, 'kern.json'), 'utf8'));
const R = {};
for (const l of fs.readFileSync(path.join(dir, 'R.txt'), 'utf8').trim().split('\n')) {
  const o = {}; for (const kv of l.split(';')) { const [k, v] = kv.split('='); o[k.trim()] = v.trim(); } R[o.naam] = o;
}
let slechtste = 0, rijen = [];
const vgl = (naam, wat, js, r) => {
  const a = +js, b = +r; const rel = Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
  slechtste = Math.max(slechtste, rel); rijen.push({ naam, wat, kern: a, R: b, rel });
};
for (const naam of Object.keys(J)) {
  const j = J[naam], r = R[naam]; if (!r) { console.log('ontbreekt in R:', naam); continue; }
  vgl(naam, 'n', j.n, r.n); vgl(naam, 'vrijheidsgraden', j.df, r.df); vgl(naam, 'som gewichten', j.wsum, r.wsum);
  vgl(naam, 'sport', j.sport.schatting, r['sport.sport']); vgl(naam, 'sport se', j.sport.se, r['sport_se']);
  vgl(naam, 'sport deff', j.sport.ontwerpeffect, r['sport_deff.sport']);
  vgl(naam, 'sport ondergrens', j.sport.onder, r['sport_lo.2.5%']); vgl(naam, 'sport bovengrens', j.sport.boven, r['sport_hi.97.5%']);
  vgl(naam, 'vrijw', j.vrijw.schatting, r['vrijw.vrijwilliger']); vgl(naam, 'vrijw se', j.vrijw.se, r['vrijw_se']);
  vgl(naam, 'vrijw deff', j.vrijw.ontwerpeffect, r['vrijw_deff.vrijwilliger']);
  vgl(naam, 'vrijw ondergrens', j.vrijw.onder, r['vrijw_lo']); vgl(naam, 'vrijw bovengrens', j.vrijw.boven, r['vrijw_hi']);
  vgl(naam, 'totaal', j.vrijwTot.schatting, r['vtot.vrijwilliger']); vgl(naam, 'totaal se', j.vrijwTot.se, r['vtot_se']);
  vgl(naam, 'totaal deff', j.vrijwTot.ontwerpeffect, r['vtot_deff.vrijwilliger']);
  for (const g of Object.keys(j.regio)) { vgl(naam, 'regio ' + g, j.regio[g].schatting, r['regio_' + g]); vgl(naam, 'regio ' + g + ' se', j.regio[g].se, r['regio_' + g + '_se']); }
  // gewichten één voor één
  const wj = fs.readFileSync(path.join(dir, naam + '.w.csv'), 'utf8').trim().split('\n').slice(1).map(Number);
  const wr = fs.readFileSync(path.join(dir, naam + '.Rw.csv'), 'utf8').trim().split('\n').slice(1).map(Number);
  let mw = 0; wj.forEach((x, i) => mw = Math.max(mw, Math.abs(x - wr[i]) / wr[i])); vgl(naam, 'gewichten (grootste)', 1 + mw, 1);
  // logit-interval via model (svyglm) ter info
  rijen.push({ naam, wat: 'sport interval via model (info)', kern: j.sport.onder, R: +r['sport_lo_glm.2.5%'], rel: Math.abs(j.sport.onder - r['sport_lo_glm.2.5%']) / r['sport_lo_glm.2.5%'] });
}
const slecht = rijen.filter(r => !(r.rel <= 1e-9) && !r.wat.includes('info'));
console.log('vergeleken getallen:', rijen.length, '| grootste relatieve afwijking:', slechtste.toExponential(2));
if (slecht.length) console.table(slecht); else console.log('Alle getallen gelijk tot op 1e-9 (relatief).');
console.log('model-interval (svyglm) vs formule, grootste rel. verschil:', Math.max(...rijen.filter(r => r.wat.includes('info')).map(r => r.rel)).toExponential(2));
fs.writeFileSync(path.join(dir, 'vergelijking.json'), JSON.stringify(rijen, null, 1));
