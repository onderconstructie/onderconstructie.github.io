// Stroom: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/stroom/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.evaluate(() => example()); await p.waitForTimeout(300);
  // 1. Stap 2 (Aanvraag registreren) wissen met de knop. "Ontbrekende stukken opvragen" wees ernaar (denken, stroom)
  const voor = await p.evaluate(() => { const f = cur(); return { stuk:f.nodes.find(n => /Ontbrekende/.test(n.text)).to === f.nodes[1].id, id:f.nodes[1].id }; });
  ok(voor.stuk, 'in het voorbeeld wijst "Ontbrekende stukken opvragen" naar stap 2');
  const geklikt = await p.evaluate(id => { const k = document.querySelector(`[data-act="del"][data-id="${id}"]`); if (k) { k.click(); return true; } const f = cur(); removeNode(f, f.nodes[1]); save(); render(); return false; }, voor.id);
  await p.waitForTimeout(300);
  const na = await p.evaluate(() => { const f = cur(), s = f.nodes.find(n => /Ontbrekende/.test(n.text)), st = f.nodes[0];
    return { aantal:f.nodes.length, to:s.to, doel:(target(f, s, 'to') || {}).text || '', startNaar:(target(f, st, 'to') || {}).text || '', tips:hints(f).list.map(x => x.text), sluitend:/sluitend/.test(hintsHTML(f)) }; });
  console.log('   (gewist via ' + (geklikt ? 'de knop' : 'removeNode') + ')');
  ok(na.aantal === 8, 'de stap is weg (' + na.aantal + ' stappen)');
  ok(na.to === 'none' && !na.doel, 'de pijl naar de gewiste stap wijst nu nergens heen, niet stil naar de volgende stap (' + na.to + ' -> ' + (na.doel || 'nergens') + ')');
  ok(na.tips.some(t => /Ontbrekende stukken opvragen\) loopt dood/.test(t)), 'de procescheck meldt dat die stap doodloopt (' + na.tips.join(' | ') + ')');
  ok(!na.sluitend, 'de procescheck zegt niet meer dat de stroom sluitend is');
  ok(na.startNaar === 'Dossier volledig?', 'een gewone pijl naar "de volgende" gaat nog altijd naar de volgende stap (' + na.startNaar + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
