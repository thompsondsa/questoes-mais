// Adapter em memória: usado como fallback (ex.: modo privado sem IndexedDB) e nos testes unitários.
export function createMemoryAdapter() {
  const data = { progress: new Map(), attempts: new Map(), packs: new Map(), meta: new Map() };
  const keys = { progress: 'qid', attempts: 'id', packs: 'id', meta: 'key' };
  const clone = (v) => structuredClone(v);
  return {
    kind: 'memory',
    async getAll(s) { return [...data[s].values()].map(clone); },
    async get(s, k) { const v = data[s].get(k); return v ? clone(v) : undefined; },
    async put(s, v) { data[s].set(v[keys[s]], clone(v)); },
    async putMany(m) {
      for (const [s, rows] of Object.entries(m)) for (const v of rows) if (v[keys[s]] == null) throw new Error('chave ausente');
      for (const [s, rows] of Object.entries(m)) for (const v of rows) data[s].set(v[keys[s]], clone(v));
    },
    async clear(list) { list.forEach((s) => data[s].clear()); },
    close() {},
  };
}
