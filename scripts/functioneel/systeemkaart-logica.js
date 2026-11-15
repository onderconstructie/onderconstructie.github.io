// Systeemkaart: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
let pos = 0; const E = (id, t, n, o = {}) => Object.assign({ id, t, n, x:(pos % 4) * 260, y:Math.floor(pos++ / 4) * 160 }, o), V = (id, a, b, s, w = 2, v = false) => ({ id, a, b, s, w, v, z:false, uit:'' });
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/systeemkaart/', { waitUntil:'networkidle' });
  const laad = async (els, ver, extra = {}) => { pos = 0; await p.evaluate(({ els, ver, extra }) => { localStorage.setItem('systeemkaart.v1', JSON.stringify({ lists:[Object.assign({ id:'t', name:'Toets', over:'', els, ver, ing:{} }, extra)], current:'t' })); }, { els, ver, extra }); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); };
  const sim = (push) => p.evaluate(push => { const S = window.systeem, r = S.simuleer(push); const o = {}; S.staat().els.forEach(e => { o[e.id] = S._pijl(r, e.id, r.T); }); return o; }, push);
  // 1. Een pijl "weet ik niet" die in beide richtingen tot hetzelfde leidt, maakt de uitkomst niet onzeker (vapen, ronde 6)
  await laad([E('i', 'ingreep', 'Verbod'), E('g', 'gedrag', 'vapen', { wie:'Jongeren', doel:'minder' }), E('s', 'factor', 'Stress'), E('u', 'uitkomst', 'Gezondheid', { doel:'meer' })],
    [V('a', 'i', 'g', '-'), V('b', 'g', 's', '+'), V('c', 's', 'g', '?', 1), V('d', 'g', 'u', '-', 3)]);
  let r = await sim({ i:1 }); ok(r.u === '↑' && r.g === '↓', 'zwakke "weet ik niet"-pijl in een kring: gezondheid stijgt, niet onzeker (' + JSON.stringify(r) + ')');
  // 2. Een "weet ik niet" die de richting echt bepaalt, blijft onzeker
  await laad([E('a', 'factor', 'A'), E('b', 'factor', 'B'), E('c', 'factor', 'C')], [V('x', 'a', 'b', '?'), V('y', 'b', 'c', '+')]);
  r = await sim({ a:1 }); ok(r.c === '↕', 'weet ik niet in de enige weg: onzeker (' + r.c + ')');
  // 3. Hernoemen weg van een negatieve naam draait de pijlen en het doel mee om (fietsen, ronde 6)
  await laad([E('i', 'ingreep', 'Extra fietsenstalling'), E('f', 'factor', 'Te weinig plaats in de fietsenstalling'), E('u', 'uitkomst', 'Minder files', { doel:'meer' }), E('g', 'gedrag', 'fietsen', { wie:'Werknemers', doel:'meer' })],
    [V('a', 'i', 'f', '-'), V('b', 'f', 'g', '-'), V('c', 'g', 'u', '+')]);
  const voor = await sim({ i:1 });
  for (const id of ['f', 'u']) { await p.evaluate(id => { const S = window.systeem; S.view; }, id); const box = await p.locator(`[data-el="${id}"] .vorm`).boundingBox(); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(200); const fx = p.locator('[data-p="fix"]'); if (await fx.count()) { await fx.first().click(); await p.waitForTimeout(200); } }
  const st = await p.evaluate(() => window.systeem.staat()); const na = await sim({ i:1 });
  ok(st.els.find(e => e.id === 'f').n === 'Plaats in de fietsenstalling' && st.ver.find(v => v.id === 'a').s === '+' && st.ver.find(v => v.id === 'b').s === '+', 'hernoemen "Te weinig plaats" draait de pijlen om (' + st.ver.map(v => v.s).join('') + ')');
  ok(st.els.find(e => e.id === 'u').n === 'Files' && st.els.find(e => e.id === 'u').doel === 'minder' && st.ver.find(v => v.id === 'c').s === '-', 'hernoemen "Minder files" draait ook het doel om');
  ok(voor.g === na.g && voor.f !== na.f, 'de kaart zegt na het hernoemen hetzelfde over het gedrag (' + voor.g + ' = ' + na.g + ')');
  // 4. "Eerst meer, later meer" mag niet; de tip "snelle oplossing" alleen bij het echte patroon
  const A = await p.evaluate(() => window.systeem.analyse()); ok(!A.terugslag, 'geen terugslag-tip zonder vertraagde versterkende kring');
  // 5. A/B: een gewist element verdwijnt ook uit A, een lege A verdwijnt
  await laad([E('i', 'ingreep', 'Verbod'), E('j', 'ingreep', 'Accijns'), E('u', 'uitkomst', 'Gezondheid', { doel:'meer' })], [V('a', 'i', 'u', '+'), V('b', 'j', 'u', '+')], { ing:{ j:1 }, ingA:{ i:1 } });
  const bx = await p.locator('[data-el="i"] .vorm').boundingBox(); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(200);
  await p.evaluate(() => { const d = document.querySelector('#sk-paneel details'); if (d) d.open = true; }); await p.click('[data-p="wis-el"]'); await p.waitForTimeout(300);
  const s5 = await p.evaluate(() => window.systeem.staat()); ok(!s5.ingA, 'na wissen van het enige element in A is er geen A meer (' + JSON.stringify(s5.ingA) + ')');
  // 6. Grenzen: meer dan 120 verbanden kan niet via het formulier
  const els = Array.from({ length:16 }, (_, i) => E('e' + i, 'factor', 'F' + i)), ver = []; let n = 0; els.forEach(a => els.forEach(b2 => { if (a !== b2 && ver.length < 120) ver.push(V('v' + (n++), a.id, b2.id, '+')); }));
  await laad(els, ver); await p.click('#b-toe'); await p.waitForTimeout(300);
  const vrij = await p.evaluate(() => { const l = window.systeem.staat(); for (const a of l.els) for (const b of l.els) if (a.id !== b.id && !l.ver.some(v => v.a === a.id && v.b === b.id)) return [a.id, b.id]; return null; });
  await p.selectOption('#v-a', vrij[0]); await p.selectOption('#v-b', vrij[1]); await p.click('[data-form="ver"] button[type="submit"]'); await p.waitForTimeout(300);
  ok((await p.evaluate(() => window.systeem.staat().ver.length)) === 120 && await p.isVisible('#v-fout'), 'een 121ste verband wordt geweigerd met een melding');
  // 7. Een emoji wordt niet doormidden geknipt
  await laad([E('a', 'factor', 'x'.repeat(79) + '😀')], []); const nm = await p.evaluate(() => window.systeem.staat().els[0].n);
  ok(!/[\uD800-\uDBFF]$/.test(nm), 'geen halve emoji na het inkorten');
  // Op de gsm: de knoppen Meer, Minder en de wisknop (alleen een kruisje) bij Ingrijpen zijn minstens 44 px (hertest b: de wisknop was 42 px breed)
  { const c2 = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true, serviceWorkers:'block' }); const q = await c2.newPage(); q.on('pageerror', e => PE.push('gsm: ' + String(e)));
    await q.goto(B + '/systeemkaart/', { waitUntil:'networkidle' });
    await q.evaluate(() => localStorage.setItem('systeemkaart.v1', JSON.stringify({ lists:[{ id:'g', name:'Gsm', over:'', els:[{ id:'i', t:'ingreep', n:'Verbod', x:0, y:0 }, { id:'u', t:'uitkomst', n:'Gezondheid', x:260, y:0, doel:'meer' }], ver:[{ id:'a', a:'i', b:'u', s:'+', w:2, v:false, z:false, uit:'' }], ing:{ i:1 } }], current:'g' })));
    await q.reload({ waitUntil:'networkidle' }); await q.waitForTimeout(300); await q.click('#b-ing'); await q.waitForTimeout(400);
    const m = await q.evaluate(() => [...document.querySelectorAll('[data-p="push"]')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
    ok(m.length >= 3 && m.every(x => x.split('x').every(v => +v >= 44)), 'gsm: Meer, Minder en de wisknop zijn minstens 44 px (' + m.join(', ') + ')');
    await c2.close(); }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
