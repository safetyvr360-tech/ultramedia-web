// Ultramedia: the farm services quote builder (#cotizador). Pick services and the farm's area; the estimate
// updates as you go, and "Cotizar por WhatsApp" opens WhatsApp with the whole quote written out.
(function () {
  'use strict';
  var form = document.getElementById('cotizador');
  if (!form) return;
  var WA_NUMBER = '573006242963';

  // prices: launch "from" prices, before VAT (the same as the section and the chat)
  var SVC = {
    topo:    { name: 'Topografía y drenajes',    calc: function (ha) { return { v: Math.max(160000 * ha, 1800000), d: ha + ' ha × $160.000 (mínimo $1.800.000)' }; } },
    agro:    { name: 'Agricultura de precisión', calc: function (ha) { var h = Math.max(ha, 10); return { v: 190000 * h, d: h + ' ha × $190.000 por vuelo' + (ha < 10 ? ' (mínimo 10 ha)' : '') }; } },
    diseno:  { name: 'Diseño de cultivos',       calc: function (ha) { return { v: 2500000, d: ha > 20 ? 'Precio base; más de 20 ha se confirma' : 'Finca de hasta 20 ha', from: ha > 20 }; } },
    predial: { name: 'Diagnóstico predial',      calc: function (ha) { return { v: 2200000, d: ha > 10 ? 'Precio base; más de 10 ha se confirma' : 'Predio de hasta 10 ha', from: ha > 10 }; } },
    ganado:  { name: 'Ganadería de precisión',   calc: function (ha) { var n = Math.max(1, Math.ceil(ha / 50)); return { v: 1500000 * n, d: n + (n === 1 ? ' visita' : ' visitas') + ' de hasta 50 ha' }; } }
  };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('es-CO'); };
  var lines = form.querySelector('.quote__lines'), total = form.querySelector('[data-total]'), status = form.querySelector('[data-q-status]');
  var haIn = form.querySelector('#q-ha'), munIn = form.querySelector('#q-mun');
  var haErr = form.querySelector('#q-ha-err'), svcErr = form.querySelector('#q-svc-err'), opts = form.querySelector('.quote__opts');

  function area() { var v = parseFloat(String(haIn.value).replace(/\s/g, '').replace(',', '.')); return isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : 0; }
  function picked() { return [].slice.call(form.querySelectorAll('input[name="svc"]:checked')).map(function (i) { return i.value; }); }

  function quote() {
    var ha = area(), items = picked().map(function (k) { var r = SVC[k].calc(ha || 1); return { k: k, name: SVC[k].name, v: r.v, d: r.d, from: r.from }; });
    return { ha: ha, items: items, sum: items.reduce(function (a, i) { return a + i.v; }, 0) };
  }

  function render() {
    var q = quote();
    lines.innerHTML = '';
    if (!q.items.length) { lines.innerHTML = '<li class="quote__empty">Elige un servicio para ver el estimado.</li>'; }
    q.items.forEach(function (i) {
      var li = document.createElement('li');
      var a = document.createElement('span'); a.className = 'quote__name'; a.textContent = i.name;
      var d = document.createElement('small'); d.textContent = q.ha ? i.d : 'Escribe el área para calcular';
      var v = document.createElement('span'); v.className = 'quote__value'; v.textContent = money(i.v);
      a.appendChild(d); li.appendChild(a); li.appendChild(v); lines.appendChild(li);
    });
    total.textContent = money(q.sum);
    form.querySelectorAll('.opt').forEach(function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); });
  }

  function message(q) {
    var t = ['Hola, quiero cotizar con Ultramedia (drones y SIG para fincas).', ''];
    t.push('Área de la finca: ' + q.ha + ' ha');
    if (munIn.value.trim()) t.push('Municipio: ' + munIn.value.trim().slice(0, 80));
    t.push('', 'Servicios:');
    q.items.forEach(function (i) { t.push('- ' + i.name + ': ' + (i.from ? 'desde ' : '') + money(i.v) + ' (' + i.d + ')'); });
    t.push('', 'Estimado desde ' + money(q.sum) + ' antes de IVA.');
    return t.join('\n');
  }

  function showErr(input, err, on) {
    err.hidden = !on;
    if (input) { if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }

  form.addEventListener('change', render);
  form.addEventListener('input', render);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = quote(), bad = 0;
    showErr(null, svcErr, !q.items.length); if (!q.items.length) { bad++; opts.classList.add('is-invalid'); } else opts.classList.remove('is-invalid');
    showErr(haIn, haErr, !q.ha); if (!q.ha) bad++;
    if (bad) {
      status.textContent = bad === 1 ? 'Falta 1 dato para cotizar.' : 'Faltan ' + bad + ' datos para cotizar.';
      (!q.items.length ? form.querySelector('input[name="svc"]') : haIn).focus();
      return;
    }
    status.textContent = 'Abrimos WhatsApp con tu cotización.';
    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message(q));
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  });
  render();
  window.__cotizador = { quote: quote, message: message }; // for the tests
})();
