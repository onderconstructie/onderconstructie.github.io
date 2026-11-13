// Gebruikersreis op een gsm: nieuwe gebruiker, welkomstgids, daarna elke stap van een plan echt invullen.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8980);
const PLAN = process.argv[2] || 'project', ROUTE = process.argv[3] || 'kort';
const TEKST = ['Nieuw digitaal loket voor premies', 'Burgers vragen hun premie online aan', 'Minder wachttijd aan het loket', 'An Peeters', 'Website', 'Handleiding', 'Opleiding voor medewerkers'];
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 140)));
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.click('#wz-start'); await p.waitForTimeout(300); await p.click(`#wz-keuzes [data-doel="${PLAN}"]`); await p.waitForTimeout(400); await p.fill('#wz-naam', 'Digitaal premieloket'); if (ROUTE === 'vol') await p.click('[data-wz-route="vol"]');
  await p.click('#wz-form button[type=submit]'); await p.waitForTimeout(300); await (await p.$('#wiz .wz-scherm[data-scherm="4"] .wz-go')).click(); await p.waitForTimeout(1600);
  const fr = async () => { const hs = await p.$$('iframe'); for (const h of hs) { if (await h.isVisible().catch(() => false)) return await h.contentFrame(); } return null; };
  for (let i = 0; i < 16; i++) { const f = await fr(); if (!f) { console.log('GEEN TOOL'); break; } await p.waitForTimeout(700);
    const balk = await p.evaluate(() => { const w = document.querySelector('#pathbar .pb-where'); return w ? w.getAttribute('aria-label').replace(/^.*Nu: /, '') : 'GEEN BALK'; });
    const info = { stap: balk, tool: f.url().replace(B, '').split('?')[0] };
    info.start = await f.evaluate(() => { const s = [...document.querySelectorAll('.oc-start')].find(e => e.getClientRects().length); return s ? s.innerText.replace(/\s+/g, ' ').slice(0, 110) : ''; });
    await p.screenshot({ path: `reis/${PLAN}-${ROUTE}-${String(i).padStart(2, '0')}a.png` });
    const begin = await f.$('.oc-start .oc-begin:visible, .oc-start [data-oc-begin]:visible'); if (begin) { await begin.click().catch(() => {}); await p.waitForTimeout(700); }
    // overnemen als het wordt aangeboden
    const imp = await f.$('button[data-oc-types]:visible'); if (imp) { info.overnemen = (await imp.innerText()).replace(/\s+/g, ' ').slice(0, 50); await imp.click().catch(() => {}); await p.waitForTimeout(600);
      info.kiezer = await f.evaluate(() => { const d = [...document.querySelectorAll('dialog[open], [role=dialog]')].pop(); return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 170) : 'geen venster'; });
      const vakjes = await f.$$('dialog[open] input[type=checkbox]:visible, [role=dialog] input[type=checkbox]:visible, dialog[open] [role=checkbox]:visible'); for (const v of vakjes.slice(0, 3)) await v.click({ force: true }).catch(() => {});
      const neem = await f.$('dialog[open] button:has-text("Neem"), [role=dialog] button:has-text("Neem")'); if (neem && await neem.isEnabled()) { await neem.click().catch(() => {}); info.genomen = vakjes.length ? Math.min(3, vakjes.length) : 0; } else { await p.keyboard.press('Escape'); info.genomen = 'niets te nemen'; } await p.waitForTimeout(600); }
    // de eerste lege velden invullen
    const velden = await f.$$('main input[type=text]:visible, main input:not([type]):visible, main textarea:visible'); let n = 0; for (const v of velden) { if (n >= 3) break; const leeg = await v.evaluate(e => !e.value && !e.readOnly && !e.disabled).catch(() => false); if (!leeg) continue; await v.fill(TEKST[(i + n) % TEKST.length]).catch(() => {}); await v.press('Enter').catch(() => {}); n++; await p.waitForTimeout(150); }
    info.ingevuld = n; await p.waitForTimeout(500); info.toast = await f.evaluate(() => [...document.querySelectorAll('.toast, [class*=toast]')].filter(e => e.getClientRects().length).map(e => e.innerText.replace(/\s+/g, ' ')).join(' | ').slice(0, 90));
    info.breed = await f.evaluate(() => document.documentElement.scrollWidth); await p.screenshot({ path: `reis/${PLAN}-${ROUTE}-${String(i).padStart(2, '0')}b.png` });
    console.log(i + 1, JSON.stringify(info));
    const nx = await p.$('#pathbar .pb-next'); if (!nx) break; const klaar = await nx.evaluate(e => e.classList.contains('pb-klaar')); await nx.click(); await p.waitForTimeout(900); if (klaar) { await p.screenshot({ path: `reis/${PLAN}-${ROUTE}-einde.png` }); console.log('einde:', await p.evaluate(() => [...document.querySelectorAll('.app-toast, .toast, [class*=toast]')].filter(e => e.getClientRects().length).map(e => e.innerText.replace(/\s+/g, ' ')).join(' | ').slice(0, 160) + ' || bovenaan: ' + (document.querySelector('#resume') || {}).innerText.replace(/\s+/g, ' ').slice(0, 120))); break; } }
  console.log('fouten:', E.length, E.slice(0, 3).join(' || ')); await b.close(); })();
