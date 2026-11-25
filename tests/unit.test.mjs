// Testes unitários (Node): lógica de repositório, backup e catálogo. Rodar: node tests/unit.test.mjs
import assert from 'node:assert/strict';
import { createMemoryAdapter } from '../js/db/memory.js';
import { StudentStore } from '../js/db/store.js';
import { buildBackup, importBackup, validateBackup } from '../js/backup/backup.js';
import { validatePack, fetchIndex, CatalogNotConfigured } from '../js/services/catalog.js';
import { DEMO_PACK } from '../js/data/demo-pack.js';

let pass = 0; const t = async (n, f) => { await f(); pass++; console.log('ok  -', n); };
const mk = async (a = createMemoryAdapter()) => { const s = new StudentStore(a); await s.init(); return [s, a]; };

await t('dados persistem em nova instância sobre o mesmo adapter', async () => {
  const [s, a] = await mk();
  await s.update('Q1', { sel: 2, cut: [0, 4], done: true, note: 'nota', comment: 'com', favorite: true, review: true });
  await s.addAttempt('Q1', 2, true); await s.flush();
  const [s2] = await mk(a);
  assert.deepEqual(s2.get('Q1').cut, [0, 4]); assert.equal(s2.get('Q1').note, 'nota');
  assert.equal(s2.get('Q1').favorite, true); assert.equal(s2.attemptsOf('Q1').length, 1);
});
await t('exporta e restaura em banco vazio', async () => {
  const [s] = await mk(); await s.update('Q1', { sel: 1, note: 'x' }); await s.addAttempt('Q1', 1, false);
  const json = JSON.stringify(await buildBackup(s));
  const [s2] = await mk(); const r = await importBackup(s2, json);
  assert.ok(r.ok); assert.equal(s2.get('Q1').note, 'x'); assert.equal(s2.attempts.length, 1);
});
await t('importar duas vezes não duplica', async () => {
  const [s] = await mk(); await s.update('Q1', { sel: 1 }); await s.addAttempt('Q1', 1, false);
  const json = JSON.stringify(await buildBackup(s));
  const [s2] = await mk(); await importBackup(s2, json); const r = await importBackup(s2, json);
  assert.equal(s2.attempts.length, 1); assert.equal(s2.all().length, 1); assert.equal(r.stats.attemptsDuplicated, 1);
});
await t('registro local mais recente é preservado', async () => {
  const [a] = await mk(); await a.update('Q1', { note: 'antiga' });
  const json = JSON.stringify(await buildBackup(a));
  await new Promise((r) => setTimeout(r, 5));
  await a.update('Q1', { note: 'nova' });
  const r = await importBackup(a, json);
  assert.equal(a.get('Q1').note, 'nova'); assert.equal(r.stats.keptLocal, 1);
});
await t('rejeita JSON inválido, formato errado, adulterado e dados malformados sem tocar nos dados', async () => {
  const [s] = await mk(); await s.update('Q9', { note: 'proteger' });
  const good = await buildBackup(s);
  const tampered = structuredClone(good); tampered.data.progress[0].note = 'hack';
  const bad = structuredClone(good); bad.data.progress[0].sel = 99; bad.checksum = (await buildBackup({ snapshot: () => bad.data })).checksum;
  for (const txt of ['', '{nao json', '{"format":"outro"}', JSON.stringify(tampered), JSON.stringify(bad)]) {
    const r = await importBackup(s, txt); assert.equal(r.ok, false, txt.slice(0, 30));
  }
  assert.equal(s.get('Q9').note, 'proteger'); assert.equal(s.all().length, 1);
});
await t('falha de gravação mantém dados atuais', async () => {
  const [s, a] = await mk(); await s.update('Q1', { note: 'ok' });
  const [src] = await mk(); await src.update('Q2', { note: 'novo' });
  const json = JSON.stringify(await buildBackup(src));
  a.putMany = async () => { throw new Error('disco cheio'); };
  const r = await importBackup(s, json);
  assert.equal(r.ok, false); assert.equal(s.get('Q2').note, ''); assert.equal(s.get('Q1').note, 'ok');
});
await t('reiniciar caderno preserva anotações, favoritos e histórico', async () => {
  const [s] = await mk(); await s.update('Q1', { sel: 1, done: true, note: 'n', favorite: true }); await s.addAttempt('Q1', 1, true);
  await s.resetAll();
  assert.equal(s.get('Q1').done, false); assert.equal(s.get('Q1').note, 'n'); assert.equal(s.attempts.length, 1);
});
await t('catálogo: pacote demo é válido, inválidos são rejeitados, sem URL não conecta', async () => {
  assert.deepEqual(validatePack(DEMO_PACK), []);
  assert.ok(validatePack({ ...DEMO_PACK, questions: [{ id: 'a', disc: 'x', stem: 's', alts: ['a', 'b'], ans: 5, com: 'c' }] }).length);
  await assert.rejects(() => fetchIndex(), CatalogNotConfigured);
});
console.log(`\n${pass} testes unitários passaram`);
