// Sponsorschap: vaste testen voor inhoudelijke fouten die testers vonden (geen niveau doorgeven onder het minimum aantal antwoorden).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/sponsor/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const kc = n => p.evaluate(n => { state.project = 'Digitaal loket'; state.name = 'Schepen'; state.a.lead = {}; ALL.slice(0, n).forEach(i => { state.a.lead[i.id] = 1; }); save(); render(); publish();
    return { scherm: /Nog te vroeg/.test(document.body.innerText), kc: kerncijfers().map(k => k.text), gedeeld: localStorage.getItem('oc.share.sponsor') || '' }; }, n);
  // 1. Eén antwoord: het scherm zegt "Nog te vroeg", dus geen niveau, score of zwak thema in de kerncijfers
  let r = await kc(1);
  ok(r.scherm, 'één antwoord: "Nog te vroeg" op het scherm');
  ok(!r.kc.some(t => /sponsor\.(niveau|score|zwak|thema_zwak|voorlopig)/.test(t)) && !/sponsor\.niveau|sponsor\.thema_zwak/.test(r.gedeeld), 'één antwoord: geen niveau of zwak thema doorgegeven (' + r.kc.join(', ') + ')');
  // 2. Vier antwoorden: nog altijd te vroeg
  r = await kc(4); ok(!r.kc.includes('sponsor.niveau'), 'vier antwoorden: nog geen niveau (' + r.kc.join(', ') + ')');
  // 3. Vijf antwoorden: wel een oordeel, en dat gaat mee
  r = await kc(5); ok(!r.scherm && r.kc.includes('sponsor.niveau') && r.kc.includes('sponsor.score'), 'vijf antwoorden: niveau gaat mee (' + r.kc.join(', ') + ')');
  // 4. Gesprekspunten als taak pas vanaf vijf antwoorden, zoals het oordeel (REST na de hertest: met vier lage antwoorden gingen ze al mee)
  const taken = () => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('oc.share.sponsor')).lists.filter(l => l.name === 'Digitaal loket').flatMap(l => l.items).filter(i => i.type === 'taak').length; } catch { return -1; } });
  await kc(4); let n = await taken(); ok(n === 0, 'vier antwoorden: geen gesprekspunten als taak doorgegeven (' + n + ')');
  await kc(5); n = await taken(); ok(n > 0, 'vijf antwoorden: de gesprekspunten gaan mee (' + n + ')');
  // 5. De tekst (kopie) zegt onder vijf antwoorden "nog te vroeg", zoals het scherm, en geeft geen niveau (hertest d2)
  await kc(4); let tx = await p.evaluate(() => (/Uitkomst[^\n]*/.exec(asText()) || [''])[0]);
  ok(/nog te vroeg/.test(tx) && !/op 4\)/.test(tx), 'vier antwoorden: tekst zegt nog te vroeg (' + tx + ')');
  await kc(5); tx = await p.evaluate(() => (/Uitkomst[^\n]*/.exec(asText()) || [''])[0]); ok(/op 4\)/.test(tx), 'vijf antwoorden: tekst geeft het oordeel (' + tx + ')');
  // Hertest e: met 1 of 2 hoge antwoorden niet "Er springen geen zwakke punten uit"; en in de tekst geen lege themaregels ("- Volhouden: ")
  for (const n of [1, 2]) {
    const r = await p.evaluate(n => { state.a.lead = {}; ALL.slice(0, n).forEach(i => state.a.lead[i.id] = 4); save(); render(); return { todo:$('todo').innerText.replace(/\s+/g, ' '), tekst:asText() }; }, n);
    ok(!/geen zwakke punten/.test(r.todo + r.tekst), `${n} antwoord(en), score 4: niet "geen zwakke punten" (${r.todo.slice(0, 120)})`);
  }
  const t5 = await p.evaluate(() => { state.a.lead = {}; ALL.slice(0, 5).forEach(i => state.a.lead[i.id] = 1); save(); render(); return asText(); });
  ok(!/^- [^:\n]+: *$/m.test(t5) && !/\(sponsor zelf: \)|\(jouw inschatting: \)/.test(t5), 'vijf antwoorden in twee thema\'s: geen lege themaregels in de tekst (' + t5.split('\n').filter(x => /^- /.test(x)).slice(0, 5).join(' / ') + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
