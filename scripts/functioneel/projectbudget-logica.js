// Projectbudget: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const I = (id, name, soort, aard, bedrag, x = {}) => ({ id, name, soort, aard, bedrag, ...x });
const L = (items, x = {}) => ({ lists:[{ id:'L', name:'Schoolproject robotica', items, jaren:3, marge:10, vo:true, vast:[], ...x }], current:'L' });
const getal = t => +String(t).replace(/[€\s ]/g, '').replace(/\./g, '').replace(',', '.');
(async () => { const b = await chromium.launch(); const PE = [];
  const open = async data => { const c = await b.newContext({ viewport:{ width:1440, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
    await c.clock.setFixedTime(new Date('2026-11-15T10:00:00+01:00'));
    const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e))); await p.goto(B + '/projectbudget/', { waitUntil:'networkidle' });
    await p.evaluate(d => localStorage.setItem('projectbudget.v1', JSON.stringify(d)), data); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); return p; };
  const lees = p => p.evaluate(() => ({ stand:document.getElementById('stand').innerText.replace(/\s+/g, ' '), tekst:asText(), exp:buildExport().node.textContent.replace(/\s+/g, ' '),
    vo:[...document.querySelectorAll('#vo-card .bg-vo li')].map(li => ({ b:li.querySelector('.vn b').textContent, p:li.querySelector('.vp').textContent })) }));
  // 1. Op de drempel: de procedure volgt het exacte bedrag, en dat bedrag staat erbij
  let p = await open(L([I('a', 'Studiebureau', 'eenmalig', 'extern', 30000), I('b', 'Licentie', 'jaarlijks', 'licentie', 9999.5), I('c', 'Laptops', 'eenmalig', 'aankoop', 29999.6),
    I('d', 'Projectleider', 'eenmalig', 'mensen', 0, { dagen:2.5, dagprijs:480.4 }), I('e', 'Catering', 'eenmalig', 'ander', 0.4)]));
  let r = await lees(p);
  const tegen = r.vo.filter((x, i) => r.vo.some((y, j) => j !== i && y.b === x.b && y.p !== x.p));
  ok(!tegen.length, 'geen twee aankopen met hetzelfde getoonde bedrag en een andere procedure (' + r.vo.map(x => x.b + ' ' + x.p).join(' | ') + ')');
  ok(r.vo.every(x => (getal(x.b) < 30000) === /beperkte waarde/.test(x.p)), 'onder € 30.000 staat beperkte waarde, vanaf € 30.000 niet');
  ok(r.vo.some(x => x.b === '€ 29.999,60' && /beperkte waarde/.test(x.p)), 'Laptops: € 29.999,60, opdracht van beperkte waarde');
  const m = /Elk jaar\s*(€ [\d.,]+) × 3 jaar\s*(€ [\d.,]+)/.exec(r.stand);
  ok(m && Math.abs(getal(m[1]) * 3 - getal(m[2])) < 0.005, '"elk jaar × 3 jaar" klopt op het scherm (' + (m ? m[1] + ' × 3 = ' + m[2] : r.stand) + ')');
  const tj = /ELK JAAR: (€ [\d.,]+) per jaar/.exec(r.tekst), tt = /Terugkerend over 3 jaar: (€ [\d.,]+)/.exec(r.tekst);
  ok(tj && tt && Math.abs(getal(tj[1]) * 3 - getal(tt[1])) < 0.005, 'en in de tekst (' + (tj && tt ? tj[1] + ' × 3 = ' + tt[1] : '') + ')');
  const tv = [...r.tekst.matchAll(/^- (.+?): (€ [\d.,]+)\. (.+)$/gm)].map(x => [x[2], x[3]]);
  ok(tv.length >= 3 && !tv.some(([b1, p1]) => tv.some(([b2, p2]) => b1 === b2 && p1 !== p2)), 'de tekst zet geen gelijk bedrag bij twee procedures (' + tv.map(x => x.join(' ')).join(' | ') + ')');
  ok(/Laptops · Opdracht van beperkte waarde ?€ 29\.999,60/.test(r.exp), 'de PDF/afbeelding toont ook het exacte bedrag');
  // 2. Totaal 0, wel al betaald: geen Infinity%
  p = await open(L([I('a', 'Gratis advies', 'eenmalig', 'extern', 0, { uit:500 })], { marge:0 }));
  r = await lees(p);
  ok(!/Infinity|NaN/.test(r.tekst + r.exp + r.stand), 'geen Infinity of NaN in tekst, export of scherm');
  ok(/Al betaald: € 500 \(€ 500 meer dan het totaal\)/.test(r.tekst), 'de tekst zegt hoeveel meer dan het totaal (' + (/Al betaald.*/.exec(r.tekst) || [''])[0] + ')');
  ok(/€ 500 meer dan het totaal/.test(r.exp), 'de export ook');
  // 3. Gewoon geval blijft zoals het was
  p = await open(L([I('a', 'Abonnement', 'jaarlijks', 'licentie', 1000, { uit:3200 }), I('b', 'Opleiding', 'eenmalig', 'extern', 2000, { uit:500 })], { marge:5 }));
  r = await lees(p);
  ok(/Al betaald: € 3\.700 \(70% van het totaal\)/.test(r.tekst) && /Elk jaar\s*€ 1\.000 × 3 jaar\s*€ 3\.000/.test(r.stand), 'hele bedragen: geen centen, 70% van het totaal');
  // Eén afronding: de lijst rondde af op de euro, de som en de tekst niet ("€ 10.000 per jaar" naast "€ 9.999,50 × 3 jaar"; hertest b)
  { const p = await open(L([I('c', 'Laptops', 'eenmalig', 'aankoop', 29999.6), I('l', 'Licentie', 'jaarlijks', 'licentie', 9999.5)], { marge:0 }));
    const r = await p.evaluate(() => ({ lijst:document.querySelector('#list').innerText.replace(/\s+/g, ' '), main:document.querySelector('main').innerText.replace(/\s+/g, ' '), tekst:asText() }));
    const bed = ['€ 29.999,60', '€ 9.999,50', '€ 29.998,50', '€ 59.998,10'];
    ok(bed.slice(0, 3).every(x => r.lijst.includes(x)) && !/€ 10\.000|€ 30\.000|€ 29\.999(?!,)/.test(r.lijst), 'lijst op het scherm: dezelfde bedragen als de som (' + r.lijst.slice(0, 160) + ')');
    ok(r.main.includes('€ 59.998,10') && bed.every(x => r.tekst.includes(x)) && !/€ 10\.000|€ 30\.000|€ 59\.998(?!,)/.test(r.tekst), 'tekst: dezelfde bedragen en hetzelfde totaal als het scherm');
    await p.context().close(); }
  // Invoer op de cent: 99,995 per jaar toonde € 100, maar × 4 jaar gaf € 399,98 (hertest d2). Dagprijs 333,335 × 3 dagen: wat er staat, telt op.
  { const p = await open(L([I('a', 'Team', 'eenmalig', 'mensen', 0, { dagen:3, dagprijs:333.335 }), I('b', 'Abonnement', 'jaarlijks', 'licentie', 99.995)], { marge:0, jaren:4 }));
    const r = await p.evaluate(() => ({ stand:document.getElementById('stand').innerText.replace(/\s+/g, ' '), tekst:asText() }));
    ok(/€ 100 × 4 jaar/.test(r.stand) && /€ 400(?![,\d])/.test(r.stand) && !/399,98/.test(r.stand + r.tekst), 'elk jaar € 100 × 4 jaar = € 400, niet € 399,98 (' + (/Elk jaar[^€]*€[^€]*€ [\d.,]+/.exec(r.stand) || [''])[0] + ')');
    ok(/3 dagen aan € 333,34\): € 1\.000,02/.test(r.tekst), 'dagprijs op de cent: 3 dagen aan € 333,34 is € 1.000,02 (' + (/Team[^\n]*/.exec(r.tekst) || [''])[0] + ')');
    await p.context().close(); }
  // Hertest e: dagen niet misleidend afgerond ("0,13 dagen × € 800 = € 100"), en een klein betaald deel is "<1%", niet "0%"
  { const p = await open(L([I('a', 'Consultant', 'eenmalig', 'mensen', 100, { dagen:0.125, dagprijs:800 }), I('b', 'Bouw', 'eenmalig', 'extern', 50000, { uit:10 })], { marge:0 }));
    const r = await p.evaluate(() => ({ scherm:document.querySelector('main').innerText.replace(/\s+/g, ' '), tekst:asText(), csv:asCSV(), pdf:buildExport().node.innerText.replace(/\s+/g, ' ') }));
    const alles = [r.scherm, r.tekst, r.csv, r.pdf].join(' | ');
    ok(!/0,13 dag/.test(alles) && /0,125 dagen/.test(r.scherm) && /0,125 dagen/.test(r.tekst) && /;0,125;/.test(r.csv), '0,125 dagen blijft 0,125 op het scherm, in de tekst en de CSV (' + (/[\d,]+ dagen[^€]*€ [\d.,]+/.exec(r.scherm) || [''])[0] + ')');
    ok(!/\b0% van het totaal/.test(alles) && /<1% van het totaal/.test(r.tekst) && /<1% van het totaal/.test(r.scherm), '€ 10 van € 50.100 betaald: "<1% van het totaal", niet "0%" (' + (/[<\d]+% van het totaal/.exec(r.tekst) || [''])[0] + ')');
    // wijzigen en opnieuw bewaren mag 0,125 dagen niet stil 0,13 maken
    await p.click('.bg-post[data-id="a"]'); await p.waitForTimeout(300); const veld = await p.inputValue('#dagen');
    ok(veld === '0,125', 'bij wijzigen staat 0,125 in het veld (' + veld + ')'); await p.context().close(); }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
