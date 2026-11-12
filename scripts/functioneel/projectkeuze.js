// Test L2 en L3: voorbeeld van jou maken, herladen, ander project; bestand openen onder een actief project.
const { chromium } = require('playwright'); const fs = require('fs'); const B = (process.env.BASE || 'http://127.0.0.1:8000');
const tools = JSON.parse(fs.readFileSync(process.env.TOOLS || require('path').join(__dirname, '../../tools.json'), 'utf8')); const ids = process.argv.slice(2);
const klikTekst = async (p, re) => { const h = await p.evaluateHandle((src) => { const re = new RegExp(src, 'i'); return [...document.querySelectorAll('button,a,[role=button]')].find(e => e.getClientRects().length && re.test((e.innerText || '').trim())) || null; }, re.source); const el = h.asElement(); if (!el) return false; await el.click({ timeout: 1500 }).catch(() => {}); return true; };
const st = () => { const m = document.querySelector('main') || document.body; const pk = [...document.querySelectorAll('.oc-pk-naam')].filter(e => e.getClientRects().length).map(e => e.innerText.trim())[0] || ''; let ap = ''; try { ap = JSON.parse(localStorage.getItem('oc.project')).name; } catch (e) {}
  return { pk: pk.slice(0, 26), app: String(ap).slice(0, 26), start: !!([...document.querySelectorAll('.oc-start')].find(e => e.getClientRects().length)), n: m.innerText.replace(/\s+/g, ' ').length }; };
const f = s => `[kiezer="${s.pk}" app="${s.app}" ${s.start ? 'STARTKAART' : 'inhoud'} ${s.n}]`;
(async () => { const b = await chromium.launch(); let fout = 0;
  for (const id of ids) { const t = tools.find(x => x.id === id); const c = await b.newContext({ viewport: { width: 1100, height: 900 }, serviceWorkers: 'block', acceptDownloads: true }); const p = await c.newPage(), E = []; p.on('dialog', d => d.accept().catch(() => {})); p.on('pageerror', e => E.push(String(e).slice(0, 90)));
    await p.addInitScript(() => { try { if (!localStorage.getItem('oc.welkom')) { localStorage.setItem('oc.welkom', '1'); localStorage.setItem('oc.project', JSON.stringify({ name: 'Alfa', since: Date.now() - 5000 })); } } catch (e) {} });
    await p.goto(B + t.path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300); const s0 = await p.evaluate(st);
    const vb = await klikTekst(p, /^voorbeeld( bekijken| laden)?$|bekijk (eerst )?een voorbeeld/); await p.waitForTimeout(600); const eg = await klikTekst(p, /maak er mijn eigen van/); await p.waitForTimeout(700);
    const s1 = await p.evaluate(st); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600); const s2 = await p.evaluate(st);
    // bestand
    let dl = null; if (await p.$('#menu-btn')) { await p.click('#menu-btn').catch(() => {}); [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3000 }).catch(() => null), p.click('[data-bestand="bewaar"]', { timeout: 1000 }).catch(() => {})]); if (dl) await dl.saveAs(require('os').tmpdir() + '/oc-k-' + id + '.json'); await p.keyboard.press('Escape'); }
    // ander project in de app: de tool moet volgen
    await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name: 'Beta', since: Date.now() }))); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600); const s3 = await p.evaluate(st);
    // onder Beta het bestand openen
    let s4 = null, s5 = null; if (dl) { await p.click('#menu-btn').catch(() => {}); const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), p.click('[data-bestand="open"]', { timeout: 1000 }).catch(() => {})]); if (fc) { await fc.setFiles(require('os').tmpdir() + '/oc-k-' + id + '.json'); await p.waitForTimeout(500); await klikTekst(p, /^vervang$/); await p.waitForTimeout(1800); s4 = await p.evaluate(st); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); s5 = await p.evaluate(st); } }
    const ok2 = vb && eg ? (!s2.start && Math.abs(s2.n - s1.n) < Math.max(40, s1.n * .05)) : null, ok3 = s3.start || s3.n < s2.n * .8 || s3.pk === 'Beta', ok4 = s4 ? (!s4.start && Math.abs(s4.n - s2.n) < Math.max(60, s2.n * .08)) : null, ok5 = s5 ? (!s5.start && Math.abs(s5.n - s2.n) < Math.max(60, s2.n * .08)) : null;
    const slecht = ok2 === false || !ok3 || ok4 === false || ok5 === false || E.length; if (slecht) fout++;
    console.log((slecht ? 'FOUT ' : 'ok   ') + id.padEnd(15), 'eigen', f(s1), '| herladen', f(s2), ok2, '| Beta', f(s3), ok3, '| bestand', s4 ? f(s4) : '-', ok4, '| herladen', s5 ? f(s5) : '-', ok5, E.slice(0, 1).join(''));
    await c.close(); }
  console.log('fouten:', fout); await b.close(); })();
