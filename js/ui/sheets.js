// Painéis inferiores (informações, comentários, anotações, histórico, recursos, dados, filtro, ir para questão).
import { exportToFile, importFromFile } from '../backup/files.js';
const L = 'ABCDE';
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createSheets(ctx) {
  const { store, nav, adapter, changed, env } = ctx;
  let flushPending = null;
  const show = (html) => { $('sheet').innerHTML = html; $('ov').classList.add('on'); };
  const close = () => { if (flushPending) { flushPending(); flushPending = null; } $('ov').classList.remove('on'); changed(); };
  $('ov').addEventListener('click', (e) => { if (e.target === $('ov')) close(); });
  const on = (sel, fn) => $('sheet').querySelectorAll(sel).forEach((el) => el.addEventListener('click', () => fn(el)));
  const textarea = (id, field) => { // salva com debounce e ao fechar
    const ta = $(id); let t = null;
    const save = () => { clearTimeout(t); t = null; store.update(nav.current().id, { [field]: ta.value.slice(0, 20000) }); };
    ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 300); flushPending = () => { if (t) save(); }; });
  };

  const api = {
    close,
    goto() {
      show('<h2>Ir para questão</h2><div class="grid">' + nav.qs.map((q, i) => { const s = store.get(q.id); return `<button class="g${i === nav.i ? ' cur' : ''}${s.done ? (s.sel === q.ans ? ' hit' : ' miss') : ''}" data-i="${i}">${i + 1}</button>`; }).join('') + '</div><div class="legend">Verde: acertou · Vermelho: errou · Borda azul: atual</div>');
      on('.g', (el) => { nav.goto(+el.dataset.i); close(); });
    },
    filter() {
      const o = [['all', 'Todas'], ['open', 'Não resolvidas'], ['done', 'Resolvidas'], ['fav', 'Favoritas'], ['review', 'Marcadas para revisão']];
      show('<h2>Filtro</h2><p>Escolha quais questões navegar:</p>' + o.map(([k, n]) => `<button class="opt${nav.filter === k ? ' on' : ''}" data-f="${k}">${n}</button>`).join('') + '<div class="st" id="fmsg"></div>');
      on('.opt', (el) => { if (nav.setFilter(el.dataset.f)) close(); else $('fmsg').textContent = 'Nenhuma questão neste filtro.'; });
    },
    info() {
      const q = nav.current(), e = q.exam;
      show(`<h2>Informações</h2><p><b>Disciplina:</b> ${esc(q.disc)}</p><p><b>Banca:</b> ${esc(e.banca)}</p><p><b>Órgão:</b> ${esc(e.orgao)}</p><p><b>Cargo:</b> ${esc(e.cargo)}</p><p><b>Ano:</b> ${e.ano}</p><p class="legend">Dados fictícios, apenas para demonstração.</p>`);
    },
    comments() {
      const q = nav.current(), s = store.get(q.id);
      show(`<h2>Comentários</h2><span class="lbl">Explicação comentada</span>${s.done ? `<p>${esc(q.com)}</p>` : '<p>A explicação fica disponível após clicar em Resolver.</p>'}<span class="lbl">Meu comentário pessoal</span><textarea class="ta" id="tc" placeholder="Escreva seu comentário...">${esc(s.comment)}</textarea>`);
      textarea('tc', 'comment');
    },
    notes() {
      const s = store.get(nav.current().id);
      show(`<h2>Anotações</h2><textarea class="ta" id="tn" style="min-height:160px" placeholder="Anotações sobre esta questão...">${esc(s.note)}</textarea>`);
      textarea('tn', 'note');
    },
    history() {
      const q = nav.current(), a = store.attemptsOf(q.id).reverse();
      show('<h2>Histórico de tentativas</h2>' + (a.length ? a.map((x) => `<p>${new Date(x.ts).toLocaleString('pt-BR')} — marcou ${L[x.choice]} (${x.correct ? 'acertou' : 'errou'})</p>`).join('') : '<p>Nenhuma tentativa nesta questão.</p>'));
    },
    resources() {
      const s = store.get(nav.current().id);
      show(`<h2>Recursos</h2>
<button class="opt" data-a="fav">${s.favorite ? '★ Remover dos favoritos' : '☆ Favoritar questão'}</button>
<button class="opt" data-a="review">${s.review ? '⚑ Remover marca de revisão' : '⚐ Marcar para revisão'}</button>
<button class="opt" data-a="notes">✎ Anotações</button>
<button class="opt" data-a="history">⏱ Histórico de tentativas</button>
<button class="opt" data-a="cut">Limpar todos os riscos</button>
<button class="opt" data-a="redo">Refazer esta questão</button>
<button class="opt" data-a="all">Reiniciar caderno</button>
<button class="opt" data-a="data">⚙ Dados, backup e offline</button>`);
      on('.opt', async (el) => {
        const id = nav.current().id, a = el.dataset.a;
        if (a === 'fav') { store.update(id, { favorite: !s.favorite }); close(); }
        else if (a === 'review') { store.update(id, { review: !s.review }); close(); }
        else if (a === 'notes') api.notes();
        else if (a === 'history') api.history();
        else if (a === 'cut') { store.update(id, { cut: [] }); close(); }
        else if (a === 'redo') { store.resetQuestion(id); close(); }
        else if (a === 'all') { await store.resetAll(); close(); }
        else if (a === 'data') api.data();
      });
    },
    async data() {
      const sw = await env.offlineStatus();
      show(`<h2>Dados, backup e offline</h2>
<div class="st">Armazenamento: <b>${store.a.kind === 'indexeddb' ? 'IndexedDB (persistente)' : 'MEMÓRIA — dados serão perdidos ao fechar'}</b>${env.persisted ? ' · protegido' : ''}</div>
<div class="st">Offline: <b>${esc(sw)}</b></div>
<div class="st">Catálogo online: <b>não configurado</b> (preparado para uma etapa futura)</div>
<div class="st" id="counts">${store.all().length} registros de progresso · ${store.attempts.length} tentativas</div>
<button class="opt" id="bx">⬇ Exportar backup (JSON)</button>
<button class="opt" id="bi">⬆ Importar backup</button>
<div class="st" id="bmsg" role="status"></div>`);
      const msg = (t, k = '') => { $('bmsg').className = 'st ' + k; $('bmsg').textContent = t; };
      $('bx').onclick = async () => { try { const n = await exportToFile(store); msg(`Backup exportado (${Math.round(n / 1024 * 10) / 10} KB).`, 'good'); } catch (e) { msg('Falha ao exportar: ' + e.message, 'bad'); } };
      $('bi').onclick = () => {
        const f = document.createElement('input'); f.type = 'file'; f.accept = 'application/json,.json'; f.id = 'file';
        f.onchange = async () => {
          if (!f.files[0]) return;
          msg('Validando arquivo...');
          const r = await importFromFile(store, f.files[0]);
          if (!r.ok) return msg('Backup recusado, dados atuais mantidos. ' + r.errors.join(' | '), 'bad');
          const t = r.stats;
          msg(`Restaurado: ${t.added} novos, ${t.updated} atualizados, ${t.keptLocal} mantidos (local mais recente), ${t.attemptsAdded} tentativas novas, ${t.attemptsDuplicated} duplicadas ignoradas.`, 'good');
          $('counts').textContent = `${store.all().length} registros de progresso · ${store.attempts.length} tentativas`;
          changed();
        };
        f.click();
      };
    },
  };
  return api;
}
