// Veranderklimaat: vaste testen voor inhoudelijke fouten die testers vonden (de grens bij ervaring 0,00 moet dezelfde zijn als in het Veranderprofiel).
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/klimaat/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  // 1. Het klimaat volgt de afgeronde waarden die naar het Veranderprofiel gaan: ervaring 0,00 of hoger = goede kant, last 0,50 of hoger = zwaar.
  const r = await p.evaluate(() => { const uit = []; for (const x of [-0.006, -0.004, 0, 0.004]) for (const y of [0.494, 0.496, 0.5]) uit.push([x, y, climateOf(x, y)]); return uit; });
  r.forEach(([x, y, cid]) => { const rx = Math.round(x * 100) / 100, ry = Math.round(y * 100) / 100, moet = rx >= 0 ? (ry >= 0.5 ? 'moe' : 'vrucht') : (ry >= 0.5 ? 'verz' : 'afw');
    ok(cid === moet, `ervaring ${x}, last ${y}: ${cid} (verwacht ${moet})`); });
  // 2. Wat doorgaat (klimaat.ervaring, klimaat.type) spreekt zichzelf niet tegen: een bijgestelde plek net onder 0 die als 0,00 doorgaat
  const k = await p.evaluate(() => { const a = cur(); a.name = 'Toets grens'; const u = a.units[0]; u.name = 'Team'; u.manual = { x:-0.004, y:0.2 }; save(); render(); return kerncijfers(a); });
  ok(k['klimaat.ervaring'] === '0.00' && k['klimaat.type'] === 'Vruchtbare grond', 'ervaring gaat door als 0.00 en het type is de goede kant (' + k['klimaat.ervaring'] + ', ' + k['klimaat.type'] + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
