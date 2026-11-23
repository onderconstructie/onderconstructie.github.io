// Het netwerk in het gekozen doel (v17.24): alleen waar de route ernaast staat (vanaf 1100 px), nooit op of tegen tekst, icoon of pijl,
// telkens anders, en het vangt geen klik op. Op gsm en smalle iPad komt er niets.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const meet = p => p.evaluate(() => { const n = document.querySelector('#stiles .st-net'); if (!n) return null; const t = n.parentNode, r = t.getBoundingClientRect(), z = [];
    const w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let x; while ((x = w.nextNode())) { if (!x.textContent.trim()) continue; const g = document.createRange(); g.selectNodeContents(x); [...g.getClientRects()].forEach(q => z.push(q)); }
    t.querySelectorAll('.icon, .st-cta').forEach(e => z.push(e.getBoundingClientRect()));
    const P = [...n.querySelectorAll('circle')].map(c => [r.left + +c.getAttribute('cx'), r.top + +c.getAttribute('cy')]);
    const raakt = P.filter(q => z.some(k => q[0] > k.left - 6 && q[0] < k.right + 6 && q[1] > k.top - 6 && q[1] < k.bottom + 6)).length;
    return { in:t.dataset.start, kijkt:t.classList.contains('kijkt'), knopen:P.length, raakt, binnen:P.every(q => q[0] > r.left && q[0] < r.right && q[1] > r.top && q[1] < r.bottom), d:n.innerHTML, pe:getComputedStyle(n).pointerEvents, aria:n.getAttribute('aria-hidden'), aantal:document.querySelectorAll('#stiles .st-net').length }; });
  for (const [w, vp, verwacht] of [['laptop', { width:1440, height:900 }, true], ['breed', { width:1920, height:1080 }, true], ['ipad', { width:1024, height:768 }, false], ['gsm', { width:390, height:844 }, false]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message)); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    if (!verwacht) { await p.locator('#stiles .stile').nth(1).hover(); await p.waitForTimeout(300); ok(!(await meet(p)), w + ': geen netwerk in de kaarten'); await c.close(); continue; }
    const eerder = [];
    for (const i of [1, 3, 0, 4, 2, 5]) { await p.locator('#stiles .stile').nth(i).hover(); await p.waitForTimeout(450); const m = await meet(p);
      ok(m && m.kijkt && m.aantal === 1, w + ': doel ' + i + ' draagt het enige netwerk'); if (!m) continue;
      ok(m.knopen >= 5 && m.raakt === 0 && m.binnen, w + ': doel ' + i + ' heeft ' + m.knopen + ' knopen, geen enkele tegen tekst, icoon of pijl');
      ok(m.pe === 'none' && m.aria === 'true', w + ': doel ' + i + ': netwerk is niet aanklikbaar en verborgen voor schermlezers'); eerder.push(m.d);
      if (w === 'laptop' && i === 1) await p.screenshot({ path:S + '/kaart-net.png' }); }
    ok(new Set(eerder).size === eerder.length, w + ': elk netwerk valt anders');
    // terug naar hetzelfde doel: opnieuw anders
    await p.locator('#stiles .stile').nth(1).hover(); await p.waitForTimeout(450); const weer = await meet(p); ok(weer && weer.d !== eerder[0], w + ': terug op een doel geeft een nieuw netwerk');
    // de klik gaat nog altijd naar het doel
    await p.locator('#stiles .stile').nth(0).click(); await p.waitForTimeout(900); ok(await p.evaluate(() => !!document.querySelector('.pathbar:not([hidden]), #viewer:not([hidden]), dialog[open]')), w + ': klikken op het doel doet nog wat het deed');
    ok(!js.length, w + ': geen scriptfouten ' + js.join(' | ')); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
