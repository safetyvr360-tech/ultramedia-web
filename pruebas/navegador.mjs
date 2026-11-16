// Ultramedia web: browser tests (Playwright). Needs the page served at http://127.0.0.1:5310/
//   node pruebas/navegador.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/USER/.claude/skills/playwright-skill/package.json');
const { chromium } = require('playwright');

import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
// its own static server, so the test needs nothing running
const ROOT = fileURLToPath(new globalThis.URL('..', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = normalize(join(ROOT, path === '' || path.endsWith('/') ? path + 'index.html' : path));
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL = process.argv[2] || `http://127.0.0.1:${server.address().port}/`;
const SIZES = [[1440, 900], [1920, 1080], [1366, 768], [1280, 620], [1024, 768], [1024, 600], [820, 1180], [768, 1024], [736, 610], [844, 390], [390, 844], [360, 640], [320, 568]];
const results = [];
const add = (id, name, fails) => results.push({ id, name, ok: !fails.length, fails });

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  // B01-B03: every size
  const overlap = [], sideways = [], heroOut = [], tiny = [];
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // walk the page so lazy images and moments settle
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const out = { overlap: [], sideways: 0, hero: null, tiny: [] };
      out.sideways = document.documentElement.scrollWidth - innerWidth;
      const secs = [...document.querySelectorAll('main > section, footer.closing')];
      for (const s of secs) {
        if (s.matches('[data-moment="photo-chapters"]')) continue;
        const sb = s.getBoundingClientRect();
        for (const e of s.querySelectorAll('img, p, h1, h2, h3, li, a, button, input, label, .chat')) {
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[hidden]')) continue;
          const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue;
          if (b.bottom > sb.bottom + 2) { out.overlap.push(`${s.id || s.className.split(' ')[0]}: ${e.tagName.toLowerCase()} "${(e.innerText || e.alt || '').trim().slice(0, 30)}" pasa ${Math.round(b.bottom - sb.bottom)}px`); break; }
        }
      }
      const box = document.querySelector('.hero__over > div')?.getBoundingClientRect(), m = document.querySelector('.hero__media')?.getBoundingClientRect();
      if (box && m && (box.top < m.top - 1 || box.bottom > m.bottom + 1)) out.hero = `recuadro ${Math.round(box.top)}-${Math.round(box.bottom)}, foto ${Math.round(m.top)}-${Math.round(m.bottom)}`;
      for (const e of document.querySelectorAll('p, li, a, label, span, h3, button')) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || !e.innerText?.trim() || e.closest('[aria-hidden="true"], .dg')) continue;
        if (parseFloat(cs.fontSize) < 13) { out.tiny.push(`${e.tagName.toLowerCase()} "${e.innerText.trim().slice(0, 25)}" ${cs.fontSize}`); }
      }
      return out;
    });
    if (r.overlap.length) overlap.push(`${w}x${h}: ` + r.overlap.join('; '));
    if (r.sideways > 1) sideways.push(`${w}x${h}: ${r.sideways}px de scroll lateral`);
    if (r.hero) heroOut.push(`${w}x${h}: ${r.hero}`);
    if (r.tiny.length) tiny.push(`${w}x${h}: ` + r.tiny.slice(0, 3).join('; '));
    await page.close();
  }
  add('B01', 'Ninguna sección se monta sobre la siguiente (13 tamaños, con pantallas bajas)', overlap);
  add('B02', 'Sin scroll lateral', sideways);
  add('B03', 'El título del inicio queda dentro de la foto', heroOut);
  add('B04', 'Ningún texto menor de 13 px', tiny);

  // B05: fonts and console errors
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  // the mocked chat.php answers 500 on purpose; missing files are checked in run.mjs (S01)
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('requestfailed', q => errors.push('falló ' + q.url()));
  page.on('response', q => { if (q.status() === 404) errors.push('404 ' + q.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  const font = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('400 16px "Hanken Grotesk"') && document.fonts.check('300 40px "Outfit"') && getComputedStyle(document.querySelector('h1')).fontFamily.includes('Outfit') && getComputedStyle(document.body).fontFamily.includes('Hanken'); });
  add('B05', 'Outfit (títulos) y Hanken Grotesk (texto) cargan y se usan', font ? [] : ['no cargó la fuente']);

  // B06: the chat
  // a slow server with no key yet: the chat must lock while it waits, then answer from its own facts
  await page.route('**/chat.php', async r => { await new Promise(x => setTimeout(x, 500)); await r.fulfill({ status: 500, body: '{}' }); });
  const chat = [];
  if (!(await page.locator('#um-chat').isHidden())) chat.push('el chat empieza abierto');
  await page.click('.chatnav');
  if (!(await page.locator('#um-chat').isVisible())) chat.push('el botón Asistente de la barra no abre el chat');
  for (const [q, re] of [['¿Hacen termografía de paneles solares?', /termografía/i], ['planes de SkyDeck', /1\.000\.000/], ['quiero hablar con una persona', /WhatsApp/]]) {
    await page.fill('#um-q', q); await page.press('#um-q', 'Enter');
    const busy = await page.locator('.chat__send').isDisabled();
    await page.waitForTimeout(1200);
    const last = await page.locator('.chat__msg--in').last().innerText();
    if (!re.test(last)) chat.push(`"${q}" -> ${last.slice(0, 60)}`);
    if (!busy) chat.push(`"${q}": el botón no se bloqueó mientras respondía`);
  }
  const wa = await page.locator('.chat__act--wa').first().getAttribute('href');
  if (!wa || !wa.startsWith('https://wa.me/573006242963')) chat.push('el botón de WhatsApp del chat no va a Jason');
  await page.keyboard.press('Escape');
  if (!(await page.locator('#um-chat').isHidden())) chat.push('Escape no cierra el chat');
  add('B06', 'El botón Asistente abre el chat, responde, se bloquea mientras contesta, lleva a WhatsApp y cierra con Escape', chat);

  // B07: the nav menu opens on hover and the phone menu toggles
  const nav = [];
  await page.evaluate(() => scrollTo(0, 0));
  await page.hover('.nav__item:has(.nav__menu) > .nav__link'); await page.waitForTimeout(400);
  if (!(await page.locator('.nav__menu').first().isVisible())) nav.push('el menú de Drones no abre');
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(URL, { waitUntil: 'networkidle' });
  await phone.click('.nav__toggle'); await phone.waitForTimeout(300);
  if ((await phone.getAttribute('.nav__toggle', 'aria-expanded')) !== 'true') nav.push('el menú del celular no abre');
  add('B07', 'Menús de computador y celular', nav);

  // B09: the quote builder: asks for what is missing, adds up right, opens WhatsApp with the quote
  const q = [];
  const qp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await qp.goto(URL.replace(/[^/]*$/, '') + 'servicios.html', { waitUntil: 'networkidle' });
  await qp.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
  await qp.locator('#cotizador').scrollIntoViewIfNeeded();
  await qp.click('#cotizador button[type="submit"]');
  if (await qp.locator('#q-svc-err').isHidden()) q.push('no pidió elegir un servicio');
  if (await qp.locator('#q-ha-err').isHidden()) q.push('no pidió el área');
  if ((await qp.evaluate(() => window.__opened.length)) !== 0) q.push('abrió WhatsApp sin datos');
  await qp.click('.opt:has(input[value="topo"])'); await qp.click('.opt:has(input[value="ganado"])');
  await qp.fill('#q-ha', '30'); await qp.fill('#q-mun', 'Sabanalarga');
  const totalTxt = (await qp.locator('[data-total]').innerText()).replace(/\s/g, '');
  if (!/6\.300\.000/.test(totalTxt)) q.push('total esperado $6.300.000 (30 ha: topografía $4.800.000 + ganadería $1.500.000), salió ' + totalTxt);
  await qp.fill('#q-ha', '5');
  const t2 = (await qp.locator('[data-total]').innerText()).replace(/\s/g, '');
  if (!/3\.300\.000/.test(t2)) q.push('con 5 ha debía aplicar el mínimo de topografía ($1.800.000 + $1.500.000 = $3.300.000), salió ' + t2);
  await qp.fill('#q-ha', '30');
  await qp.click('#cotizador button[type="submit"]');
  const opened = await qp.evaluate(() => window.__opened[0] || '');
  const text = decodeURIComponent(opened.split('text=')[1] || '');
  if (!opened.startsWith('https://wa.me/573006242963?text=')) q.push('no abrió el WhatsApp de Jason: ' + opened.slice(0, 60));
  for (const must of ['Topografía y drenajes', 'Ganadería de precisión', '30 ha', 'Sabanalarga', '6.300.000']) if (!text.includes(must)) q.push('el mensaje no incluye ' + must);
  await qp.close();
  const qm = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await qm.goto(URL.replace(/[^/]*$/, '') + 'servicios.html', { waitUntil: 'networkidle' });
  await qm.locator('#cotizador').scrollIntoViewIfNeeded();
  await qm.click('.opt:has(input[value="agro"])'); await qm.fill('#q-ha', '8');
  const t3 = (await qm.locator('[data-total]').innerText()).replace(/\s/g, '');
  if (!/1\.900\.000/.test(t3)) q.push('en celular, agricultura con 8 ha debía cobrar el mínimo de 10 ha ($1.900.000), salió ' + t3);
  await qm.close();
  add('B09', 'Cotizador: pide lo que falta, suma bien (mínimos incluidos) y abre WhatsApp con el pedido', q);
  add('B08', 'Sin errores en la consola', errors);
  await phone.close(); await page.close();
} finally { await browser.close(); server.close(); }

let bad = 0;
for (const r of results) { console.log(`${r.ok ? 'PASA ' : 'FALLA'} ${r.id} ${r.name}`); if (!r.ok) { bad++; r.fails.slice(0, 12).forEach(f => console.log('       ' + f)); } }
console.log(`\n${results.length - bad} de ${results.length} pruebas de navegador pasan`);
process.exit(bad ? 1 : 0);
