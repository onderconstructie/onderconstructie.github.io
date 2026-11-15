// Dossier: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/dossier/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.click('#example'); await p.waitForTimeout(400);
  // De realistische einddatum uit de Monitor k dagen na de geplande einddatum van de opdracht zetten (in het voorbeeld)
  const zet = k => p.evaluate(k => {
    const plan = vbCache['opdracht.v1'].opdrachten[0].einddatum, d = new Date(plan + 'T12:00:00'); d.setDate(d.getDate() + k);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    vbCache['oc.share.project-realisme'].lists[0].items.find(x => x.text === 'realisme.einddatum').note = iso; render();
    const sig = signalen().find(x => /Realistisch klaar op/.test(x)) || '', t = alsTekst().split('\n').find(l => /later dan gepland|vroeger dan gepland|zoals gepland/.test(l)) || '';
    return { sig, t };
  }, k);
  // 1. Drie dagen te laat geeft een signaal, in dagen (denken, dossier)
  let r = await zet(3);
  ok(/3 dagen na de geplande einddatum/.test(r.sig), '3 dagen te laat: signaal "3 dagen" (' + (r.sig || 'geen signaal') + ')');
  ok(/3 dagen later dan gepland/.test(r.t), '3 dagen te laat: de tekst zegt 3 dagen later, niet "zoals gepland" (' + r.t.trim() + ')');
  // 2. Vier dagen is geen week
  r = await zet(4);
  ok(/4 dagen na de geplande einddatum/.test(r.sig) && !/week/.test(r.sig), '4 dagen te laat: "4 dagen", geen "1 week" (' + r.sig + ')');
  // 3. Twee hele weken blijven weken; op tijd geeft geen signaal; vroeger staat in dagen
  r = await zet(14); ok(/2 weken na de geplande einddatum/.test(r.sig), '14 dagen: "2 weken" (' + r.sig + ')');
  r = await zet(0); ok(!r.sig && /zoals gepland/.test(r.t), 'op de geplande dag: geen signaal, "zoals gepland" (' + r.t.trim() + ')');
  r = await zet(-3); ok(!r.sig && /3 dagen vroeger dan gepland/.test(r.t), '3 dagen vroeger: geen signaal, "3 dagen vroeger" (' + r.t.trim() + ')');
  // Dossier met een apart voorbeeldproject (één regel voor "Maak er mijn eigen van"): Nieuwe bib heeft eigen besluiten, het voorbeeld van de
  // Beslissingslog werd een apart project. Het dossier van Nieuwe bib toont zijn eigen besluiten; het voorbeeldproject staat apart in de lijst.
  { const c2 = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); const q = await c2.newPage(); q.on('pageerror', e => PE.push('dossier apart: ' + String(e)));
    await q.goto(B + '/beslissingen/', { waitUntil:'domcontentloaded' });
    await q.evaluate(() => { localStorage.setItem('oc.project', JSON.stringify({ name:'Nieuwe bib', since:1 }));
      localStorage.setItem('beslissingen.v1', JSON.stringify({ logs:[{ id:'L1', name:'Nieuwe bib', items:[{ id:'d1', what:'Leeszaal blijft open op zondag', why:'Veel vraag van studenten', who:'Schepen', date:'2026-11-10', alt:'', status:'genomen', note:'', created:1 }] }], current:'L1' })); });
    await q.reload({ waitUntil:'networkidle' }); await q.waitForTimeout(300);
    await q.evaluate(() => { const e = document.querySelector('#vb-show'); e.hidden = false; e.click(); }); await q.waitForTimeout(400); await q.click('#vb-eigen'); await q.waitForTimeout(500);
    const logs = await q.evaluate(() => state.logs.map(l => l.name + ':' + l.items.length).join(', '));
    await q.goto(B + '/dossier/', { waitUntil:'networkidle' }); await q.waitForTimeout(600);
    const d = await q.evaluate(() => ({ t:document.querySelector('main').innerText.replace(/\s+/g, ' '), sel:[...document.querySelectorAll('select.bron-sel')].map(s => s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : '').join(' | ') }));
    ok(/Nieuwe bib:1/.test(logs) && /Digitaal premieloket voor renovatie:3/.test(logs), 'Beslissingslog: Nieuwe bib houdt zijn besluit, het voorbeeld is een apart project (' + logs + ')');
    ok(/Leeszaal blijft open op zondag/.test(d.t) && !/Elke vrijdag een korte stand van zaken/.test(d.t) && /^Nieuwe bib/.test(d.sel), 'dossier van Nieuwe bib: de eigen besluiten, niet die van het voorbeeldproject (' + d.sel + ')');
    ok(/Gevonden op dit toestel.*Digitaal premieloket voor renovatie/.test(d.t) && !/voorbeeld/i.test(d.t.split('Datum van de nota')[0]), 'het voorbeeldproject staat apart in het dossier, onder zijn eigen naam');
    await c2.close(); }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
