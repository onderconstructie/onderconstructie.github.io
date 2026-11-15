// Veranderprofiel: vaste testen voor inhoudelijke fouten die testers vonden (gegevens van een ander project, grens bij ervaring 0,00, sponsor te vroeg).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const JAAR = String(new Date().getFullYear() - 1);
(async () => { const b = await chromium.launch(); const PE = [];
  // Elk geval in een eigen, lege browsercontext: geen gegevens van een vorig geval, niets wissen.
  const nieuw = async () => { const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); await c.addInitScript(() => { try { localStorage.setItem('oc.welkom', '1'); } catch (e) {} }); return c; };
  const open = async (c, u) => { const p = await c.newPage(); p.on('pageerror', e => PE.push(u + ': ' + String(e))); await p.goto(B + u, { waitUntil:'networkidle' }); await p.waitForTimeout(400); return p; };
  const klimaat = (c, naam, ervaring) => open(c, '/klimaat/').then(p => p.evaluate(({ naam, ervaring, JAAR }) => { const a = cur(); a.name = naam; const u = a.units[0]; u.name = 'Team'; u.workload = 2;
    u.projects = [Object.assign(newProject('Vorige verandering'), ervaring === 'nul' ? { year:JAAR, month:'3', goal:'ja', support:'slecht', time:'', budget:'' } : { year:JAAR, goal:'nee', support:'slecht', time:'nee', budget:'nee', weight:4 })];
    save(); render(); ocPublish(); return CLIM[result(u).cid].name; }, { naam, ervaring, JAAR }));
  const impact = (c, naam) => open(c, '/impact/').then(p => p.evaluate(naam => { const a = cur(); a.name = naam; const pr = a.profiles[0]; pr.name = 'Loket'; DIMS.forEach(d => { pr.dims[d.id].score = 4; }); save(); ocPublish(); }, naam));
  const profiel = (c, project) => open(c, '/veranderprofiel/').then(p => p.evaluate(n => { state.project = n; save(); render(); const r = compute();
    return { niveaus:Object.fromEntries(Object.entries(r.ax).map(([k, v]) => [k, v.level])), stappen:r.effort ? r.effort.steps.map(s => s.text) : [], advies:advice(r).map(a => a.text).join(' | ') }; }, project));
  // 1. Klimaat en impact van een ander project tellen niet mee
  let c = await nieuw(); await klimaat(c, 'Verhuis naar het Huis van de Stad', 'slecht'); await impact(c, 'Verhuis naar het Huis van de Stad');
  let r = await profiel(c, 'Digitaal loket parkeervergunningen');
  ok(r.niveaus.klimaat == null, 'klimaat van een ander project telt niet mee (' + r.niveaus.klimaat + ')');
  ok(r.niveaus.impact == null, 'impact van een ander project telt niet mee (' + r.niveaus.impact + ')');
  // controle: met dezelfde projectnaam tellen ze wel
  r = await profiel(c, 'Verhuis naar het Huis van de Stad');
  ok(r.niveaus.klimaat === 3 && r.niveaus.impact === 4, 'klimaat en impact van hetzelfde project tellen mee (' + r.niveaus.klimaat + ', ' + r.niveaus.impact + ')');
  await c.close();
  // 2. Ervaring precies 0,00: het Veranderklimaat zegt Vruchtbare grond, dus het profiel zegt niet "weinig vertrouwen"
  c = await nieuw(); const P = 'Herinrichting dienst Burgerzaken'; const kl = await klimaat(c, P, 'nul'); await impact(c, P); r = await profiel(c, P);
  ok(kl === 'Vruchtbare grond', 'klimaat bij ervaring 0,00: ' + kl);
  ok(r.niveaus.klimaat != null && r.niveaus.klimaat < 3 && r.stappen.length && !r.stappen.some(t => /vertrouwen/.test(t)) && !/liepen niet goed/.test(r.advies), 'profiel bij ervaring 0,00 zegt hetzelfde als het klimaat (niveau ' + r.niveaus.klimaat + '; ' + r.stappen.join(' / ') + ')');
  await c.close();
  // 3. Sponsorschap met één antwoord: "Nog te vroeg", dus geen "Sponsorschap zwak" in het profiel
  c = await nieuw(); const Q = 'Digitaal loket parkeervergunningen';
  const sp = await open(c, '/sponsor/'); await sp.evaluate(Q => { state.project = Q; state.name = 'Schepen'; state.a.lead = { r1:1 }; save(); render(); publish(); }, Q);
  r = await profiel(c, Q);
  ok(r.niveaus.sponsor == null && !r.stappen.some(t => /Sponsorschap/.test(t)), 'sponsor onder het minimum: geen niveau, geen +1 Sponsorschap zwak (' + r.niveaus.sponsor + '; ' + r.stappen.join(' / ') + ')');
  await c.close();
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
