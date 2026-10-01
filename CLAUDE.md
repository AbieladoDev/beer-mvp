# beer-mvp

**Cliente / nicho:** Degga Beer (bar e empório de cervejas) — MVP de demonstração de PDV + estoque +
cardápio (produtos, kits/combos, drinks) + financeiro. Dados fictícios. **Não está em produção**;
front-only, deploy de demo na Vercel.
**Papel:** painel (front-only, sem API)
**Irmãos:** nenhum ainda (quando virar sistema: `degga-api` + `degga-client`, copiando da Vetro/TodosDan)

## Banco
Não usa banco. Todos os dados vivem em `src/store/demo-store.ts` (zustand + `persist` no
`localStorage`, chave `degga-demo`), semeados por `src/data/seed.ts`. Sem `.env` — não há variável.

## Comandos
dev: `pnpm dev` · build: `pnpm build` · test: não há · lint: `pnpm lint` · migration: não se aplica

## Estrutura
- `src/app/login` — escolha de perfil (Dono, Gerente, Caixa). Não há senha. Caixa cai em `/painel/pdv`.
- `src/app/painel/<modulo>` — lista em `page.tsx`, `cadastro/`, `[id]/` (ficha), `[id]/edicao/`.
  As páginas de rota são finas: o conteúdo está em `src/components/<modulo>/`.
- `src/store/demo-store.ts` — o "banco" e TODAS as ações de domínio. Cada ação chama `registrar()`
  (histórico + notificação). `registrarVenda` amarra tudo: baixa estoque, grava custo snapshot e gera
  a conta a receber com prazo/taxa da forma de pagamento.
- `src/store/sessao-store.ts` — perfil logado; `usePode(permissao)`.
- `src/lib/permissoes.ts` — matriz perfil → permissões (`recurso.acao`, igual à API da TodosDan).
- `src/lib/derivados.ts` — TODA regra calculada: custo por ml, custo de kit/drink, margem, consumo de
  estoque, situação de conta/estoque, fluxo de caixa. Tela e store usam as mesmas funções.
- `src/lib/modulos.ts` — ícone de cada módulo (selo neutro) e `hex` só para gráficos.
- `src/components/apae/` — nome herdado, conteúdo genérico: `Guard`, `NaoEncontrado`, `Vazio`,
  `FaixaIndicadores`, `SituacaoContaBadge`, `BarraUso` e `ficha.tsx` (25% identidade + 75% abas).
- `src/components/dashboard/graficos.tsx` — gráficos do dashboard (recharts via `ui/chart`).
- `src/components/common/brand-logo.tsx` — a marca é wordmark "DEGGA BEER", sem imagem.

## Diferenças em relação ao template
Base copiada do **apae-mvp** (que por sua vez veio da `todosDan-client`), não do `default-admin`:
- **Sem camada de API**: o `demo-store` faz o papel da API; os nomes das ações foram pensados para
  virar endpoints.
- **Visual = admin da TodosDan**: `globals.css` da `todosDan-client` (monocromático, barra lateral
  quase preta = modo "contraste"). Só tema claro; sem `next-themes` nem `data-barra`. Selo de módulo
  neutro; cor só em estado (`StatusBadge`) e variação (▲/▼).
- `command-search`, `notification-list`, `user-menu`, `app-header`, `app-sidebar`, `nav-config`,
  `quick-create`, `bottom-nav`, `mobile-menu-sheet` e `audit/*` reescritos sobre o store. O menu do
  usuário também **troca de perfil** e **restaura os dados de demo**.
- Notificações = gravadas pelo store + alertas calculados (conta vencida/vencendo, recebimento
  atrasado, produto abaixo do mínimo) — alerta calculado não é gravado.
- Skill `modulo-painel`, passo 0 (conferir endpoint na `-api`): **não se aplica** — não há API.

## Armadilhas
- O painel só renderiza **depois de montar no navegador** (`painel-shell.tsx`): os dados vêm do
  localStorage e as datas do seed são relativas a hoje. `curl` numa rota devolve 200 com o spinner —
  não prova que a tela funciona.
- Mudou o formato de algum tipo em `data/tipos.ts`? Quem já abriu a demo tem o formato velho no
  localStorage: use "Restaurar dados de demonstração" (menu do usuário) ou suba `version` no persist.
- Estoque é em UNIDADES do produto e pode ser fracionado (dose de drink = ml ÷ `volumeMl`). Exibir com
  `estoqueEmTexto`, nunca o número cru.
- Margem/lucro do dashboard usam o `custoUnitCents` gravado na venda, não o custo atual do produto.
- O histórico de vendas do seed **não** baixou o estoque do seed (estoque escrito à mão).
- `useSearchParams` exigiria Suspense no build; atalhos como `?entrada=1` são lidos com
  `window.location.search` num efeito.
- `eslint-plugin-react-hooks` está travado em 7.0.1 via `overrides` no `pnpm-workspace.yaml` — a 7.1
  acusa `setState` em efeito nos componentes copiados da TodosDan.
- `pnpm build` precisa do `pnpm-workspace.yaml` com `allowBuilds`.
- Gráficos são monocromáticos (série em `--foreground`); onde há duas séries, a segunda é cinza
  **tracejada** + legenda — cinza × preto reprova no validador de paleta como categórica, então a
  diferença não pode depender só do tom.
