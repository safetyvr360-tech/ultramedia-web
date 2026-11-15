// Ultramedia web: the test suite. Run from the site folder:  node pruebas/run.mjs [--rapido]
// Static checks always; with no --rapido it also runs the design kit's copy, layout and performance checks.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';

const KIT = 'C:/Users/USER/.claude/skills/design-taste-frontend';
const WA = '573006242963';
const PAGES = ['index.html', 'privacidad.html', 'terminos.html', 'creditos.html', '404.html'];
const fast = process.argv.includes('--rapido');
const results = [];
const test = (id, name, fn) => {
  let fails = [];
  try { fails = fn() || []; } catch (e) { fails = ['error: ' + e.message]; }
  results.push({ id, name, ok: fails.length === 0, fails });
};
const read = (f) => readFileSync(f, 'utf8');
const tags = (html, re) => [...html.matchAll(re)];

test('S01', 'Archivos locales (src, srcset, href) existen', () => {
  const out = [];
  for (const p of PAGES) {
    const h = read(p);
    const refs = [];
    for (const m of tags(h, /\s(?:src|href)="([^"]+)"/g)) refs.push(m[1]);
    for (const m of tags(h, /\ssrcset="([^"]+)"/g)) for (const part of m[1].split(',')) refs.push(part.trim().split(/\s+/)[0]);
    for (const r of refs) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(r) || r === '/') continue;
      const f = r.replace(/^\//, '').split('#')[0].split('?')[0];
      if (f && !existsSync(f)) out.push(`${p}: falta ${r}`);
    }
  }
  return out;
});

test('S02', 'Cada enlace #ancla tiene su id', () => {
  const h = read('index.html');
  const ids = new Set(tags(h, /\sid="([^"]+)"/g).map(m => m[1]));
  return tags(h, /href="#([^"]*)"/g).map(m => m[1]).filter(a => a && !ids.has(a)).map(a => `ancla rota #${a}`);
});

test('S03', 'Ids únicos', () => {
  const ids = tags(read('index.html'), /\sid="([^"]+)"/g).map(m => m[1]);
  return ids.filter((x, i) => ids.indexOf(x) !== i).map(x => `id repetido ${x}`);
});

test('S04', 'Enlaces externos con target=_blank llevan rel=noopener', () => {
  const out = [];
  for (const p of PAGES) for (const m of tags(read(p), /<a\s[^>]*target="_blank"[^>]*>/g)) if (!/rel="[^"]*noopener/.test(m[0])) out.push(`${p}: ${m[0].slice(0, 90)}`);
  return out;
});

test('S05', 'WhatsApp de Jason en todos los botones y en el chat; sin el número viejo', () => {
  const out = [];
  const h = read('index.html'), js = read('asistente.js');
  const links = tags(h, /https:\/\/wa\.me\/(\d+)/g).map(m => m[1]);
  if (!links.length) out.push('no hay enlaces de WhatsApp');
  for (const n of links) if (n !== WA) out.push(`enlace a ${n}`);
  if (!js.includes(`WA_NUMBER = '${WA}'`)) out.push('asistente.js no usa el número de Jason');
  for (const f of [...PAGES, 'asistente.js', 'chat.php']) if (read(f).includes('5492604094484')) out.push(`${f} aún tiene el número viejo`);
  return out;
});

test('S06', 'Datos estructurados (JSON-LD) válidos', () => {
  const m = read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return ['no hay JSON-LD'];
  const j = JSON.parse(m[1]);
  return ['@type', 'name', 'url', 'telephone', 'address'].filter(k => !j[k]).map(k => `falta ${k}`);
});

test('S07', 'Cada página tiene lang=es, title, description y viewport', () => {
  const out = [];
  for (const p of PAGES) {
    const h = read(p);
    if (!/<html lang="es"/.test(h)) out.push(`${p}: lang`);
    if (!/<title>[^<]{10,}<\/title>/.test(h)) out.push(`${p}: title`);
    if (!/<meta name="description" content="[^"]{20,}"/.test(h)) out.push(`${p}: description`);
    if (!/name="viewport"/.test(h)) out.push(`${p}: viewport`);
  }
  return out;
});

