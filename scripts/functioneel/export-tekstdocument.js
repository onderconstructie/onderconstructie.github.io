// Tekstdocument (ODT): naast elke PDF-knop staat een knop met icoon en woord, en de download is een geldig ODT-bestand.
const { chromium } = require('playwright'); const fs = require('fs'), os = require('os'), path = require('path'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9421);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  for (const t of ['tijdlijn', 'opdracht', 'raci', 'dossier', 'notities']) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', locale: 'nl-BE', acceptDownloads: true }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
    await p.goto(B + '/' + t + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    let vb = await p.$('#vb-show'); if (!(vb && await vb.isVisible())) { vb = null; for (const k of await p.$$('button, a')) if (await k.isVisible() && /voorbeeld/i.test(await k.innerText())) { vb = k; break; } }
    if (vb) { await vb.click(); await p.waitForTimeout(900); }
    const r = await p.evaluate(() => { const ks = [...document.querySelectorAll('[data-oc-odt]')], k = ks.find(x => x.offsetWidth);
      const balk = [...document.querySelectorAll('button[data-exp], button[data-dl]')].filter(x => x.offsetWidth && !x.closest('[role="menu"]'));
      return { n: ks.length, tekst: k ? k.innerText.trim() : '', icoon: !!(k && k.querySelector('svg')), h: k ? Math.round(k.getBoundingClientRect().height) : 0, zonderIcoon: balk.filter(x => !x.querySelector('svg')).length, breed: document.documentElement.scrollWidth > innerWidth + 1,
        volgorde: (() => { const a = balk.find(x => (x.dataset.exp || x.dataset.dl) === 'png'), d = balk.find(x => (x.dataset.exp || x.dataset.dl) === 'pdf'); return !a || !d || !!(a.compareDocumentPosition(d) & 4); })() }; });
    ok(r.n >= 1 && (r.h === 0 || /tekstdocument/i.test(r.tekst) && r.icoon && r.h >= 44),   // h = 0: de knop zit alleen in het menu
      t + ': knop Tekstdocument met icoon en woord, minstens 44 px hoog (' + JSON.stringify(r) + ')');
    ok(r.zonderIcoon === 0 && r.volgorde && !r.breed, t + ': elke exportknop heeft een icoon, Afbeelding staat voor PDF, niets valt buiten het scherm');
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 25000 }).catch(() => null), p.evaluate(() => { const ks = [...document.querySelectorAll('[data-oc-odt]')].filter(x => !x.disabled); (ks.find(x => x.offsetWidth) || ks[0]).click(); })]);
    ok(!!d && /\.odt$/.test(d ? d.suggestedFilename() : ''), t + ': download heet .odt');
    if (d) { const f = path.join(os.tmpdir(), 'oc-test-' + t + '.odt'); await d.saveAs(f); const u = fs.readFileSync(f), s = u.toString('latin1');
      ok(u[0] === 0x50 && u[1] === 0x4b && s.slice(30, 38) === 'mimetype' && s.slice(38, 77) === 'application/vnd.oasis.opendocument.text', t + ': zip met mimetype vooraan');
      ok(s.includes('content.xml') && s.includes('styles.xml') && s.includes('META-INF/manifest.xml') && /<text:h /.test(s) && /<text:p /.test(s), t + ': inhoud met kop en alinea\'s'); fs.unlinkSync(f);
      await p.waitForTimeout(400); const toast = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => !e.children.length && !/SCRIPT|STYLE/.test(e.tagName) && /PDF gedownload/.test(e.textContent)).length);
      ok(toast === 0, t + ': de melding zegt niet "PDF gedownload"'); }
    ok(E.length === 0, t + ': geen scriptfouten ' + E.join(' | '));
    await c.close(); }
  await b.close(); console.log(fout.length ? '\n' + fout.length + ' FOUT' : '\nalles ok'); process.exit(fout.length ? 1 : 0); })();
