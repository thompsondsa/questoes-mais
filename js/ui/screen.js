// Desenha cabeçalho, identificação, enunciado, alternativas, feedback e barra inferior.
import { renderAlternatives } from './alternatives.js';
const $ = (id) => document.getElementById(id);
const L = 'ABCDE';

export function renderScreen({ store, nav }, actions) {
  const q = nav.current(), s = store.get(q.id), total = nav.qs.length, e = q.exam;
  $('code').textContent = 'Questão ' + q.id;
  $('disc').textContent = q.disc;
  $('num').textContent = String(nav.i + 1).padStart(2, '0');
  $('num').style.setProperty('--p', ((nav.i + 1) / total * 100) + '%');
  $('tot').textContent = 'de ' + total;
  $('meta').innerHTML = `<b>Ano:</b> ${e.ano} &nbsp; <b>Banca:</b> <span id="m1"></span><br><b>Órgão:</b> <span id="m2"></span><br><b>Cargo:</b> <span id="m3"></span><br><b>Prova:</b> <span id="m4"></span>` +
    (s.favorite || s.review || s.note || s.comment ? '<br>' : '') + (s.favorite ? '<span class="pill">★ Favorita</span>' : '') + (s.review ? '<span class="pill">⚑ Revisão</span>' : '') + (s.note ? '<span class="pill">✎ Anotação</span>' : '') + (s.comment ? '<span class="pill">💬 Comentário</span>' : '');
  $('m1').textContent = e.banca; $('m2').textContent = e.orgao; $('m3').textContent = e.cargo; $('m4').textContent = e.concurso;
  $('stem').textContent = q.stem;
  renderAlternatives($('alts'), q, s, actions);
  $('go').disabled = s.done || s.sel === null;
  $('go').textContent = s.done ? 'Resolvida' : 'Resolver';
  const fb = $('fb');
  if (s.done) {
    fb.innerHTML = `<div class="fb"><b>${s.sel === q.ans ? 'Você acertou!' : 'Você errou.'}</b> Gabarito: alternativa ${L[q.ans]}.<br><button class="xp" id="xp">Ver explicação comentada</button></div>`;
    $('xp').onclick = actions.onExplain;
  } else fb.innerHTML = '';
  $('prev').disabled = nav.i === 0;
  $('next').disabled = nav.i === total - 1;
}
