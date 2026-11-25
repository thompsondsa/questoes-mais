// Ponto de entrada: abre o banco, carrega dados, liga navegação, interface e PWA.
import { openIdb } from './db/idb.js';
import { createMemoryAdapter } from './db/memory.js';
import { StudentStore } from './db/store.js';
import { loadQuestions } from './services/questionRepo.js';
import { Navigator } from './nav/navigator.js';
import { renderScreen } from './ui/screen.js';
import { createSheets } from './ui/sheets.js';
import { registerPwa, offlineStatus } from './pwa.js';

const $ = (id) => document.getElementById(id);

async function start() {
  let adapter, warn = null;
  try { adapter = await openIdb(); } catch (e) { adapter = createMemoryAdapter(); warn = 'IndexedDB indisponível: seus dados NÃO serão salvos nesta sessão.'; }
  const store = new StudentStore(adapter);
  await store.init();
  store.onError = (e) => sheets.error('Erro ao salvar: ' + e.message);
  const questions = await loadQuestions(adapter);
  const nav = new Navigator(questions, store);
  const env = { persisted: false, offlineStatus };
  if (navigator.storage?.persist) navigator.storage.persist().then((p) => { env.persisted = p; }).catch(() => {});

  const draw = () => renderScreen({ store, nav }, actions);
  const sheets = createSheets({ store, nav, adapter, changed: draw, env });
  sheets.error = (m) => { $('sheet').innerHTML = `<h2>Atenção</h2><p>${m}</p>`; $('ov').classList.add('on'); };
  const actions = {
    onSelect: (i) => { const q = nav.current(); if (!store.get(q.id).done) { store.update(q.id, { sel: i }); draw(); } },
    onToggleCut: (i) => {
      const q = nav.current(), s = store.get(q.id); if (s.done) return;
      store.update(q.id, { cut: s.cut.includes(i) ? s.cut.filter((x) => x !== i) : [...s.cut, i] }); draw();
    },
    onExplain: () => sheets.comments(),
  };
  const resolve = () => {
    const q = nav.current(), s = store.get(q.id);
    if (s.sel === null || s.done) return;
    store.update(q.id, { done: true }); store.addAttempt(q.id, s.sel, s.sel === q.ans); draw();
  };
  const step = (d) => { if (nav.go(d)) { draw(); window.scrollTo(0, 0); } };
  $('go').onclick = resolve;
  $('prev').onclick = () => step(-1); $('next').onclick = () => step(1);
  $('btn-goto').onclick = sheets.goto; $('btn-filter').onclick = sheets.filter;
  $('btn-info').onclick = sheets.info; $('btn-comments').onclick = sheets.comments;
  $('btn-rec').onclick = sheets.resources;
  $('btn-back').onclick = () => { $('sheet').innerHTML = '<h2>Voltar</h2><p>No protótipo há apenas esta tela de resolução.</p>'; $('ov').classList.add('on'); };
  draw();
  if (warn) sheets.error(warn);
  window.__qmais = { store, nav, adapter }; // facilita inspeção e testes
  registerPwa();
}
start().catch((e) => { document.body.insertAdjacentHTML('beforeend', '<pre style="padding:16px;color:#ff8a80">Falha ao iniciar: ' + e.message + '</pre>'); });
