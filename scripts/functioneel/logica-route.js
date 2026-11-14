// Routelogica: 3000 willekeurige reeksen van overslaan, erbij nemen en wisselen; daarna moeten de vaste regels nog kloppen.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8994);
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 100))); await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', 'true'); } catch (e) {} });
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const fout = []; let n = 0, rnd = 4242; const R = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648; const plannen = Object.keys(ROUTE_KERN);
    for (let ronde = 0; ronde < 3000; ronde++) { const tr = plannen[Math.floor(R() * plannen.length)], alle = trajectStappen(tr), sleutels = alle.map(stapSleutel);
      store.set('route', {}); store.set('stap-over', {}); store.set('stap-erbij', {});
      for (let k = 0; k < 12; k++) { const x = R(), s = sleutels[Math.floor(R() * sleutels.length)];
        if (x < 0.3) { stapZet('stap-over', tr, s, true); stapZet('stap-erbij', tr, s, false); } else if (x < 0.6) { stapZet('stap-erbij', tr, s, true); stapZet('stap-over', tr, s, false); } else if (x < 0.8) { const o = Object.assign({}, store.get('route', {})); o[tr] = R() < 0.5 ? 'kort' : 'vol'; store.set('route', o); } else stapZet('stap-over', tr, s, false);
        n++; const st = stepsOf(tr), act = st.map(stapSleutel), over = stapLijst('stap-over', tr), erbij = stapLijst('stap-erbij', tr), kort = routeVan(tr) === 'kort';
        if (act.some(a => over.includes(a))) fout.push(`${tr}: een overgeslagen stap staat in de route`);
        if (over.some(a => erbij.includes(a))) fout.push(`${tr}: een stap is tegelijk overgeslagen en erbij genomen`);
        const volgorde = act.map(a => sleutels.indexOf(a)); if (volgorde.some((v, i) => v < 0 || (i && v <= volgorde[i - 1]))) fout.push(`${tr}: volgorde van de stappen klopt niet`);
        alle.forEach(s2 => { const a = stapSleutel(s2), inR = act.includes(a), kern = ROUTE_KERN[tr].includes(s2.t.id); const moet = !over.includes(a) && (!kort || kern || erbij.includes(a)); if (inR !== moet) fout.push(`${tr} ${kort ? 'kort' : 'uitgebreid'}: ${a} ${inR ? 'staat' : 'ontbreekt'} in de route`); });
        if (fout.length > 8) return { n, fout }; } }
    store.set('route', {}); store.set('stap-over', {}); store.set('stap-erbij', {});
    // de kern bestaat: elke kernstap is een echte stap van het plan, en elke kernstap heeft een "klaar als"
    plannen.forEach(tr => { const ids = trajectStappen(tr).map(s => s.t.id); ROUTE_KERN[tr].forEach(id => { n++; if (!ids.includes(id)) fout.push(`${tr}: kernstap ${id} bestaat niet in het plan`); if (!(KLAAR_ALS[tr] || {})[id]) fout.push(`${tr}: kernstap ${id} heeft geen "klaar als"`); }); if (stepsOf(tr).length !== kernAantal(tr)) fout.push(`${tr}: korte route telt ${stepsOf(tr).length} stappen, de kern ${kernAantal(tr)}`); });
    return { n, fout }; });
  console.log((r.fout.length ? 'FOUT ' : 'ok   ') + 'Routelogica'.padEnd(34), r.n, 'gevallen', r.fout.slice(0, 6).join('\n     '), '| paginafouten', E.length); await b.close(); })();
