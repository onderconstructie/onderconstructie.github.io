// De voortgang als draad met knopen (v17.25): een rechte lijn, per stap precies een knoop, de knoop van de huidige stap is groter,
// de draad is groen tot waar je bent. Op de gsm duwt de draad niets weg. Wie beweging uitzet, krijgt geen animatie.
// En: koppen staan in Bricolage Grotesque, van de eigen site.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp, sel, rm] of [['laptop', { width:1440, height:900 }, '.pb-dots', false], ['gsm', { width:390, height:844 }, '.pb-bol', false], ['smal', { width:320, height:640 }, '.pb-bol', false], ['rustig', { width:1440, height:900 }, '.pb-dots', true]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block', reducedMotion:rm ? 'reduce' : 'no-preference' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message)); const ext = []; p.on('request', r => { if (!r.url().startsWith(B) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) ext.push(r.url()); });
    await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    if (w === 'laptop') { const f = await p.evaluate(async () => { await document.fonts.ready; const g = s => getComputedStyle(document.querySelector(s)).fontFamily; return { kop:g('#start-h'), doel:g('#stiles .stile b'), tekst:g('.start-lead'), geladen:document.fonts.check("700 20px 'Bricolage Grotesque'") }; });
      ok(/^"?Bricolage Grotesque/.test(f.kop) && /^"?Bricolage Grotesque/.test(f.doel) && f.geladen, 'koppen en doelen in Bricolage Grotesque, geladen'); ok(/^"?DM Sans/.test(f.tekst), 'lopende tekst blijft DM Sans'); }
    if (w === 'laptop') { const tt = []; for (const t of ['Projecten', 'Verandering', 'Vergaderen', 'Zakmes']) { await p.evaluate(t => { const k = [...document.querySelectorAll('button')].find(e => new RegExp('^\\s*' + t + '\\s*$').test(e.textContent)); if (k) k.click(); }, t); await p.waitForTimeout(400); tt.push(await p.evaluate(() => { const e = [...document.querySelectorAll('.tab-hero .th-title')].find(x => x.getClientRects().length); return e ? getComputedStyle(e).fontFamily : 'geen titel'; })); }
      ok(tt.every(x => /^"?Bricolage Grotesque/.test(x)), 'de titel van elke tab staat in Bricolage Grotesque (v17.29): ' + tt.map(x => x.split(',')[0]).join(' | ')); await p.evaluate(() => { const k = [...document.querySelectorAll('button')].find(e => /^\s*Start\s*$/.test(e.textContent)); if (k) k.click(); }); await p.waitForTimeout(400); }
    await p.locator('#stiles .stile').nth(0).click(); await p.waitForTimeout(700); await p.fill('#pn-name', 'Proef'); await p.locator('#pn-form button:has-text("Verder")').click(); await p.waitForTimeout(2200);
    const naar = async () => { await p.locator('.pb-next').click(); await p.waitForTimeout(1300); const d = p.locator('#brug-dlg:not([hidden]) button'); if (await d.count()) await d.last().click(); await p.waitForTimeout(1500); };
    await naar(); await naar();
    const m = await p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getClientRects().length); if (!e) return null; const sp = [...e.children], r = e.getBoundingClientRect();
      const kn = sp.map(s => { const a = getComputedStyle(s, '::after'), q = s.getBoundingClientRect(); return { kl:s.className, y:Math.round((q.top + q.height / 2) * 2) / 2, b:parseFloat(a.width), rond:a.borderRadius, anim:a.animationName, h:q.height, x:q.right }; });
      const nx = document.querySelector('.pb-next').getBoundingClientRect(), tb = document.querySelector('.topbar');
      return { n:sp.length, kn, r:{ l:r.left, rt:r.right }, nextIn:nx.right <= innerWidth + 0.5 && nx.width > 40, over:tb.scrollWidth > tb.clientWidth + 1, stappen:(document.querySelector('.pb-where').getAttribute('aria-label') || '') }; }, sel);
    ok(!!m, w + ': de draad staat in de balk'); if (!m) { await c.close(); continue; }
    ok(m.n === 7, w + ': zeven stappen, zeven knopen (' + m.n + ')');
    ok(new Set(m.kn.map(k => k.y)).size === 1 && m.kn.every(k => k.h <= 2), w + ': een rechte lijn, alle knopen op dezelfde hoogte');
    ok(m.kn.every(k => k.rond === '50%' && k.b >= 7), w + ': elke stap heeft een ronde knoop');
    const hier = m.kn.findIndex(k => /here/.test(k.kl)); ok(hier === 2 && m.kn[hier].b > m.kn[0].b, w + ': de knoop van stap 3 is de grootste');
    ok(m.kn.slice(0, hier).every(k => /voor/.test(k.kl)) && m.kn.slice(hier + 1).every(k => !/voor|here/.test(k.kl)), w + ': de draad is groen tot waar je bent, niet verder');
    ok(m.kn.every((k, i) => !i || k.x > m.kn[i - 1].x + 5) && m.kn[m.n - 1].x <= m.r.rt + 0.5, w + ': de knopen staan los van elkaar en binnen de draad');
    ok(m.nextIn && !m.over, w + ': Volgende staat volledig in beeld, de balk loopt niet over');
    ok(rm ? m.kn.every(k => k.anim === 'none') : /knoop-hier/.test(m.kn[hier].anim), w + (rm ? ': beweging uit, geen animatie' : ': de huidige knoop licht op'));
    if (w === 'laptop' || w === 'gsm') await p.screenshot({ path:S + '/draad-' + w + '.png', clip:{ x:0, y:0, width:vp.width, height:120 } });
    if (w === 'laptop') { await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500); await p.evaluate(() => { const t = [...document.querySelectorAll('button')].find(e => /^\s*Projecten\s*$/.test(e.textContent)); if (t) t.click(); }); await p.waitForTimeout(900);
      const k = await p.evaluate(() => [...document.querySelectorAll('.path-bar')].filter(e => e.getClientRects().length).map(e => ({ n:e.children.length, y:new Set([...e.children].map(s => Math.round(s.getBoundingClientRect().top))).size, binnen:e.getBoundingClientRect().right <= e.closest('.path').getBoundingClientRect().right })));
      ok(k.length >= 2 && k.every(x => x.y === 1 && x.binnen && x.n >= 2), 'plankaarten: ook daar een rechte draad met een knoop per stap (' + k.map(x => x.n).join(', ') + ')'); await p.screenshot({ path:S + '/draad-plankaart.png' }); }
    ok(!ext.length, w + ': niets van buiten de eigen site geladen ' + ext.slice(0, 2).join(' ')); ok(!js.length, w + ': geen scriptfouten ' + js.join(' | ')); await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
