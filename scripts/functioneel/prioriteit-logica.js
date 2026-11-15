// Prioriteren: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const it = (id, name, impact, effort, x = {}) => ({ id, name, impact, effort, done:false, ...x });
const lijst = { id:'L1', name:'Digitaal loket', items:[it('a', 'Formulier vereenvoudigen', 4, 1), it('b', 'Nieuwe website', 4, 4), it('c', 'Koppeling register', 3, 3),
  it('g', 'Nog te schatten item', 3, 3, { nieuw:true }), it('h', 'Gedaan item', 4, 2, { done:true })] };
(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e))); await p.goto(B + '/prioriteit/', { waitUntil:'networkidle' });
  await p.evaluate(d => localStorage.setItem('prioriteit.v1', JSON.stringify(d)), { lists:[lijst], current:'L1', scale:4 }); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const x = buildExport(); return { sub:x.subtitle, rechts:x.node.children[1].innerText.replace(/\s+/g, ' '), tekst:asText(),
    scherm:[...document.querySelectorAll('#list .q-head')].map(e => e.firstChild ? e.textContent.replace(/·.*$/, '').replace(/\d+$/, '').trim() : '') }; });
  // 1. PDF/PNG: telt 4 open, dan moet ook het item dat nog in te schatten is erin staan
  ok(/4 open, 1 gedaan/.test(r.sub) && /Nog te schatten item/.test(r.rechts), 'de export toont wat ze meetelt: ook "Nog te schatten item" (' + r.sub + ' | ' + r.rechts.slice(0, 80) + ')');
  ok(/^Nog in te schatten/i.test(r.rechts.trim()), 'en zet het bovenaan, zoals op het scherm');
  // 2. Tekst: dezelfde volgorde en vorm als het scherm
  const kop = r.tekst.split('\n').filter(x => x && !x.startsWith('- ')).slice(1).map(x => x.replace(/ \(.*\)$/, ''));
  ok(kop[0] === 'Nog in te schatten' && kop.join('|') === r.scherm.join('|'), 'de tekst volgt de koppen van het scherm (' + kop.join(', ') + ' / scherm: ' + r.scherm.join(', ') + ')');
  ok(/\n\nNog in te schatten\n- \[ \] Nog te schatten item\n\nSnelle winst/.test(r.tekst), 'met een witregel en een vinkvak, zoals de andere items');
  ok(r.tekst.startsWith('Digitaal loket\n\n') && r.tekst.endsWith(')\n') && !/\n{3,}/.test(r.tekst), 'geen dubbele witregels, één regeleinde op het eind');
  // 3. Zonder iets in te schatten: zoals vroeger
  await p.evaluate(() => { cur().items = cur().items.filter(i => !i.nieuw); save(); render(); });
  const t2 = await p.evaluate(() => asText()), r2 = await p.evaluate(() => buildExport().node.children[1].innerText);
  ok(t2 === 'Digitaal loket\n\nSnelle winst (nu doen)\n- [ ] Formulier vereenvoudigen (impact 4, inspanning 1)\n- [x] Gedaan item (impact 4, inspanning 2)\n\nGrote klussen (plannen)\n- [ ] Nieuwe website (impact 4, inspanning 4)\n- [ ] Koppeling register (impact 3, inspanning 3)\n', 'zonder in te schatten items: de kwadranten, zonder lege regels op het eind');
  ok(!/Nog in te schatten/i.test(r2), 'en geen lege kop in de export');
  // De CSV volgt de volgorde van het scherm: "Nog in te schatten" eerst (hertest b: de CSV zette het achteraan)
  { await p.evaluate(d => localStorage.setItem('prioriteit.v1', JSON.stringify(d)), { lists:[lijst], current:'L1', scale:4 }); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
    const csv = await p.evaluate(() => asCSV().replace(/^\uFEFF/, '').split('\r\n').slice(1).filter(Boolean).map(r => r.split(';')[0]));
    const scherm = await p.evaluate(() => [...document.querySelectorAll('#list .q-head')].map(e => e.textContent.replace(/·.*$/, '').replace(/\d+$/, '').trim()));
    const csvBlokken = csv.filter((x, i) => x !== csv[i - 1]);
    ok(csvBlokken[0] === 'Nog in te schatten' && scherm[0].startsWith('Nog in te schatten') && csvBlokken.every((x, i) => scherm[i] && scherm[i].startsWith(x)), 'CSV in dezelfde volgorde als het scherm (' + csvBlokken.join(' > ') + ' | scherm ' + scherm.join(' > ') + ')'); }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
