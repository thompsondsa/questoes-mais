// Pacote de questões FICTÍCIAS de demonstração (mesmo formato que um catálogo futuro terá).
export const DEMO_PACK = {
  id: 'demo-guarabira-2026', title: 'Demonstração — Guarabira 2026',
  exam: { ano: 2026, banca: 'UEPB/CPCON', orgao: 'Prefeitura Municipal de Guarabira - Paraíba', cargo: 'Agente Administrativo', concurso: 'Concurso Público 2026 (exemplo fictício)' },
  questions: [
    { id: 'Q0000101', disc: 'Direito Administrativo', stem: 'Segundo a Lei nº 14.133/2021 (Nova Lei de Licitações), NÃO é modalidade de licitação:', alts: ['Pregão.', 'Concorrência.', 'Tomada de preços.', 'Leilão.', 'Diálogo competitivo.'], ans: 2, com: 'A tomada de preços era modalidade da Lei 8.666/1993 e não foi mantida pela Lei 14.133/2021, que prevê pregão, concorrência, concurso, leilão e diálogo competitivo.' },
    { id: 'Q0000102', disc: 'Língua Portuguesa', stem: 'Assinale a alternativa em que a concordância verbal está de acordo com a norma-padrão:', alts: ['Fazem dois anos que ele se mudou.', 'Haviam muitos candidatos na fila.', 'Devem existir soluções para o problema.', 'Houveram várias reclamações ontem.', 'Faz dois anos que moramos aqui, e sobrou-nos poucas dúvidas.'], ans: 2, com: 'Em locuções verbais, o auxiliar concorda com o sujeito: “Devem existir soluções”. Os verbos fazer (tempo) e haver (existir) são impessoais e ficam no singular.' },
    { id: 'Q0000103', disc: 'Matemática', stem: 'Uma prefeitura comprou 350 resmas de papel e distribuiu 20% delas para as escolas. Quantas resmas restaram?', alts: ['70', '180', '250', '280', '300'], ans: 3, com: '20% de 350 = 70. Restaram 350 − 70 = 280 resmas.' },
    { id: 'Q0000104', disc: 'Noções de Informática', stem: 'No Microsoft Word, o atalho de teclado usado para salvar um documento é:', alts: ['Ctrl + P', 'Ctrl + B', 'Ctrl + S', 'Ctrl + Z', 'Ctrl + N'], ans: 2, com: 'Ctrl + S salva o documento. Ctrl + P imprime, Ctrl + B aplica negrito, Ctrl + Z desfaz e Ctrl + N cria novo documento.' },
  ],
};
