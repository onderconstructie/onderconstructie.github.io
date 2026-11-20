const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8991);
const PASEN = { 2025: '04-20', 2026: '04-05', 2027: '03-28', 2028: '04-16', 2029: '04-01', 2030: '04-21' };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' }); await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} });
  const open = async u => { const p = await c.newPage(); await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(400); return p; };
  let mis = 0; const meld = (naam, r) => { if (r.fout && r.fout.length) mis++; console.log((r.fout && r.fout.length ? 'FOUT ' : 'ok   ') + naam.padEnd(34), r.n !== undefined ? r.n + ' gevallen' : '', r.fout && r.fout.length ? '\n     ' + r.fout.slice(0, 6).join('\n     ') : '', r.noot || ''); };
  const vang = e => ({ fout: ['kan niet meten: ' + String(e).slice(0, 160)] });
  let p = await open('/raci/'); meld('RACI-matrix: regels per taak', await p.evaluate(() => { const fout = []; let n = 0; const L = ['', 'R', 'A', 'C', 'I']; const roles = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    for (const x of L) for (const y of L) for (const z of L) { n++; const t = { cells: { a: x, b: y, c: z } }, f = rowFlags({ roles }, t); const v = [x, y, z], A = v.filter(s => s === 'A').length, R = v.filter(s => s === 'R').length;
      const moet = [A === 0 && 'geen A', A > 1 && 'meer dan één A', R === 0 && 'geen R'].filter(Boolean); if (moet.join('|') !== f.join('|')) fout.push(`${v.join('/')}: tool "${f.join(', ')}", verwacht "${moet.join(', ')}"`); } return { n, fout }; }).catch(vang)); await p.close();
  p = await open('/tijdlijn/'); meld('Tijdlijn: achteruit plannen', await p.evaluate((PASEN) => { const D = 86400000, fout = []; const u = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / D), iso = n => new Date(n * D).toISOString().slice(0, 10); const vrij = new Set();
    for (const y in PASEN) { const [pm, pd] = PASEN[y].split('-').map(Number), ps = u(+y, pm, pd); [u(+y, 1, 1), ps + 1, u(+y, 5, 1), ps + 39, ps + 50, u(+y, 7, 11), u(+y, 7, 21), u(+y, 8, 15), u(+y, 11, 1), u(+y, 11, 11), u(+y, 12, 25)].forEach(x => vrij.add(x)); }
    const wk = n => { const w = new Date(n * D).getUTCDay(); return w !== 0 && w !== 6; }; let n = 0, metFeest = 0, zonder = 0, rnd = 99; const r = () => (rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648; const eenheid = typeof TG_E !== 'undefined' ? TG_E : null;
    for (let i = 0; i < 1500; i++) { const s = u(2026, 1, 1) + Math.floor(r() * 1400), k = 1 + Math.floor(r() * 40); n++;
      const terug = m => { let d = s, c = 0; while (c < m) { d--; if (wk(d) && !vrij.has(d)) c++; } return iso(d); };
      const a = tgVoor(iso(s), k, 'wd').d; if (a !== terug(k) && fout.length < 6) fout.push(`${k} werkdagen voor ${iso(s)}: tool ${a}, verwacht ${terug(k)}`);
      const w = tgVoor(iso(s), k, 'wk').d; n++; if (w !== terug(5 * k) && fout.length < 6) fout.push(`${k} weken (${5 * k} werkdagen) voor ${iso(s)}: tool ${w}, verwacht ${terug(5 * k)}`); }
    return { n, fout, noot: '(werkdagen zonder weekend, feestdagen en 11 juli; een week telt vijf werkdagen)' }; }, PASEN).catch(vang)); await p.close();
  p = await open('/agenda/'); meld('Agenda: tijden optellen', await p.evaluate(() => { const fout = []; let n = 0; for (let h = 0; h < 24; h++) for (const m of [0, 15, 45]) for (const d of [5, 50, 90, 240, 600]) { n++; const s = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), e = h * 60 + m + d, v = String(Math.floor(e / 60) % 24).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0'); const t = uurVan(minVan(s) + totaal({ punten: [{ min: d - 5 }, { min: 5 }] })); if (t !== v) fout.push(`${s} + ${d} min: tool ${t}, verwacht ${v}`); } return { n, fout }; }).catch(vang)); await p.close();
  // De Sociale Mixer: "personen per groepje", gemeten op de regel in de tool zelf (groupsFor). Staat de tool niet naast de app, dan zegt de test dat.
  p = await open('/mixer/'); meld('De Sociale Mixer: groepsgrootte', await p.evaluate(() => { const fout = []; let n = 0; mode = 'size';
    for (let m = 2; m <= 60; m++) for (let v = 2; v <= 12; v++) { n++; names.length = 0; for (let i = 0; i < m; i++) names.push('p' + i); groupCountInput.value = String(v); const g = groupsFor();
      if (g < 2) { if (m >= 4 && m > v) fout.push(`${m} mensen, ${v} per groepje: geen verdeling, terwijl twee groepjes kan`); continue; }
      const klein = Math.floor(m / g), groot = Math.ceil(m / g); if (klein < 2) fout.push(`${m} mensen, ${v} per groepje: een groepje van ${klein}`); else if (groot > v + Math.ceil(v / 2)) fout.push(`${m} mensen, ${v} per groepje: groepjes tot ${groot}`); }
    return { n, fout }; }).catch(vang)); await p.close();
  await b.close(); process.exit(mis ? 1 : 0); })();
