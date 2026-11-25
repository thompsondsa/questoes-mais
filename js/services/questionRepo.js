import { DEMO_PACK } from '../data/demo-pack.js';
import { validatePack } from './catalog.js';

// Junta o pacote de demonstração (embutido) com os pacotes baixados e guardados no IndexedDB.
export async function loadQuestions(adapter) {
  const packs = [DEMO_PACK];
  try { for (const p of await adapter.getAll('packs')) if (p.id !== DEMO_PACK.id && !validatePack(p).length) packs.push(p); } catch { /* usa só o demo */ }
  return packs.flatMap((p) => p.questions.map((q) => ({ ...q, exam: p.exam, packId: p.id })));
}
