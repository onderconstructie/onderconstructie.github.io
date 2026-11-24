// Koppen in Bricolage Grotesque in elke tool (v17.32), geladen van de eigen site. Kleine labels in hoofdletters blijven DM Sans. Lopende tekst blijft DM Sans.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const t = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tools.json'), 'utf8')); const tools = (Array.isArray(t) ? t : t.tools).filter(x => x.path);
  const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' }); const fout = []; let n = 0, koppen = 0;
  for (const x of tools) { const p = await c.newPage(); const ext = []; p.on('request', r => { const u = r.url(); if (!u.startsWith(B) && !/^(data|blob):/.test(u)) ext.push(u); });
    try { await p.goto(B + x.path, { waitUntil:'domcontentloaded', timeout:20000 }); await p.waitForTimeout(350);
      const m = await p.evaluate(async () => { try { await document.fonts.load("700 20px 'Bricolage Grotesque'"); } catch (e) {} const fam = e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim();
        const k = [...document.querySelectorAll('h1, h2, h3, .title, .oc-u-titel')].filter(e => e.getClientRects().length).map(e => ({ naam:e.tagName.toLowerCase() + '.' + String(e.className.baseVal || e.className).split(' ')[0], f:fam(e), up:getComputedStyle(e).textTransform === 'uppercase', klein:parseFloat(getComputedStyle(e).fontSize) < 14 }));
        return { blok:!!document.getElementById('oc-kop-font'), k, body:fam(document.body), geladen:document.fonts.check("700 20px 'Bricolage Grotesque'"), breed:document.documentElement.scrollWidth <= innerWidth + 1 }; });
      n++; koppen += m.k.length; const zeg = s => fout.push(x.id + ': ' + s);
      if (!m.blok) zeg('het blok oc-kop-font ontbreekt'); if (!m.geladen) zeg('Bricolage Grotesque is niet geladen');
      const eigen = ['Caveat', 'JetBrains Mono'];   // een tool mag bewust een ander lettertype kiezen voor een kop (handschrift, cijfers)
      m.k.filter(e => !(e.up && e.klein) && e.f !== 'Bricolage Grotesque' && !eigen.includes(e.f)).forEach(e => zeg('kop ' + e.naam + ' staat in ' + e.f));
      m.k.filter(e => e.up && e.klein && e.f === 'Bricolage Grotesque').forEach(e => zeg('klein label ' + e.naam + ' in hoofdletters staat in Bricolage'));
      if (m.body !== 'DM Sans') zeg('lopende tekst is ' + m.body); if (!m.breed) zeg('zijwaarts scrollen op gsm'); if (ext.length) zeg('laadt van buiten: ' + ext[0]);
      if (['raci', 'kanban', 'retro'].includes(x.id)) await p.screenshot({ path:S + '/kopfont-' + x.id + '.png' });
    } catch (e) { fout.push(x.id + ': ' + e.message.slice(0, 80)); } await p.close(); }
  fout.forEach(f => console.log('  FOUT ' + f)); console.log(n + ' tools, ' + koppen + ' zichtbare koppen nagekeken'); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
