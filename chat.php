<?php
// Ultramedia: the chat assistant's server side. The page posts {messages:[{role,content}...]} here;
// this answers with {ok, reply, whatsapp, skydeck}. With no API key it returns 503 and the page
// answers from its own facts (asistente.js).
//
// The key: set the environment variable ANTHROPIC_API_KEY on the hosting, or put the key alone in
// a file one level ABOVE the public folder named anthropic.key. Never inside the public folder.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false]);

// only this site's own pages may use the assistant (stops others from spending the API key)
$host = strtolower($_SERVER['HTTP_HOST'] ?? '');
$from = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$fromHost = strtolower((string) parse_url($from, PHP_URL_HOST));
if ($host === '' || $fromHost === '' || $fromHost !== preg_replace('/:\d+$/', '', $host)) out(403, ['ok' => false]);

$rawIn = file_get_contents('php://input', false, null, 0, 40000);
function cut($t, $n) { return function_exists('mb_substr') ? mb_substr($t, 0, $n) : substr($t, 0, $n); }

$key = getenv('ANTHROPIC_API_KEY');
if (!$key) {
  $f = dirname($_SERVER['DOCUMENT_ROOT'] ?? __DIR__) . '/anthropic.key';
  if (is_readable($f)) $key = trim(file_get_contents($f));
}
if (!$key) out(503, ['ok' => false, 'error' => 'no-key']);

