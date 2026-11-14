const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8992);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch();
  const nieuw = async (vp, seed) => { const c = await b.newContext({ viewport: vp, serviceWorkers: 'block', locale: 'nl-BE' }); const p = await c.newPage(); p.E = []; p.on('pageerror', e => p.E.push(String(e).slice(0, 160)));
    if (seed) await p.addInitScript(s => { if (!localStorage.getItem('opdracht.v1')) localStorage.setItem('opdracht.v1', s); }, JSON.stringify(seed)); await p.goto(B + '/opdracht/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500); return p; };
  const basis = { id: 'a1', name: 'Oud project', waarom: '', opleveren: '', doelen: [''], binnen: [''], buiten: [''], opdrachtgever: '', projectleider: '', kernteam: '', akkoord: [''], einddatum: '', budget: '', mensen: '', knelt: '', mijlpalen: [{ id: 'm1', text: '', date: '' }], risicos: [''], freq: '', aanWie: '', escaleren: '', teken: { naam: '', datum: '', kopie: null } };
  // a. los, leeg, gsm: startkaart, dan de kern met hoge vakken
  let p = await nieuw({ width: 390, height: 844 }); ok(await p.isVisible('#vb-start'), 'los en leeg: startkaart'); await p.screenshot({ path: 'shots/a-start.png' });
  const voor = await p.evaluate(() => localStorage.getItem('opdracht.v1'));
  await p.click('#begin-btn'); await p.waitForTimeout(600);
  // de naamvraag kan verschijnen: sluit ze
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(await p.isVisible('#kern') && !(await p.isVisible('#s-scope')), 'na Begin: de kern');
  const h = await p.evaluate(() => [...document.querySelectorAll('#form textarea')].map(e => { const k = e.clientHeight; e.value = e.placeholder; const s = e.scrollHeight; e.value = ''; return [k, s]; }));
  ok(h.every(([k, s]) => s <= k + 1), 'los: de voorbeeldtekst past in elk vak ' + JSON.stringify(h));
  ok(await p.evaluate(v => localStorage.getItem('opdracht.v1') === v, voor), 'openen en Begin schrijven niets weg');
  await p.fill('#f-waarom', 'Test'); await p.waitForTimeout(400); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  ok(await p.isVisible('#kern'), 'na herladen: nog altijd de kern'); ok(!p.E.length, 'geen fouten a ' + p.E);
  // b. bestaande opdracht met inhoud, zonder de nieuwe keuze: alle vakken
  p = await nieuw({ width: 390, height: 844 }, { opdrachten: [Object.assign({}, basis, { waarom: 'Bestond al', risicos: ['Iets'] })], current: 'a1' });
  ok(await p.isVisible('#s-risicos') && !(await p.isVisible('#kern')), 'bestaande opdracht met inhoud: alle vakken'); ok(await p.isVisible('.zicht'), 'met de schakelaar erbij');
  await p.click('.zicht [data-zicht="kern"]'); await p.waitForTimeout(300); ok(/1 risico genoteerd/.test(await p.textContent('[data-groei]')), 'naar de kern: het risico staat in het lijstje, niets weg');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('opdracht.v1')).opdrachten[0].risicos[0] === 'Iets'), 'gegevens blijven'); ok(!p.E.length, 'geen fouten b ' + p.E);
  // c. bestaande lege opdracht: de kern
  p = await nieuw({ width: 390, height: 844 }, { opdrachten: [basis], current: 'a1' }); await p.click('#begin-btn'); await p.waitForTimeout(500); await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok(await p.isVisible('#kern'), 'bestaande lege opdracht: de kern');
  // d. voorbeeld: alles, zonder schakelaar
  await p.goto(B + '/opdracht/', { waitUntil: 'networkidle' }); 
  p = await nieuw({ width: 390, height: 844 }); await p.click('#example'); await p.waitForTimeout(600); ok(await p.isVisible('#s-risicos') && !(await p.isVisible('.zicht')), 'voorbeeld: alle vakken, geen schakelaar'); ok(!p.E.length, 'geen fouten d ' + p.E);
  // e. breed scherm
  p = await nieuw({ width: 1280, height: 900 }); await p.click('#begin-btn'); await p.waitForTimeout(500); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.screenshot({ path: 'shots/e-breed-kern.png' });
  await p.click('.zicht [data-zicht="alles"]'); await p.waitForTimeout(400); await p.screenshot({ path: 'shots/e-breed-alles.png' }); ok(await p.isVisible('#controle'), 'breed: controle rechts bij alle vakken');
  // f. toetsenbord: de schakelaar houdt de focus
  await p.focus('.zicht [data-zicht="kern"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok(await p.evaluate(() => document.activeElement.dataset.zicht === 'kern'), 'toetsenbord: focus blijft op de schakelaar');
  console.log(fout.length ? `\n${fout.length} FOUT` : '\nalles ok'); await b.close(); process.exit(fout.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
