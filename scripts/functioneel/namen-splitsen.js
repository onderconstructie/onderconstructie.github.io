// Lange toolnamen breken af op een woordgrens of lettergreep, nooit zomaar ergens. Geldt ook voor elke nieuwe tool.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9421);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 360, height: 800 }, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const r = await p.evaluate(async () => { const T = await (await fetch('/tools.json')).json();
    const zonder = [], delen = [];
    T.forEach(t => afbreek(t.title).split(/[\s-]+/).forEach(w => { const kaal = w.replace(/­/g, ''); if (kaal.length > 9 && !w.includes('­')) zonder.push(kaal); w.split('­').forEach(d => { if (d.length > 9) delen.push(kaal + ': ' + d); }); }));
    return { n: T.length, zonder, delen, vb: ['Projectbudget', 'Kennisbank', 'Projectopdracht'].map(x => afbreek(x).replace(/­/g, '|')) }; });
  ok(r.zonder.length === 0, 'elk woord van meer dan 9 letters in een toolnaam heeft een breekpunt: ' + r.zonder.join(', '));
  ok(r.delen.length === 0, 'geen stuk tussen twee breekpunten is langer dan 9 letters: ' + r.delen.join(', '));
  ok(r.vb.join() === 'Project|budget,Kennis|bank,Project|op|dracht', 'Project|budget, Kennis|bank, Project|op|dracht (' + r.vb.join(', ') + ')');
  ok(E.length === 0, 'geen scriptfouten ' + E.join(' | '));
  await b.close(); console.log(fout.length ? '\n' + fout.length + ' FOUT' : '\nalles ok'); process.exit(fout.length ? 1 : 0); })();
