// "Maak er mijn eigen van": één regel in alle tools met een voorbeeld (hertest a en b, november 2026). Elke toets is een geval dat ooit fout ging.
// A. Actief project zonder werk in de tool: het voorbeeld komt in de lege lijst van dat project. Nooit een tweede, lege lijst met die naam
//    (Klimaat, Beslissingslog en Retro openden na een projectwissel die lege lijst: "Nog niets ingevuld").
// B. Het project heeft al werk in de tool: het voorbeeld blijft een apart project onder zijn eigen naam, het werk van het project blijft,
//    de app houdt haar project en een melding zegt het (negen tools maakten een tweede lijst met dezelfde naam).
// C. Geen actief project: de naam van het voorbeeld wordt het project van de app, zonder "(voorbeeld)" en zonder lege lijst ernaast.
// Gebruik: PORT=8000 node voorbeeld-eigen-logica.js [tool,tool,...]
const { chromium } = require('playwright');
const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const ALLE = 'klimaat,beslissingen,retro,gap,informatie,kennisbank,meetplan,opdracht,pestle,prioriteit,projectbudget,raci,swot,tijdlijn,vinkje,impact,communicatie,sponsor,oefen,verhaal,veranderprofiel,agenda,sprint,weerstand,gedrag,stroom,visgraat,schildpad,systeemkaart';
const TOOLS = (process.argv[2] || ALLE).split(',').filter(Boolean);
// Tools die ocKop.vooraf zonder lijst gebruiken: waar de lijsten staan, wat hun project is en wanneer ze leeg zijn
const EXTRA = {
  gedrag: { lijst: 'units', van: 'u => String(u.project || "").trim()', leeg: 'u => !u.wie.trim() && !u.wat.trim() && !u.acts.length && !Object.keys(u.scores).length' },
  stroom: { lijst: 'flows', van: 'u => u.proj || ""', leeg: 'u => !(u.lanes || []).length && (u.nodes || []).every(n => n.type !== "stap" || !String(n.text || "").trim())' },
  visgraat: { lijst: 'units', van: 'u => u.proj || ""', leeg: 'u => !String(u.probleem || "").trim() && !(u.causes || []).length' },
  schildpad: { lijst: 'procs', van: 'u => u.proj || ""', leeg: 'u => !String(u.naam || "").trim() && !String(u.doel || "").trim() && Object.values(u.vak || {}).every(a => !(a || []).length)' }
};
const VB = '#example, #vb-load, #vb-show, [data-act="example"], #vbLoad, [data-vb="start"], #exampleBtn, #example-btn';
const EIG = '#vb-eigen, [data-act="vb-eigen"], #vbEigen, [data-vb="eigen"]';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const init = (proj) => {
  let k; Object.defineProperty(window, 'ocKop', { configurable: true, get: () => k, set: v => { k = v; const o = v.vooraf; v.vooraf = function (x) { window.__vo = x; return o.apply(this, arguments); }; } });
  if (!localStorage.getItem('oc.welkom')) { localStorage.setItem('oc.welkom', '1'); if (proj) { localStorage.setItem('oc.project', JSON.stringify({ name: proj, since: 1 })); localStorage.setItem('oc-app.projects', JSON.stringify([proj, 'Fietsplan'])); } }
};
// De lijsten van de tool zoals de tool ze zelf beschrijft (ocKop.vooraf), met per lijst het project en of ze leeg is
// (als tekst naar de pagina: de pagina staat geen eval toe)
const stand = (xVan, xLeeg, xLijst) => { const o = window.__vo || {}; let d = null; try { d = JSON.parse(localStorage.getItem(o.sleutel)); } catch (e) {}
  const x = { lijst: xLijst }, van = xVan || o.van || (u => u.name), leeg = xLeeg || (u => o.leeg(u, d)), arr = d && Array.isArray(d[x.lijst || o.lijst]) ? d[x.lijst || o.lijst] : [];
  let app = ''; try { app = JSON.parse(localStorage.getItem('oc.project')).name; } catch (e) {}
  const t = [...document.querySelectorAll('.oc-toast, .toast, #toast')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' / ');
  return { app, toast: t, start: !![...document.querySelectorAll('.oc-start')].find(e => e.getClientRects().length && !e.closest('[hidden]')),
    cur: d && (d.current || null), L: arr.map(u => ({ id: u.id, p: String(van(u) || ''), naam: String(u.name || u.naam || ''), vb: !!u.voorbeeld, leeg: !!leeg(u), json: JSON.stringify(u).length })) }; };
