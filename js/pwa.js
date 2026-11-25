// Registro do Service Worker e diagnóstico de prontidão offline.
export async function registerPwa() {
  if (!('serviceWorker' in navigator)) return null;
  if (!(window.isSecureContext)) return null; // exige HTTPS ou localhost
  try { return await navigator.serviceWorker.register('./sw.js'); } catch { return null; }
}
export async function offlineStatus() {
  if (!('serviceWorker' in navigator)) return 'Service Worker não suportado';
  if (!window.isSecureContext) return 'indisponível (exige HTTPS ou localhost)';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'ainda não preparado';
  const ready = !!(await caches.keys()).length;
  return reg.active && ready ? (navigator.serviceWorker.controller ? 'pronto — funciona sem internet' : 'instalado; recarregue uma vez para ativar') : 'preparando...';
}
