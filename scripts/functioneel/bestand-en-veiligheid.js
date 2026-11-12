// Tweede ronde, met het voorbeeld als echte gegevens: blijft het, per project gescheiden, bestand heen en terug, en vergiftigd herladen.
const { chromium } = require('playwright'); const fs = require('fs');
const B = (process.env.BASE || 'http://127.0.0.1:8000');
const tools = JSON.parse(fs.readFileSync(process.env.TOOLS || require('path').join(__dirname, '../../tools.json'), 'utf8'));
const PAY = `x"'><img src=x onerror="window.__x=(window.__x||0)+1"><svg onload="window.__x=(window.__x||0)+1">`;
const proj = n => JSON.stringify({ name: n, since: Date.now() });
const sig = () => { const m = document.querySelector('main') || document.body; const t = [...m.querySelectorAll('input,textarea')].filter(e => e.getClientRects().length).map(e => e.value).join('|') + '§' + m.innerText; return t.replace(/[\d\s]+/g, ' ').replace(/Voorbeeld geladen|Bewaard|Geopend[^ ]*/g, '').trim(); };
const zelfde = (a, b) => a && b && Math.abs(a.length - b.length) <= Math.max(12, a.length * 0.03);
const klikTekst = async (p, re) => { const h = await p.evaluateHandle((src) => { const re = new RegExp(src, 'i'); return [...document.querySelectorAll('button,a,[role=button],[role=menuitem]')].find(e => e.getClientRects().length && re.test((e.innerText || '').trim())) || null; }, re.source); const el = h.asElement(); if (!el) return false; await el.click({ timeout: 1500 }).catch(() => {}); return true; };
(async () => {
  const b = await chromium.launch(), R = {};
  for (const t of tools) {
    const c = await b.newContext({ viewport: { width: 1100, height: 900 }, serviceWorkers: 'block', acceptDownloads: true }); const p = await c.newPage(); const r = {}, E = [];
    p.on('dialog', d => d.accept().catch(() => {})); p.on('pageerror', e => E.push(String(e).slice(0, 100)));
    try {
      await p.addInitScript(() => { try { if (!localStorage.getItem('oc.welkom')) { localStorage.setItem('oc.welkom', '1'); localStorage.setItem('oc.project', JSON.stringify({ name: 'Alfa', since: 1 })); } } catch (e) {} });
      await p.goto(B + t.path, { waitUntil: 'networkidle', timeout: 25000 }); await p.waitForTimeout(300);
      const leeg = await p.evaluate(sig);
      r.vb = await klikTekst(p, /^voorbeeld( bekijken| laden)?$|bekijk (eerst )?een voorbeeld/); await p.waitForTimeout(700);
      if (r.vb) { r.eigen = await klikTekst(p, /maak er mijn eigen van/); await p.waitForTimeout(600);
        const s1 = await p.evaluate(sig); r.len = s1.length;
        await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); const s2 = await p.evaluate(sig); r.blijft = zelfde(s1, s2);
        if (await p.$('#menu-btn')) { await p.click('#menu-btn').catch(() => {}); await p.waitForTimeout(200);
          const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3500 }).catch(() => null), p.click('[data-bestand="bewaar"]', { timeout: 1200 }).catch(() => {})]);
          if (dl) { r.f = require('os').tmpdir() + '/oc-' + t.id.replace(/\W/g, '') + '.' + dl.suggestedFilename().split('.').pop(); await dl.saveAs(r.f); r.bestand = dl.suggestedFilename(); } await p.keyboard.press('Escape'); }
        await p.evaluate((v) => localStorage.setItem('oc.project', v), proj('Beta')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); const sB = await p.evaluate(sig); r.betaZietAlfa = zelfde(sB, s2) && !zelfde(sB, leeg);
        await p.evaluate((v) => localStorage.setItem('oc.project', v), proj('Alfa')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); r.terug = zelfde(await p.evaluate(sig), s2);
        if (r.f) { await p.evaluate(() => { Object.keys(localStorage).forEach(k => { if (k !== 'oc.welkom' && k !== 'oc.project') localStorage.removeItem(k); }); }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(300); r.naWisLeeg = !zelfde(await p.evaluate(sig), s2);
          await p.click('#menu-btn').catch(() => {}); await p.waitForTimeout(200);
          const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), p.click('[data-bestand="open"]', { timeout: 1200 }).catch(() => {})]);
          if (fc) { await fc.setFiles(r.f); await p.waitForTimeout(1200); r.uitBestand = zelfde(await p.evaluate(sig), s2); } else r.uitBestand = 'geen kiezer'; }
        r.sleutels = await p.evaluate((PAY) => { let n = 0; const gif = v => typeof v === 'string' ? (n++, v + PAY) : Array.isArray(v) ? v.map(gif) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, gif(w)])) : v;
          Object.keys(localStorage).forEach(k => { if (k === 'oc.welkom') return; try { const j = JSON.parse(localStorage.getItem(k)); if (j && typeof j === 'object') localStorage.setItem(k, JSON.stringify(gif(j))); } catch (e) {} }); return n; }, PAY);
        await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800); r.gif = await p.evaluate(() => ({ x: window.__x || 0, inj: document.querySelectorAll('img[src="x"]').length }));
        if (r.f) { try { const j = JSON.parse(fs.readFileSync(r.f, 'utf8')); const gif = v => typeof v === 'string' ? v + PAY : Array.isArray(v) ? v.map(gif) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, gif(w)])) : v; fs.writeFileSync(r.f + '.gif.json', JSON.stringify(gif(j)));
            await p.evaluate(() => { Object.keys(localStorage).forEach(k => { if (k !== 'oc.welkom' && k !== 'oc.project') localStorage.removeItem(k); }); }); await p.reload({ waitUntil: 'networkidle' }); await p.click('#menu-btn').catch(() => {});
            const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null), p.click('[data-bestand="open"]', { timeout: 1200 }).catch(() => {})]);
            if (fc) { await fc.setFiles(r.f + '.gif.json'); await p.waitForTimeout(1200); r.gifBestand = await p.evaluate(() => ({ x: window.__x || 0, inj: document.querySelectorAll('img[src="x"]').length })); } } catch (e) { r.gifBestand = 'geen json'; } }
      }
    } catch (e) { r.fout = String(e).slice(0, 120); }
    r.E = E.slice(0, 2); delete r.f; R[t.id] = r; await c.close();
  }
  fs.writeFileSync('nazicht.json', JSON.stringify(R)); const E = Object.entries(R), l = (n, f) => console.log(n + ' (' + E.filter(([k, r]) => f(r)).length + '):', E.filter(([k, r]) => f(r)).map(x => x[0]).join(' ') || '-');
  l('fout', r => r.fout); l('paginafouten', r => r.E.length); l('geen voorbeeld gevonden', r => !r.vb); l('voorbeeld getest', r => r.vb); l('blijft NIET na herladen', r => r.vb && !r.blijft);
  l('Beta ziet Alfa', r => r.betaZietAlfa); l('niet terug in Alfa', r => r.vb && r.blijft && !r.terug); l('bestand gemaakt', r => r.bestand); l('niet terug uit bestand', r => r.bestand && r.uitBestand !== true);
  l('vergiftigd: tekst bewaard', r => r.sleutels > 0); l('vergiftigd RAAK', r => r.gif && (r.gif.x || r.gif.inj)); l('vergiftigd bestand getest', r => r.gifBestand && typeof r.gifBestand === 'object'); l('vergiftigd bestand RAAK', r => r.gifBestand && (r.gifBestand.x || r.gifBestand.inj));
  E.filter(([k, r]) => r.E.length).forEach(([k, r]) => console.log('  fout', k, r.E[0]));
  console.log('extensies:', [...new Set(E.map(([k, r]) => r.bestand && r.bestand.split('.').pop()).filter(Boolean))].join(' '));
  await b.close();
})();
