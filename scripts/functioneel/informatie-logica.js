// Informatiemodel: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const WOORDEN = { Aanvrager:'Aanvragers', Aanvraag:'Aanvragen', Bedrijf:'Bedrijven', Huis:'Huizen', Woning:'Woningen', Dag:'Dagen', Weg:'Wegen', Brief:'Brieven',
  Dier:'Dieren', Persoon:'Personen', Adres:'Adressen', Gezin:'Gezinnen', Kind:'Kinderen', Lid:'Leden', Premie:'Premies', Bijlage:'Bijlagen', Pand:'Panden',
  Dossier:'Dossiers', Factuur:'Facturen', Beslissing:'Beslissingen', Werf:'Werven', Gezinslid:'Gezinsleden', Werkdag:'Werkdagen', Formulier:'Formulieren',
  Mogelijkheid:'Mogelijkheden', Medewerker:'Medewerkers', School:'Scholen', Vergunning:'Vergunningen', Organisatie:'Organisaties', Categorie:'Categorieën',
  Project:'Projecten', Les:'Lessen', Auto:"Auto's", Prijs:'Prijzen', Fietspad:'Fietspaden', Straat:'Straten', Bedrag:'Bedragen', Verslag:'Verslagen' };
(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e))); await p.goto(B + '/informatie/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  // Geen geraden meervoud meer (hertest d2: Leverancieren, Stoels, Deels, Websiten, Ticketten, Scoren; eerder Teamen).
  // Zonder eigen meervoud zegt de zin "meer dan één <naam>"; met een eigen meervoud "meerdere <meervoud>".
  const zin = await p.evaluate(W => W.map(w => sentence({ subjects:[{ id:'a', name:'Aanvraag' }, { id:'b', name:w, plural:'' }] }, { a:'a', b:'b', verb:'heeft', q:'meer' })), Object.keys(WOORDEN).concat(['Leverancier', 'Stoel', 'Deel', 'Website', 'Ticket', 'Score', 'Team']));
  const fout1 = zin.filter(z => !/^Eén Aanvraag heeft meer dan één \S+\.$/.test(z));
  ok(!fout1.length && zin.includes('Eén Aanvraag heeft meer dan één Leverancier.'), 'zin zonder meervoud: "meer dan één <naam>" (' + (fout1.slice(0, 3).join(' | ') || zin.length + ' zinnen') + ')');
  const eigen = await p.evaluate(() => sentence({ subjects:[{ id:'a', name:'Aanvraag' }, { id:'b', name:'Leverancier', plural:'Leveranciers' }] }, { a:'a', b:'b', verb:'heeft', q:'meer' }));
  ok(eigen === 'Eén Aanvraag heeft meerdere Leveranciers.', 'met een eigen meervoud: "meerdere Leveranciers" (' + eigen + ')');
  const een = await p.evaluate(() => sentence({ subjects:[{ id:'a', name:'Aanvraag' }, { id:'b', name:'Woning', plural:'' }] }, { a:'a', b:'b', verb:'gaat over', q:'een' }));
  ok(een === 'Eén Aanvraag gaat over één Woning.', 'één: blijft enkelvoud (' + een + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
