// Test L1: Stroom, Schildpad en Visgraat volgen het actieve project.
const { chromium } = require('playwright'); const B = (process.env.BASE || 'http://127.0.0.1:8000');
const T = { stroom: { key: 'stroom.v1', lijst: 'flows', naam: 'name', typ: 'Aanvraag registreren' }, schildpad: { key: 'schildpad.v1', lijst: 'procs', naam: 'naam', typ: '' }, visgraat: { key: 'visgraat.v1', lijst: 'units', naam: 'probleem', typ: 'Te veel onvolledige aanvragen' } };
const zet = n => JSON.stringify({ name: n, since: Date.now() });
(async () => { const b = await chromium.launch(); let fout = 0; const chk = (ok, wat, extra) => { if (!ok) fout++; console.log((ok ? '  ok   ' : '  FOUT ') + wat + (extra ? ' → ' + extra : '')); };
  for (const [id, t] of Object.entries(T)) { console.log('== ' + id); const c = await b.newContext({ viewport: { width: 1100, height: 900 }, serviceWorkers: 'block' }); const p = await c.newPage(), E = []; p.on('dialog', d => d.accept().catch(() => {})); p.on('pageerror', e => E.push(String(e).slice(0, 120)));
    const st = () => p.evaluate(([key, lijst, naam]) => { const pk = (document.querySelector('.oc-pk-naam') || {}).innerText || ''; let s = {}; try { s = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) {} const L = s[lijst] || []; return { pk: pk.trim(), start: !!([...document.querySelectorAll('.oc-start')].find(e => e.getClientRects().length)), bewaard: L.map(x => (x[naam] || '(leeg)') + '|' + (x.proj || '-') + (x.voorbeeld ? '|vb' : '') + (x.id === s.current ? '*' : '')).join(' ; '), tekst: (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').length }; }, [t.key, t.lijst, t.naam]);
    const herlaad = async () => { await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); return st(); };
    await p.goto(B + '/' + id + '/', { waitUntil: 'networkidle' }); await p.evaluate((v) => { localStorage.clear(); localStorage.setItem('oc.welkom', '1'); localStorage.setItem('oc.project', v); }, zet('Aanvragen behandelen')); let s = await herlaad();
    chk(s.start, 'leeg project: startkaart', JSON.stringify(s).slice(0, 120));
    await p.click('.oc-begin'); await p.waitForTimeout(500); if (t.typ) { await p.keyboard.type(t.typ); await p.keyboard.press('Tab'); } else await p.keyboard.press('Tab'); await p.waitForTimeout(700); s = await st();
    chk(/\|Aanvragen behandelen\*?/.test(s.bewaard), 'Begin: hoort bij het project', s.bewaard); if (id !== 'visgraat') chk(s.pk === 'Aanvragen behandelen', 'Begin: krijgt de naam van het proces', 'kiezer="' + s.pk + '"');
    const n1 = s.tekst; await p.evaluate((v) => localStorage.setItem('oc.project', v), zet('Facturen betalen')); s = await herlaad();
    chk(/\|Facturen betalen\*/.test(s.bewaard) || s.pk === 'Facturen betalen' || s.start || s.tekst < n1, 'ander project: toont niet het vorige proces', 'kiezer="' + s.pk + '" ' + s.bewaard);
    await p.evaluate((v) => localStorage.setItem('oc.project', v), zet('Aanvragen behandelen')); s = await herlaad(); chk(id === 'visgraat' ? s.pk.includes(t.typ.slice(0, 10)) : s.pk === 'Aanvragen behandelen', 'terug naar het eerste project: het eerste proces staat open', 'kiezer="' + s.pk + '"');
    // geen project in de app: niets verandert
    await p.evaluate(() => localStorage.removeItem('oc.project')); const voor = s.pk; s = await herlaad(); chk(s.pk === voor, 'geen actief project: blijft staan', 'kiezer="' + s.pk + '"');
    // oud werk zonder project: één → hoort erbij; twee → nieuw
    await p.evaluate(([key, lijst]) => { const s = JSON.parse(localStorage.getItem(key)); s[lijst] = s[lijst].slice(0, 1); s[lijst].forEach(x => delete x.proj); delete s.ocSince; s.current = s[lijst][0].id; localStorage.setItem(key, JSON.stringify(s)); }, [t.key, t.lijst]);
    await p.evaluate((v) => localStorage.setItem('oc.project', v), zet('Nieuw loket')); s = await herlaad(); chk(!s.start && s.tekst > 200 && !/Nieuw loket\*/.test(s.bewaard.replace(/\|Nieuw loket/, '')), 'oud werk (één, zonder project): blijft open staan', 'kiezer="' + s.pk + '"');
    // voorbeeld van jou maken onder een project, herladen
    await p.evaluate(() => { Object.keys(localStorage).forEach(k => { if (!/welkom|oc\.project/.test(k)) localStorage.removeItem(k); }); }); s = await herlaad();
    await p.click('[data-act="example"]'); await p.waitForTimeout(600); await p.click('[data-act="vb-eigen"]').catch(() => console.log('  geen eigen-knop')); await p.waitForTimeout(600); const a = await st(); s = await herlaad();
    chk(!s.start && Math.abs(s.tekst - a.tekst) < 60, 'voorbeeld van jou gemaakt: blijft na herladen', 'kiezer="' + s.pk + '" ' + s.bewaard.slice(0, 90));
    // live wissel via een ander venster
    const q = await c.newPage(); await q.goto(B + '/privacy/'); await q.evaluate((v) => localStorage.setItem('oc.project', v), zet('Live wissel')); await p.waitForTimeout(900); s = await st(); await q.close();
    chk(/Live wissel/.test(s.bewaard) || s.pk === 'Live wissel', 'project wisselt terwijl de tool open staat: de tool volgt', 'kiezer="' + s.pk + '"');
    chk(!E.length, 'geen fouten', E.join(' | ')); await c.close(); }
  console.log('fouten:', fout); await b.close(); })();
