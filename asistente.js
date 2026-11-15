// Ultramedia: the chat assistant, inline in #asistente (adapted from the Neural Frames chat).
// It asks /chat.php (Claude) first; when the server has no key, is offline, or the page runs locally,
// it answers from Ultramedia's own facts below. Mon-Fri 8 a.m.-6 p.m. (Colombia) it offers a person on WhatsApp.
(function () {
  'use strict';
  // WhatsApp number in one place (Jason).
  var WA_NUMBER = '573006242963';
  var WA = 'https://wa.me/' + WA_NUMBER + '?text=';
  var WA_TEXT = 'Hola, vengo del chat de la web de Ultramedia y quiero hablar con alguien del equipo.';
  var KEY = 'um-bot-v1';
  var MAX_TURNS = 12;

  // keep every WhatsApp button on the page on the same number
  document.querySelectorAll('a[data-wa]').forEach(function (a) { a.href = 'https://wa.me/' + WA_NUMBER; });

  var host = document.querySelector('[data-chat]');
  if (!host) return;

  function nowCO() {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return { day: o.weekday, hour: parseInt(o.hour, 10) };
    } catch (e) { var d = new Date(); return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], hour: d.getHours() }; }
  }
  function open() { var n = nowCO(); return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(n.day) > -1 && n.hour >= 8 && n.hour < 18; }
  function waAction() {
    return { label: open() ? 'Hablar con una persona por WhatsApp' : 'Dejar mensaje por WhatsApp', href: WA + encodeURIComponent(WA_TEXT), wa: true };
  }
  function handoff() {
    return open()
      ? 'Ahora mismo hay alguien del equipo en WhatsApp (lunes a viernes, 8 a.m. a 6 p.m.).'
      : 'El equipo responde por WhatsApp de lunes a viernes, de 8 a.m. a 6 p.m. Déjanos tu mensaje y te escribimos en ese horario.';
  }
  var SKYDECK = { label: 'Pedir un vuelo en SkyDeck', href: 'https://skydeck.dronesbaq.com' };
  var FICHA = { label: 'Ficha técnica (PDF)', href: 'http://dronesbaq.com/wp-content/uploads/2026/10/Servicios_Termograficos_Drones_Barranquilla_peq.pdf' };
  var PROYECTOS = { label: 'Ver los proyectos', href: '#proyectos' };

  // answers from Ultramedia's facts (used when the AI is not available)
  var FACTS = [
    { k: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'saludos'],
      a: '¡Hola! Soy el asistente de Ultramedia. ¿Buscas visualización 3D, drones para obra o industria, o marketing para tu inmobiliaria?' },
    { k: ['termograf', 'termic', 'solar', 'panel', 'fotovolta', 'industrial', 'industria', 'subestacion', 'red electrica', 'redes electricas', 'cubierta', 'techo', 'inspeccion'],
      a: 'Hacemos termografía aérea con drones para paneles solares, infraestructura industrial, redes eléctricas y edificaciones o cubiertas. Detecta anomalías térmicas antes de que causen pérdidas o paradas. Se cotiza según el sitio; la ficha técnica tiene el detalle.', wa: true, x: [FICHA] },
    { k: ['topograf', 'conteo de ganado', 'finca', 'campo', 'predio', 'hacienda', 'agricultura', 'cultivo', 'siembra', 'ndvi', 'multiespectral', 'ganado', 'ganaderia', 'vacas', 'potrero', 'drenaje', 'curvas de nivel', 'sig'],
      a: 'Para fincas hacemos drones y SIG (precios de lanzamiento, antes de IVA): topografía y drenajes desde $160.000 por hectárea (mínimo $1.800.000), agricultura de precisión con mapa NDVI desde $190.000 por hectárea por vuelo (mínimo 10 ha), diseño de cultivos desde $2.500.000 (hasta 20 ha), diagnóstico predial desde $2.200.000 (hasta 10 ha) y ganadería de precisión desde $1.500.000 por visita (hasta 50 ha).', wa: true, x: [{ label: 'Ver drones para fincas', href: '#campo' }] },
    { k: ['skydeck', 'obra', 'avance', 'seguimiento', 'constructora', 'vuelo', 'piloto'],
      a: 'Para obras usamos SkyDeck: un piloto verificado de la zona vuela la obra y cada visita queda guardada para compararla. Avance de obra: 1 vuelo al mes, unos $1.000.000 al mes por obra. Seguimiento: 2 vuelos al mes con modelos 3D y mediciones, unos $1.800.000. Constructora: a medida. Precios antes de IVA; también hay vuelos sueltos.', x: [SKYDECK] },
    { k: ['drone', 'dron', 'aereo', 'aerea', 'ortomosaico', 'hidrolog', 'mapa'],
      a: 'Con drones hacemos termografía industrial, topografía y SIG para fincas, mapas y modelos 3D, estudios hidrológicos y seguimiento de obra con SkyDeck. ¿Es para una obra, una finca o una planta?', x: [SKYDECK, FICHA] },
    { k: ['render', 'imagen', 'fotorreal', 'modelado', 'modelo 3d', 'plano', 'planos', 'bim'],
      a: 'Hacemos modelado 3D a partir de tus planos, renders fotorrealistas y video 360° estereoscópico, con metodología BIM si el proyecto lo necesita. El precio depende del tamaño del proyecto: cuéntanos qué tienes y te cotizamos.', wa: true },
    { k: ['tour', 'recorrido', '360', 'interactivo', 'virtual', 'vr', 'realidad virtual', 'visor'],
      a: 'Los tours interactivos abren en el celular, el computador o un visor de realidad virtual, y pueden cambiar materiales en tiempo real. Puedes probar el del Fuerte San Rafael o los de la sección de proyectos.', x: [{ label: 'Recorrer el Fuerte San Rafael', href: 'https://estudiofbx.com/fuertesanrafael/' }, PROYECTOS] },
    { k: ['aumentada', 'ar ', 'tablet'],
      a: 'Con realidad aumentada ves el modelo a escala sobre el terreno o sobre una mesa, desde una tablet o un celular.', wa: true },
    { k: ['inmobiliaria', 'propiedad', 'propiedades', 'marketing', 'meta ads', 'loteo', 'lote', 'masterplan'],
      a: 'Para inmobiliarias usamos el método de Estudio FBX: diagnóstico (1 semana), plan de acción (1 semana), ejecución (8 a 12 semanas) y mantenimiento. Incluye fotografía HDR, tour 360°, video, drone y Masterplan 360 para loteos. El contrato mínimo es de 6 meses.', wa: true, x: [{ label: 'Ver el método', href: '#inmobiliarias' }] },
    { k: ['precio', 'precios', 'cuanto', 'cuesta', 'valor', 'tarifa', 'cotiza', 'cotizacion', 'presupuesto'],
      a: 'Los planes de SkyDeck para obra son de unos $1.000.000 y $1.800.000 al mes por obra. La visualización 3D, la termografía y el marketing inmobiliario se cotizan según el proyecto. Escríbenos por WhatsApp con lo que necesitas.', wa: true, g: true },
    { k: ['proyecto', 'proyectos', 'portafolio', 'ejemplo', 'trabajos'],
      a: 'Algunos proyectos: Plaza Urbina en Ambato, Casa San Martín, Box House, Rivendel Lodge y el Fuerte San Rafael del Diamante, hecho con el Municipio de San Rafael y el CONICET.', x: [PROYECTOS] },
    { k: ['equipo', 'quienes', 'jason', 'matias', 'arquitect'],
      a: 'Ultramedia la dirige Jason Carrero. En el equipo hay arquitectos para diseño, documentación y BIM, y Matías Carrisi en modelado 3D, Unreal Engine y tours.', x: [{ label: 'Ver el equipo', href: '#equipo' }] },
    { k: ['donde', 'ubicad', 'ciudad', 'barranquilla', 'pais', 'paises'],
      a: 'Estamos en Barranquilla, Colombia, y hemos trabajado en Colombia, Argentina, España y Estados Unidos. Las reuniones pueden ser por videollamada.' },
    { k: ['contacto', 'whatsapp', 'telefono', 'llamar', 'correo', 'email', 'persona', 'humano', 'asesor'],
      a: function () { return handoff(); }, wa: true },
    { k: ['gracias', 'perfecto', 'listo', 'genial'],
      a: 'Con gusto. Cuando quieras arrancar, escríbenos por WhatsApp.', wa: true }
  ];
  function plain(s) { return (' ' + s + ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' '); }
  function localAnswer(q) {
    var t = plain(q), best = null, score = 0;
    FACTS.forEach(function (f, i) {
      var s = 0;
      f.k.forEach(function (k) { if (t.indexOf(k.length < 4 ? ' ' + k.trim() + ' ' : k) > -1) s += k.length; });
      if (f.g) s = s * 0.4;
      if (i === 0) s = Math.min(s, 1);
      if (s > score) { score = s; best = f; }
    });
    if (!best) return { text: 'No tengo ese dato a la mano. ' + handoff(), actions: [waAction()] };
    var acts = (best.x || []).slice();
    if (best.wa) acts.unshift(waAction());
    return { text: typeof best.a === 'function' ? best.a() : best.a, actions: acts };
  }

  host.innerHTML =
    '<div class="chat">' +
    '<div class="chat__head"><span class="chat__av" aria-hidden="true"><span class="mark" data-mark="ring"></span></span><div><b>Asistente de Ultramedia</b><span class="chat__status"><i class="chat__live" aria-hidden="true"></i><span class="chat__status-text"></span></span></div></div>' +
    '<div class="chat__log" aria-live="polite"></div>' +
    
    '<form class="chat__form"><label class="chat__label" for="um-q">Tu pregunta</label>' +
    '<div class="chat__row"><input id="um-q" name="q" type="text" maxlength="500" autocomplete="off" required>' +
    '<button type="submit" class="chat__send" aria-label="Enviar la pregunta"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 13V3.5M3.8 7.5 8 3.3l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></form>' +
    '</div>';

  var log = host.querySelector('.chat__log'), form = host.querySelector('form'), input = host.querySelector('input'),
      chips = Object.assign(document.createElement('div'), { className: 'chat__chips' }), status = host.querySelector('.chat__status-text'), send = host.querySelector('.chat__send');
  var history = [], busy = false, aiOff = false;

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-MAX_TURNS * 2))); } catch (e) {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }

  function bubble(role, text, actions) {
    var m = document.createElement('div'); m.className = 'chat__msg chat__msg--' + (role === 'user' ? 'out' : 'in');
    String(text).split(/\n+/).forEach(function (line) { if (!line.trim()) return; var p = document.createElement('p'); p.textContent = line; m.appendChild(p); });
    if (actions && actions.length) {
      var row = document.createElement('div'); row.className = 'chat__acts';
      actions.forEach(function (a) {
        var l = document.createElement('a'); l.href = a.href; l.textContent = a.label;
        l.className = 'chat__act' + (a.wa ? ' chat__act--wa' : '');
        if (/^https?:/.test(a.href)) { l.target = '_blank'; l.rel = 'noopener'; }
        row.appendChild(l);
      });
      m.appendChild(row);
    }
    log.appendChild(m); log.scrollTo({ top: log.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function typing(on) {
    var t = log.querySelector('.chat__typing');
    if (on && !t) { t = document.createElement('div'); t.className = 'chat__msg chat__msg--in chat__typing'; t.setAttribute('aria-label', 'Escribiendo'); t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight; }
    if (!on && t) t.remove();
  }
  function setChips() {
    chips.innerHTML = '';
    log.appendChild(chips); // the suggestions follow the latest message
    ['Termografía con drones', 'Drones para fincas', 'Planes de SkyDeck', 'Tours y renders'].forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chat__chip'; b.textContent = c;
      b.addEventListener('click', function () { ask(c); });
      chips.appendChild(b);
    });
    log.scrollTop = log.scrollHeight;
  }
  function refreshStatus() { status.textContent = open() ? 'En línea · equipo en WhatsApp ahora' : 'En línea · equipo de lunes a viernes, 8 a.m. a 6 p.m.'; }

  function askAI() {
    if (aiOff || location.protocol === 'file:') return Promise.resolve(null);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
    return fetch('chat.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages: history.slice(-MAX_TURNS * 2) }), signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (r.status === 404 || r.status === 405 || r.status === 503) aiOff = true; // no server script here (a static host answers 404 or 405), or no key yet
      return r.ok ? r.json() : null;
    }).then(function (j) { return j && j.ok && j.reply ? j : null; })
      .catch(function () { clearTimeout(timer); return null; });
  }

  function ask(q) {
    q = String(q || '').trim().slice(0, 500);
    if (!q || busy) return;
    busy = true; chips.innerHTML = ''; send.disabled = true; host.querySelector('.chat').setAttribute('aria-busy', 'true');
    bubble('user', q); history.push({ role: 'user', content: q }); save();
    typing(true);
    askAI().then(function (j) {
      typing(false);
      var text, acts;
      if (j) { text = j.reply; acts = []; if (j.whatsapp) acts.push(waAction()); if (j.skydeck) acts.push(SKYDECK); }
      else { var l = localAnswer(q); text = l.text; acts = l.actions; }
      bubble('assistant', text, acts);
      history.push({ role: 'assistant', content: text }); save();
      busy = false; send.disabled = false; host.querySelector('.chat').removeAttribute('aria-busy'); setChips();
    });
  }

  refreshStatus();
  history = load();
  if (history.length) history.forEach(function (m) { bubble(m.role, m.content); });
  else bubble('assistant', 'Hola, soy el asistente de Ultramedia. Pregúntame lo que quieras o elige un tema.');
  setChips();
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; ask(v); });
})();
