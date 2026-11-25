# Questões+ (protótipo de arquitetura)
Sem build, sem dependências. Precisa ser servido por HTTP(S) (módulos ES e Service Worker não funcionam em file://).

    python3 -m http.server 8080      # abrir http://localhost:8080
    node tests/unit.test.mjs         # testes unitários (Node 18+)
    python3 tests/e2e.py             # ponta a ponta (requer playwright + chromium)

Para instalar no Android: publicar em HTTPS (ex.: GitHub Pages) e usar "Instalar app".
Catálogo: configurar `CATALOG_CONFIG.baseUrl` em js/services/catalog.js (somente arquivos JSON públicos; nunca tokens).
