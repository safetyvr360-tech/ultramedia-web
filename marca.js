// Ultramedia brand motion: the drifting point network behind the hero, the light that follows the pointer
// on glass cards. It stays still under reduced motion, and the network only runs on screens 768px and wider while the hero is in view.
(function () {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the light that follows the pointer across a glass card */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.rows > li, .tile, .card, .fig').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
  }

  /* the hero network: points drift and join when close, pulled gently toward the pointer */
  var cv = document.querySelector('.hero-net');
  if (!cv || !cv.getContext || !window.matchMedia('(min-width: 768px)').matches) return;
  var cx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, pts = [], mouse = { x: -1e4, y: -1e4 }, on = true, raf = 0;
  function size() {
    var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(90, Math.max(28, W * H / 16000))); pts = [];
    for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.4 + .6 });
  }
  function draw() {
    cx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!still) {
        var dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 32000) { p.vx += dx * 0.00002; p.vy += dy * 0.00002; }
        p.vx *= .995; p.vy *= .995; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, e2 = ex * ex + ey * ey;
        if (e2 < 15000) { cx.strokeStyle = 'rgba(60,213,245,' + (0.22 * (1 - e2 / 15000)).toFixed(3) + ')'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(q.x, q.y); cx.stroke(); }
      }
      cx.fillStyle = 'rgba(127,233,255,.75)'; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
    }
    if (!still && on) raf = requestAnimationFrame(draw);
  }
  size(); draw();
  window.addEventListener('resize', function () { size(); if (still) draw(); });
  if (still) return;
  cv.parentElement.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  cv.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -1e4; });
  new IntersectionObserver(function (es) { var vis = es[0].isIntersecting; if (vis && !on) { on = true; draw(); } else if (!vis) { on = false; cancelAnimationFrame(raf); } }).observe(cv);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { on = false; cancelAnimationFrame(raf); } else if (!on) { on = true; draw(); } });
})();
