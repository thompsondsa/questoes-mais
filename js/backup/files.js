// Parte de backup que depende do navegador (download e leitura de arquivo).
import { buildBackup, importBackup } from './backup.js';

export async function exportToFile(store) {
  const json = JSON.stringify(await buildBackup(store), null, 1);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `questoes-mais-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return json.length;
}
export async function importFromFile(store, file) { return importBackup(store, await file.text()); }