test('S08', 'Todas las imágenes tienen alt; las de contenido, con texto', () => {
  const out = [];
  for (const m of tags(read('index.html'), /<img\s[^>]*>/g)) {
    const t = m[0];
    if (!/\salt="/.test(t)) out.push(`sin alt: ${t.slice(0, 80)}`);
    else if (/alt=""/.test(t) && !/class="ic\b/.test(t)) out.push(`alt vacío en imagen de contenido: ${t.slice(0, 80)}`);
  }
  return out;
});

test('S09', 'Imágenes con width y height, y lazy fuera del inicio', () => {
  const out = [];
  const h = read('index.html');
  const heroEnd = h.indexOf('id="servicios"');
  for (const m of tags(h, /<img\s[^>]*>/g)) {
    const t = m[0];
    if (!/\swidth="\d+"/.test(t) || !/\sheight="\d+"/.test(t)) out.push(`sin tamaño: ${t.slice(0, 70)}`);
    const peek = /data-peek-for=/.test(t), nav = m.index < h.indexOf('<main');
    if (m.index > heroEnd && !peek && !nav && !/loading="lazy"/.test(t)) out.push(`sin lazy: ${t.slice(0, 70)}`);
  }
  return out;
});

test('S10', 'Sin restos de plantilla (corchetes, TODO, lorem)', () => {
  const out = [];
  for (const p of PAGES) {
    const text = read(p).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
    for (const re of [/\[[A-Za-zÁ-ú ]{3,}\]/, /\bTODO\b/, /lorem ipsum/i]) if (re.test(text)) out.push(`${p}: ${re}`);
  }
  return out;
});

test('S11', 'JavaScript sin errores de sintaxis', () => {
  const r = spawnSync(process.execPath, ['--check', 'asistente.js'], { encoding: 'utf8' });
  return r.status === 0 ? [] : [r.stderr.trim()];
});

test('S12', 'chat.php: protegido y sin la clave en el código', () => {
  const p = read('chat.php'), out = [];
  if (!/HTTP_ORIGIN/.test(p)) out.push('no revisa el origen');
  if (/sk-ant-/.test(p)) out.push('tiene una clave escrita');
  if (!/anthropic-version: 2026-10-21/.test(p)) out.push('versión de API');
  if (!/'model' => 'claude-opus-5-5'/.test(p)) out.push('modelo');
  if (!/out\(429/.test(p)) out.push('sin límite de uso');
  return out;
});

test('S13', 'Respuestas del chat sin servidor (datos guardados)', () => {
  // runs asistente.js's localAnswer on sample questions in a tiny fake page
  const src = read('asistente.js');
  const body = src.slice(src.indexOf('var FACTS'), src.indexOf('host.innerHTML'));
  const head = src.slice(src.indexOf('function nowCO'), src.indexOf('var FACTS'));
  const fn = new Function('WA', 'WA_TEXT', head + body + '; return localAnswer;');
  const ask = fn('https://wa.me/' + WA + '?text=', 'x');
  const cases = [
    ['¿Hacen termografía de paneles solares?', /termografía/i],
    ['cuánto cuesta el seguimiento de obra', /1\.000\.000/],
    ['quiero un render de mi casa', /render/i],
    ['tienen tours 360', /tours? interactivo/i],
    ['marketing para mi inmobiliaria', /6 meses/],
    ['dónde están ubicados', /Barranquilla/],
    ['cuánto cuesta la topografía de mi finca', /160\.000/],
    ['conteo de ganado con drones', /ganadería de precisión/i],
    ['hola', /asistente de Ultramedia/],
    ['¿venden pizza?', /WhatsApp/]
  ];
  const out = [];
  for (const [q, re] of cases) { const a = ask(q); if (!re.test(a.text)) out.push(`"${q}" respondió: ${a.text.slice(0, 80)}`); }
  return out;
});

test('S15', 'Legal: política de datos y términos con lo que exige la ley, enlazados desde el pie', () => {
  const out = [];
  const priv = read('privacidad.html'), term = read('terminos.html'), home = read('index.html');
  for (const [txt, what] of [[/Ley 1581 de 2012/, 'Ley 1581'], [/Decreto 1377|Decreto 1074/, 'decreto reglamentario'], [/id="responsable"/, 'responsable'], [/id="derechos"/, 'derechos del titular'], [/10 días hábiles/, 'plazo de consultas'], [/15 días hábiles/, 'plazo de reclamos'], [/sic\.gov\.co/, 'enlace a la SIC'], [/id="cookies"/, 'cookies'], [/Anthropic/, 'proveedor del chat'], [/Circular Externa 005/, 'transferencia internacional']])
    if (!txt.test(priv)) out.push('privacidad sin ' + what);
  for (const [txt, what] of [[/Ley 1480 de 2011/, 'Estatuto del Consumidor'], [/id="retracto"/, 'retracto'], [/artículo 47/, 'excepción del retracto'], [/artículo 51/, 'reversión del pago'], [/id="pqr"/, 'PQR'], [/id="propiedad"/, 'propiedad intelectual'], [/RAC 100/, 'reglas de vuelo'], [/Ley 527 de 1999/, 'comercio electrónico']])
    if (!txt.test(term)) out.push('términos sin ' + what);
  for (const h of ['privacidad.html"', 'terminos.html"', 'terminos.html#pqr"', 'privacidad.html#cookies"', 'sic.gov.co']) if (!home.includes(h)) out.push('el pie no enlaza ' + h);
  for (const f of ['privacidad.html', 'terminos.html']) for (const m of read(f).matchAll(/href="#([^"]+)"/g)) if (!read(f).includes(`id="${m[1]}"`)) out.push(`${f}: índice roto #${m[1]}`);
  return out;
});

test('S14', 'robots.txt, sitemap.xml, 404 y favicon', () => ['robots.txt', 'sitemap.xml', '404.html', 'favicon.svg', 'share.jpg'].filter(f => !existsSync(f)).map(f => `falta ${f}`));

const run = (id, name, args, okRe) => {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 590000 });
  const txt = (r.stdout || '') + (r.stderr || '');
  const ok = okRe(txt);
  results.push({ id, name, ok, fails: ok ? [] : txt.split('\n').filter(l => /FAIL|WARN|finding|neighbour|screen-|sparse|edge|spill|overflow|hero-/.test(l)).slice(0, 15) });
};
if (!fast) {
  // the one WARN allowed: the facts strip, whose four figures all come from the source sites
  run('K01', 'Textos (copy-lint): 0 FAIL; solo la advertencia de la franja de cifras reales', [join(KIT, 'scripts/copy-lint.mjs'), 'index.html', '--kind', 'service'], t => / 0 FAIL, (0 WARN|1 WARN)/.test(t) && (!/1 WARN/.test(t) || /copy-stat-strip/.test(t)));
  run('K02', 'Diseño en 1440, 1024, 820, 768 y 390', [join(KIT, 'assets/layout/check.mjs'), '--url', 'index.html', '--profile', '.taste-skill/chrome-check', '--sizes', '1440x900,1024x768,820x1180,768x1024,390x844'], t => (t.match(/no findings/g) || []).length === 5);
  run('K03', 'Rendimiento (perf): sin FAIL', [join(KIT, 'scripts/perf.mjs'), 'index.html', '--profile', '.taste-skill/chrome-check'], t => !/^\s*FAIL/m.test(t));
}

let bad = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASA ' : 'FALLA'} ${r.id} ${r.name}`);
  if (!r.ok) { bad++; for (const f of r.fails) console.log('       ' + f); }
}
console.log(`\n${results.length - bad} de ${results.length} pruebas pasan`);
process.exit(bad ? 1 : 0);
