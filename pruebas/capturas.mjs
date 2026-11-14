// Ultramedia web: review screenshots of states the layout check does not shoot.  node pruebas/capturas.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/USER/.claude/skills/playwright-skill/package.json');
const { chromium } = require('playwright');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = normalize(join(ROOT, path === '' || path.endsWith('/') ? path + 'index.html' : path));
  try { const b = await readFile(file); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const U = `http://127.0.0.1:${server.address().port}/`;
const OUT = join(ROOT, 'shots', 'review'); await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const shot = async (name, w, h, fn, full = false) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.route('**/chat.php', r => r.fulfill({ status: 500, body: '{}' }));
  await fn(p); await p.waitForTimeout(500);
  await p.screenshot({ path: join(OUT, name + '.png'), fullPage: full }); await p.close();
};
await shot('footer-1440', 1440, 900, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); });
await shot('menu-drones-1440', 1440, 900, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.hover('.nav__item:has(.nav__menu) > .nav__link'); });
await shot('menu-celular-390', 390, 844, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.click('.nav__toggle'); });
await shot('chat-1440', 1440, 900, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.locator('#asistente').scrollIntoViewIfNeeded(); await p.evaluate(() => scrollTo(0, document.getElementById('asistente').offsetTop)); await p.fill('#um-q', '¿Hacen termografía de paneles solares?'); await p.press('#um-q', 'Enter'); await p.waitForTimeout(1200); });
await shot('chat-390', 390, 844, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.evaluate(() => scrollTo(0, document.getElementById('asistente').offsetTop + 300)); await p.fill('#um-q', 'planes de SkyDeck'); await p.press('#um-q', 'Enter'); await p.waitForTimeout(1200); });
await shot('terminos-1440', 1440, 900, async p => { await p.goto(U + 'terminos.html', { waitUntil: 'networkidle' }); });
await shot('privacidad-390', 390, 844, async p => { await p.goto(U + 'privacidad.html', { waitUntil: 'networkidle' }); });
await shot('404-1440', 1440, 900, async p => { await p.goto(U + '404.html', { waitUntil: 'networkidle' }); });
await shot('drones-390', 390, 844, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.evaluate(() => scrollTo(0, document.getElementById('drones').offsetTop)); });
await shot('estudio-390', 390, 844, async p => { await p.goto(U, { waitUntil: 'networkidle' }); await p.evaluate(() => scrollTo(0, document.getElementById('estudio').offsetTop)); });
await browser.close(); server.close();
console.log('capturas en', OUT);
