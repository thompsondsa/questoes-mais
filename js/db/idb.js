// Camada de acesso ao IndexedDB. Interface "adapter": getAll, get, put, putMany (transação única), clear.
export const DB_NAME = 'questoes-mais';
export const STORES = { progress: 'qid', attempts: 'id', packs: 'id', meta: 'key' };

export function openIdb(factory = globalThis.indexedDB, name = DB_NAME) {
  return new Promise((resolve, reject) => {
    if (!factory) return reject(new Error('IndexedDB indisponível neste navegador.'));
    const r = factory.open(name, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [s, key] of Object.entries(STORES))
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: key });
    };
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('Abertura do banco bloqueada por outra aba.'));
    r.onsuccess = () => resolve(wrap(r.result));
  });
}

function wrap(db) {
  const run = (stores, mode, fn) => new Promise((res, rej) => {
    let out;
    const t = db.transaction(stores, mode);
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Transação abortada.'));
    fn(t, (v) => { out = v; });
  });
  return {
    kind: 'indexeddb',
    getAll: (s) => run([s], 'readonly', (t, set) => { const r = t.objectStore(s).getAll(); r.onsuccess = () => set(r.result); }),
    get: (s, k) => run([s], 'readonly', (t, set) => { const r = t.objectStore(s).get(k); r.onsuccess = () => set(r.result); }),
    put: (s, v) => run([s], 'readwrite', (t) => { t.objectStore(s).put(v); }),
    // Grava vários registros em várias stores numa única transação: tudo ou nada.
    putMany: (m) => run(Object.keys(m), 'readwrite', (t) => {
      for (const [s, rows] of Object.entries(m)) for (const v of rows) t.objectStore(s).put(v);
    }),
    clear: (list) => run(list, 'readwrite', (t) => list.forEach((x) => t.objectStore(x).clear())),
    close: () => db.close(),
  };
}
