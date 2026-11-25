// Repositório de dados do estudante (progresso, tentativas, favoritos, anotações) sobre um adapter.
const blank = (qid) => ({ qid, sel: null, cut: [], done: false, favorite: false, review: false, note: '', comment: '', updatedAt: 0 });

export class StudentStore {
  constructor(adapter) {
    this.a = adapter; this.p = new Map(); this.attempts = []; this.meta = new Map();
    this.queue = Promise.resolve(); this.onError = () => {};
  }
  async init() {
    for (const r of await this.a.getAll('progress')) this.p.set(r.qid, { ...blank(r.qid), ...r });
    this.attempts = (await this.a.getAll('attempts')).sort((x, y) => x.ts - y.ts);
    for (const m of await this.a.getAll('meta')) this.meta.set(m.key, m.value);
  }
  get(qid) { return this.p.get(qid) || blank(qid); }
  all() { return [...this.p.values()]; }
  _w(fn) { this.queue = this.queue.then(fn).catch((e) => this.onError(e)); return this.queue; }
  flush() { return this.queue; }
  update(qid, patch) {
    const row = { ...this.get(qid), ...patch, qid, updatedAt: Date.now() };
    this.p.set(qid, row);
    return this._w(() => this.a.put('progress', row));
  }
  addAttempt(qid, choice, correct) {
    const ts = Date.now();
    let id = `${qid}|${ts}`, n = 0;
    while (this.attempts.some((x) => x.id === id)) id = `${qid}|${ts}|${++n}`;
    const row = { id, qid, ts, choice, correct };
    this.attempts.push(row);
    return this._w(() => this.a.put('attempts', row));
  }
  attemptsOf(qid) { return this.attempts.filter((x) => x.qid === qid); }
  resetQuestion(qid) { return this.update(qid, { sel: null, cut: [], done: false }); }
  resetAll() {
    const now = Date.now();
    const rows = this.all().map((r) => ({ ...r, sel: null, cut: [], done: false, updatedAt: now }));
    rows.forEach((r) => this.p.set(r.qid, r));
    return this._w(() => this.a.putMany({ progress: rows }));
  }
  getMeta(k, d = null) { return this.meta.has(k) ? this.meta.get(k) : d; }
  setMeta(key, value) { this.meta.set(key, value); return this._w(() => this.a.put('meta', { key, value })); }
  snapshot() { return { progress: this.all(), attempts: [...this.attempts] }; }
  // Aplica mesclagem já validada em UMA transação; o cache em memória só muda se a gravação der certo.
  async applyMerge(progress, attempts) {
    await this.flush();
    await this.a.putMany({ progress, attempts });
    progress.forEach((r) => this.p.set(r.qid, { ...blank(r.qid), ...r }));
    const ids = new Set(this.attempts.map((x) => x.id));
    attempts.forEach((r) => { if (!ids.has(r.id)) this.attempts.push(r); });
    this.attempts.sort((x, y) => x.ts - y.ts);
  }
}
