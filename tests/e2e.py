"""Testes ponta a ponta em Chromium real (Playwright). Rodar na raiz do projeto: python3 tests/e2e.py"""
import subprocess, time, json, os, sys
from playwright.sync_api import sync_playwright

PORT = 8765; URL = f'http://localhost:{PORT}/'
os.makedirs('tests/out', exist_ok=True)
results = []
def check(name, cond, extra=''):
    results.append((name, bool(cond))); print(('PASS' if cond else 'FAIL'), '-', name, extra if not cond else '')

server = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

def swipe(page, i, dx=-140):
    b = page.locator(f'.alt[data-i="{i}"]').bounding_box(); y = b['y'] + b['height'] / 2; x = b['x'] + b['width'] * 0.7
    page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x + dx / 2, y, steps=4); page.mouse.move(x + dx, y, steps=4); page.mouse.up()
def tap(page, i): page.locator(f'.alt[data-i="{i}"]').click()
def cls(page, i): return page.locator(f'.alt[data-i="{i}"]').get_attribute('class')
def close_sheet(page): page.mouse.click(5, 5)
def rec(page, label): page.click('#btn-rec'); page.click(f'.opt:has-text("{label}")')
def overflow(page): return page.evaluate('document.documentElement.scrollWidth - window.innerWidth')

