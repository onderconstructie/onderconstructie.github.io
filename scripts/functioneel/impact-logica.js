// Impactanalyse: vaste testen voor inhoudelijke fouten die testers vonden (gemiddelde op een deel van de dimensies, "één dimensie", breed herontwerp).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const ids = ['proc', 'org', 'cult', 'tech', 'stur'];
const prof = (id, name, sc) => ({ id, name, dims:Object.fromEntries(ids.map((d, i) => [d, { score:sc[i], what:'', actions:[] }])) });
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  const ps = [prof('p1', 'Loket', [4, 3, 2, 4, 1]), prof('p2', 'Burgers', [0, 0, 0, 4, 0]), prof('p3', 'ICT-team', [3, 3, 3, 1, 1]), prof('p4', 'Juridisch', [1, 1, 1, 1, 3])];
  await p.goto(B + '/impact/', { waitUntil:'domcontentloaded' });
  await p.evaluate(a => localStorage.setItem('impact.v1', JSON.stringify({ analyses:[a], current:'A' })), { id:'A', name:'Digitaal premieloket', change:'', profiles:ps, current:'p1', view:'profiel', cmp:'reeks' });
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const toon = id => p.evaluate(id => { cur().current = id; render(); return document.getElementById('summary').innerText.replace(/\s+/g, ' '); }, id);
  // 1. Twee dimensies op 4: niet "want één dimensie is ingrijpend"
  let s = await toon('p1'); ok(!/één dimensie is ingrijpend/.test(s) && /twee dimensies zijn ingrijpend/.test(s), 'twee dimensies op 4: "twee dimensies zijn ingrijpend" (' + (s.match(/Zwaarder[^.]*\./) || [''])[0] + ')');
  // 2. Breed herontwerp noemt geen sturing als sturing 1 scoort
  s = await toon('p3'); ok(/Breed herontwerp/.test(s) && !/sturing/i.test(s.replace(/Zwaartepunten:[^O]*/, '')), 'breed herontwerp zonder "sturing" bij sturing 1 (' + (s.match(/Breed herontwerp[^.]*\./) || [''])[0] + ')');
  // 3. Eén dimensie gescoord: het scherm zegt op hoeveel dimensies het gemiddelde rust
  s = await toon('p2'); ok(/1 van 5/.test(s), 'Burgers met één dimensie: "1 van 5" bij het gemiddelde (' + s.slice(0, 120) + ')');
  const cmp = await p.evaluate(() => { renderCompare(); return '' } ) + await p.evaluate(() => document.getElementById('cmp-body').innerText.replace(/\s+/g, ' ') + ' | ' + document.getElementById('cmp-table').innerText.replace(/\s+/g, ' '));
  ok(/Burgers 4,0 · zwaar · 1 van 5/.test(cmp) && /4,0 \(1 van 5\)/.test(cmp), 'vergelijking toont "1 van 5" bij Burgers');
  const md = await p.evaluate(() => asMarkdown(cur())); ok(/Gemiddelde impact 4,0 op 4, op 1 van 5 dimensies/.test(md), 'export zegt op hoeveel dimensies');
  // 4. De zwaarst geraakte doelgroep voor het Veranderprofiel: een volledig gescoorde, geen losse 4
  const kc = await p.evaluate(() => Object.fromEntries(kerncijfers(cur())[0].items.map(i => [i.text, i.note])));
  ok(kc['impact.zwaarst'] === '2.8' && kc['impact.max'] === '4' && kc['impact.gescoord'] === '1', 'impact.zwaarst rekent met volledig gescoorde doelgroepen (' + kc['impact.zwaarst'] + ')');
  // 5. Controle: een volledig gescoorde doelgroep krijgt geen "van 5" en één dimensie op 3 blijft "één dimensie"
  s = await toon('p4'); ok(!/van 5/.test(s) && /één dimensie heeft een grote impact/.test(s), 'volledige doelgroep, één 3: ongewijzigd');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
