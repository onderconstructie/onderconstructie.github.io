// Retro: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const PE = [];
  // ---- 1. Een al overgenomen risico staat uitgegrijsd in de kiezer (denken, retro) ----
  let c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); let p = await c.newPage(); p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/retro/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem('oc.share.risico', JSON.stringify({ id:'risico', tool:'Risicomatrix', updated:Date.now(), lists:[{ name:'Loket', items:[{ type:'risico', text:'Leverancier failliet' }, { type:'risico', text:'Server valt uit' }] }] })));
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const kies = async () => { await p.click('#oc-imp'); await p.waitForTimeout(250); return p.evaluate(() => [...document.querySelectorAll('.ocs-item')].map(x => ({ t:x.querySelector('span').childNodes[0].textContent, uit:x.querySelector('input').disabled }))); };
  let k = await kies(); ok(k.length === 2 && k.every(x => !x.uit), 'eerste keer: niets uitgegrijsd');
  await p.click('.ocs-item:has-text("Leverancier failliet") input'); await p.click('.ocs-ok'); await p.waitForTimeout(250);
  ok(await p.evaluate(() => cur().cards.some(c => c.text === 'Risico: Leverancier failliet')), 'het kaartje heet "Risico: Leverancier failliet"');
  k = await kies();
  ok(k.find(x => x.t === 'Leverancier failliet').uit, 'tweede keer: het overgenomen risico staat uitgegrijsd (' + JSON.stringify(k) + ')');
  ok(!k.find(x => x.t === 'Server valt uit').uit, 'een ander risico blijft te kiezen');
  await p.click('.ocs-cancel'); await p.waitForTimeout(200);
  // ---- 2. De export volgt de volgorde van het scherm ----
  await p.evaluate(() => { addCards(0, 'Goede sfeer'); addCards(0, 'Snelle feedback'); });
  for (let i = 0; i < 3; i++) await p.click('.note:has-text("Snelle feedback") [data-vote="1"]');
  const volg = () => p.evaluate(() => ({ scherm:[...document.querySelectorAll('.col[data-col="0"] .note-text')].map(x => x.textContent),
    md:markdown(cur()).split('\n## ')[1].split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).replace(/ \(\d+ stem(men)?\)$/, '')),
    beeld:(() => { const kol = exportView(cur()).node.children[0].children[0]; return [...kol.querySelectorAll('[data-oc-keep]')].map(x => x.firstElementChild ? x.firstElementChild.textContent.trim() : x.textContent.trim()); })() }));
  let v = await volg(); const sorteer = await p.evaluate(() => !!state.sortVotes);
  ok(v.md.join(' > ') === v.scherm.join(' > '), 'tekst in dezelfde volgorde als het scherm' + (sorteer ? ' (op stemmen)' : ' (niet op stemmen)') + ': ' + v.scherm.join(' > ') + ' | ' + v.md.join(' > '));
  ok(v.beeld.join(' > ') === v.scherm.join(' > '), 'PDF en afbeelding in dezelfde volgorde als het scherm: ' + v.beeld.join(' > '));
  await p.click('#sort-btn'); await p.waitForTimeout(200);
  v = await volg();
  ok(v.md.join(' > ') === v.scherm.join(' > ') && v.beeld.join(' > ') === v.scherm.join(' > '), 'na omschakelen van het sorteren volgt de export nog altijd het scherm: ' + v.scherm.join(' > ') + ' | ' + v.md.join(' > ') + ' | ' + v.beeld.join(' > '));
  await c.close();
  // ---- 3. Een nieuwe retro om 00:30 krijgt de lokale datum, niet die van gisteren (UTC) ----
  c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' }); p = await c.newPage(); p.on('pageerror', e => PE.push(String(e)));
  await p.clock.install({ time:new Date('2026-11-16T00:30:00+01:00') });
  await p.goto(B + '/retro/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const d = await p.evaluate(() => ({ date:cur().date, name:cur().name }));
  ok(d.date === '2026-11-16' && /16\/11\/2026/.test(d.name), 'om 00:30 op 16 november: datum 16 november (' + d.date + ', ' + d.name + ')');
  await c.close();
  // ---- Project als vast veld (hertest a: koppeling op naam liet een tweede, lege retro met de projectnaam open na een projectwissel) ----
  c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); p = await c.newPage(); p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/retro/', { waitUntil:'domcontentloaded' });
  await p.evaluate(() => { localStorage.setItem('oc.project', JSON.stringify({ name:'Premieloket', since:1 }));
    // oude gegevens zonder veld project: het project komt uit de naam
    localStorage.setItem('retro.v1', JSON.stringify({ retros:[{ id:'o', name:'Premieloket 3/11/2026', date:'2026-11-03', format:'hrp', cards:[{ id:'k', col:0, text:'Goede start', votes:0 }], actions:[], carried:[] }], current:'o' })); });
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  let r = await p.evaluate(() => ({ p:ocRetroProject(cur()), nieuw:newRetro().project }));
  ok(r.p === 'Premieloket' && r.nieuw === 'Premieloket', 'oude retro zonder veld: project uit de naam; een nieuwe retro krijgt het veld project (' + JSON.stringify(r) + ')');
  // een andere naam geven via de kiezer (Hernoem deze retro) verandert het project niet meer, ook niet wat klaarligt voor andere tools
  await p.click('.oc-pk-knop'); await p.waitForTimeout(150);
  await p.evaluate(() => { const m = [...document.querySelectorAll('.oc-pk-menu [role="menuitem"]')].find(e => /Hernoem/.test(e.textContent)); m.click(); }); await p.waitForTimeout(200);
  await p.fill('.oc-pk-veld', 'Sprintretro november'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  r = await p.evaluate(() => ({ naam:cur().name, p:ocRetroProject(cur()), gedeeld:JSON.parse(localStorage.getItem('oc.share.retro') || '{"lists":[]}').lists.map(l => l.name + '|' + l.project).join(' ; ') }));
  ok(/^Sprintretro november/.test(r.naam) && r.p === 'Premieloket' && /\|Premieloket$/.test(r.gedeeld), 'andere naam, zelfde project, ook in wat klaarligt (' + JSON.stringify(r) + ')');
  await c.close();
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