try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- CELULAR ----------
    ctx = b.new_context(**p.devices['Pixel 7'], accept_downloads=True)
    page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    page.goto(URL); page.wait_for_selector('.alt')
    page.evaluate('navigator.serviceWorker.ready.then(()=>1)'); page.reload(); page.wait_for_selector('.alt')
    check('Service Worker ativo e controlando a página', page.evaluate('!!navigator.serviceWorker.controller'))
    check('Manifest PWA carregado (nome e ícones)', page.evaluate("fetch('manifest.webmanifest').then(r=>r.json()).then(m=>m.name==='Questões+'&&m.icons.length>=2)"))
    check('Cache do app shell preenchido', page.evaluate("caches.open('qmais-v1').then(c=>c.keys()).then(k=>k.length>15)"))
    check('Banco em uso é IndexedDB', page.evaluate('window.__qmais.adapter.kind') == 'indexeddb')
    check('Sem overflow horizontal no celular', overflow(page) <= 0, overflow(page))
    # interações preservadas
    swipe(page, 0); swipe(page, 2); swipe(page, 0)
    check('Deslize risca; segundo deslize desfaz', 'cut' not in cls(page, 0) and 'cut' in cls(page, 2))
    check('Tesoura aparece na alternativa riscada', page.locator('.alt[data-i="2"] svg').count() == 1)
    check('Alternativa riscada continua visível', page.locator('.alt[data-i="2"]').is_visible())
    tap(page, 2); check('Toque seleciona (cinza)', 'sel' in cls(page, 2))
    tap(page, 1); check('Seleção troca', 'sel' in cls(page, 1) and 'sel' not in cls(page, 2))
    check('Sem correção antes de Resolver', 'ok' not in cls(page, 2) and 'bad' not in cls(page, 1))
    page.click('#go')
    check('Resposta errada: escolhida vermelha, correta verde', ' bad' in cls(page, 1) and ' ok' in cls(page, 2))
    check('Mensagem "Você errou"', 'Você errou' in page.inner_text('#fb'))
    page.click('#xp'); check('Botão de explicação comentada abre explicação', 'tomada de preços' in page.inner_text('#sheet').lower()); 
    page.fill('#tc', 'meu comentario pessoal'); close_sheet(page)   # fecha SEM esperar o debounce
    rec(page, 'Anotações'); page.fill('#tn', 'minha anotacao de estudo'); close_sheet(page)
    rec(page, 'Favoritar'); rec(page, 'Marcar para revisão')
    page.click('#btn-info'); check('Painel de informações', 'Guarabira' in page.inner_text('#sheet')); close_sheet(page)
    # ---------- RECARREGAR ----------
    page.reload(); page.wait_for_selector('.alt')
    check('Respostas sobrevivem ao recarregamento', ' bad' in cls(page, 1) and ' ok' in cls(page, 2) and 'Você errou' in page.inner_text('#fb'))
    check('Riscos sobrevivem ao recarregamento', 'cut' in cls(page, 2) and 'cut' not in cls(page, 0))
    page.click('#btn-comments'); check('Comentário pessoal preservado', page.input_value('#tc') == 'meu comentario pessoal'); close_sheet(page)
    rec(page, 'Anotações'); check('Anotação preservada', page.input_value('#tn') == 'minha anotacao de estudo'); close_sheet(page)
    meta = page.inner_text('#meta'); check('Favorita e revisão preservados', '★ Favorita' in meta and '⚑ Revisão' in meta)
    rec(page, 'Histórico'); check('Histórico de tentativas preservado', 'marcou B' in page.inner_text('#sheet') and 'errou' in page.inner_text('#sheet')); close_sheet(page)
    page.click('#next'); page.evaluate('window.__qmais.store.flush()'); page.reload(); page.wait_for_selector('.alt')
    check('Posição (questão atual) lembrada', page.inner_text('#num') == '02'); page.click('#prev')
    # filtro
    page.click('#btn-filter'); page.click('.opt:has-text("Favoritas")'); check('Filtro favoritas mantém questão favorita', page.inner_text('#num') == '01')
    page.click('#btn-filter'); page.click('.opt:has-text("Todas")')
    # ---------- BACKUP ----------
    rec(page, 'Dados, backup'); page.wait_for_selector('#bx')
    check('Painel de dados indica IndexedDB e catálogo não configurado', 'IndexedDB' in page.inner_text('#sheet') and 'não configurado' in page.inner_text('#sheet'))
    with page.expect_download() as d: page.click('#bx')
    d.value.save_as('tests/out/backup.json'); bk = json.load(open('tests/out/backup.json'))
    check('Backup exportado com formato, checksum e dados', bk['format'] == 'questoes-mais-backup' and bk['checksum'] and len(bk['data']['progress']) >= 1 and len(bk['data']['attempts']) == 1)
    close_sheet(page)
    # apagar tudo
    page.evaluate("new Promise(r=>{window.__qmais.adapter.close();const q=indexedDB.deleteDatabase('questoes-mais');q.onsuccess=q.onerror=q.onblocked=()=>r()})")
    page.reload(); page.wait_for_selector('.alt')
    check('Banco apagado: tela volta ao estado inicial', 'bad' not in cls(page, 1) and page.locator('#fb .fb').count() == 0)
    def do_import(path):
        rec(page, 'Dados, backup')
        with page.expect_file_chooser() as fc: page.click('#bi')
        fc.value.set_files(path); page.wait_for_function("document.getElementById('bmsg').textContent.length>25"); m = page.inner_text('#bmsg'); return m
    m = do_import('tests/out/backup.json'); close_sheet(page)
    check('Backup restaurado após apagar o banco', 'Restaurado' in m and ' bad' in cls(page, 1) and 'Você errou' in page.inner_text('#fb'), m)
    page.click('#btn-comments'); ok_c = page.input_value('#tc') == 'meu comentario pessoal'; close_sheet(page)
    rec(page, 'Anotações'); ok_n = page.input_value('#tn') == 'minha anotacao de estudo'; close_sheet(page)
    check('Comentário e anotação restaurados', ok_c and ok_n)
    m = do_import('tests/out/backup.json'); close_sheet(page)
    n_att = page.evaluate('window.__qmais.store.attempts.length')
    check('Reimportar o mesmo backup não duplica', 'duplicadas' in m and n_att == 1, f'{m} / tentativas={n_att}')
    open('tests/out/lixo.json', 'w').write('{"format":"outro"}')
    t = json.load(open('tests/out/backup.json')); t['data']['progress'][0]['note'] = 'adulterado'; json.dump(t, open('tests/out/adulterado.json', 'w'))
    m1 = do_import('tests/out/lixo.json'); close_sheet(page)
    m2 = do_import('tests/out/adulterado.json'); close_sheet(page)
    rec(page, 'Anotações'); kept = page.input_value('#tn') == 'minha anotacao de estudo'; close_sheet(page)
    check('Backups inválidos/adulterados são recusados e dados atuais ficam intactos', 'recusado' in m1 and 'recusado' in m2 and kept, f'{m1} | {m2}')
    page.screenshot(path='tests/out/mobile.png')
    check('Sem erros de console/página no celular', not errs, errs)
    ctx.close()
    # ---------- DESKTOP ----------
    ctx = b.new_context(viewport={'width': 1280, 'height': 800}); page = ctx.new_page(); errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(URL); page.wait_for_selector('.alt'); page.evaluate('navigator.serviceWorker.ready.then(()=>1)')
    swipe(page, 3); tap(page, 0); page.click('#go'); page.click('#next')
    check('Desktop: Resolver e Próximo levam à questão 02', page.inner_text('#num') == '02'); page.click('#btn-goto')
    page.click('.g >> nth=0'); check('Desktop: voltar à questão 1 pela grade e ver correção', ' bad' in cls(page, 0) and 'cut' in cls(page, 3))
    check('Sem overflow horizontal no desktop', overflow(page) <= 0)
    page.screenshot(path='tests/out/desktop.png'); check('Sem erros de página no desktop', not errs, errs)
    # ---------- OFFLINE REAL: servidor encerrado ----------
    page.evaluate('window.__qmais.store.flush()'); page.reload(); page.wait_for_selector('.alt')
    check('Pré-condição offline: página controlada pelo Service Worker', page.evaluate('!!navigator.serviceWorker.controller'))
    server.terminate(); server.wait(); time.sleep(0.5)
    import urllib.request
    try: urllib.request.urlopen(URL, timeout=2); dead = False
    except Exception: dead = True
    check('Servidor realmente encerrado (sem rede para o app)', dead)
    ctx.set_offline(True)
    page.reload(); page.wait_for_selector('.alt', timeout=8000)
    check('App abre SEM internet e SEM servidor (recarregamento)', page.locator('.alt').count() >= 4)
    check('Dados do IndexedDB disponíveis offline', ' bad' in cls(page, 0) and 'cut' in cls(page, 3))
    p2 = ctx.new_page(); p2.goto(URL + 'index.html'); p2.wait_for_selector('.alt', timeout=8000)
    check('Nova aba também abre offline', p2.locator('.alt').count() >= 4)
    p2.click('#next'); p2.click('#next'); p2.locator('.alt[data-i="3"]').click(); p2.click('#go')
    check('Resolver e navegar funcionam offline', ' ok' in p2.locator('.alt[data-i="3"]').get_attribute('class') or ' bad' in p2.locator('.alt[data-i="3"]').get_attribute('class'))
    page.screenshot(path='tests/out/offline.png')
    ctx.close(); b.close()
finally:
    if server.poll() is None: server.terminate()
print('\nResumo:', sum(r for _, r in results), '/', len(results), 'aprovados')
sys.exit(0 if all(r for _, r in results) else 1)
