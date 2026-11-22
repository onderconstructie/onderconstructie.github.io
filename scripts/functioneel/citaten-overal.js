// Onder elke tool staat een Stoïcijnse uitspraak met alleen de naam van de auteur en het icoontje van Citaten.
// Een tik opent Citaten, en de bibliotheek toont precies die uitspraak. De lijst hieronder is de afgesproken koppeling tool, zin, auteur.
const { chromium } = require('playwright');
const LIJST = [
 [
  "opdracht",
  "Wie niet weet naar welke haven hij vaart, heeft nooit de goede wind.",
  "Seneca"
 ],
 [
  "tijdlijn",
  "We hebben niet te weinig tijd, we hebben er veel van verspild.",
  "Seneca"
 ],
 [
  "kanban",
  "Wie overal is, is nergens.",
  "Seneca"
 ],
 [
  "sprint",
  "Bouw je leven op, daad per daad.",
  "Marcus Aurelius"
 ],
 [
  "vinkje",
  "Het goede bereik je met kleine stappen, maar klein is het niet.",
  "Zeno"
 ],
 [
  "prioriteit",
  "Het meeste van wat we zeggen en doen, is niet nodig.",
  "Marcus Aurelius"
 ],
 [
  "risico",
  "Er is meer dat ons angst aanjaagt dan wat ons echt drukt, Lucilius. We lijden vaker onder wat we denken dan onder wat er is.",
  "Seneca"
 ],
 [
  "project-realisme",
  "Een klap die je zag aankomen, komt zachter aan.",
  "Seneca"
 ],
 [
  "project-radar",
  "Sommige dingen hangen van ons af, andere niet.",
  "Epictetus"
 ],
 [
  "beslissingen",
  "Zeg eerst tegen jezelf wie je wil zijn. Doe daarna wat je doet.",
  "Epictetus"
 ],
 [
  "beslisscore",
  "Mensen raken niet van streek door de dingen, maar door wat ze over de dingen denken.",
  "Epictetus"
 ],
 [
  "swot",
  "Eerst moeten we onszelf bekijken.",
  "Seneca"
 ],
 [
  "mindmap",
  "Zoals je vaak denkt, zo wordt je geest. Want je ziel kleurt naar je gedachten.",
  "Marcus Aurelius"
 ],
 [
  "systeemkaart",
  "Denk vaak na over hoe alles met alles samenhangt.",
  "Marcus Aurelius"
 ],
 [
  "leerpunten",
  "Je moet blijven leren zolang je iets niet weet. Geloven we het spreekwoord, dan is dat zolang je leeft.",
  "Seneca"
 ],
 [
  "kennisbank",
  "Wie anderen iets leert, leert zelf.",
  "Seneca"
 ],
 [
  "retro",
  "Kan iemand me tonen dat ik verkeerd denk of handel, dan verander ik graag. Want ik zoek de waarheid, en daar werd nog nooit iemand door geschaad.",
  "Marcus Aurelius"
 ],
 [
  "stakeholders",
  "Mensen bestaan voor elkaar. Leer ze dus iets, of verdraag ze.",
  "Marcus Aurelius"
 ],
 [
  "impact",
  "De wereld is verandering, het leven is hoe je het opvat.",
  "Marcus Aurelius"
 ],
 [
  "klimaat",
  "Wat niet goed is voor de zwerm, is niet goed voor de bij.",
  "Marcus Aurelius"
 ],
 [
  "kantelpunt",
  "Het is niet omdat iets moeilijk is dat we het niet durven. Het is moeilijk omdat we het niet durven.",
  "Seneca"
 ],
 [
  "sponsor",
  "Filosofie leert je doen, niet praten.",
  "Seneca"
 ],
 [
  "communicatie",
  "Taal die de waarheid dient, is eenvoudig en onopgesmukt.",
  "Seneca"
 ],
 [
  "gedrag",
  "Wil je iets doen, maak er een gewoonte van. Wil je iets niet doen: doe het niet, en wen je aan iets anders.",
  "Epictetus"
 ],
 [
  "verhaal",
  "Via regels is de weg lang, via voorbeelden kort en doeltreffend.",
  "Seneca"
 ],
 [
  "oefen",
  "Elke gewoonte en elk vermogen blijft bestaan en groeit door de daden die erbij horen.",
  "Epictetus"
 ],
 [
  "rondje",
  "We hebben twee oren en één mond, om meer te luisteren dan te spreken.",
  "Zeno"
 ],
 [
  "agenda",
  "Zwijg meestal, of zeg wat nodig is, in weinig woorden.",
  "Epictetus"
 ],
 [
  "vergaderkost",
  "Alles, Lucilius, is van een ander. Alleen de tijd is van ons.",
  "Seneca"
 ],
 [
  "kaartjes",
  "Je kan niet beginnen te leren wat je denkt al te weten.",
  "Epictetus"
 ],
 [
  "mixer",
  "We zijn leden van één groot lichaam.",
  "Seneca"
 ],
 [
  "check-out",
  "Welke fout heb je vandaag verholpen?",
  "Sextius"
 ],
 [
  "zakmes/citaten",
  "Dit zei Zeno. En jij?",
  "Seneca"
 ],
 [
  "adem",
  "Nergens trekt een mens zich rustiger en ongestoorder terug dan in zijn eigen ziel.",
  "Marcus Aurelius"
 ],
 [
  "hart",
  "Vriendelijkheid is onoverwinnelijk, als ze echt is.",
  "Marcus Aurelius"
 ],
 [
  "pluim",
  "Een weldaad zit niet in wat je geeft, maar in de gezindheid waarmee je geeft.",
  "Seneca"
 ],
 [
  "raci",
  "Wat je te doen hebt, hangt af van je verhouding tot de anderen.",
  "Epictetus"
 ],
 [
  "weerstand",
  "Wat de daad hindert, helpt haar vooruit. Wat in de weg staat, helpt je op weg.",
  "Marcus Aurelius"
 ],
 [
  "focus",
  "Niets is zo nuttig dat het in het voorbijgaan al helpt.",
  "Seneca"
 ],
 [
  "stroom",
  "Wat volgt, sluit altijd aan op wat voorafging.",
  "Marcus Aurelius"
 ],
 [
  "cockpit",
  "Kijk van bovenaf.",
  "Marcus Aurelius"
 ],
 [
  "dossier",
  "Zeg wat je denkt, en denk wat je zegt.",
  "Seneca"
 ],
 [
  "projectbudget",
  "Arm is niet wie weinig heeft, maar wie meer wil.",
  "Seneca"
 ],
 [
  "gap",
  "Dat je je eigen gebreken ziet, bewijst al dat je erop vooruitgaat.",
  "Seneca"
 ],
 [
  "pestle",
  "Denk aan alles wat kan gebeuren, en wapen je ertegen.",
  "Seneca"
 ],
 [
  "meetplan",
  "Schapen tonen de herder niet hoeveel ze aten. Ze geven wol en melk.",
  "Epictetus"
 ],
 [
  "informatie",
  "Het volstaat zoveel te hebben als je kunt lezen.",
  "Seneca"
 ],
 [
  "schildpad",
  "Niets groots ontstaat in één keer, zei hij. Zelfs een druiventros of een vijg niet.",
  "Epictetus"
 ],
 [
  "visgraat",
  "Wat is dit, op zichzelf? Waaruit bestaat het, en wat doet het in de wereld?",
  "Marcus Aurelius"
 ],
 [
  "veranderprofiel",
  "Bang voor verandering? Wat gebeurt er dan zonder verandering?",
  "Marcus Aurelius"
 ],
 [
  "paradox",
  "Wat je vooral moet mijden? De massa.",
  "Seneca"
 ],
 [
  "check-in",
  "Geen enkel goed is fijn om te bezitten zonder iemand om het mee te delen.",
  "Seneca"
 ],
 [
  "notities",
  "Wat je al lezend verzamelde, maakt je pen tot één geheel.",
  "Seneca"
 ],
 [
  "ijsbreker",
  "Wil je jezelf opvrolijken? Denk aan het goede in wie met je samenleeft.",
  "Marcus Aurelius"
 ],
 [
  "fortuna",
  "Goed gedaan, Fortuna, dat je me naar de filosofie drijft.",
  "Zeno"
 ],
 [
  "bingo",
  "Onze woorden moeten niet behagen, maar helpen.",
  "Seneca"
 ],
 [
  "goesting",
  "Vooruit willen is al een groot deel van vooruitgaan.",
  "Seneca"
 ],
 [
  "energie",
  "Gun je geest ontspanning: uitgerust staat hij scherper op.",
  "Seneca"
 ],
 [
  "hier",
  "Ieder leeft alleen dit ogenblik.",
  "Marcus Aurelius"
 ],
 [
  "zakmes/kompas",
  "Neem altijd de korte weg: dat is de natuurlijke.",
  "Marcus Aurelius"
 ],
 [
  "zakmes/kladblok",
  "Dit zouden filosofen elke dag moeten opschrijven, en zich erin oefenen.",
  "Epictetus"
 ],
 [
  "zakmes/memomiles",
  "Je moet je geest veranderen, niet de hemel boven je.",
  "Seneca"
 ],
 [
  "zakmes/schets",
  "Niemand schildert een gelijkenis als hij niet weet wat hij wil schilderen.",
  "Seneca"
 ],
 [
  "zakmes/werkdagen",
  "Wie ken jij die de waarde van een dag kent?",
  "Seneca"
 ],
 [
  "zakmes/woordwolk",
  "Het gaat er niet om hoeveel je er hebt, maar hoe goed ze zijn.",
  "Seneca"
 ],
 [
  "qr",
  "Zeg tegen elke harde indruk: je bent een indruk, en helemaal niet wat je lijkt.",
  "Epictetus"
 ],
 [
  "zakmes/pdf",
  "Laat het oordeel los, en het gevoel 'ik ben gekwetst' verdwijnt. Laat dat gevoel los, en de kwetsuur is weg.",
  "Marcus Aurelius"
 ],
 [
  "zakmes/klankkast",
  "Lach niet te veel, niet om alles, en niet uitbundig.",
  "Epictetus"
 ],
 [
  "zakmes/looplicht",
  "Wat het licht niet doorlaat, berooft zichzelf van de glans.",
  "Marcus Aurelius"
 ],
 [
  "eerst-alleen",
  "Niets is belangrijker dan dat we niet als schapen de kudde voor ons volgen: gaan waar men gaat, niet waar we heen moeten.",
  "Seneca"
 ]
];
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0, goed = 0;
  const mis = m => { console.log('FOUT ' + m); fout++; };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true }), p = await c.newPage();
  // Deze test speelt iemand die Citaten al kent: die komt recht in de bibliotheek. De eerste keer staat in citaten-eerste-keer.js.
  await p.addInitScript(() => { try { localStorage.setItem('citaten.gezien', '1'); } catch {} });
  let nu = ''; p.on('pageerror', e => mis(nu + ': paginafout ' + e.message));
  for (const [map, zin, wie] of LIJST) {
    nu = map;
    await p.goto(BASE + '/' + map + '/', { waitUntil:'domcontentloaded' }); await p.waitForTimeout(350);
    // Schetsboek is één tekenvel: daar staat de voet in het blad 'Hoe werkt dit', dus dat gaat eerst open.
    if (map === 'zakmes/schets') { await p.goto(BASE + '/' + map + '/#hoe-werkt-dit', { waitUntil:'domcontentloaded' }); await p.waitForTimeout(500); }
    const a = p.locator('footer a.oc-citaat');
    if (await a.count() !== 1) { mis(map + ': geen (of meer dan één) uitspraak onderaan'); continue; }
    const t = (await a.locator('.quote').textContent()).replace(/^“|”$/g, ''), w = await a.locator('.oc-citaat-wie').textContent();
    if (t !== zin) mis(map + ': andere zin dan afgesproken: ' + t);
    if (w !== wie) mis(map + ': andere auteur dan afgesproken: ' + w);
    if (await p.locator('footer .quote').count() !== 1) mis(map + ': meer dan één .quote in de voet (de export leest die)');
    const m = await p.evaluate(() => { const a = document.querySelector('footer a.oc-citaat'); a.scrollIntoView({ block:'end' }); const r = a.getBoundingClientRect(); return { h:r.height, l:r.left, r:r.right, breed:document.documentElement.scrollWidth <= innerWidth + 1, svg:!!a.querySelector('svg') }; });
    if (m.h < 44) mis(map + ': raakvlak lager dan 44 px (' + Math.round(m.h) + ')');
    if (m.l < 0 || m.r > 390 || !m.breed) mis(map + ': de voet loopt buiten het scherm');
    if (!m.svg) mis(map + ': het icoontje van Citaten ontbreekt');
    const href = await a.getAttribute('href');
    await p.goto(BASE + href, { waitUntil:'domcontentloaded' }); await p.waitForTimeout(250);
    try { await p.waitForFunction(z => { const d = document.getElementById('bib'); return d && d.open && d.innerText.includes(z); }, zin, { timeout:6000 }); goed++; }
    catch { mis(map + ': Citaten toont de uitspraak niet via ' + href); }
  }
  console.log(goed + ' van ' + LIJST.length + ' tools: de uitspraak staat onderaan en opent in Citaten');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
