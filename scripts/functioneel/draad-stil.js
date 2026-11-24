// De draad speelt niet opnieuw terwijl je werkt (v17.34). Verschijnt de balk: de vonk loopt over de hele weg. Een stap verder: alleen van de vorige knoop
// naar de nieuwe. Vul je iets in, of ga je terug: alles staat stil. En het kopje "Je stappenplan" breekt op de gsm niet meer in twee.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp, sel] of [['laptop', { width:1440, height:900 }, '.pb-dots'], ['gsm', { width:390, height:844 }, '.pb-bol']]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message)); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    const stand = () => p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); return [...e.children].map(s => ({ kl:s.className, stil:s.classList.contains('stil'), i:s.style.getPropertyValue('--i'), a:getComputedStyle(s, '::after').animationName, v:getComputedStyle(s, '::before').animationName })); }, sel);
    await p.locator('#stiles .stile').nth(0).click(); await p.waitForTimeout(700); await p.fill('#pn-name', 'Proef'); await p.locator('#pn-form button:has-text("Verder")').click(); await p.waitForTimeout(2500);
    let s = await stand(); ok(s.every(x => !x.stil) && /knoop-hier/.test(s[0].a), w + ': de balk verschijnt: de vonk loopt, niets staat stil');
    // iets invullen: zelfde stap, de draad blijft stil
    const fr = p.frames().find(f => f !== p.mainFrame() && /\/opdracht\//.test(f.url())); const v = fr.locator('textarea:visible, input[type=text]:visible').first(); await v.fill('Een nieuwe website'); await v.blur(); await p.waitForTimeout(1200);
    await p.evaluate(() => { delete document.getElementById('pathbar').dataset.sig; renderPathbar(current); }); await p.waitForTimeout(200);
    s = await stand(); ok(s.every(x => x.stil && x.a === 'none' && x.v === 'none'), w + ': na invullen op dezelfde stap speelt niets opnieuw');
    // een stap verder: alleen het nieuwe stuk
    await p.locator('.pb-next').click(); await p.waitForTimeout(1800);
    s = await stand(); ok(s[0].stil && s[0].a === 'none' && !s[1].stil && /knoop-hier/.test(s[1].a) && /draad-reis/.test(s[1].v) && s[1].i === '0', w + ': een stap verder: de eerste knoop staat stil, alleen de nieuwe licht op, zonder wachttijd');
    await p.locator('.pb-next').click(); await p.waitForTimeout(1800);
    s = await stand(); ok(s[0].stil && s[1].stil && !s[2].stil && s[2].i === '0' && /here/.test(s[2].kl), w + ': nog een stap: weer alleen de nieuwe');
    // terug: stil
    await p.locator('.pb-prev').click(); await p.waitForTimeout(1800);
    s = await stand(); ok(s.every(x => x.stil) && /here/.test(s[1].kl), w + ': een stap terug: alles staat stil, de knoop van stap 2 brandt');
    // twee stappen ineens vooruit via het plan: de vonk reist over beide
    await p.evaluate(() => { const st = stepsOf('project'); pathCtx = 'project'; viaPad = true; openTool(st[3].t.id); }); await p.waitForTimeout(2200);
    s = await stand(); ok(s[1].stil && !s[2].stil && !s[3].stil && s[2].i === '0' && s[3].i === '1' && /here/.test(s[3].kl), w + ': twee stappen ineens: de vonk reist knoop na knoop over het nieuwe stuk');
    ok(!js.length, w + ': geen scriptfouten ' + js.join(' | '));
    // de plankaarten: eerste keer loopt de vonk, opnieuw tekenen zonder verandering staat stil
    await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
    const kaart = () => p.evaluate(() => { const e = [...document.querySelectorAll('.path[data-path="project"] .path-bar')].find(x => x.getClientRects().length); return e ? [...e.children].map(s => s.classList.contains('stil')) : null; });
    let k = await kaart(); if (k) { ok(k.some(x => !x), w + ': plankaart, eerste keer: de vonk loopt'); await p.waitForTimeout(300); await p.evaluate(() => renderPaths()); await p.waitForTimeout(200); k = await kaart(); ok(k && k.every(x => x), w + ': plankaart opnieuw getekend zonder verandering: stil'); }
    if (w === 'gsm') { const h = await p.evaluate(() => { const e = document.getElementById('paths-h'); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { h:r.height, lh:parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.4, breed:document.documentElement.scrollWidth <= innerWidth + 1, hint:(() => { const x = e.parentNode.querySelector('.filter-hint'); return x && x.getClientRects().length ? x.getBoundingClientRect().right <= innerWidth : true; })() }; });
      ok(h && h.h <= h.lh * 1.3 && h.breed && h.hint, w + ': het kopje "Je stappenplan" staat op één regel en niets loopt uit beeld'); await p.screenshot({ path:S + '/draad-stil-gsm.png' }); }
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
