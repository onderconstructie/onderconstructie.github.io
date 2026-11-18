# Functionele tests

De gewone sitetest (`scripts/test-tools.py`) kijkt naar fouten, breedte, contrast en tekstgrootte.
Deze scripts kijken naar wat de app doet: blijft je werk staan, volgt een tool het juiste project, komt een bestand terug.

Ze draaien met Node en Playwright tegen een lokale kopie van de hele site (app en alle tools onder één adres):

    BASE=http://127.0.0.1:8000 node scripts/functioneel/proces.js
    BASE=http://127.0.0.1:8000 node scripts/functioneel/projectkeuze.js swot opdracht retro vinkje kanban

| Script | Wat het nagaat |
|---|---|
| `proces.js` | Stroom, Schildpaddiagram en Visgraat volgen het actieve project (het proces van het stappenplan). |
| `projectkeuze.js <tools>` | Een voorbeeld dat je van jou maakt en een bestand dat je opent, blijven open staan; een ander project in de app trekt de tool mee. |
| `bestand-en-veiligheid.js` | Per tool: het voorbeeld blijft na herladen, bestand bewaren en openen, en bewaarde tekst met code erin wordt nooit uitgevoerd. |
| `robuust.js` | Kapotte bewaarde gegevens en een volle opslag geven nooit een fout of een lege pagina; zoeken en toetsenbord in de app. |
| `offline.js` | Na één bezoek opent elke tool zonder netwerk. |
| `ideeenkaart.js` | Ideeënkaart: de plusjes aan een gekozen idee, en een idee verslepen (muis en aanraken), met Ongedaan en Esc. |
| `kantelpunt.js` | De tool Kantelpunt: leeg begin, voorbeeld (niet bewaard), zelf invullen, grenzen, uitkomst in woorden zonder procenten, één verloop (ook met minder beweging), wissen en ongedaan, overnemen, downloads, schermbreedtes en de plaats in de app. |
| `kantelpunt-model.js` | Het denkmodel achter Kantelpunt, zonder browser (`node scripts/functioneel/kantelpunt-model.js`): vaste uitkomst bij dezelfde invoer, grenzen, 400 willekeurige verlopen, de kantelzone, het effect van naar wie mensen kijken en van waar de voortrekkers zitten. |
| `blok-verandering.js` | Het tabblad Verandering met zijn drie kopjes, Reset als Even pauze in het Zakmes, elke tool onder minstens één tabblad, en de oude ingangen (Kom even tot rust, `?start=reset`, `?groep=reset`, zoeken, welkomstgids). |
| `brug-en-loopt-mee.js` | De vraag na de Projectopdracht (ja, nee, later, terugdraaien, per project), de extra stappen in de korte en de uitgebreide route, en de strook Loopt mee. |
| `kompas.js` | Kompas: nagebootste metingen van de sensor (Android en iPhone), de korte weg over het noorden, de melding zonder sensor, geen verkeer naar buiten. |

Elk script eindigt met een telling. `proces.js`, `projectkeuze.js`, `ideeenkaart.js`, `brug-en-loopt-mee.js`, `blok-verandering.js`, `kantelpunt.js` en `kantelpunt-model.js` moeten op `fouten: 0` uitkomen.
Ze draaien nog niet mee in de automatische test: daarvoor moeten alle tools onder één lokaal adres staan.

## De hele reeks draaien (november 2026)

- De tests laden alle tools uit `tools.json`. Staan de aparte repo's (zakmes, kanban, risico, stakeholders, project-radar, project-realisme, mixer, fortuna, check-in, qr, focus, paradox, hier, adem, hart) niet naast deze repo op de testserver, dan falen `bestandsnaam-logica`, `sterretje-los-logica` en de tests hieronder zonder dat er iets stuk is.
- Vijf tests lopen alle tools af en duren 5 tot 13 minuten elk: `robuust`, `bestand-en-veiligheid`, `delen-kladblok-logica`, `voorbeeld-eigen-logica`, `voorbeeld-herladen-logica`. Geef ze geen korte tijdslimiet; `robuust` schrijft pas op het einde iets uit.
- De testbrowser weigert de bewegingssensor zonder te vragen; `kompas` zet daarom zelf de toestemming op toegestaan.