// simple limit: 30 questions per visitor IP per hour
$ip = preg_replace('/[^0-9a-f:.]/i', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
$bucket = sys_get_temp_dir() . '/um-chat-' . md5($ip) . '-' . date('YmdH');
$n = is_readable($bucket) ? (int) file_get_contents($bucket) : 0;
if ($n >= 30) out(429, ['ok' => false, 'error' => 'limit']);
@file_put_contents($bucket, (string) ($n + 1));

$in = json_decode($rawIn, true);
$msgs = [];
foreach (array_slice(is_array($in['messages'] ?? null) ? $in['messages'] : [], -24) as $m) {
  $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
  $text = trim(cut((string) ($m['content'] ?? ''), 800));
  if ($text === '') continue;
  if ($msgs && end($msgs)['role'] === $role) { $msgs[count($msgs) - 1]['content'] .= "\n" . $text; continue; }
  $msgs[] = ['role' => $role, 'content' => $text];
}
while ($msgs && $msgs[0]['role'] !== 'user') array_shift($msgs);
if (!$msgs || end($msgs)['role'] !== 'user') out(400, ['ok' => false]);

$system = <<<TXT
Eres el asistente de la web de Ultramedia (Ultramedia Tech), un estudio de Barranquilla, Colombia, dirigido por Jason Carrero. Respondes en español de Colombia, con tuteo, en 1 a 4 frases cortas, sin listas largas ni markdown.

Lo que hace Ultramedia:
- Visualización 3D para constructoras, inmobiliarias, desarrolladores y organismos públicos: modelado 3D a partir de planos, renders fotorrealistas y video 360° estereoscópico, tours interactivos web (celular, computador o visor VR, con cambio de materiales en tiempo real), realidad virtual, realidad aumentada y metodología BIM.
- Proyectos publicados: Plaza Urbina (remodelación del mercado en Ambato, Ecuador), Casa San Martín, Box House, Rivendel Lodge (paisajismo con Verónica Pellegrini), Jardines de Gingins, Marble Viewer, TwinSip (antes y después de obra) y el Fuerte San Rafael del Diamante (realidad virtual hecha con el Municipio de San Rafael, Mendoza, y el CONICET; salió en Sitio Andino, Diario San Rafael y Media Mendoza).
- Drones industriales (línea nueva): termografía aérea para paneles solares, infraestructura industrial, redes eléctricas y edificaciones o cubiertas; detecta anomalías térmicas antes de que causen pérdidas, fallas o paradas. También mapas y modelos 3D, topografía y estudios hidrológicos. Se cotizan según el sitio; no des precios para estos.
- Drones y SIG para fincas (precios de lanzamiento, desde, antes de IVA; el valor final depende del área, el acceso y la ubicación): topografía y drenajes (ortofoto, modelo del terreno, curvas de nivel y drenajes) desde $160.000 por hectárea, mínimo $1.800.000; agricultura de precisión (vuelo multiespectral y mapa de vigor NDVI por lote) desde $190.000 por hectárea por vuelo, mínimo 10 ha; diseño de cultivos (lotes, surcos y drenajes sobre la ortofoto) desde $2.500.000 para fincas de hasta 20 ha; diagnóstico predial (áreas, linderos de referencia, usos del suelo e informe SIG; no reemplaza un levantamiento catastral oficial) desde $2.200.000 hasta 10 ha; ganadería de precisión (conteo de animales, potreros, aguaderos y cercas) desde $1.500.000 por visita de hasta 50 ha.
- Drones para obras con SkyDeck (https://skydeck.dronesbaq.com): un piloto verificado de la zona vuela la obra y cada visita queda guardada para compararla en un visor. Planes mensuales por obra, en pesos antes de IVA: Avance de obra, 1 vuelo al mes, alrededor de $1.000.000; Seguimiento, 2 vuelos al mes con modelos 3D, mediciones y usuarios ilimitados, alrededor de $1.800.000; Constructora, varias obras, a medida. También hay vuelos sueltos sin suscripción.
- Marketing inmobiliario con el método de Estudio FBX: análisis integral, posicionamiento (Meta Ads y analítica) y producción de activos (fotografía HDR, tour 360°, video, drone y Masterplan 360 para loteos con precio, superficie y financiación por lote). Etapas: diagnóstico 1 semana, plan de acción 1 semana, ejecución 8 a 12 semanas, mantenimiento continuo. Contrato mínimo de 6 meses.
- Han trabajado en Colombia, Argentina, España y Estados Unidos. El equipo responde por WhatsApp de lunes a viernes, de 8 a.m. a 6 p.m.

Reglas:
- No inventes precios, plazos, clientes ni datos que no estén arriba. Si no sabes algo, dilo y ofrece hablar con el equipo por WhatsApp.
- Para cotizar visualización 3D, termografía o marketing inmobiliario, invita a escribir por WhatsApp.
- No pidas datos personales. Si alguien los escribe, no los repitas.
- Si te piden algo ajeno a Ultramedia, responde en una frase que solo ayudas con los servicios del estudio.
TXT;

$body = [
  'model' => 'claude-opus-5-5',
  'max_tokens' => 1024,
  'system' => $system,
  'output_config' => ['effort' => 'low'],
  'fallbacks' => 'default',
  'messages' => $msgs,
];

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 40,
  CURLOPT_HTTPHEADER => [
    'content-type: application/json',
    'x-api-key: ' . $key,
    'anthropic-version: 2026-10-21',
    'anthropic-beta: server-side-fallback-2026-07-01',
  ],
  CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
]);
$raw = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false || $code !== 200) out(502, ['ok' => false, 'error' => 'upstream', 'status' => $code]);
$res = json_decode($raw, true);
if (($res['stop_reason'] ?? '') === 'refusal') {
  out(200, ['ok' => true, 'reply' => 'Eso no lo puedo responder aquí. Si es sobre un proyecto, escríbele al equipo por WhatsApp.', 'whatsapp' => true]);
}
$reply = '';
foreach ($res['content'] ?? [] as $b) if (($b['type'] ?? '') === 'text') $reply .= $b['text'];
$reply = trim($reply);
if ($reply === '') out(502, ['ok' => false, 'error' => 'empty']);

out(200, [
  'ok' => true,
  'reply' => $reply,
  'whatsapp' => (bool) preg_match('/whats ?app|cotiz|equipo/i', $reply),
  'skydeck' => (bool) preg_match('/skydeck|obra/i', $reply),
]);
