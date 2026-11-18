// v16.62: elke tool uit tools.json (ook het zakmes en de aparte repos).
// 1. Deel-icoon "Deel deze tool" in de kop, minstens 44 px. Het deelt alleen de naam van de tool, één zin en het adres zonder ?... en #...:
//    nooit inhoud of een project, ook niet als er inhoud staat en de adresbalk ?project=Geheim#stuk bevat.
//    Op een aanraakscherm (390) via het deelmenu van het toestel, anders (1280) de link naar het klembord met een melding.
// 2. Waar "Tekstdocument" staat, staat ook "Open in Kladblok"; de tekst komt in Kladblok aan als nieuwe markdown-notitie.
// 3. Geen merknamen (Word, LibreOffice, Google Docs) in knoptips en teksten van de exportknoppen. Geen paginafouten op 390 en 1280.
const { chromium } = require('playwright'); const fs = require('fs'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const ALLE = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../../tools.json'), 'utf8')).map(t => t.path);
const TOOLS = process.argv[2] ? process.argv[2].split(',').map(t => '/' + t.replace(/^\/|\/$/g, '') + '/') : ALLE;
// Zonder kop-blok (geen .oc-kop-acties) of zonder worktree: niet aangepast, apart gemeld in het rapport
const ZONDER = (process.env.ZONDER || '/zakmes/schets/,/adem/,/hier/,/paradox/').split(',');
const VB = ['#example', '#example-btn', '#exampleBtn', '#vb-show', '#vb-load', '#vbLoad', '[data-act="example"]', '.oc-vb', 'button:has-text("Voorbeeld bekijken")'];
const MERK = /\b(Word|LibreOffice|Google Docs)\b/;
(async () => { const b = await chromium.launch();
  for (const pad of TOOLS) {
    if (ZONDER.includes(pad)) { console.log(`  --   ${pad}: zonder kop-blok of zonder worktree, niet aangepast`); continue; }
    for (const breed of [390, 1280]) {
      const mobiel = breed === 390;
      const c = await b.newContext({ viewport:{ width:breed, height:mobiel ? 844 : 900 }, hasTouch:mobiel, isMobile:mobiel, serviceWorkers:'block' });
      await c.addInitScript(() => { localStorage.setItem('oc.welkom', '1');
        window.__gedeeld = null; window.__klembord = null;
        try { Object.defineProperty(navigator, 'share', { configurable:true, value: d => { window.__gedeeld = JSON.parse(JSON.stringify(d)); return Promise.resolve(); } }); } catch (e) {}
        try { if (navigator.clipboard) navigator.clipboard.writeText = t => { window.__klembord = String(t); return Promise.resolve(); }; } catch (e) {} });
      const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e).slice(0, 140))); p.on('dialog', d => d.accept().catch(() => {}));
      const tag = `${pad} ${breed}`;
      try {
        await p.goto(B + pad + '?project=Geheim#stuk', { waitUntil:'networkidle', timeout:30000 }); await p.waitForTimeout(500);
        // inhoud: het voorbeeld laden waar dat kan, en de app-projectnaam Geheim
        await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Geheim', since:Date.now() })));
        for (const s of VB) { const l = p.locator(s + ':visible').first(); if (await l.count()) { await l.click().catch(() => {}); await p.waitForTimeout(600); break; } }
        const k = await p.evaluate(() => { const e = document.querySelector('header[data-oc-kop] .oc-kop-acties .oc-deel:not(.oc-ster)'); if (!e) return null; const r = e.getBoundingClientRect();
          return { w:r.width, h:r.height, label:e.getAttribute('aria-label'), zicht:!!e.getClientRects().length }; });
        ok(k && k.zicht && k.w >= 44 && k.h >= 44 && k.label === 'Deel deze tool', `${tag}: deel-icoon in de kop, ${k ? Math.round(k.w) + 'x' + Math.round(k.h) : 'ontbreekt'}`);
        if (k) {
          await p.click('header[data-oc-kop] .oc-deel:not(.oc-ster)'); await p.waitForTimeout(400);
          const r = await p.evaluate(() => ({ g:window.__gedeeld, k:window.__klembord, melding:[...document.querySelectorAll('.oc-deel-melding')].map(e => e.textContent).join(' '),
            og:(document.querySelector('meta[property="og:title"]') || {}).content || '', d:(document.querySelector('meta[name="description"]') || {}).content || '', url:location.origin + location.pathname }));
          const alles = JSON.stringify([r.g, r.k]);
          if (mobiel) ok(r.g && r.g.url === r.url && r.g.title === r.og && r.g.text === r.d && Object.keys(r.g).sort().join() === 'text,title,url', `${tag}: deelmenu krijgt alleen naam, één zin en het gewone adres (${JSON.stringify(r.g).slice(0, 140)})`);
          else ok(r.k === r.url && /Link naar de tool gekopieerd/.test(r.melding), `${tag}: link naar het klembord en melding (${r.k} | ${r.melding})`);
          const urls = [r.g && r.g.url, r.k].filter(Boolean);   // een vraagteken in de beschrijving mag; in het adres niet
          ok(!/Geheim|project=|#stuk/.test(alles) && urls.every(u => !/[?#]/.test(u)), `${tag}: niets van inhoud, project of adresbalk gedeeld`);
        }
        // merknamen in de exportknoppen (ook in een menu)
        const merk = await p.evaluate(src => { const re = new RegExp(src); return [...document.querySelectorAll('button, [role="menuitem"], a')].map(e => [e.getAttribute('title'), e.getAttribute('aria-label'), e.textContent].join(' ')).filter(t => re.test(t)).slice(0, 2); }, MERK.source);
        ok(!merk.length, `${tag}: geen merknamen in knoptips of knoppen (${merk.join(' | ').slice(0, 120)})`);
        // Open in Kladblok (alleen op 1280, één keer per tool)
        const odt = await p.evaluate(() => [...document.querySelectorAll('[data-oc-odt]')].map(o => ({ klad:!!(o.nextElementSibling && o.nextElementSibling.dataset.ocKlad), tekst:o.nextElementSibling ? o.nextElementSibling.textContent.trim() : '' })));
        const isKlad = pad === '/zakmes/kladblok/';
        if (odt.length) ok(isKlad ? odt.every(o => !o.klad) : odt.every(o => o.klad && /Open in Kladblok/.test(o.tekst)), `${tag}: naast elke knop Tekstdocument ${isKlad ? 'geen' : 'een'} knop Open in Kladblok (${odt.length})`);
        if (!mobiel && odt.length && !isKlad) {
          const kb = await p.evaluate(() => { const L = [...document.querySelectorAll('[data-oc-klad]')]; const k = L.find(x => !x.disabled && x.getClientRects().length) || L.find(x => !x.disabled); if (!k) return false; k.click(); return true; });
          if (kb) {
            await p.waitForURL(/\/zakmes\/kladblok\//, { timeout:20000 }).catch(() => {}); await p.waitForTimeout(1200);
            const n = await p.evaluate(() => { try { const x = st.notes[st.notes.length - 1]; return { url:location.pathname + location.search, soort:x.soort, naam:x.naam, van:x.bron && x.bron.van, begin:String(x.tekst || '').slice(0, 60), len:String(x.tekst || '').length }; } catch (e) { return { url:location.pathname, fout:String(e).slice(0, 80) }; } });
            const id = pad.split('/').filter(Boolean).pop();
            if (!/^\/zakmes\/kladblok\//.test(n.url)) {   // geen sprong: weigert de tool ook de PDF (nog geen inhoud, zoals Mixer zonder groepen)? Dan is er niets te exporteren.
              const pdfOk = await Promise.all([p.waitForEvent('download', { timeout:8000 }).then(() => true).catch(() => false),
                p.evaluate(() => { const k = [...document.querySelectorAll('[data-oc-odt]')].find(x => !x.disabled), b = k && k.previousElementSibling; if (b) b.click(); })]).then(r => r[0]);
              if (!pdfOk) { console.log(`  --   ${tag}: geen inhoud om te exporteren, ook de PDF komt er niet (Open in Kladblok doet dan ook niets)`); n.geen = true; }
            }
            if (!n.geen) ok(/^\/zakmes\/kladblok\/\?van=/.test(n.url) && n.soort === 'md' && n.van === id && /^# \S/.test(n.begin) && n.len > 20, `${tag}: Open in Kladblok geeft een nieuwe md-notitie (${JSON.stringify(n).slice(0, 160)})`);
          } else console.log(`  --   ${tag}: Open in Kladblok staat er, maar is nu uitgeschakeld (nog geen inhoud)`);
        }
      } catch (e) { ok(false, `${tag}: ${String(e).slice(0, 120)}`); }
      ok(!PE.length, `${tag}: geen paginafouten ${PE.join(' | ')}`);
      await c.close();
    }
  }
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
