// Borgen als slotstap van "Begeleid een verandering" (v17.30): het Meetplan, met een eigen naam in het plan,
// en in het Meetplan de vraag wat je doet als het terugzakt. Kort: 6 stappen, uitgebreid: 11, Borgen komt na Weerstand en voor de Retro.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const js = []; p.on('pageerror', e => js.push(e.message));
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500);
  await p.evaluate(() => { const k = [...document.querySelectorAll('button')].find(e => /^\s*Verandering\s*$/.test(e.textContent)); k.click(); }); await p.waitForTimeout(500);
  const lijst = async r => { await p.evaluate(r => { store.set('route', Object.assign(store.get('route', {}) || {}, { verandering:r })); const s = new Set(store.get('paths-open', [])); s.add('verandering'); store.set('paths-open', [...s]); renderPaths(); }, r); await p.waitForTimeout(300);
    return p.evaluate(() => [...document.querySelectorAll('.path[data-path="verandering"] ol.steps .step-btn')].filter(e => e.getClientRects().length).map(e => ({ id:e.dataset.id, t:e.innerText.replace(/\s+/g, ' ').trim() }))); };
  const kort = await lijst('kort'); ok(kort.length === 6 && kort[5].id === 'meetplan', 'kort: 6 stappen, de laatste is het Meetplan (' + kort.map(x => x.id).join(', ') + ')');
  ok(/^6?\s*Borgen/.test(kort[5].t.replace(/^\d+\s*/, 'X').replace(/^X/, '')) || /Borgen/.test(kort[5].t), 'kort: de stap heet Borgen in het plan (' + kort[5].t.slice(0, 50) + ')');
  ok(/Blijft het ook zo\?/.test(kort[5].t) && !/Meetplan/.test(kort[5].t.replace('Borgen', '')) || /Blijft het ook zo\?/.test(kort[5].t), 'kort: met de vraag "Blijft het ook zo?"');
  const vol = await lijst('vol'); const ids = vol.map(x => x.id); ok(vol.length === 11 && ids.indexOf('meetplan') === ids.indexOf('weerstand') + 1 && ids.indexOf('retro') === ids.indexOf('meetplan') + 1 && ids[10] === 'retro', 'uitgebreid: 11 stappen, Borgen na Weerstand en voor de Retro, die afsluit (' + ids.join(', ') + ')');
  ok(/Kort\s*6 stappen/.test(await p.locator('.path[data-path="verandering"] .rk[data-route="kort"]').innerText()) && /11 stappen/.test(await p.locator('.path[data-path="verandering"] .rk[data-route="vol"]').innerText()), 'de keuze Kort of Uitgebreid telt mee: 6 en 11');
  // in het projectplan en het procesplan heet het Meetplan gewoon Meetplan
  await p.evaluate(() => { const k = [...document.querySelectorAll('button')].find(e => /^\s*Projecten\s*$/.test(e.textContent)); k.click(); store.set('route', { project:'vol', proces:'vol' }); store.set('paths-open', ['project', 'proces']); renderPaths(); }); await p.waitForTimeout(500);
  const elders = await p.evaluate(() => [...document.querySelectorAll('.path[data-path="project"] .step-btn[data-id="meetplan"], .path[data-path="proces"] .step-btn[data-id="meetplan"]')].filter(e => e.getClientRects().length).map(e => e.innerText.replace(/\s+/g, ' ')));
  ok(elders.length === 2 && elders.every(t => /Meetplan/.test(t) && !/Borgen/.test(t)), 'in project en proces blijft de stap Meetplan heten');
  // de stap openen vanuit het veranderplan
  await p.evaluate(() => { const k = [...document.querySelectorAll('button')].find(e => /^\s*Verandering\s*$/.test(e.textContent)); k.click(); store.set('route', { verandering:'kort' }); store.set('paths-open', ['verandering']); renderPaths(); }); await p.waitForTimeout(400);
  await p.locator('.path[data-path="verandering"] .step-btn[data-id="meetplan"]').first().click(); await p.waitForTimeout(1500);
  const d = p.locator('#pn-form button:has-text("Verder")'); if (await d.isVisible().catch(() => false)) { await p.fill('#pn-name', 'Nieuwe werkwijze'); await d.click(); } await p.waitForTimeout(2500);
  const balk = (await p.locator('#pathbar').innerText()).replace(/\s+/g, ' '); ok(/stap 6 van 6/.test(balk) && /Borgen/.test(balk), 'de balk zegt stap 6 van 6 en Borgen (' + balk.slice(0, 90) + ')');
  ok(await p.locator('#pathbar .pb-next').innerText().then(t => /Klaar/.test(t)), 'het is de laatste stap: de knop zegt Klaar');
  // de nieuwe vraag in het Meetplan
  const fr = p.frames().find(f => f !== p.mainFrame() && /\/meetplan\//.test(f.url())); const bg = fr.locator('.oc-start .oc-begin'); if (await bg.count() && await bg.isVisible()) { await bg.click(); await p.waitForTimeout(600); }
  const doel = fr.locator('input[placeholder^="Doel"]').first(); await doel.fill('Iedereen werkt met de nieuwe agenda'); await doel.press('Enter'); await p.waitForTimeout(900);
  let veld = fr.locator('[data-f="actie"]:visible').first();
  if (!(await veld.count())) { const k = fr.locator('button:visible').filter({ hasText:/meet|Meet|indicator|Voeg|Hoe zie/ }).first(); if (await k.count()) { await k.click(); await p.waitForTimeout(700); } veld = fr.locator('[data-f="actie"]:visible').first(); }
  if (!(await veld.count())) { for (const k of await fr.locator('.card button:visible, [data-open]:visible, summary:visible').all()) { try { await k.click({ timeout:800 }); await p.waitForTimeout(300); } catch (e) {} if (await fr.locator('[data-f="actie"]:visible').count()) break; } veld = fr.locator('[data-f="actie"]:visible').first(); }
  ok(await veld.count() === 1, 'het Meetplan vraagt wat je doet als het terugzakt');
  if (await veld.count()) { const lab = await fr.evaluate(() => { const v = [...document.querySelectorAll('[data-f="actie"]')].find(e => e.getClientRects().length); const l = document.querySelector('label[for="' + v.id + '"]'); const w = [...document.querySelectorAll('[data-f="wie"]')].find(e => e.getClientRects().length); return { tekst:l ? l.textContent : '', naWie:!!(w && (w.compareDocumentPosition(v) & Node.DOCUMENT_POSITION_FOLLOWING)), breed:v.getBoundingClientRect().right <= innerWidth }; });
    ok(/Zakt het terug\? Dan/.test(lab.tekst) && lab.naWie && lab.breed, 'de vraag staat na "Wie meet?" en past in beeld (' + lab.tekst + ')');
    await veld.scrollIntoViewIfNeeded(); await veld.fill('We bekijken samen waarom en sturen bij'); await veld.blur(); await p.waitForTimeout(900); await p.screenshot({ path:S + '/borgen-veld.png' });
    ok(await fr.evaluate(() => Object.keys(localStorage).some(k => /sturen bij/.test(localStorage.getItem(k) || ''))), 'het antwoord wordt bewaard');
    await fr.evaluate(() => location.reload()); await p.waitForTimeout(2500); const fr2 = p.frames().find(f => f !== p.mainFrame() && /\/meetplan\//.test(f.url())); ok(await fr2.evaluate(() => /sturen bij/.test(document.body.innerHTML) || [...document.querySelectorAll('[data-f="actie"]')].some(e => /sturen bij/.test(e.value))), 'na herladen staat het er nog'); }
  ok(!js.length, 'geen scriptfouten ' + js.join(' | ')); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
