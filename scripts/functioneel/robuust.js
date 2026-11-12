// Robuustheid: kapotte bewaarde gegevens en een volle opslag, voor elke tool; daarna de app zelf.
const { chromium } = require('playwright'); const fs = require('fs');
const B = (process.env.BASE || 'http://127.0.0.1:8000');
const tools = JSON.parse(fs.readFileSync(process.env.TOOLS || require('path').join(__dirname, '../../tools.json'), 'utf8'));
const KAPOT = ['{{{', 'null', '[]', '"tekst"', '{"items":"geen lijst","v":999}', '12'];
(async () => {
  const b = await chromium.launch(), R = {};
  for (const t of tools) {
    const keys = (t.storage || []).filter(k => !k.includes('*') && !k.startsWith('oc.share') && !k.startsWith('oc.naar') && !k.startsWith('oc.beeld')); const r = { kapot: [], vol: null };
    const c = await b.newContext({ viewport: { width: 1100, height: 900 }, serviceWorkers: 'block' });
    for (const v of KAPOT) { const p = await c.newPage(), E = []; p.on('pageerror', e => E.push(String(e).slice(0, 110))); p.on('dialog', d => d.dismiss().catch(() => {}));
      try { await p.addInitScript(([keys, v]) => { try { localStorage.clear(); localStorage.setItem('oc.welkom', '1'); keys.forEach(k => localStorage.setItem(k, v)); } catch (e) {} }, [keys, v]);
        await p.goto(B + t.path, { waitUntil: 'networkidle', timeout: 20000 }); await p.waitForTimeout(250);
        const ok = await p.evaluate(() => !!document.querySelector('h1') && document.body.innerText.trim().length > 30);
        // werkt de tool nog: Begin of het eerste veld
        await p.click('.oc-begin', { timeout: 500 }).catch(() => {}); await p.waitForTimeout(150);
        if (E.length || !ok) r.kapot.push({ v, ok, E: E.slice(0, 2) }); } catch (e) { r.kapot.push({ v, fout: String(e).slice(0, 90) }); }
      await p.close(); }
    // volle opslag: setItem gooit een fout zodra de tool iets bewaart
    { const p = await c.newPage(), E = []; p.on('pageerror', e => E.push(String(e).slice(0, 110))); p.on('dialog', d => d.dismiss().catch(() => {}));
      try { await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('oc.welkom', '1'); } catch (e) {} });
        await p.goto(B + t.path, { waitUntil: 'networkidle', timeout: 20000 });
        await p.evaluate(() => { const o = Storage.prototype.setItem; window.__vol = 0; Storage.prototype.setItem = function () { window.__vol++; throw new DOMException('vol', 'QuotaExceededError'); }; });
        await p.click('.oc-begin', { timeout: 500 }).catch(() => {}); await p.waitForTimeout(150);
        await p.evaluate(() => { const e = [...document.querySelectorAll('input:not([type]),input[type=text],textarea')].filter(e => e.getClientRects().length && !e.disabled)[0]; if (!e) return; e.focus(); const d = Object.getOwnPropertyDescriptor(e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'); d.set.call(e, 'Test volle opslag'); ['input', 'change'].forEach(n => e.dispatchEvent(new Event(n, { bubbles: true }))); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); e.blur(); });
        await p.waitForTimeout(1200);
        r.vol = await p.evaluate(() => ({ pogingen: window.__vol, melding: /niet bewaard|opslag|vol\b|geen plaats|ruimte/i.test(document.body.innerText) })); r.vol.E = E.slice(0, 2);
      } catch (e) { r.vol = { fout: String(e).slice(0, 90) }; } await p.close(); }
    R[t.id] = r; await c.close();
  }
  fs.writeFileSync('robuust.json', JSON.stringify(R)); const E = Object.entries(R);
  console.log('kapot → fout of leeg:', E.filter(([k, r]) => r.kapot.length).length); E.filter(([k, r]) => r.kapot.length).forEach(([k, r]) => console.log('  ', k, JSON.stringify(r.kapot).slice(0, 260)));
  console.log('vol → onopgevangen fout:', E.filter(([k, r]) => r.vol && r.vol.E && r.vol.E.length).map(([k, r]) => k + ' ' + r.vol.E[0].slice(0, 60)).join(' | ') || '-');
  const bew = E.filter(([k, r]) => r.vol && r.vol.pogingen > 0); console.log('vol: tools die probeerden te bewaren', bew.length, '; met melding aan de gebruiker', bew.filter(([k, r]) => r.vol.melding).length, '; zonder:', bew.filter(([k, r]) => !r.vol.melding).map(x => x[0]).join(' '));
  // ---- de app zelf
  const PAY = `x"'><img src=x onerror="window.__x=(window.__x||0)+1">`;
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true }); const p = await c.newPage(), E2 = []; p.on('pageerror', e => E2.push(String(e).slice(0, 120)));
  await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', 'true'); localStorage.setItem('oc-app.privkader-weg', 'true'); } catch (e) {} });
  await p.goto(B + '/', { waitUntil: 'networkidle' });
  // zoeken: vindt de zoekbalk elke tool op zijn titel?
  const mis = []; for (const t of tools) { await p.fill('#search', t.title); await p.waitForTimeout(120); const ok = await p.evaluate((id) => [...document.querySelectorAll(`[data-id="${id}"],[data-tool="${id}"],[data-open="${id}"]`)].some(e => e.getClientRects().length), t.id); if (!ok) mis.push(t.id); }
  console.log('zoeken op titel vindt niet:', mis.join(' ') || '-'); await p.fill('#search', 'zzzqqq'); await p.waitForTimeout(200); console.log('zoeken zonder resultaat:', (await p.evaluate(() => { const e = [...document.querySelectorAll('[id*=empty],[class*=empty],[class*=geen],[id*=geen]')].find(e => e.getClientRects().length); return e ? e.innerText.slice(0, 90) : 'GEEN MELDING'; })));
  await p.fill('#search', '');
  // projectnaam en gedeelde gegevens met een aanvalstekst
  await p.evaluate((PAY) => { localStorage.setItem('oc.project', JSON.stringify({ name: PAY, since: Date.now() })); localStorage.setItem('oc-app.projects', JSON.stringify([PAY, 'Tweede'])); localStorage.setItem('oc.share.opdracht', JSON.stringify({ [PAY]: { naam: PAY, notes: [{ t: PAY, type: PAY }] }, project: PAY, items: [{ t: PAY, titel: PAY, naam: PAY }] })); localStorage.setItem('oc-app.recent', JSON.stringify([PAY, 'opdracht'])); localStorage.setItem('oc-app.favs', JSON.stringify([PAY])); }, PAY);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  console.log('app met aanvalstekst in project en lijsten:', JSON.stringify(await p.evaluate(() => ({ x: window.__x || 0, inj: document.querySelectorAll('img[src="x"]').length }))), 'fouten', E2.slice(0, 2));
  // kapotte app-instellingen
  await p.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith('oc-app.') || k === 'oc.project').forEach(k => localStorage.setItem(k, '{{{')); }); E2.length = 0;
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500); console.log('app met kapotte instellingen: tegels', await p.evaluate(() => document.querySelectorAll('.stile').length), 'fouten', E2.slice(0, 3));
  // terugknop: tool openen, terug, vooruit
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' }); await p.click('#wz-skip,.wz-skip,[data-wz-sluit]', { timeout: 800 }).catch(() => {});
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const tab = []; for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); tab.push(await p.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return (e.innerText || e.getAttribute('aria-label') || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 18) + (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none' ? '' : ' [GEEN RAND]'); })); }
  console.log('tabvolgorde:', tab.join(' > '));
  await b.close();
})();