(async () => {
  const b = await chromium.launch();
  for (const t of TOOLS) {
    console.log('== ' + t);
    for (const geval of ['A', 'C']) {
      const c = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block', locale: 'nl-BE', timezoneId: 'Europe/Brussels' });
      const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e).slice(0, 140))); p.on('dialog', d => d.accept().catch(() => {}));
      await p.addInitScript(init, geval === 'A' ? 'Premieloket' : '');
      const X = EXTRA[t] || {}, ST = `(${stand})(${X.van || 'null'}, ${X.leeg || 'null'}, ${X.lijst ? JSON.stringify(X.lijst) : 'null'})`;
      const open = async () => { await p.goto(B + '/' + t + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(450); };
      const klik = async sel => { const r = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; e.hidden = false; e.click(); return true; }, sel); await p.waitForTimeout(700); return r; };
      const zetApp = async (n, s) => { await p.evaluate(([n, s]) => localStorage.setItem('oc.project', JSON.stringify({ name: n, since: s })), [n, s]); await open(); };
      await open();
      if (!await klik(VB) || !await klik(EIG)) { ok(false, t + ' ' + geval + ': voorbeeld of eigen-knop niet gevonden'); await c.close(); continue; }
      let s = await p.evaluate(ST); const echt = s.L.filter(u => !u.vb);
      if (geval === 'A') {
        const vanP = echt.filter(u => u.p === 'Premieloket');
        ok(s.app === 'Premieloket' && vanP.length >= 1 && vanP.every(u => !u.leeg) && !s.L.some(u => u.vb), `${t} A: het voorbeeld zit in de lijst van Premieloket, geen lege lijst ernaast (${s.L.map(u => u.p + (u.leeg ? '(leeg)' : '')).join(', ')}; app ${s.app})`);
        await zetApp('Fietsplan', 2); await zetApp('Premieloket', 3);
        s = await p.evaluate(ST);
        ok(!s.start, `${t} A: na wisselen naar Fietsplan en terug toont de tool het werk van Premieloket, geen startkaart`);
        // B: Premieloket heeft nu werk. Een tweede voorbeeld eigen maken (zoals de hertest: het voorbeeld laden terwijl Premieloket open staat).
        //    Laat de tool het voorbeeld alleen op een lege lijst toe (het vervangt die lijst), dan eerst een nieuwe lijst via "Nieuw" in de kiezer.
        const voorB = s.L.filter(u => !u.vb && u.p === 'Premieloket').map(u => u.id + ':' + u.json).sort().join();
        const bewaard = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]))));
        await klik(VB); s = await p.evaluate(ST);
        let weg = 'voorbeeld naast het werk';
        if (!s.L.some(u => u.vb) || s.L.filter(u => !u.vb && u.p === 'Premieloket').map(u => u.id + ':' + u.json).sort().join() !== voorB) {
          weg = 'eerst een nieuwe lijst';
          await p.evaluate(o => { JSON.parse(o, (k, v) => v); const d = JSON.parse(o); Object.keys(localStorage).forEach(k => { if (!(k in d)) localStorage.removeItem(k); }); Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, v)); }, bewaard); await open();
          const nieuw = await p.evaluate(() => { const g = document.querySelector('[data-act="new"]'); const k = document.querySelector('.oc-pk-knop'); if (!k) { if (g) g.click(); return !!g; } k.click(); const m = [...document.querySelectorAll('.oc-pk-menu [role="menuitem"], .oc-pk-menu button')].find(e => /^\s*Nieuwe?\b/.test(e.textContent)); if (!m) return false; m.click(); return true; });
          await p.waitForTimeout(500);
          await p.evaluate(() => { const ok = document.querySelector('.dlg [data-ok]'); if (ok) ok.click(); });   // Retro vraagt de nieuwe retro in een venster
          await p.waitForTimeout(400);
          if (!nieuw) { ok(false, t + ' B: geen knop Nieuw in de kiezer'); await c.close(); continue; }
          await klik(VB);
          if (!(await p.evaluate(ST)).L.some(u => u.vb)) { ok(true, `${t} B: het voorbeeld staat alleen in een lege tool; met werk kan je het niet laden (geval B kan niet)`); await c.close(); continue; }
        }
        await klik(EIG); s = await p.evaluate(ST);
        const naB = s.L.filter(u => !u.vb && u.p === 'Premieloket').map(u => u.id + ':' + u.json).sort().join();
        // Het werk van Premieloket is er nog: dezelfde lijsten, niets korter (een tool mag bij het bewaren lege velden aanvullen, zoals de Systeemkaart)
        const heel = (v, n) => { const V = v.split(',').map(x => x.split(':')), N = n.split(',').map(x => x.split(':')); return V.length === N.length && V.every(([id, l], i) => N[i][0] === id && +N[i][1] >= +l); };
        const vb = s.L.find(u => u.id === s.cur) || {}, dubbel = s.L.filter(u => !u.vb && u.leeg && s.L.some(w => w !== u && !w.vb && !w.leeg && w.p === u.p));
        ok(s.app === 'Premieloket' && heel(voorB, naB) && vb.p && vb.p !== 'Premieloket' && !/voorbeeld/i.test(vb.p) && /apart project/.test(s.toast) && !s.L.some(u => u.vb) && !dubbel.length,
          `${t} B (${weg}): Premieloket blijft zoals het was${heel(voorB, naB) ? '' : ' [VERANDERD: ' + voorB + ' -> ' + naB + ']'}, het voorbeeld is apart project "${vb.p}", geen lege lijst met dezelfde naam, de melding zegt het (${s.L.map(u => u.p + (u.leeg ? '(leeg)' : '')).join(', ')}; app ${s.app}; "${s.toast.slice(0, 90)}")`);
        await open(); s = await p.evaluate(ST);
        ok(s.app === 'Premieloket' && !s.start, `${t} B: na herladen blijft de app bij Premieloket en toont de tool werk`);
      } else {
        const c0 = s.L.find(u => u.id === s.cur) || {};
        ok(s.app && s.app === c0.p && !/voorbeeld/i.test(s.app) && !s.L.some(u => u.vb) && !echt.some(u => u.leeg && u.id !== c0.id), `${t} C: zonder project wordt "${c0.p}" het project van de app, zonder lege lijst ernaast (${s.L.map(u => u.p + (u.leeg ? '(leeg)' : '')).join(', ')}; app ${s.app})`);
      }
      ok(!PE.length, `${t} ${geval}: geen fouten in de pagina ${PE.join(' | ')}`);
      await c.close();
    }
  }
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0);
})();
