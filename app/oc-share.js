/* ---------- Overnemen tussen tools (één gedeeld bestand voor alle Onder Constructie-tools, v4) ----------
   Alle tools draaien op hetzelfde domein en delen dus localStorage. Elke tool legt wat hij te bieden
   heeft klaar onder 'oc.share.<tool-id>', in een vaste vorm, zodat andere tools het kunnen overnemen
   zonder elkaars binnenkant te kennen.

   Soorten (type):
     'betrokkene'  persoon, rol, stakeholder, doelgroep of team   { text, note? }
     'taak'        iets dat gedaan moet worden                     { text, note? }
     'actie'       taak met eigenaar en/of termijn                 { text, who?, when? }
     'risico'      risico met kans en impact                       { text, note? }
     'besluit'     beslissing (Beslissingslog)                     { text, note?, who?, when? }
     'doel'        wat er beter moet worden (Projectopdracht)      { text, note? }
     'mijlpaal'    mijlpaal met datum (Tijdlijn, Projectopdracht)  { text, when, note? }   note = gepland, gehaald of verschoven
     'agendapunt'  punt op een agenda (Agenda)                     { text, who?, when?, note? }   when = startuur (UU:MM), note = doel en materiaal
     'leerpunt'    les voor een volgend project (Leerpuntenlog)    { text, note? }
     'omgevingsfactor' wat er rond het project gebeurt (PESTLE-analyse) { text, note }   note = "Kans · Politiek · grote impact" (Kans, Bedreiging, Kans en bedreiging of Nog niet zeker)
                   Andere tools kiezen zelf welke soorten ze tonen (types in pick/count/sources) en slaan onbekende soorten dus over.
   'when' is bij voorkeur een datum als JJJJ-MM-DD; in "Overnemen uit…" staat die als 15 februari 2027.

   Gebruik:
     ocShare.publish('raci', 'RACI-matrix', [
       { name:'Heraanleg stadspark', items:[ { type:'betrokkene', text:'Projectleider' }, { type:'taak', text:'Budget goedkeuren' } ] }
     ]);                                   // aanroepen na elke bewaring
     ocShare.clear('raci');                // bij "Alles wissen"
     const gekozen = await ocShare.pick({ types:['betrokkene'], self:'weerstand', title:'Doelgroepen overnemen' });
     // geeft [] terug bij annuleren, anders de aangevinkte items (met .source, .bronId, .list en .project erbij; .ref als de bron die meegaf)
     // Afspraak: een tool geeft wat ze overnam (bronId) NIET opnieuw door, tenzij ze er een eigen oordeel aan toevoegde
     // (een score, een eigenaar, een datum). Zo blijft de bron de baas en komt wat daar verwijderd is niet terug.
     ocShare.pick({ ..., have:['Budget goedkeuren'] })  // optioneel: wat de tool al heeft, staat uitgegrijsd ("staat er al")
     ocShare.pick({ ..., vink:false })    // niets vooraf aanvinken;  notes:false  toont geen notities (voor wie alleen namen neemt)
     window.ocHave = types => [...]       // optioneel per tool: dan telt de knop "Overnemen uit andere tools" alleen wat nieuw is
   Dezelfde tekst van dezelfde soort uit meerdere tools tonen en tellen we één keer (tools geven overgenomen werk ook weer door).
   ?van=<tool> vinkt alleen die bron aan, en daarin de lijst van het actieve project als die er is (ook onder een vorige naam,
   of een lijst die met de projectnaam begint). &lijst=<naam> vinkt precies die lijst aan. Anders: de lijst die het laatst veranderde.
   Dezelfde tekst als taak en als actie is één item: de rijkste versie (met wie en wanneer) blijft.
   Zo ook dezelfde tekst als omgevingsfactor en als risico (de PESTLE legt een grote bedreiging als allebei klaar).

   Project (v3): elke klaargelegde lijst hoort bij een project: { name, project, items }.
   Een tool met meer projecten tegelijk geeft per lijst het project mee (project:'' = bij geen project).
   Zonder project houdt publish het project dat de lijst met dezelfde naam al had, dan een gekend project waarmee de lijstnaam
   begint of eindigt (zo deed de kiezer het vroeger), en anders het actieve project van de app (oc.project).
   De kiezer zet de lijsten van het actieve project bovenaan. Andere projecten staan ingeklapt en zijn nooit vooraf aangevinkt.
   Oude gegevens zonder project: de kiezer kijkt naar de lijstnaam, zoals vroeger.
   Herkomst (v3): een item mag een vaste id meekrijgen { ref } (bv. de id in de bron). Hernoem je het in de bron, dan blijft de ref:
   wie overneemt, werkt dan het item met die ref bij in plaats van het dubbel toe te voegen.
   ocShare.refs('stakeholders', 'Nieuwe bib') geeft { tool, refs } van wat die bron nu klaarlegt (null als ze niets klaarlegt),
   voor een zacht signaal "staat niet meer in Betrokkenenradar". Nooit zelf wissen.

   v4: dit bestand is de enige bron (vroeger stond een kopie in elke tool). Laad het in de <head>, voor de eigen scripts:
     <script src="/app/oc-share.js" data-tool="<tool-id>" data-opslag="<sleutel>,<sleutel>"></script>
   Klaar: geef een item klaar:true mee als het in de bron klaar is (afgevinkt, afgesloten). Het staat dan apart en loopt mee naar de kopieën.
   Meelopen: zie volg() onderaan. prio: 'hoog', 'middel' of 'laag' gaat mee als vaste waarde.
*/
window.ocShare = (() => {
  const PREFIX = 'oc.share.';
  const LABEL = { betrokkene:'betrokkenen', taak:'taken', actie:'acties', risico:"risico's", besluit:'besluiten', doel:'doelen', mijlpaal:'mijlpalen', agendapunt:'agendapunten', leerpunt:'leerpunten', omgevingsfactor:'omgevingsfactoren', onderdeel:'onderdelen' };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  // Een datum als JJJJ-MM-DD tonen we zoals in de tools: 15 februari 2027. Andere tekst blijft zoals ze is.
  const datum = v => { const s = String(v || '').trim(), d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : null;
    return d && !isNaN(d) ? d.toLocaleDateString('nl-BE', { day:'numeric', month:'long', year:'numeric' }) : s; };

  // Het actieve project van de app (oc.project) met zijn vorige namen, en de projecten die de app kent.
  function actief() {
    try { const p = JSON.parse(localStorage.getItem('oc.project') || 'null') || {};
      return { naam: typeof p.name === 'string' ? p.name.trim().slice(0, 80) : '', oud: Array.isArray(p.oud) ? p.oud.filter(x => typeof x === 'string' && x.trim()) : [] };
    } catch { return { naam:'', oud:[] }; }
  }
  function gekend() { try { const h = JSON.parse(localStorage.getItem('oc-app.projects') || '[]'); return Array.isArray(h) ? h.filter(x => typeof x === 'string' && x.trim()) : []; } catch { return []; } }
  // Een lijstnaam hoort bij project p als ze zo heet, of ermee begint of eindigt ("Sprint 1 · Nieuwe bib")
  const past = (lijst, p) => { const l = norm(lijst), q = norm(p); return !!q && (l === q || l.startsWith(q + ' ') || l.endsWith(' ' + q)); };

  function publish(id, tool, lists) {
    let oud = null; try { oud = JSON.parse(localStorage.getItem(PREFIX + id)); } catch {}
    let vorig = (oud && oud.lists) || [];
    if (!Array.isArray(vorig)) vorig = [];
    const A = actief(), namen = [A.naam].concat(gekend()).filter(Boolean);
    // Het project van een lijst (v3): wat de tool meegeeft; anders wat de lijst al had; anders een gekend project in de naam; anders het actieve project.
    // Zo blijft een lijst bij haar project, ook als je daarna in de app een ander project kiest.
    const projVan = l => {
      if (l.project != null) return String(l.project).trim().slice(0, 80);
      const n = String(l.name || '').slice(0, 80), v = vorig.find(x => x && x.name === n && typeof x.project === 'string');
      if (v) return v.project;
      const o = A.oud.find(p => past(n, p)); if (o && A.naam) return A.naam;   // een vorige naam van het actieve project
      return namen.filter(p => past(n, p)).sort((a, b) => b.length - a.length)[0] || A.naam;
    };
    const item = i => ({ type:i.type, text:String(i.text).trim().slice(0, 300),
      note: i.note ? String(i.note).slice(0, 200) : undefined, who: typeof i.who === 'string' && i.who.trim() ? i.who.trim().slice(0, 120) : undefined,
      when: typeof i.when === 'string' && i.when.trim() ? i.when.trim().slice(0, 40) : undefined,
      // vaste herkomst-id: blijft gelijk als je het item in de bron hernoemt
      ref: i.ref != null && String(i.ref).trim() ? String(i.ref).trim().slice(0, 80) : undefined,
      // v4: een vaste prioriteit (bv. uit Project Radar), zodat niemand ze uit een notitie moet afleiden
      prio: i.prio === 'hoog' || i.prio === 'middel' || i.prio === 'laag' ? i.prio : undefined });
    // v4: wat in de bron klaar is (afgevinkt, afgesloten, gehaald), staat apart onder 'klaar'. De kiezer, de Cockpit en het Projectdossier
    // zien het niet; de kopieën in andere tools lopen ermee mee (zie volg hieronder).
    const klaar = [];
    const clean = (lists || []).map(l => {
      const name = String((l && l.name) || '').slice(0, 80), project = projVan(l || {}), alle = ((l && l.items) || []).filter(i => i && i.type && String(i.text || '').trim());
      alle.filter(i => i.klaar).slice(0, 300).forEach(i => { const x = item(i); klaar.push({ l:name, p:project, y:x.type, t:x.text, r:x.ref }); });
      return { name, project, items: alle.filter(i => !i.klaar).slice(0, 300).map(item) };
    }).filter(l => l.items.length);
    if (!clean.length && !klaar.length) { try { localStorage.removeItem(PREFIX + id); } catch {} return; }
    // per lijst: wanneer veranderde ze laatst (zo weet de kiezer aan welke lijst je net werkte). Dezelfde naam in twee projecten is twee lijsten.
    const nu = Date.now(), hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0; return h; };
    clean.forEach(l => { const h = hash(JSON.stringify(l.items)), v = vorig.find(x => x && x.name === l.name && (typeof x.project !== 'string' || x.project === l.project)); l.h = h; l.ch = v && v.h === h && v.ch ? v.ch : nu; });
    const d = { id, tool, updated: nu, lists: clean };
    if (klaar.length) d.klaar = klaar.slice(0, 500);
    // v4: niets veranderd? Dan niet opnieuw wegschrijven. Zo blijft 'updated' het moment van de laatste wijziging,
    // en krijgen andere tabbladen (de Cockpit) geen nutteloos signaal.
    const zonder = o => JSON.stringify(Object.assign({}, o, { updated:0 }));
    if (oud && zonder(oud) === zonder(d)) return;
    schrijf(PREFIX + id, JSON.stringify(d));
  }
  // Wegschrijven. Is de opslag van het toestel vol, dan één rustige melding per bezoek (vroeger mislukte dit stil).
  let volGemeld = false;
  function schrijf(k, v) {
    try { localStorage.setItem(k, v); return true; }
    catch (e) {
      if (!volGemeld && e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) { volGemeld = true;
        melding('Je toestel heeft geen plaats meer om gegevens te bewaren. Andere tools zien je laatste wijzigingen niet. Download een reservekopie en wis wat je niet meer nodig hebt.', 12000); }
      return false;
    }
  }
  // Wat bron id nu klaarlegt (voor het project, als je dat meegeeft): { tool, refs }. null als die bron niets klaarlegt.
  function refs(id, project) {
    try {
      const d = JSON.parse(localStorage.getItem(PREFIX + id)); if (!d || !Array.isArray(d.lists)) return null;
      const r = new Set();
      d.lists.forEach(l => { if (!l || !Array.isArray(l.items)) return; if (project != null && typeof l.project === 'string' && norm(l.project) !== norm(project)) return;
        l.items.forEach(i => { if (i && i.ref != null) r.add(String(i.ref)); }); });
      return { tool: String(d.tool || id), refs: r };
    } catch { return null; }
  }
  function clear(id) { try { localStorage.removeItem(PREFIX + id); } catch {} }

  // Elke bron apart: één kapotte sleutel mag de andere niet verbergen.
  function sources(types, self, voorkeur) {
    const out = [];
    let keys = [];
    try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch { return out; }
    keys.forEach(k => {
      if (!k || !k.startsWith(PREFIX) || k === PREFIX + self) return;
      try {
        const d = JSON.parse(localStorage.getItem(k));
        if (!d || !Array.isArray(d.lists)) return;
        d.lists.forEach(l => {
          if (!l || !Array.isArray(l.items)) return;
          const items = l.items.filter(it => it && types.includes(it.type) && typeof it.text === 'string' && it.text.trim())
            .map(it => ({ ...it, who: typeof it.who === 'string' ? it.who : undefined, when: typeof it.when === 'string' ? it.when : undefined }));
          // project: undefined bij oude gegevens (dan kijkt de kiezer naar de lijstnaam)
          if (items.length) out.push({ tool: String(d.tool || d.id || k.slice(PREFIX.length)), id: d.id, updated: +d.updated || 0, ch: +l.ch || 0, list: String(l.name || ''),
            project: typeof l.project === 'string' ? l.project : undefined, items });
        });
      } catch {}
    });
    out.sort((a, b) => (b.updated || 0) - (a.updated || 0));
    // Elke tekst van elke soort één keer. Wie houdt hem? De bron uit ?van=, dan de rijkste (notitie, wie, wanneer),
    // dan de grootste lijst (meestal het origineel, niet een tool die het overnam), dan de recentste.
    // Mist de gekozen versie een wie of wanneer die een andere bron wel heeft, dan vullen we aan.
    const score = (s, it) => [s.id === voorkeur ? 1 : 0, (it.note ? 2 : 0) + (it.who ? 1 : 0) + (it.when ? 1 : 0), s.items.length, s.updated || 0];
    const beter = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
    // Per project: dezelfde tekst in twee projecten is twee items (anders verdwijnt hij uit het ene project)
    const best = new Map(), sl = (s, it) => (it.type === 'actie' ? 'taak' : it.type === 'omgevingsfactor' ? 'risico' : it.type) + '|' + norm(it.text) + '|' + (s.project == null ? '?' : norm(s.project));   // een taak en een actie (of een omgevingsfactor en een risico) met dezelfde tekst zijn één item
    out.forEach(s => s.items.forEach(it => { const k = sl(s, it), sc = score(s, it), e = best.get(k); if (!e || beter(sc, e.sc)) best.set(k, { it, sc }); }));
    out.forEach(s => s.items.forEach(it => { const e = best.get(sl(s, it)).it; if (e !== it) { if (!e.who && it.who) e.who = it.who; if (!e.when && it.when) e.when = it.when; } }));
    return out.map(s => ({ ...s, items: s.items.filter(it => best.get(sl(s, it)).it === it) }))
      .filter(s => s.items.length);
  }
  // Vergelijken zonder hoofdletters, dubbele spaties of leestekens aan de rand
  function norm(v) { return String(v || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[\s.,;:!?·-]+|[\s.,;:!?·-]+$/g, ''); }

  let styled = false;
  function style() {
    if (styled) return; styled = true;
    const s = document.createElement('style');
    s.textContent = `
      .ocs-back{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(15,23,42,.45);
        backdrop-filter:blur(3px);opacity:0;transition:opacity .15s;font-family:'DM Sans',system-ui,sans-serif}
      @media(min-width:640px){.ocs-back{align-items:center;padding:1rem}}
      .ocs-back.open{opacity:1}
      .ocs{width:100%;max-width:520px;max-height:min(86vh,720px);display:flex;flex-direction:column;background:#fff;border-radius:18px 18px 0 0;
        box-shadow:0 20px 50px rgba(15,23,42,.25);transform:translateY(12px);transition:transform .15s;color:#1e293b;-webkit-hyphens:manual;hyphens:manual}
      @media(min-width:640px){.ocs{border-radius:18px}}
      .ocs-back.open .ocs{transform:none}
      .ocs-head{padding:1.125rem 1.25rem .75rem;border-bottom:1px solid #e2e8f0}
      .ocs-title{font-size:1.125rem;font-weight:700;letter-spacing:-.02em}
      .ocs-sub{font-size:.8125rem;color:#64748b;margin-top:.125rem}
      .ocs-body{overflow:auto;padding:.5rem 1.25rem 1rem;flex:1}
      .ocs-src{margin-top:.875rem}
      .ocs-src-head{display:flex;flex-wrap:wrap;align-items:center;column-gap:.5rem;padding:.375rem 0}
      .ocs-src-head b{font-size:.9375rem}
      .ocs-src-head span{font-size:.8125rem;color:#64748b;flex:1 1 8rem}
      .ocs-all{margin-left:auto;font:inherit;font-size:.8125rem;color:#047857;background:none;border:0;cursor:pointer;padding:.25rem .5rem;min-height:44px;min-width:44px;border-radius:6px}
      .ocs-all:hover{background:#d1fae5}
      .ocs-item{display:flex;align-items:flex-start;gap:.625rem;padding:.625rem .25rem;min-height:44px;box-sizing:border-box;border-top:1px solid #f1f5f9;cursor:pointer;font-size:.9375rem;line-height:1.4;overflow-wrap:anywhere;min-width:0}
      .ocs-item.al{cursor:default;color:#64748b}.ocs-item.al em{font-style:normal;font-size:.8125rem;font-weight:600;color:#047857;margin-left:.375rem;white-space:nowrap}
      .ocs-src-head b,.ocs-src-head span{overflow-wrap:break-word;min-width:0}.ocs-src-head b{flex:0 1 auto;min-width:auto;max-width:100%}.ocs-note{margin:.25rem 0 .5rem;padding:.5rem .75rem;border-radius:10px;background:#f8fafc;color:#475569;font-size:.875rem;line-height:1.45}
      .ocs-item input{width:18px;height:18px;margin-top:.125rem;accent-color:#10b981;flex:none}
      .ocs-item small{display:block;font-size:.8125rem;color:#64748b}
      .ocs-empty{padding:1.5rem .25rem;color:#64748b;font-size:.9375rem;line-height:1.5}
      .ocs-foot{display:flex;align-items:center;gap:.5rem;justify-content:flex-end;padding:.875rem 1.25rem calc(.875rem + env(safe-area-inset-bottom,0px));border-top:1px solid #e2e8f0}
      .ocs-btn{font:inherit;font-size:.9375rem;font-weight:600;padding:.625rem 1rem;min-height:44px;border-radius:10px;border:0;cursor:pointer}
      .ocs-hint{margin-right:auto;font-size:.8125rem;line-height:1.3;color:#64748b}
      .ocs-cancel{background:#ecfdf5;color:#047857;box-shadow:inset 0 0 0 1px #a7f3d0}.ocs-cancel:hover{background:#d1fae5}
      .ocs-ok{background:#0c8660;color:#fff}.ocs-ok:hover{background:#047857}
      .ocs-ok:disabled{background:#cbd5e1;color:#334155;cursor:default}
      .ocs-back :focus-visible{outline:2px solid #047857;outline-offset:2px}
      .ocs-vz{margin-top:1rem;padding:.75rem;border-radius:12px;background:#ecfdf5;display:flex;flex-wrap:wrap;align-items:center;gap:.25rem .75rem;font-size:.9375rem;line-height:1.4}
      .ocs-vz label{display:flex;gap:.625rem;align-items:flex-start;flex:1 1 16rem;min-height:44px;cursor:pointer}
      .ocs-vz input{width:18px;height:18px;margin-top:.125rem;accent-color:#10b981;flex:none}
      .ocs-vz small{display:block;font-size:.8125rem;color:#475569}
      .ocs-vz p{margin:0;flex:1 1 12rem;color:#1e293b}
      .ocs-vz-knop{font:inherit;font-size:.8125rem;font-weight:600;color:#047857;background:none;border:0;cursor:pointer;min-height:44px;padding:.25rem .5rem;border-radius:8px}
      .ocs-vz-knop:hover{background:#d1fae5}`;
    document.head.appendChild(s);
  }

  function pick({ types, self, title, intro, have, vink, notes }) {
    style();
    // Vanzelf overnemen (zie vanzelf hieronder): de tool vroeg zelf om een overname, en de keuze ligt al klaar. Geen venster.
    if (wachtAuto && wachtAuto.tool === self && Date.now() < wachtAuto.tot) {
      const W = wachtAuto; wachtAuto = null;
      const h = new Set((have || []).map(norm)), items = W.items.filter(it => types.includes(it.type) && !h.has(norm(it.text))).map(({ _k, ...it }) => it);
      try { const R = register(self) || { e:[], z:{} }; R.a = [...new Set((R.a || []).concat(W.items.map(x => x._k)))].slice(-2000); bewaarRegister(self, R); onthoud(self, items); } catch {}
      if (items.length) setTimeout(() => meldVanzelf(self, items), 80);
      return Promise.resolve(items);
    }
    return new Promise(resolve => {
      let van = window.ocVan || ''; try { van = van || new URLSearchParams(location.search).get('van') || ''; } catch {}
      // Eerst je eigen project (v3: het veld project; oude gegevens zonder project: de lijstnaam, ook onder een vorige naam)
      const A = actief(), P = [A.naam].concat(A.oud).filter(Boolean);
      const eigen = s => !!P.length && (s.project != null ? P.some(p => norm(p) === norm(s.project)) : P.some(p => past(s.list, p)));
      const src0 = sources(types, self, van), src = src0.filter(eigen).concat(src0.filter(s => !eigen(s))), terug = document.activeElement;
      const heeft = new Set((have || []).map(norm));
      const vanNaam = van && !src.some(s => s.id === van) ? van : '';
      const vol = s => s.items.every(it => heeft.has(norm(it.text))), alles = src.length > 0 && src.every(vol);
      // Een lijst van een ander project draagt de naam van dat project, als die niet al in de lijstnaam staat
      const lijstVan = s => !eigen(s) && s.project && !past(s.list, s.project) ? s.list + ' · ' + s.project : s.list;
      const back = document.createElement('div');
      back.className = 'ocs-back';
      const what = types.map(t => LABEL[t] || t).join(' of ');
      back.innerHTML = `<div class="ocs" role="dialog" aria-modal="true" aria-label="${esc(title || 'Overnemen')}">
        <div class="ocs-head"><div class="ocs-title">${esc(title || 'Overnemen uit een andere tool')}</div>
          <div class="ocs-sub">${esc(intro || `Kies welke ${what} je wil overnemen.`)}</div></div>
        <div class="ocs-body">${vanNaam ? `<p class="ocs-note">Uit die tool ligt nog niets klaar. Hieronder staat wat andere tools aanbieden.</p>` : ''}${src.length && alles ? `<p class="ocs-empty">Alles staat er al. Er is niets nieuws om over te nemen.</p>` : ''}${src.length && !alles ? src.map((s, si) => vol(s) ? `
          <div class="ocs-src"><div class="ocs-src-head"><b>${esc(s.tool)}</b><span>${esc(lijstVan(s))} · alles staat er al</span></div></div>` : `
          <div class="ocs-src"><div class="ocs-src-head"><b>${esc(s.tool)}</b><span>${esc(lijstVan(s))} · ${s.items.length}</span>
            <button class="ocs-all" type="button" data-all="${si}">alles</button></div>
            ${s.items.map((it, ii) => { const al = heeft.has(norm(it.text)); return `<label class="ocs-item${al ? ' al' : ''}"><input type="checkbox" data-s="${si}" data-i="${ii}"${al ? ' disabled' : ''}>
              <span>${esc(it.text)}${al ? '<em>staat er al</em>' : ''}${it.who || it.when || (notes !== false && it.note) ? `<small>${esc([it.who, datum(it.when), notes !== false && it.note].filter(Boolean).join(' · '))}</small>` : ''}</span></label>`; }).join('')}
          </div>`).join('') : ''}${!src.length ? `<p class="ocs-empty">Er zijn nog geen ${esc(what)} om over te nemen. Vul ze eerst in een andere tool van Onder Constructie in, dan verschijnen ze hier.</p>` : ''}
        </div>
        <div class="ocs-foot"><span class="ocs-hint">Vink eerst iets aan</span><button class="ocs-btn ocs-cancel" type="button">Annuleer</button>
          <button class="ocs-btn ocs-ok" type="button" disabled>Neem over</button></div></div>`;
      document.body.appendChild(back);
      // Eerst je eigen project: lijsten van andere projecten klappen in onder één regel (een sprint "Sprint 1 · Project" telt mee).
      // Is er voor je project niets, dan zegt een regel dat; de andere projecten blijven ingeklapt.
      try {
        const els = [...back.querySelectorAll('.ocs-src')], ander = src.filter(s => !eigen(s));
        if (P.length && els.length === src.length && ander.length) {
          const d = document.createElement('details'); d.className = 'ocs-ander';
          d.innerHTML = `<summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600;color:#047857;padding:0.25rem 0.125rem">${ander.every(s => s.project) ? 'Andere projecten' : 'Andere projecten en lijsten'} (${ander.length})</summary>`;
          els.forEach((el, i) => { if (!eigen(src[i])) d.appendChild(el); });
          if (ander.length === src.length && !alles) { const n = document.createElement('p'); n.className = 'ocs-note'; n.textContent = `Voor ${A.naam} ligt hier nog niets klaar.`; back.querySelector('.ocs-body').appendChild(n); }
          back.querySelector('.ocs-body').appendChild(d);
        }
      } catch {}
      // De schakelaar voor vanzelf overnemen, in de tools die dat kunnen (zie vanzelf)
      if (AUTO && AUTO.tool === self) {
        const bron = [...new Set(AUTO.paden.map(p => bronNaam(p.v)))].join(', ').replace(/, ([^,]*)$/, ' en $1'), overalUit = (() => { try { return localStorage.getItem('oc.vanzelf') === '0'; } catch { return false; } })();
        const r = document.createElement('div'); r.className = 'ocs-vz';
        r.innerHTML = overalUit ? `<p>Vanzelf overnemen staat uit, in alle tools.</p><button type="button" class="ocs-vz-knop" data-vz="overal-aan">Zet weer aan</button>`
          : `<label><input type="checkbox" id="ocs-vz"${vanzelfAan(self) ? ' checked' : ''}><span>Neem vanzelf over uit ${esc(bron)}<small>Wat er nieuw bijkomt in je project, staat er dan meteen. Je kan het altijd ongedaan maken.</small></span></label>
            <button type="button" class="ocs-vz-knop" data-vz="overal-uit">In alle tools uitzetten</button>`;
        back.querySelector('.ocs-body').appendChild(r);
        r.addEventListener('change', e => { if (e.target.id === 'ocs-vz') zetVanzelf(self, e.target.checked); });
        r.addEventListener('click', e => { const k = e.target.closest('[data-vz]'); if (!k) return;
          zetVanzelf(null, k.dataset.vz === 'overal-aan'); r.innerHTML = k.dataset.vz === 'overal-aan' ? '<p>Vanzelf overnemen staat weer aan.</p>' : '<p>Vanzelf overnemen staat nu uit, in alle tools. Hier zet je het weer aan.</p>'; });
      }
      requestAnimationFrame(() => back.classList.add('open'));
      const ok = back.querySelector('.ocs-ok'), hint = back.querySelector('.ocs-hint');
      const boxes = () => [...back.querySelectorAll('input[type=checkbox][data-s]:not(:disabled)')];
      // Grijze knop: er staat bij wat je eerst doet. Is er niets om aan te vinken, dan zegt het venster dat al zelf.
      const sync = () => { const n = boxes().filter(b => b.checked).length; ok.disabled = !n; ok.textContent = n ? `Neem ${n} over` : 'Neem over'; hint.hidden = !!n || !boxes().length; };
      // Geopend vanuit een tool (?van=<tool>): alleen die bron aanvinken, en daarin de lijst van het actieve project als die er is.
      // Zonder ?van= en met één bron: die staat aangevinkt.
      let lijst = '';
      try { lijst = norm(window.ocLijst || new URLSearchParams(location.search).get('lijst') || ''); } catch {}
      // Met een actief project: alleen lijsten van dat project, nooit een ander project (die staan ingeklapt)
      const vanSrc = van ? src.filter(s => s.id === van && !vol(s) && (!P.length || eigen(s))) : [];
      const vanLijst = lijst ? vanSrc.filter(s => norm(s.list) === lijst) : [];
      // geen lijst van het project: dan alleen de lijst die het laatst veranderde (daar werkte je net aan), nooit alles
      const laatst = vanSrc.length > 1 ? vanSrc.filter(s => s.ch && s.ch === Math.max(...vanSrc.map(x => x.ch || 0))).slice(0, 1) : vanSrc;
      // Alleen vanuit een link (?van=) staat iets vooraf aangevinkt. Anders kies je zelf (of tik op "alles"):
      // één tik op het punt dat je wil, mag nooit de rest overnemen.
      const aan = vink === false || !van ? [] : (vanLijst.length ? vanLijst : P.length ? vanSrc : laatst);
      boxes().forEach(b => { if (aan.includes(src[+b.dataset.s])) b.checked = true; }); sync();
      back.addEventListener('change', sync);
      back.addEventListener('click', e => {
        const a = e.target.closest('[data-all]');
        if (a) { const bs = boxes().filter(b => b.dataset.s === a.dataset.all); const all = bs.every(b => b.checked); bs.forEach(b => b.checked = !all); sync(); }
        if (e.target === back) close([]);
      });
      function close(v) { document.removeEventListener('keydown', onKey, true); back.remove(); try { if (terug && terug.isConnected) terug.focus({ preventScroll:true }); } catch {} resolve(v); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close([]); return; }
        if (e.key !== 'Tab') return;   // de focus blijft in de kiezer
        const f = [...back.querySelectorAll('input:not(:disabled),button:not(:disabled)')].filter(x => x.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      }
      document.addEventListener('keydown', onKey, true);
      back.querySelector('.ocs-cancel').addEventListener('click', () => close([]));
      ok.addEventListener('click', () => { const gekozen = boxes().filter(b => b.checked).map(b => {
        const s = src[+b.dataset.s]; return { ...s.items[+b.dataset.i], source: s.tool, bronId: s.id, list: s.list, project: s.project };
      }); try { onthoud(self, gekozen); } catch {} close(gekozen); });
      const first = back.querySelector('input:not(:disabled),.ocs-cancel'); first && first.focus();
    });
  }

  // Hoeveel er klaarligt voor deze soorten (om een knop te tonen of een teller te zetten).
  const count = (types, self) => sources(types, self).reduce((n, s) => n + s.items.length, 0);

  /* ---------- Meelopen (v4) ----------
     Wat je overneemt, is een kopie. Die loopt mee met de bron, volgens drie vaste regels:
     1. Hernoemd in de bron: de kopie krijgt de nieuwe naam, zolang je de kopie zelf niet anders noemde.
     2. Afgevinkt (klaar, gehaald) in de bron: de kopie ook. Opnieuw open in de bron: de kopie ook, als jij ze niet zelf anders zette.
     3. Gewist in de bron: één rustige melding. De kopie blijft staan: jij beslist.
     Het register (oc.volg.<tool>) onthoudt per overgenomen item de bron, de lijst, de soort, de tekst en de plaats in de lijst.
     Bij het openen van een tool (voor ze haar gegevens leest) vergelijken we het register met wat de bron nu klaarlegt,
     en passen we de kopieën aan in de opslag van de tool. Een voorbeeld raken we nooit aan.
     Hernoemen herkennen we aan de vaste ref van de bron; zonder ref aan de plaats in de lijst, maar alleen als de lijst even lang
     bleef en de nieuwe tekst echt nieuw is. Bij twijfel doen we niets. */
  const VOLG = 'oc.volg.', DATUM = ['date', 'when', 'datum', 'due', 'deadline'], TEKST = ['text', 'name', 'title', 'titel', 'naam', 'tekst', 'label', 'wat', 'what', 't'], AF = ['done', 'af', 'klaar', 'afgevinkt'];
  const lees = k => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : null; } catch { return null; } };
  const lijstVan = (d, naam, project) => d && Array.isArray(d.lists) ? d.lists.find(l => l && l.name === naam && (project == null || typeof l.project !== 'string' || norm(l.project) === norm(project))) : null;
  const vanSoort = (l, y) => l && Array.isArray(l.items) ? l.items.filter(i => i && i.type === y && typeof i.text === 'string') : [];
  function register(tool) { const R = lees(VOLG + tool); return R && Array.isArray(R.e) ? Object.assign({ z:{} }, R) : null; }
  function bewaarRegister(tool, R) { R.e = R.e.slice(-1000); schrijf(VOLG + tool, JSON.stringify(R)); }
  // Bij "Neem over": onthoud elk item met zijn plaats in de bron, en hoe die lijst er nu uitziet.
  function onthoud(tool, gekozen) {
    if (!tool || !gekozen || !gekozen.length) return;
    const R = register(tool) || { e:[], z:{} };
    gekozen.forEach(g => {
      if (!g || !g.bronId || !g.type || typeof g.text !== 'string') return;
      const d = lees(PREFIX + g.bronId), l = lijstVan(d, g.list, g.project), L = vanSoort(l, g.type), i = L.findIndex(x => norm(x.text) === norm(g.text));
      R.e = R.e.filter(x => !(x.v === g.bronId && x.y === g.type && norm(x.t) === norm(g.text) && x.l === g.list));
      const w = L[i] && typeof L[i].when === 'string' && L[i].when ? L[i].when : undefined;
      R.e.push({ v:g.bronId, l:g.list, p:typeof g.project === 'string' ? g.project : undefined, y:g.type, t:g.text, i, r:g.ref || undefined, d:w, at:Date.now() });
      (R.z[g.bronId] = R.z[g.bronId] || {})[g.list + '|' + g.type] = L.map(x => norm(x.text));
    });
    bewaarRegister(tool, R);
  }
  // Eerste keer (nog geen register): wat de tool al eerder overnam en met zijn bron bewaarde (van, bronId of bron), komt erin.
  function opstart(tool, data) {
    const R = { e:[], z:{} }, namen = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) { const d = lees(k); if (d && d.tool) namen[norm(d.tool)] = k.slice(PREFIX.length); } } } catch {}
    const loop = o => {
      if (Array.isArray(o)) { o.forEach(loop); return; }
      if (!o || typeof o !== 'object' || o.voorbeeld === true) return;
      const v = typeof o.van === 'string' ? o.van : typeof o.bronId === 'string' ? o.bronId : typeof o.bron === 'string' ? namen[norm(o.bron)] : null;
      const d = v && v !== tool ? lees(PREFIX + v) : null;
      if (d && Array.isArray(d.lists)) TEKST.forEach(f => { if (typeof o[f] !== 'string' || !o[f].trim()) return;
        d.lists.some(l => (l.items || []).some((x, j) => { if (!x || norm(x.text) !== norm(o[f])) return false;
          const L = vanSoort(l, x.type); R.e.push({ v, l:l.name, p:typeof l.project === 'string' ? l.project : undefined, y:x.type, t:x.text, i:L.indexOf(x), r:x.ref || undefined, d:typeof x.when === 'string' && x.when ? x.when : undefined, at:Date.now() });
          (R.z[v] = R.z[v] || {})[l.name + '|' + x.type] = L.map(y => norm(y.text)); return true; })); });
      Object.keys(o).forEach(k => { const w = o[k]; if (w && typeof w === 'object') loop(w); });
    };
    data.forEach(x => loop(x.obj));
    return R;
  }
  // De motor. tool = de id van deze tool, sleutels = waar ze haar gegevens bewaart, af = hoe ze "klaar" bewaart als dat geen
  // gewone vlag is (bv. 'status=klaar' of 'status=gehaald'). Geeft terug wat er gebeurde: { hernoemd, klaar, weg, gewijzigd }.
  // modus 'signaal' (v4.2): een tool die vastlegt (Beslissingslog, Vergadernotities, Kennisbank) houdt wat je overnam zoals het was.
  // Verandert de bron, dan komt er één signaal per versie (gewijzigd), met de keuze om bij te werken: dat zet e.bij, en bij de volgende
  // opening (voor de tool leest) loopt het dan toch mee. Een gok zonder ref telt in die modus niet: daar zou je een vastlegging op baseren.
  function volg(tool, sleutels, af, modus) {
    const uit = { hernoemd:[], klaar:[], weg:[], gewijzigd:[], datum:[] }, sig = modus === 'signaal';
    if (!tool) return uit;
    const data = (sleutels || []).map(k => { try { const raw = localStorage.getItem(k); return raw ? { k, obj:JSON.parse(raw) } : null; } catch { return null; } }).filter(x => x && x.obj && typeof x.obj === 'object');
    let R = register(tool);
    if (!R) { R = opstart(tool, data); bewaarRegister(tool, R); }
    if (!R.e.length) return uit;
    const D = {}, bron = v => (v in D ? D[v] : (D[v] = lees(PREFIX + v)));
    const [afVeld, afWaarde] = String(af || '').split('=');
    const zelfde = t => R.e.filter(x => norm(x.t) === norm(t)).length;
    const ren = [], kl = [], dat = [], zag = {};
    R.e.forEach(e => {
      const d = bron(e.v); if (!d || !Array.isArray(d.lists)) return;   // de bron legt niets klaar (nog niet geopend, of gewist): niets doen
      const l = lijstVan(d, e.l, e.p), L = vanSoort(l, e.y), LN = L.map(x => norm(x.text)), K = Array.isArray(d.klaar) ? d.klaar : [];
      const sl = e.v + '|' + e.l + '|' + e.y; if (l) zag[sl] = { v:e.v, k:e.l + '|' + e.y, LN };
      let nu = null;
      if (e.r) { const x = L.find(x => x.ref === e.r); if (x) nu = { t:x.text, i:L.indexOf(x), d:x.when }; else { const k = K.find(k => k.r === e.r && k.y === e.y); if (k) nu = { t:k.t, af:true }; } }
      if (!nu) { const j = LN.indexOf(norm(e.t)); if (j >= 0) nu = { t:L[j].text, i:j, d:L[j].when }; }
      if (!nu) { const k = K.find(k => k.l === e.l && k.y === e.y && norm(k.t) === norm(e.t)); if (k) nu = { t:e.t, af:true }; }
      if (!nu && !e.r && l) {   // zonder ref: dezelfde plaats, even lange lijst, en de tekst daar is echt nieuw
        const vorig = (R.z[e.v] || {})[e.l + '|' + e.y], x = L[e.i];
        if (x && Array.isArray(vorig) && vorig.length === L.length && !vorig.includes(norm(x.text)) && !R.e.some(y => y !== e && y.v === e.v && norm(y.t) === norm(x.text))) nu = { t:x.text, i:e.i, gok:true };
      }
      if (nu && nu.gok && sig && !e.bij) nu = null;
      if (!nu) { if (!e.w) uit.weg.push({ t:e.t, bron:String(d.tool || e.v) }); e.w = 1; return; }
      delete e.w; if (nu.i != null && nu.i >= 0) e.i = nu.i;
      if (sig && !e.bij) {   // vastgelegd: niets aanpassen, wel één keer melden per versie van de bron
        const nt = norm(nu.t) !== norm(e.t), nk = !!nu.af !== !!e.k;
        if (nt || nk) { const v = (nt ? nu.t : '') + '|' + (nk ? (nu.af ? 1 : 0) : ''); if (e.n !== v) { e.n = v; uit.gewijzigd.push({ oud:e.t, nieuw:nt ? nu.t : null, af:nk ? !!nu.af : null, bron:String(d.tool || e.v), k:[e.v, e.l, e.y, norm(e.t)].join('|') }); } }
        else delete e.n;
        return;
      }
      delete e.bij; delete e.n;
      if (norm(nu.t) !== norm(e.t)) { if (zelfde(e.t) === 1) ren.push({ v:e.v, oud:e.t, nieuw:nu.t, bron:String(d.tool || e.v), e, gok:nu.gok }); e.t = nu.t; }
      // v4.3: een datum loopt mee (bv. de einddatum van de Projectopdracht als mijlpaal in de Tijdlijn), zolang de kopie nog de vorige datum draagt
      if (typeof nu.d === 'string' && nu.d) { if (e.d && e.d !== nu.d) dat.push({ v:e.v, t:e.t, oud:e.d, nieuw:nu.d, l:e.l, p:e.p, bron:String(d.tool || e.v) }); e.d = nu.d; }
      const k = !!nu.af; if (k !== !!e.k) { if (zelfde(e.t) === 1) kl.push({ v:e.v, t:e.t, af:k, e, bron:String(d.tool || e.v) }); if (k) e.k = 1; else delete e.k; }
    });
    Object.values(zag).forEach(z => { (R.z[z.v] = R.z[z.v] || {})[z.k] = z.LN; });
    // Toepassen in de opslag van de tool: alleen velden die nog precies de tekst van de bron dragen (wat je zelf wijzigde, blijft van jou)
    if (ren.length || kl.length || dat.length) data.forEach(x => {
      let n = 0; const geraakt = new Map();
      const raak = (o, f) => { if (!geraakt.has(o)) geraakt.set(o, new Set()); geraakt.get(o).add(f); };
      const eigenBron = (o, v) => { const b = typeof o.van === 'string' ? o.van : typeof o.bronId === 'string' ? o.bronId : null; return !b || b === v; };
      // ctx: de naam van de lijst of het project waar dit item in zit (een datum loopt alleen mee binnen het project van de bron)
      const loop = (o, ctx) => {
        if (Array.isArray(o)) { o.forEach(x => loop(x, ctx)); return; }
        if (!o || typeof o !== 'object' || o.voorbeeld === true) return;
        ren.forEach(c => TEKST.forEach(f => { if (typeof o[f] === 'string' && norm(o[f]) === norm(c.oud) && eigenBron(o, c.v)) { o[f] = c.nieuw; n++; c.gedaan = 1; raak(o, f); } }));
        kl.forEach(c => { if (!TEKST.some(f => typeof o[f] === 'string' && norm(o[f]) === norm(c.t)) || !eigenBron(o, c.v)) return;
          AF.forEach(f => { if (typeof o[f] === 'boolean' && o[f] !== c.af) { o[f] = c.af; n++; c.gedaan = 1; raak(o, f); } });
          if (afVeld && typeof o[afVeld] === 'string') {
            if (c.af && o[afVeld] !== afWaarde) { c.e.s = o[afVeld]; o[afVeld] = afWaarde; n++; c.gedaan = 1; raak(o, afVeld); }
            else if (!c.af && o[afVeld] === afWaarde && c.e.s) { o[afVeld] = c.e.s; delete c.e.s; n++; c.gedaan = 1; raak(o, afVeld); }
          } });
        dat.forEach(c => { if (!TEKST.some(f => typeof o[f] === 'string' && norm(o[f]) === norm(c.t)) || !eigenBron(o, c.v)) return;
          if (ctx && ![c.l, c.p].some(n => n && norm(n) === norm(ctx))) return;
          DATUM.forEach(f => { if (o[f] === c.oud) { o[f] = c.nieuw; n++; c.gedaan = 1; raak(o, f);
            // een tool die onthoudt wat binnenkwam (Tijdlijn: vanWas = 'status|datum'), moet dit niet als eigen werk zien
            if (typeof o.vanWas === 'string' && o.vanWas.includes(c.oud)) o.vanWas = o.vanWas.split(c.oud).join(c.nieuw); } }); });
        const sub = Object.keys(o).some(k => Array.isArray(o[k])) && typeof (o.project || o.name) === 'string' ? (o.project || o.name) : ctx;
        Object.keys(o).forEach(k => { const w = o[k]; if (w && typeof w === 'object') loop(w, sub); });
      };
      loop(x.obj, '');
      // Gedeeld bestand (oc-koppel): daar wint per item de laatste wijziging (gewijzigd, in ms). Een item dat meeliep, krijgt net één ms meer
      // dan zijn vorige tijd. Zo wint het van zijn oude versie in het bestand, maar nooit van een echte, latere wijziging van een collega.
      geraakt.forEach((velden, o) => {
        if (typeof o.gewijzigd === 'number' && isFinite(o.gewijzigd)) o.gewijzigd += 1;
        else if (typeof o.gewijzigd === 'string' && o.gewijzigd.trim()) { const t = /^\d+$/.test(o.gewijzigd.trim()) ? +o.gewijzigd : Date.parse(o.gewijzigd); if (isFinite(t)) o.gewijzigd = /^\d+$/.test(o.gewijzigd.trim()) ? t + 1 : new Date(t + 1).toISOString(); }
        if (o.kopT && typeof o.kopT === 'object') velden.forEach(f => { if (typeof o.kopT[f] === 'number') o.kopT[f] += 1; });
      });
      if (n) schrijf(x.k, JSON.stringify(x.obj));
    });
    // Een gok (zonder ref) die nergens paste (de kopie is weg of door jou gewijzigd): niet onthouden. Wis + nieuw in de bron is geen hernoeming.
    ren.forEach(c => { if (c.gok && !c.gedaan) c.e.t = c.oud; });
    bewaarRegister(tool, R);
    uit.hernoemd = ren.filter(c => c.gedaan); uit.datum = dat.filter(c => c.gedaan).map(c => ({ t:c.t, nieuw:c.nieuw, bron:c.bron })); uit.klaar = kl.filter(c => c.gedaan).map(c => ({ t:c.t, af:c.af, bron:c.bron }));
    return uit;
  }
  /* ---------- Vanzelf overnemen (v4.1) ----------
     Op een paar vaste paden (bv. Projectopdracht naar Tijdlijn: mijlpalen) neemt een tool vanzelf over wat nieuw is in je project.
     Het gaat langs dezelfde weg als je klik: we klikken de knop "Overnemen" van de tool, en pick() geeft meteen de keuze terug.
     Zo werken de eigen regels van de tool (geen dubbels, project, melding met Ongedaan) precies zoals altijd.
     Regels: alleen met een actief project in de app, alleen lijsten van dat project, nooit vanuit een voorbeeld (dan staat de knop er niet),
     en wat er al stond toen je dit voor het eerst opende, blijft je eigen keuze: alleen wat later bijkomt, gaat vanzelf mee.
     Wat ooit vanzelf werd aangeboden, komt nooit een tweede keer (ook niet als je het wiste of ongedaan maakte).
     Uitzetten: per tool (oc.vanzelf.<tool> = '0') of overal (oc.vanzelf = '0'), in de melding of in de kiezer. */
  let AUTO = null, wachtAuto = null;
  const vanzelfAan = tool => { try { return localStorage.getItem('oc.vanzelf') !== '0' && localStorage.getItem('oc.vanzelf.' + tool) !== '0'; } catch { return false; } };
  function zetVanzelf(tool, aan) { try { const k = tool ? 'oc.vanzelf.' + tool : 'oc.vanzelf'; if (aan) localStorage.removeItem(k); else localStorage.setItem(k, '0'); } catch {} }
  const bronNaam = id => { const d = lees(PREFIX + id); return String((d && d.tool) || ({ opdracht:'Projectopdracht', retro:'Retro', beslissingen:'Beslissingslog', notities:'Vergadernotities' })[id] || id); };
  function instel(cfg) { AUTO = cfg && cfg.tool && cfg.paden && cfg.paden.length ? cfg : null; }
  const MEER = { mijlpaal:'mijlpalen', risico:'risico’s', doel:'doelen', betrokkene:'betrokkenen', actie:'acties', taak:'taken', leerpunt:'leerpunten' };
  // Deelt deze tool iets via een gedeeld bestand (oc-koppel)? De koppeling zelf weet het; vlak na het laden kan ze nog bezig zijn,
  // dus kijken we ook naar de opslag: een eenheid die meegaat, draagt "gedeeld": true.
  function gedeeldBestand() {
    try { const t = window.ocKoppel && ocKoppel.toestand && ocKoppel.toestand(); if (t && t.fase && t.fase !== 'uit') return true; } catch {}
    return (AUTO && AUTO.opslag || []).some(k => { try { return /"gedeeld":true/.test(localStorage.getItem(k) || ''); } catch { return false; } });
  }
  function vanzelf() {
    if (!AUTO || !vanzelfAan(AUTO.tool) || document.hidden) return 0;
    try { if (window.ocVan || new URLSearchParams(location.search).get('van')) return 0; } catch {}
    const A = actief(); if (!A.naam) return 0;
    const knop = String(AUTO.knop || '').split(',').map(x => { try { return document.querySelector(x.trim()); } catch { return null; } }).find(b => b && !b.hidden && !b.disabled && b.offsetParent !== null);
    if (!knop) return 0;
    const types = [...new Set(AUTO.paden.map(p => p.y))], P = [A.naam].concat(A.oud).filter(Boolean), proj = norm(A.naam);
    const eigen = s => s.project != null ? P.some(p => norm(p) === norm(s.project)) : P.some(p => past(s.list, p));
    const R = register(AUTO.tool) || { e:[], z:{} }; R.a = R.a || []; R.b = R.b || {};
    let have = []; try { have = (window.ocHave && window.ocHave(types)) || []; } catch {}
    const H = new Set(have.map(norm)), al = new Set(R.a), genomen = new Set(R.e.map(e => e.v + '|' + e.y + '|' + norm(e.t) + '|' + norm(e.p || e.l))), kand = [];   // per project: "Project klaar" van project A is niet dat van B
    sources(types, AUTO.tool).filter(s => AUTO.paden.some(p => p.v === s.id) && eigen(s)).forEach(s => s.items.forEach(it => {
      if (AUTO.paden.some(p => p.v === s.id && p.y === it.type)) kand.push({ ...it, source:s.tool, bronId:s.id, list:s.list, project:s.project, _k:s.id + '|' + it.type + '|' + norm(it.text) + '|' + proj }); }));
    if (!R.b[proj]) {   // de eerste keer voor dit project: staat er al iets in de tool, dan blijft wat er nu klaarligt je eigen keuze
      R.b[proj] = 1;
      if (H.size) { kand.forEach(k => al.add(k._k)); R.a = [...al].slice(-2000); bewaarRegister(AUTO.tool, R); return 0; }
      bewaarRegister(AUTO.tool, R);
    }
    const nieuw = kand.filter(k => !al.has(k._k) && !H.has(norm(k.text)) && !genomen.has(k.bronId + '|' + k.type + '|' + norm(k.text) + '|' + norm(k.project || k.list)));
    if (!nieuw.length) return 0;
    // Deel je deze tool via een gedeeld bestand, dan niets vanzelf: een voorstel met één knop. Anders kan je team dubbels krijgen
    // (bv. als de koppeling nog op je toestemming wacht en een collega hetzelfde al in het bestand zette).
    if (gedeeldBestand()) {
      R.a = [...new Set(R.a.concat(nieuw.map(x => x._k)))].slice(-2000); bewaarRegister(AUTO.tool, R);
      const bron = [...new Set(nieuw.map(i => i.source || bronNaam(i.bronId)))].join(', ').replace(/, ([^,]*)$/, ' en $1');
      const ty = [...new Set(nieuw.map(i => i.type))], wat = ty.length === 1 ? (MEER[ty[0]] || 'items') : 'items';
      melding(`${nieuw.length === 1 ? 'Eén nieuw item' : nieuw.length + ' nieuwe ' + wat} in ${bron}. Deze tool deel je via een bestand met je team: kies zelf wat erbij komt.`, 15000,
        { knop:'Bekijk', doe:m => { m.remove(); knop.click(); } });
      return 0;
    }
    wachtAuto = { tool:AUTO.tool, items:nieuw, tot:Date.now() + 4000 };
    knop.click();
    setTimeout(() => { if (wachtAuto && wachtAuto.items === nieuw) wachtAuto = null; }, 4000);
    return nieuw.length;
  }
  function meldVanzelf(tool, items) {
    const bron = [...new Set(items.map(i => i.source || bronNaam(i.bronId)))].join(', ').replace(/, ([^,]*)$/, ' en $1');
    melding(`Vanzelf overgenomen uit ${bron}.`, 9000, { hoog:true, knop:'Niet meer vanzelf', doe:m => { zetVanzelf(tool, false);
      m.querySelector('span').textContent = 'Deze tool neemt niet meer vanzelf over. Weer aanzetten kan onder ‘Overnemen uit andere tools’.'; } });
  }
  // Eén rustige melding onderaan, in de stijl van de tools. Ze neemt de focus niet over.
  // v4.3: gecentreerd zonder translate (left:50% gaf de melding maar de halve schermbreedte: op een gsm werd de tekst één letter breed);
  // is er te weinig plaats, dan schuiven de knoppen onder de tekst.
  // o.hoog: boven de eigen melding van de tool (die meldt hoeveel er overkwam, met Ongedaan). o.knop + o.doe: een tweede knop.
  function melding(tekst, ms, o) {
    const toon = () => {
      style(); let m = document.getElementById('ocs-melding');
      if (!m) { m = document.createElement('div'); m.id = 'ocs-melding'; m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
        m.style.cssText = 'position:fixed;left:0;right:0;margin:0 auto;width:fit-content;bottom:calc(' + (o && o.hoog ? '6.5rem' : '1rem') + ' + env(safe-area-inset-bottom,0px));z-index:9999;max-width:min(92vw,560px);box-sizing:border-box;display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:flex-start;gap:.5rem .75rem;padding:.75rem .75rem .75rem 1rem;background:#fff;color:#1e293b;border:1px solid #a7f3d0;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);font:500 .9375rem/1.45 "DM Sans",system-ui,sans-serif';
        document.body.appendChild(m); }
      m.style.bottom = 'calc(' + (o && o.hoog ? '6.5rem' : '1rem') + ' + env(safe-area-inset-bottom,0px))';
      m.innerHTML = `<span style="flex:1 1 auto;min-width:0;overflow-wrap:break-word;align-self:center">${esc(tekst)}</span>${o && o.knop ? `<button type="button" class="ocs-btn ocs-cancel" data-m="knop" style="flex:none">${esc(o.knop)}</button>` : ''}<button type="button" class="ocs-btn ocs-cancel" data-m="ok" style="flex:none">Oké</button>`;
      m.querySelector('[data-m="ok"]').onclick = () => m.remove();
      const k = m.querySelector('[data-m="knop"]'); if (k) k.onclick = () => { k.remove(); o.doe(m); clearTimeout(m._t); m._t = setTimeout(() => m.remove(), 8000); };
      clearTimeout(m._t); m._t = setTimeout(() => m.remove(), ms || 8000);
    };
    if (document.body) toon(); else document.addEventListener('DOMContentLoaded', () => setTimeout(toon, 500), { once:true });
  }
  const kort = t => '‘' + (t.length > 60 ? t.slice(0, 57).trim() + '…' : t) + '’';
  function meld(u, tool) {
    const z = [], H = u.hernoemd, A = u.klaar.filter(x => x.af), O = u.klaar.filter(x => !x.af), G = u.gewijzigd || [], DT = u.datum || [], bronnen = [...new Set(H.concat(u.klaar, DT).map(x => x.bron))];
    const uit = bronnen.length === 1 ? 'uit ' + bronnen[0] : 'uit andere tools';
    if (H.length === 1 && !u.klaar.length) z.push(`Meegelopen ${uit}: ${kort(H[0].oud)} heet nu ${kort(H[0].nieuw)}.`);
    else if (A.length === 1 && !H.length && !O.length) z.push(`Meegelopen ${uit}: ${kort(A[0].t)} is afgevinkt.`);
    else if (O.length === 1 && !H.length && !A.length) z.push(`Meegelopen ${uit}: ${kort(O[0].t)} staat weer open.`);
    else if (DT.length === 1 && !H.length && !u.klaar.length) z.push(`Meegelopen ${uit}: ${kort(DT[0].t)} staat nu op ${datum(DT[0].nieuw)}.`);
    else if (H.length || u.klaar.length || DT.length) z.push(`Meegelopen ${uit}: ` + [H.length && `${H.length} ${H.length === 1 ? 'naam' : 'namen'} aangepast`, DT.length && `${DT.length} ${DT.length === 1 ? 'datum' : 'datums'} aangepast`, A.length && `${A.length} afgevinkt`, O.length && `${O.length} weer open`].filter(Boolean).join(', ') + '.');
    // Vastgelegd (modus signaal): wat in de bron veranderde, blijft hier zoals het was, tot je kiest om bij te werken
    if (G.length === 1) { const g = G[0];
      z.push(g.nieuw != null ? `In ${g.bron} veranderde ${kort(g.oud)} intussen in ${kort(g.nieuw)}.` : `In ${g.bron} is ${kort(g.oud)} intussen ${g.af ? 'afgevinkt' : 'weer open'}.`);
      z.push('Hier blijft het zoals je het vastlegde.'); }
    else if (G.length > 1) z.push(`${G.length} overgenomen items veranderden intussen in hun bron. Hier blijven ze zoals je ze vastlegde.`);
    if (u.weg.length === 1) z.push(`${kort(u.weg[0].t)} staat niet meer in ${u.weg[0].bron}. Hier staat het nog: wis het zelf als het weg mag.`);
    else if (u.weg.length > 1) z.push(`${u.weg.length} overgenomen items staan niet meer in hun bron. Hier staan ze nog: wis ze zelf als ze weg mogen.`);
    if (!z.length) return;
    if (G.length && tool) melding(z.join(' '), 15000, { knop:G.length === 1 ? 'Werk bij' : 'Werk ze bij', doe:m => {
      // Bijwerken gebeurt bij het opnieuw openen, nog voor de tool haar gegevens leest: zo komt niets in de knel met wat al open staat
      try { const K = new Set(G.map(g => g.k)), R = register(tool); if (R) { R.e.forEach(e => { if (K.has([e.v, e.l, e.y, norm(e.t)].join('|'))) e.bij = 1; }); bewaarRegister(tool, R); } } catch {}
      m.querySelector('span').textContent = 'Even geduld: de tool laadt opnieuw met de nieuwe versie.'; setTimeout(() => location.reload(), 250); } });
    else melding(z.join(' '), 9000);
  }



  /* ---------- Wat je zelf deed, per project (v4.3) ----------
     De app toont een stap van een plan als gedaan voor het project dat nu open staat. Daarvoor houdt elke tool bij voor welk project
     jij er zelf iets in veranderde (oc-app.werk-pp: { _t:{ <tool>:1 }, <tool>:[<project>, ...] }). Wat vanzelf binnenkwam of meeliep,
     telt niet: alleen een wijziging na een tik of toets van jou. _t zegt dat de tool dit bijhoudt; staat ze er niet in, dan telt de app zoals vroeger. */
  const WERK = 'oc-app.werk-pp';
  function werk(tool, opslag) {
    const sl = (opslag || []).filter(k => k && !k.startsWith(PREFIX) && !k.startsWith(VOLG));
    if (!tool || !sl.length) return;
    const leesW = () => lees(WERK) || {}, zetW = w => schrijf(WERK, JSON.stringify(w));
    const projectNu = () => { const p = lees('oc.project'); return p && typeof p.name === 'string' ? p.name.trim() : ''; };
    const heeftIets = () => sl.some(k => { try { const v = localStorage.getItem(k); return v != null && v !== '' && v !== 'null' && v !== '{}' && v !== '[]'; } catch { return false; } });
    { const w = leesW(); if (!w._t || !w._t[tool]) {
      // Eerste keer met deze versie: wat er al stond, verdelen we over de projecten die de tool kent: de lijsten met iets in
      // haar gedeelde blok, en de projecten die haar kiezer kent (oc-app.projecten-tools). Weten we niets, dan telt het voor elk project ('*').
      w._t = Object.assign({}, w._t, { [tool]:1 });
      if (!Array.isArray(w[tool]) && heeftIets()) {
        const namen = new Set(), d = lees(PREFIX + tool), reg = lees('oc-app.projecten-tools');
        if (d && Array.isArray(d.lists)) d.lists.forEach(l => { if (l && Array.isArray(l.items) && l.items.length && typeof (l.project || l.name) === 'string') namen.add(String(l.project || l.name).trim()); });
        if (reg && Array.isArray(reg[location.pathname])) reg[location.pathname].forEach(n => { if (typeof n === 'string' && n.trim()) namen.add(n.trim()); });
        w[tool] = namen.size ? [...namen].slice(0, 200) : ['*'];
      }
      zetW(w); } }
    // Een vingerafdruk van de eigen opslag. Tot 3 MB volledig; daarboven het begin, het midden en het einde.
    const vingerafdruk = () => sl.map(k => { let v = ''; try { v = localStorage.getItem(k) || ''; } catch {} let h = 2166136261;
      const s = v.length > 3e6 ? v.slice(0, 1e6) + v.slice(v.length / 2 - 5e5, v.length / 2 + 5e5) + v.slice(-1e6) : v;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return v.length + ':' + (h >>> 0); }).join('|');
    // Alleen wat je typt of kiest (een veld, een vinkje, een keuzelijst, een bestand), en wat de tool kort daarna bewaart.
    // Een tik, een ander project kiezen of iets dat de tool zelf op de achtergrond bewaart, telt niet.
    // Snel kijken (na 0,6 s), zodat de app meteen weet dat de stap gedaan is; bewaart de tool later, dan nog eens, tot 5 s na je laatste invoer.
    let basis = null, tik = 0, laatst = 0;
    const kijk = slot => { clearTimeout(tik); tik = 0; if (basis == null) return;
      if (vingerafdruk() === basis) { if (!slot && Date.now() - laatst < 5000) tik = setTimeout(kijk, 600); else basis = null; return; }
      basis = null; const p = projectNu() || '*'; const w = leesW(), L = Array.isArray(w[tool]) ? w[tool] : [];
      if (!L.includes(p)) { w[tool] = L.concat(p).slice(-200); zetW(w); } };
    const actie = e => { if (!e.isTrusted) return;
      try { if (e.target && e.target.closest && e.target.closest('[class*="oc-pk"], [id^="ocpk"]')) return; } catch {}   // de projectkiezer (een project maken of hernoemen) is geen werk in de tool
      if (basis == null) basis = vingerafdruk(); laatst = Date.now(); clearTimeout(tik); tik = setTimeout(kijk, 600); };
    ['beforeinput', 'input', 'change'].forEach(t => document.addEventListener(t, actie, true));
    addEventListener('pagehide', () => { if (tik) kijk(true); }); document.addEventListener('visibilitychange', () => { if (document.hidden && tik) kijk(true); });
  }

  return { publish, clear, pick, count, sources, refs, esc, volg, melding, meld, instel, vanzelf, onthoud, werk };
})();

