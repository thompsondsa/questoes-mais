// Estado de navegação: questão atual e filtro. A posição é lembrada entre sessões.
export class Navigator {
  constructor(questions, store) {
    this.qs = questions; this.store = store; this.filter = 'all'; this.i = 0;
    const last = store.getMeta('nav');
    if (last) { const k = questions.findIndex((q) => q.id === last.qid); if (k >= 0) this.i = k; if (last.filter) this.filter = last.filter; }
  }
  current() { return this.qs[this.i]; }
  _save() { this.store.setMeta('nav', { qid: this.current().id, filter: this.filter }); }
  go(d) { const n = this.i + d; if (n < 0 || n >= this.qs.length) return false; this.i = n; this._save(); return true; }
  goto(i) { if (i >= 0 && i < this.qs.length) { this.i = i; this._save(); } }
  matches(q, f = this.filter) {
    const s = this.store.get(q.id);
    return f === 'all' || (f === 'open' && !s.done) || (f === 'done' && s.done) || (f === 'fav' && s.favorite) || (f === 'review' && s.review);
  }
  setFilter(f) {
    const idx = this.qs.map((q, i) => (this.matches(q, f) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return false;
    this.filter = f; if (!idx.includes(this.i)) this.i = idx[0];
    this._save(); return true;
  }
}
