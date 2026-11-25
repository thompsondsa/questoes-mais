// Serviço de catálogo público (ex.: GitHub Pages / raw.githubusercontent.com). NÃO conectado nesta etapa.
// Regra: só leitura de arquivos JSON públicos. Nunca colocar token, senha ou chave aqui.
export const CATALOG_CONFIG = {
  baseUrl: null, // ex.: 'https://raw.githubusercontent.com/<dono>/<repo>/main/catalogo'
  timeoutMs: 8000,
};
export class CatalogNotConfigured extends Error { constructor() { super('Catálogo ainda não configurado.'); this.name = 'CatalogNotConfigured'; } }

export function validatePack(p) {
  const errs = [];
  const s = (v, max = 5000) => typeof v === 'string' && v.length > 0 && v.length <= max;
  if (!p || typeof p !== 'object') return ['Pacote inválido.'];
  if (!s(p.id, 64) || !/^[A-Za-z0-9_.\-]+$/.test(p.id)) errs.push('id do pacote inválido');
  if (!s(p.title, 200)) errs.push('título inválido');
  const e = p.exam;
  if (!e || !Number.isInteger(e.ano) || !s(e.banca, 100) || !s(e.orgao, 200) || !s(e.cargo, 200) || !s(e.concurso, 200)) errs.push('dados da prova inválidos');
  if (!Array.isArray(p.questions) || !p.questions.length) errs.push('sem questões');
  else p.questions.forEach((q, i) => {
    const ok = q && /^[A-Za-z0-9_.\-]{1,64}$/.test(q.id) && s(q.disc, 100) && s(q.stem) && Array.isArray(q.alts) && q.alts.length >= 2 && q.alts.length <= 5 &&
      q.alts.every((a) => s(a, 2000)) && Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.alts.length && s(q.com);
    if (!ok) errs.push('questão inválida no item ' + (i + 1));
  });
  return errs;
}

async function getJson(path, cfg) {
  if (!cfg.baseUrl) throw new CatalogNotConfigured();
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), cfg.timeoutMs);
  try {
    const r = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/${path}`, { signal: ctl.signal, credentials: 'omit' });
    if (!r.ok) throw new Error('Catálogo respondeu ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
export const fetchIndex = (cfg = CATALOG_CONFIG) => getJson('index.json', cfg); // [{id,title,count}]
export async function fetchPack(id, cfg = CATALOG_CONFIG) {
  const p = await getJson(`packs/${encodeURIComponent(id)}.json`, cfg);
  const errs = validatePack(p);
  if (errs.length) throw new Error('Pacote rejeitado: ' + errs.join('; '));
  return p;
}
// Baixa e guarda no IndexedDB para uso offline.
export async function downloadPack(id, adapter, cfg = CATALOG_CONFIG) {
  const p = await fetchPack(id, cfg);
  await adapter.put('packs', { ...p, downloadedAt: Date.now() });
  return p;
}