// Bij het laden, nog voor de tool haar gegevens leest: de kopieën van deze tool lopen mee met hun bron.
// <script src="/app/oc-share.js" data-tool="retro" data-opslag="retro.v1" data-af="status=klaar"></script>
(function () {
  const me = document.currentScript; if (!me || !me.dataset.tool) return;
  const opslag = String(me.dataset.opslag || '').split(',').map(s => s.trim()).filter(Boolean);
  try { const u = ocShare.volg(me.dataset.tool, opslag, me.dataset.af, me.dataset.volg);
    if (u.hernoemd.length || u.klaar.length || u.weg.length || u.gewijzigd.length || u.datum.length) ocShare.meld(u, me.dataset.tool); } catch (e) {}
  try { ocShare.werk(me.dataset.tool, opslag); } catch (e) {}
  // data-vanzelf="opdracht:mijlpaal,retro:actie" en data-vanzelf-knop="#oc-imp,#oc-imp-start": vanzelf overnemen op die paden
  const paden = String(me.dataset.vanzelf || '').split(',').map(x => x.trim().split(':')).filter(x => x.length === 2 && x[0] && x[1]).map(([v, y]) => ({ v, y }));
  if (paden.length) { ocShare.instel({ tool: me.dataset.tool, paden, knop: me.dataset.vanzelfKnop || '', opslag });
    const probeer = () => setTimeout(() => { try { ocShare.vanzelf(); } catch (e) {} }, 900);
    if (document.readyState === 'complete') probeer(); else window.addEventListener('load', probeer, { once:true }); }
})();
