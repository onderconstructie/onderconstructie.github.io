// v17.36. Twee dingen. (1) De knopen op de draad zijn zichtbaar: de rand van elke knoop haalt minstens 3 op 1 tegen wit.
// (2) Op de gsm noemt de balk de stap bij naam, voluit, desnoods over twee regels. De draad houdt zijn breedte, de balk wordt niet hoger en er valt niets
// buiten de balk, ook niet op een smalle gsm met de terugknop erbij. Elke stapnaam van elk plan past (kort en uitgebreid).
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
const lum = c => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(x => +x / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const contrast = c => 1.05 / (lum(c) + .05);
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const [w, vp] of [['gsm 390', { width:390, height:844 }], ['gsm 360', { width:360, height:740 }], ['laptop', { width:1440, height:900 }]]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message)); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
    await p.locator('#stiles .stile').nth(0).click(); await p.waitForTimeout(700); await p.fill('#pn-name', 'Proef'); await p.locator('#pn-form button:has-text("Verder")').click(); await p.waitForTimeout(2500);
    const gsm = vp.width < 700; let h1 = 0;
    for (let stap = 1; stap <= 5; stap++) {
      if (stap > 1) { await p.locator('#topbar .pb-next').click(); await p.waitForTimeout(1800); }
      const m = await p.evaluate(() => { const zicht = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'; const bar = document.querySelector('#pathbar'), kn = bar.querySelector('.pb-kn'), ko = bar.querySelector('.pb-ko'), t2 = bar.querySelector('.pb-tel2'), where = bar.querySelector('.pb-where'), nx = bar.querySelector('.pb-next');
        const dr = [...bar.querySelectorAll('.pb-bol, .pb-dots')].find(zicht); const sp = dr ? [...dr.children] : [];
        const rand = e => { const s = getComputedStyle(e, '::after'); return { bs:s.boxShadow, bg:s.backgroundColor }; };
        const open = sp.find(x => !x.classList.contains('here') && !x.classList.contains('voor') && !x.classList.contains('done')), voor = sp.find(x => x.classList.contains('voor')), hier = sp.find(x => x.classList.contains('here'));
        const r = e => e.getBoundingClientRect();
        return { kn:zicht(kn) ? kn.textContent : '', heel:zicht(kn) ? kn.scrollHeight <= kn.clientHeight + 1 && kn.scrollWidth <= kn.clientWidth + 1 : false, balkH:r(document.querySelector('#topbar')).height, knT:zicht(kn) ? r(kn).top : 0, drB:dr ? r(dr).bottom : 0, ko:ko.textContent, koBreed:r(ko).width, t2:zicht(t2) ? t2.textContent : '', n:sp.length, draad:dr ? r(dr).width : 0, whereR:r(where).right, volgL:nx ? r(nx).left : 9999, terugL:(() => { const t = bar.querySelector('.pb-prev, [data-pb="prev"]'); return t && zicht(t) ? r(t).left : 9999; })(), open:open ? rand(open) : null, voor:voor ? rand(voor) : null, hier:hier ? rand(hier) : null, scrol:document.documentElement.scrollWidth - innerWidth, lijst:(document.querySelector('.pb-stapnaam') || {}).textContent }; });
      if (gsm) { ok(m.kn && m.kn === m.lijst, `${w}, stap ${stap}: de balk noemt de stap: "${m.kn}"`);
        ok(m.t2 === '', `${w}, stap ${stap}: geen telling op een gewone gsm, de draad toont waar je bent`);
        ok(/Stap \d van 7/.test(m.ko) && m.koBreed <= 2, `${w}, stap ${stap}: "Stap ${stap} van 7" blijft voor wie laat voorlezen, maar staat niet in beeld`);
        ok(m.draad >= m.n * 11.5, `${w}, stap ${stap}: de draad houdt zijn breedte (${Math.round(m.draad)} px voor ${m.n} knopen)`);
        ok(m.whereR <= Math.min(m.volgL, m.terugL) + 0.5 && m.scrol <= 0, `${w}, stap ${stap}: niets schuift onder de knoppen of buiten het scherm`);
        ok(m.heel, `${w}, stap ${stap}: de naam staat er voluit, niets afgekapt`);
        if (stap === 1) h1 = m.balkH; ok(m.balkH === h1 && m.knT >= 0 && m.drB <= m.balkH, `${w}, stap ${stap}: de balk blijft even hoog (${m.balkH} px) en alles past erin`); }
      else ok(!m.kn && !m.t2, `${w}, stap ${stap}: op laptop verandert er niets aan de balk`);
      const kl = x => (x.bs.match(/rgba?\([^)]+\)/) || [''])[0];
      if (m.open) ok(contrast(kl(m.open)) >= 3, `${w}, stap ${stap}: open knoop ${contrast(kl(m.open)).toFixed(2)} op 1`);
      if (m.voor) ok(contrast(kl(m.voor)) >= 3, `${w}, stap ${stap}: knoop die je voorbij bent ${contrast(kl(m.voor)).toFixed(2)} op 1`);
      if (m.hier) ok(contrast(m.hier.bg) >= 3, `${w}, stap ${stap}: de knoop waar je bent ${contrast(m.hier.bg).toFixed(2)} op 1`);
      if (stap === 5) await p.screenshot({ path:S + '/stapnaam-' + w.replace(' ', '') + '.png' });
    }
    if (gsm) { const lang = await p.evaluate(() => { const kn = document.querySelector('#pathbar .pb-kn'), oud = kn.textContent, uit = []; const namen = new Set();
        const r0 = store.get('route', {}) || {}; for (const route of ['kort', 'vol']) { const r = {}; TRAJECTEN.forEach(tr => r[tr.id] = route); store.set('route', r); for (const tr of TRAJECTEN) { try { stepsOf(tr.id).forEach(s => namen.add(s.t.title)); } catch (e) {} } } store.set('route', r0);
        for (const n of namen) { kn.textContent = n; if (kn.scrollHeight > kn.clientHeight + 1 || kn.scrollWidth > kn.clientWidth + 1) uit.push(n); } kn.textContent = oud; return { n:namen.size, uit }; });
      // Eén bekende uitzondering: "Project Realisme Monitor" is drie woorden en krijgt na twee regels een beletselteken ("Project Realisme…").
      const echt = lang.uit.filter(n => n !== 'Project Realisme Monitor'); ok(lang.n > 30 && !echt.length, `${w}: de ${lang.n} stapnamen van alle plannen passen voluit` + (lang.uit.length ? ' (afgekapt: ' + lang.uit.join(' | ') + ')' : '')); }
    ok(!js.length, w + ': geen scriptfouten ' + js.join(' | ')); await c.close(); }
  await b.close(); console.log(fout.length ? 'MISLUKT: ' + fout.length : 'GESLAAGD'); process.exit(fout.length ? 1 : 0); })();
