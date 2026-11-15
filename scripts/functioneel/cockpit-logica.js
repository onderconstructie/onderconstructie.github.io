// Cockpit (met Schildpaddiagram): vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const P = 'Premieloket';
const data = {
  'oc.project': { name:P, since:1 },
  'sprint.v1': { v:1, current:'s1', sprints:[{ id:'s1', name:'Sprint 3 · ' + P, days:10, buffer:20, end:'2026-11-27', team:[{ id:'a', name:'An', days:10, pct:100 }], stories:[{ id:'x1', title:'Formulier herschrijven', note:'', est:8, rounds:1 }, { id:'x2', title:'FAQ online', note:'', est:5, rounds:1 }] }] },
  'swot.v1': { lists:[{ id:'l1', name:P, items:[{ id:'w1', vak:'w', text:'Weinig testtijd' }, { id:'t1', vak:'t', text:'Nieuwe regelgeving', groot:true }, { id:'t2', vak:'t', text:'Besparingen bij de stad' }, { id:'s1', vak:'s', text:'Ervaren team' }], links:[{ i:'w1', e:'t1' }], acties:[] }], current:'l1', stap:'vakken' },
  'schildpad.v1': { v:1, current:'p1', procs:[{ id:'p1', proj:P, naam:'Aanvraag behandelen', doel:'', eigenaar:'', start:'', einde:'', vak:{ in:[], uit:[], wie:[], wat:[], hoe:[{ id:'h1', text:'Geen checklist', st:'prob', actie:'Checklist maken', wie:'Sofie', tegen:'2026-12-01' }], regels:[], meet:[] } },
    { id:'p2', proj:P, naam:'Klachten opvolgen', doel:'', eigenaar:'', start:'', einde:'', vak:{ in:[], uit:[], wie:[], wat:[], hoe:[{ id:'h2', text:'Geen vaste termijn', st:'let' }], regels:[], meet:[] } }] },
  // zoals de Risicomatrix klaarlegt: kans, impact, maatregel en status in de notitie
  'oc.share.risico': { id:'risico', tool:'Risicomatrix', updated:Date.parse('2026-11-15T09:00:00+01:00'), lists:[{ name:P, items:[
    { type:'risico', text:'Server valt uit', note:'kans 4/5 · impact 4/5 · maatregel: tweede server · Onder controle' },
    { type:'risico', text:'Te weinig testers', note:'kans 3/5 · impact 4/5 · Nog te doen' },
    { type:'risico', text:'Late levering', note:'kans 2/5 · impact 2/5 · Nog te doen' }] }] },
};
const bord = tools => ({ v:1, actief:'b1', borden:[{ id:'b1', naam:P, kolommen:[{ id:'k1', naam:'Tools', blokken:tools.map(t => ({ id:'x' + t, soort:'tool', tool:t, project:P, widget:true, kleur:'wit' })) }] }] });
(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  await c.clock.setFixedTime(new Date('2026-11-15T10:00:00+01:00'));
  const open = async pad => { const p = await c.newPage(); p.on('pageerror', e => PE.push(pad + ': ' + String(e))); await p.goto(B + pad, { waitUntil:'networkidle' }); await p.waitForTimeout(600); return p; };
  let p = await open('/cockpit/');
  await p.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  for (const t of ['sprint', 'swot', 'schildpad']) { const q = await open('/' + t + '/'); await q.close(); }   // elke tool legt zelf klaar
  // 3. Schildpad: de klaargelegde lijst heet naar het project, twee processen worden één lijst
  const sch = await p.evaluate(() => JSON.parse(localStorage.getItem('oc.share.schildpad') || '{"lists":[]}').lists);
  ok(sch.length === 1 && sch[0].name === P, 'Schildpad legt één lijst klaar onder de projectnaam (' + sch.map(l => l.name).join(', ') + ')');
  ok(sch.length === 1 && sch[0].items.length === 2 && /^Aanvraag behandelen: /.test(sch[0].items[0].note || ''), 'met beide processen, en de procesnaam in de notitie (' + (sch[0] && sch[0].items.map(i => i.note).join(' | ')) + ')');
  await p.evaluate(x => localStorage.setItem('cockpit.v1', JSON.stringify(x)), bord(['sprint', 'swot', 'schildpad', 'risico']));
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);
  const wg = t => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, `[data-id="x${t}"] .wg`);
  // 2a. Sprint: de taken, niet de mijlpaal "Einde sprint"
  const ws = await wg('sprint'); ok(/^2 open/.test(ws) && /Formulier herschrijven/.test(ws) && !/mijlpa/.test(ws), 'sprint-widget toont de taken (' + ws + ')');
  // 2b. SWOT: geen lege risicomatrix, wel de bedreigingen zoals de SWOT ze klaarlegt
  const ww = await wg('swot'); ok(/^2 bedreigingen · 1 raakt een zwakte/.test(ww) && /Nieuwe regelgeving belangrijk/.test(ww) && !/kans|hoog of kritiek/.test(ww), 'SWOT-widget toont de bedreigingen (' + ww + ')');
  // 2c. Schildpad: de widget vindt de lijst van het project
  const wp = await wg('schildpad'); ok(!/Nog niets/.test(wp) && /Checklist maken/.test(wp), 'Schildpad-widget vindt de acties van het project (' + wp + ')');
  // 2d. Risico onder controle telt niet als hoog of kritiek
  // 2e. Tijdlijn: een geplande mijlpaal waarvan de datum voorbij is, zegt "te laat" in woorden, niet alleen in het rood (hertest b)
  await p.evaluate(P => localStorage.setItem('oc.share.tijdlijn', JSON.stringify({ id:'tijdlijn', tool:'Tijdlijn', updated:Date.now(), lists:[{ name:P, project:P, items:[
    { type:'mijlpaal', text:'Start proef', when:'2026-11-01', note:'gepland' }, { type:'mijlpaal', text:'Lancering', when:'2026-12-15', note:'gepland' }] }] })), P);
  await p.evaluate(x => localStorage.setItem('cockpit.v1', JSON.stringify(x)), bord(['sprint', 'swot', 'schildpad', 'risico', 'tijdlijn'])); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);
  const wt = await p.evaluate(() => [...document.querySelectorAll('[data-id="xtijdlijn"] .wg-tijd li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
  ok(wt.length === 2 && /Start proef.*te laat/.test(wt[0]) && !/te laat/.test(wt[1]), 'tijdlijn-widget: de verlopen mijlpaal zegt "te laat", de volgende niet (' + wt.join(' | ') + ')');
  const wr = await wg('risico'); const aria = await p.evaluate(() => (document.querySelector('[data-id="xrisico"] [role="img"]') || {}).ariaLabel || '');
  ok(/^1 hoog of kritiek/.test(wr.replace(/^.*?(\d+ hoog)/, '$1')) && /3 risico's ingeschat, 1 hoog of kritiek/.test(aria), 'risico onder controle telt niet mee als hoog of kritiek (' + wr + ' | ' + aria + ')');
  ok(/Server valt uit onder controle/.test(wr), 'en staat in de lijst met "onder controle"');
  ok(await p.isHidden('#bord-ander'), 'zelfde project: geen melding over een ander project');
  // 2e. Wissel van project in de app: het bord zegt van welk project de cijfers zijn
  await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Zwembad', since:2 })));
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(500);
  const an = await p.evaluate(() => { const e = document.getElementById('bord-ander'); return e && !e.hidden ? e.textContent : ''; });
  ok(/Dit bord toont Premieloket\. Je werkt nu aan Zwembad\./.test(an), 'na een wissel zegt het bord van welk project de cijfers zijn (' + an + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
