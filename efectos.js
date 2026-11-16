// A soft magenta light under the pointer on the cards, so the surface answers the hand. Fine pointers only, and off
// when the visitor asks for less motion.
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const sel = '.rows > li, .card.card--open, .faq .faq__item, .fig';
  let raf = 0, last = null;
  document.addEventListener('pointermove', (e) => {
    last = e;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = last.target.closest && last.target.closest(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (last.clientX - r.left) + 'px');
      el.style.setProperty('--my', (last.clientY - r.top) + 'px');
    });
  }, { passive: true });
})();
