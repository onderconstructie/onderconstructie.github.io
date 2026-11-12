const { chromium } = require('playwright'); const B = (process.env.BASE || 'http://127.0.0.1:8000');
(async () => { const b = await chromium.launch(); let fout = 0; const chk = (ok, wat, extra) => { if (!ok) fout++; console.log((ok ? 'ok   ' : 'FOUT ') + wat + (extra != null ? ' → ' + extra : '')); };
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' }); const p = await c.newPage(), E = []; p.on('pageerror', e => E.push(String(e).slice(0, 140)));
  await p.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} });
  await p.goto(B + '/mindmap/?sjabloon=productboom', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const boom = () => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('mindmap.v1')), m = s.maps.find(x => x.id === s.current); return m.nodes.map(n => '  '.repeat(n.level) + (n.text || '(leeg)').slice(0, 22)).join('\n'); });
  const mid = async (tekst) => p.evaluate((t) => { const g = [...document.querySelectorAll('#canvas g[data-node]')].find(g => g.textContent.replace(/\s+/g, ' ').includes(t)); const r = g.querySelector('rect:last-of-type').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, tekst);
  const v0 = await boom(); const n0 = v0.split('\n').length;
  // kiezen: plusjes
  let r = await mid('Eerste deelresultaat'); await p.mouse.click(r.x + r.w / 2, r.y + r.h / 2); await p.waitForTimeout(400);
  const pl = await p.evaluate(() => [...document.querySelectorAll('.mm-plus')].map(k => { const r = k.getBoundingClientRect(); return k.dataset.plek + ':' + k.dataset.mm + '@' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + r.width + 'x' + r.height; }));
  chk(pl.length === 2, 'gekozen idee toont twee plusjes', pl.join(' | ')); await p.screenshot({ path: require('os').tmpdir() + '/oc-boom1.png' });
  await p.click('.mm-plus[data-plek="zij"]'); await p.waitForTimeout(400); await p.keyboard.type('Vierde deelresultaat'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  let v = await boom(); chk(/\n  Vierde deelresultaat/.test(v) && v.split('\n').length === n0 + 1, 'plusje ernaast: nieuw deel op hetzelfde niveau');
  r = await mid('Vierde deelresultaat'); console.log('     idee is', Math.round(r.w) + 'x' + Math.round(r.h), 'px; plusjes:', (await p.$$('.mm-plus')).length); await p.click('.mm-plus[data-plek="onder"]', { timeout: 3000 }); await p.waitForTimeout(400); await p.keyboard.type('Onderdeel A'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  v = await boom(); chk(/  Vierde deelresultaat\n    Onderdeel A/.test(v), 'plusje eronder: nieuw deel eronder');
  // slepen: Onderdeel A naar het midden van "Tweede deelresultaat" → eronder
  const sleep = async (van, naar, fx, fy, los = true) => { const a = await mid(van), d = await mid(naar); await p.mouse.move(a.x + a.w / 2, a.y + a.h / 2); await p.mouse.down(); await p.mouse.move(a.x + a.w / 2 + 10, a.y + a.h / 2 + 10, { steps: 3 }); await p.mouse.move(d.x + d.w * fx, d.y + d.h * fy, { steps: 12 }); await p.waitForTimeout(150); if (los) { await p.mouse.up(); await p.waitForTimeout(500); } };
  await sleep('Onderdeel A', 'Tweede deelresultaat', 0.5, 0.5, false); await p.screenshot({ path: require('os').tmpdir() + '/oc-boom2.png' });
  chk(await p.evaluate(() => !!document.querySelector('.mm-geest') && !!document.querySelector('.mm-doel.in:not([hidden])')), 'tijdens het slepen: het idee volgt en het doel licht op'); await p.mouse.up(); await p.waitForTimeout(500);
  v = await boom(); chk(/  Tweede deelresultaat[^\n]*\n(    [^\n]*\n)*    Onderdeel A/.test(v) && !/Vierde deelresultaat\n    Onderdeel A/.test(v), 'loslaten in het midden: het idee staat eronder'); chk(v.split('\n').length === n0 + 2, 'niets verloren of verdubbeld', v.split('\n').length);
  // slepen naar de linkerrand van "Eerste deelresultaat" → ervoor, met de hele tak
  await sleep('Derde deelresultaat', 'Eerste deelresultaat', 0.08, 0.5); v = await boom();
  chk(v.indexOf('  Derde deelresultaat') < v.indexOf('  Eerste deelresultaat') && /  Derde deelresultaat[^\n]*\n    /.test(v), 'loslaten aan de linkerrand: de tak staat ervoor, met zijn delen');
  // ongedaan
  await p.click('.toast button, [data-undo], .toast-undo').catch(() => {}); await p.waitForTimeout(400); const v2 = await boom(); chk(v2.indexOf('  Eerste deelresultaat') < v2.indexOf('  Derde deelresultaat'), 'Ongedaan zet het terug');
  // niet in zijn eigen tak; Esc annuleert
  const voor = await boom(); await sleep('Tweede deelresultaat', 'Onderdeel A', 0.5, 0.5); chk(await boom() === voor, 'een tak in zichzelf slepen doet niets');
  await sleep('Onderdeel A', 'Wat krijg je van', 0.5, 0.5, false); await p.keyboard.press('Escape'); await p.mouse.up(); await p.waitForTimeout(300); chk(await boom() === voor && !(await p.$('.mm-geest')), 'Esc annuleert het slepen');
  // klikken werkt nog (kiezen), en slepen op leeg vlak schuift
  r = await mid('Eerste deelresultaat'); await p.mouse.click(r.x + r.w / 2, r.y + r.h / 2); await p.waitForTimeout(300); chk(!!(await p.$('.mm-bar')), 'gewoon klikken kiest nog');
  // kaartvorm
  await p.keyboard.press('Escape'); await p.click('[data-vorm]:not([data-vorm="boom"])'); await p.waitForTimeout(600); r = await mid('Tweede deelresultaat'); await p.mouse.click(r.x + r.w / 2, r.y + r.h / 2); await p.waitForTimeout(300); await p.screenshot({ path: require('os').tmpdir() + '/oc-boom3.png' });
  chk((await p.$$('.mm-plus')).length === 2, 'ook op de kaart: plusjes', await p.evaluate(() => [...document.querySelectorAll('.mm-plus')].map(k => k.dataset.plek + ':' + k.dataset.mm).join(' '))); await p.keyboard.press('Escape'); await sleep('Onderdeel A', 'Eerste deelresultaat', 0.5, 0.5); v = await boom(); chk(/  Eerste deelresultaat[^\n]*\n(    [^\n]*\n)*    Onderdeel A/.test(v), 'ook op de kaart: slepen');
  chk(!E.length, 'geen fouten', E.join(' | ')); await c.close();
  // aanraken: lang vasthouden en slepen (pointer events van het type touch)
  const t = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' }); const q = await t.newPage(), E2 = []; q.on('pageerror', e => E2.push(String(e).slice(0, 140)));
  await q.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} }); await q.goto(B + '/mindmap/?sjabloon=productboom', { waitUntil: 'networkidle' }); await q.waitForTimeout(900);
  await q.click('[data-act="fit"]').catch(() => {}); await q.waitForTimeout(500);
  const res = await q.evaluate(async () => { const zoek = t => [...document.querySelectorAll('#canvas g[data-node]')].find(g => g.textContent.replace(/\s+/g, ' ').includes(t)); const c = document.getElementById('canvas');
    const a = zoek('Welke delen horen'); a.scrollIntoView({ block: 'center', inline: 'center' }); const ra = a.querySelector('rect:last-of-type').getBoundingClientRect(), d = zoek('Eerste deelresultaat'), rd = d.querySelector('rect:last-of-type').getBoundingClientRect();
    const ev = (type, x, y) => (document.elementFromPoint(x, y) || document.body).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0 }));
    // kort vegen: geen slepen
    ev('pointerdown', ra.left + 10, ra.top + 8); ev('pointermove', ra.left + 40, ra.top + 30); const kort = !!document.querySelector('.mm-geest'); ev('pointerup', ra.left + 40, ra.top + 30);
    ev('pointerdown', ra.left + 10, ra.top + 8); await new Promise(r => setTimeout(r, 450)); const lang = !!document.querySelector('.mm-geest');
    for (let k = 1; k <= 6; k++) ev('pointermove', ra.left + 10 + (rd.left + rd.width - 6 - ra.left - 10) * k / 6, ra.top + 8 + (rd.top + rd.height / 2 - ra.top - 8) * k / 6); await new Promise(r => setTimeout(r, 100));
    const lijn = !!document.querySelector('.mm-doel.lijn:not([hidden])'); ev('pointerup', rd.left + rd.width - 6, rd.top + rd.height / 2); await new Promise(r => setTimeout(r, 400));
    const s = JSON.parse(localStorage.getItem('mindmap.v1')), m = s.maps.find(x => x.id === s.current); return { kort, lang, lijn, boom: m.nodes.map(n => n.level + ':' + (n.text || '').slice(0, 18)).join(' | ').slice(0, 200), breed: Math.round(ra.width) }; });
  chk(!res.kort, 'aanraken: kort vegen sleept niet (scrollen blijft)'); chk(res.lang, 'aanraken: even vasthouden start het slepen', 'breedte idee ' + res.breed + ' px'); chk(res.lijn && /1:Eerste deelresulta \| (2:[^|]*\| )*1:Welke delen horen/.test(res.boom), 'aanraken: loslaten aan de rechterrand zet het erna', res.boom.slice(0, 150));
  await q.screenshot({ path: require('os').tmpdir() + '/oc-boom4.png' }); chk(!E2.length, 'geen fouten (gsm)', E2.join(' | ')); await t.close();
  console.log('fouten:', fout); await b.close(); })();
