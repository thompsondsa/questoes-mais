// Backup: exportação, validação estrita e mesclagem sem duplicar. Sem DOM (testável em Node).
export const FORMAT = 'questoes-mais-backup';
export const VERSION = 1;
const MAX_BYTES = 10 * 1024 * 1024, MAX_TEXT = 20000, ID = /^[A-Za-z0-9_.:|\-]{1,80}$/;

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildBackup(store) {
  const data = store.snapshot();
  return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), app: 'Questões+', checksum: await sha256(JSON.stringify(data)), data };
}

const isStr = (v) => typeof v === 'string' && v.length <= MAX_TEXT;
const isTs = (v) => Number.isFinite(v) && v >= 0;

export async function validateBackup(text) {
  const fail = (m) => ({ ok: false, errors: [m], data: null });
  if (typeof text !== 'string' || !text.trim()) return fail('Arquivo vazio.');
  if (text.length > MAX_BYTES) return fail('Arquivo grande demais (máx. 10 MB).');
  let o; try { o = JSON.parse(text); } catch { return fail('O arquivo não é um JSON válido.'); }
  if (!o || o.format !== FORMAT) return fail('Este arquivo não é um backup do Questões+.');
  if (o.version !== VERSION) return fail('Versão de backup não suportada: ' + o.version);
  if (!o.data || !Array.isArray(o.data.progress) || !Array.isArray(o.data.attempts)) return fail('Estrutura de dados ausente.');
  if (typeof o.checksum !== 'string' || (await sha256(JSON.stringify(o.data))) !== o.checksum) return fail('Falha na verificação de integridade (arquivo alterado ou corrompido).');
  const errors = [], progress = new Map(), attempts = new Map();
  o.data.progress.forEach((r, i) => {
    const ok = r && typeof r === 'object' && ID.test(r.qid) && (r.sel === null || (Number.isInteger(r.sel) && r.sel >= 0 && r.sel < 10)) &&
      Array.isArray(r.cut) && r.cut.length <= 10 && r.cut.every((x) => Number.isInteger(x) && x >= 0 && x < 10) &&
      typeof r.done === 'boolean' && typeof r.favorite === 'boolean' && typeof r.review === 'boolean' &&
      isStr(r.note) && isStr(r.comment) && isTs(r.updatedAt);
    if (!ok) { errors.push('Progresso inválido no item ' + (i + 1)); return; }
    const row = { qid: r.qid, sel: r.sel, cut: [...new Set(r.cut)], done: r.done, favorite: r.favorite, review: r.review, note: r.note, comment: r.comment, updatedAt: r.updatedAt };
    const prev = progress.get(row.qid);
    if (!prev || row.updatedAt > prev.updatedAt) progress.set(row.qid, row);
  });
  o.data.attempts.forEach((r, i) => {
    const ok = r && typeof r === 'object' && ID.test(r.id) && ID.test(r.qid) && isTs(r.ts) && Number.isInteger(r.choice) && r.choice >= 0 && r.choice < 10 && typeof r.correct === 'boolean';
    if (!ok) { errors.push('Tentativa inválida no item ' + (i + 1)); return; }
    attempts.set(r.id, { id: r.id, qid: r.qid, ts: r.ts, choice: r.choice, correct: r.correct });
  });
  return { ok: errors.length === 0, errors: errors.slice(0, 10), data: { progress: [...progress.values()], attempts: [...attempts.values()] } };
}

// Decide o que gravar: registro mais recente vence; tentativas idênticas (mesmo id) não duplicam.
export function planMerge(local, incoming) {
  const lp = new Map(local.progress.map((r) => [r.qid, r]));
  const la = new Set(local.attempts.map((r) => r.id));
  const stats = { added: 0, updated: 0, keptLocal: 0, attemptsAdded: 0, attemptsDuplicated: 0 };
  const progress = [];
  for (const r of incoming.progress) {
    const cur = lp.get(r.qid);
    if (!cur) { progress.push(r); stats.added++; }
    else if (r.updatedAt > cur.updatedAt) { progress.push(r); stats.updated++; }
    else stats.keptLocal++;
  }
  const attempts = [];
  for (const r of incoming.attempts) { if (la.has(r.id)) stats.attemptsDuplicated++; else { attempts.push(r); stats.attemptsAdded++; } }
  return { progress, attempts, stats };
}

// 1) valida tudo 2) calcula plano 3) só então grava, numa transação. Falhou antes? Nada muda.
export async function importBackup(store, text) {
  const v = await validateBackup(text);
  if (!v.ok) return { ok: false, errors: v.errors };
  const plan = planMerge(store.snapshot(), v.data);
  try { await store.applyMerge(plan.progress, plan.attempts); }
  catch (e) { return { ok: false, errors: ['Falha ao gravar: ' + e.message + '. Seus dados atuais foram mantidos.'] }; }
  return { ok: true, stats: plan.stats };
}
