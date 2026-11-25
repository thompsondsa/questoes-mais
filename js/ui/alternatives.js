// Cartões de alternativa: toque seleciona; deslize lateral risca/desfaz (com tesoura).
import { SCISSORS } from './icons.js';
const L = 'ABCDE';

export function renderAlternatives(box, q, s, { onSelect, onToggleCut }) {
  box.innerHTML = '';
  q.alts.forEach((text, i) => {
    const cut = s.cut.includes(i);
    const el = document.createElement('div');
    el.className = 'alt' + (cut ? ' cut' : '') + (s.sel === i && !s.done ? ' sel' : '') +
      (s.done ? ' lock' + (i === q.ans ? ' ok' : i === s.sel ? ' bad' : '') : '');
    el.dataset.i = i;
    el.innerHTML = `<div class="chip">${cut && !s.done ? SCISSORS : L[i]}</div><div class="t"></div>`;
    el.querySelector('.t').textContent = text;
    if (!s.done) bind(el, i, onSelect, onToggleCut);
    box.appendChild(el);
  });
}

function bind(el, i, onSelect, onToggleCut) {
  let x0 = null, dx = 0, id = null;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; id = e.pointerId; });
  el.addEventListener('pointermove', (e) => {
    if (x0 === null || e.pointerId !== id) return;
    dx = e.clientX - x0;
    if (Math.abs(dx) > 8) el.style.transform = `translateX(${Math.max(-60, Math.min(60, dx))}px)`;
  });
  el.addEventListener('pointerup', () => {
    if (x0 === null) return;
    const d = dx; x0 = null; el.style.transform = '';
    if (Math.abs(d) >= 50) onToggleCut(i); else if (Math.abs(d) < 10) onSelect(i);
  });
  el.addEventListener('pointercancel', () => { x0 = null; el.style.transform = ''; });
}
