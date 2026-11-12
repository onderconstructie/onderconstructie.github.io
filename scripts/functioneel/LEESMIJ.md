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
| `kompas.js` | Kompas: nagebootste metingen van de sensor (Android en iPhone), de korte weg over het noorden, de melding zonder sensor, geen verkeer naar buiten. |

Elk script eindigt met een telling. `proces.js`, `projectkeuze.js` en `ideeenkaart.js` moeten op `fouten: 0` uitkomen.
Ze draaien nog niet mee in de automatische test: daarvoor moeten alle tools onder één lokaal adres staan.
