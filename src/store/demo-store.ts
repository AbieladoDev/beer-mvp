import { create } from "zustand"
import { persist } from "zustand/middleware"

import { gerarSeed, type DadosDemo } from "@/data/seed"
import type {
  AcaoAuditoria,
  Auditoria,
  ContaPagar,
  ContaReceber,
  Drink,
  Entidade,
  FormaPagamento,
  ItemVenda,
  Kit,
  MeioPagamento,
  MovEstoque,
  Mudanca,
  Notificacao,
  Perfil,
  Produto,
  TipoItemVenda,
  TomNotificacao,
  Venda,
} from "@/data/tipos"
import { formatPrice } from "@/lib/format"
import { hoje, somarDias } from "@/lib/datas"
import {
  FORMA_LABEL,
  LIQUIDACAO,
  consumoDosItens,
  custoDoDrinkCents,
  custoDoKitCents,
  faltasDeEstoque,
} from "@/lib/derivados"
import { usuarioAtual } from "./sessao-store"

/**
 * O "BANCO" DO MVP DA DEGGA BEER — um store só, persistido no navegador.
 *
 * Mesmo desenho do `apae-mvp`: toda ação de domínio passa por `registrar()`
 * (histórico + notificação). A venda é a ação que amarra tudo: baixa o estoque
 * de cada produto (inteiro, do kit ou em ml do drink), grava o custo do momento
 * para a margem e gera a conta a receber já com o prazo e a taxa da forma de
 * pagamento.
 *
 * ⚠️ Quando virar sistema, cada ação vira um endpoint e `registrar()` vira o
 * interceptor de auditoria (padrão Vetro/TodosDan).
 */

type Novo<T> = Omit<T, "id" | "criadoEm"> & { id?: string }

interface Registro {
  entidade: Entidade
  entidadeId: string
  acao: AcaoAuditoria
  rotulo: string
  mudancas?: Mudanca[]
}

interface Aviso {
  tom: TomNotificacao
  titulo: string
  corpo: string
  href: string
  para: Perfil[]
}

export interface ItemCarrinho {
  tipo: TipoItemVenda
  refId: string
  quantidade: number
}

export type ResultadoVenda =
  | { ok: true; vendaId: string; numero: number }
  | { ok: false; faltas: { nome: string; precisa: number; tem: number }[] }

export interface DadosEntrada {
  produtoId: string
  quantidade: number
  custoUnitCents: number
  fornecedor: string
  documento: string
  /** Gera a conta a pagar da nota (vencimento + já paga?). */
  conta?: { vencimento: string; pago: boolean; forma?: MeioPagamento }
}

interface Acoes {
  restaurar: () => void

  salvarProduto: (p: Novo<Produto>) => string
  removerProduto: (id: string) => void
  salvarKit: (k: Novo<Kit>) => string
  removerKit: (id: string) => void
  salvarDrink: (d: Novo<Drink>) => string
  removerDrink: (id: string) => void

  registrarVenda: (itens: ItemCarrinho[], descontoCents: number, forma: FormaPagamento) => ResultadoVenda
  cancelarVenda: (id: string, motivo: string) => void

  entradaEstoque: (e: DadosEntrada) => void
  /** Ajuste para uma quantidade CONTADA, ou perda (quebra) de `quantidade` unidades. */
  ajustarEstoque: (produtoId: string, novaQuantidade: number, motivo: string) => void
  registrarPerda: (produtoId: string, quantidade: number, motivo: string) => void

  salvarContaPagar: (c: Novo<ContaPagar>) => string
  removerContaPagar: (id: string) => void
  pagarConta: (id: string, data: string, forma: MeioPagamento) => void
  desfazerPagamento: (id: string) => void
  salvarContaReceber: (c: Novo<ContaReceber>) => string
  removerContaReceber: (id: string) => void
  receberConta: (id: string, data: string, forma: MeioPagamento | FormaPagamento) => void
  desfazerRecebimento: (id: string) => void

  marcarLida: (perfil: Perfil, id: string) => void
  marcarTodasLidas: (perfil: Perfil, ids: string[]) => void
}

export type DemoState = DadosDemo & Acoes

const ROTULO_CAMPO: Record<string, string> = {
  nome: "Nome",
  categoria: "Categoria",
  marca: "Marca",
  unidade: "Unidade",
  volumeMl: "Volume (ml)",
  custoCents: "Custo",
  precoVendaCents: "Preço de venda",
  precoCents: "Preço",
  vendeAvulso: "Vende no PDV",
  estoqueMinimo: "Estoque mínimo",
  fornecedor: "Fornecedor",
  ativo: "Ativo",
  descricao: "Descrição",
  valorCents: "Valor",
  vencimento: "Vencimento",
  cliente: "Cliente",
  origem: "Origem",
  observacoes: "Observações",
}

function legivel(campo: string, v: unknown): string {
  if (v === undefined || v === null || v === "") return "vazio"
  if (campo.endsWith("Cents") && typeof v === "number") return formatPrice(v)
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/")
  if (typeof v === "boolean") return v ? "sim" : "não"
  return String(v)
}

function diff<T extends object>(antes: T, depois: T): Mudanca[] {
  const out: Mudanca[] = []
  for (const campo of Object.keys(ROTULO_CAMPO)) {
    const a = (antes as Record<string, unknown>)[campo]
    const b = (depois as Record<string, unknown>)[campo]
    if (a === b || (a == null && b == null)) continue
    if (!(campo in depois) && !(campo in antes)) continue
    out.push({ campo: ROTULO_CAMPO[campo], de: legivel(campo, a), para: legivel(campo, b) })
  }
  return out
}

/** Arredonda frações de estoque (doses) para não acumular 0,30000000004. */
const r4 = (n: number) => Math.round(n * 10000) / 10000

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => {
      function novoId(prefixo: string): string {
        const seq = get().seq + 1
        set({ seq })
        return `${prefixo}${seq}`
      }

      function registrar(r: Registro, aviso?: Aviso) {
        const u = usuarioAtual()
        const agora = new Date().toISOString()
        const entrada: Auditoria = { id: novoId("au"), ...r, usuario: u.nome, perfil: u.perfil, data: agora }
        set((s) => ({ auditoria: [entrada, ...s.auditoria] }))
        if (aviso) avisar(aviso, r.entidade)
      }

      function avisar(aviso: Aviso, entidade: Entidade) {
        const u = usuarioAtual()
        const n: Notificacao = { id: novoId("nt"), entidade, ator: u.nome, data: new Date().toISOString(), ...aviso }
        set((s) => ({ notificacoes: [n, ...s.notificacoes] }))
      }

      /** Avisa quando um produto CRUZA o mínimo — não a cada venda abaixo dele. */
      function avisarSeCruzouMinimo(antes: Produto, depois: Produto) {
        const cruzouMinimo = antes.estoque > antes.estoqueMinimo && depois.estoque <= depois.estoqueMinimo
        const zerou = antes.estoque > 0.0001 && depois.estoque <= 0.0001
        if (!cruzouMinimo && !zerou) return
        avisar(
          {
            tom: zerou ? "perigo" : "alerta",
            titulo: zerou ? "Produto zerado no estoque" : "Estoque abaixo do mínimo",
            corpo: `${depois.nome} — ${r4(depois.estoque).toLocaleString("pt-BR")} ${depois.unidade} (mínimo ${depois.estoqueMinimo})`,
            href: `/painel/produtos/${depois.id}`,
            para: ["dono", "gerente"],
          },
          "estoque"
        )
      }

      /** Aplica deltas de estoque e grava uma movimentação por produto. */
      function moverEstoque(
        deltas: Map<string, number>,
        mov: Omit<MovEstoque, "id" | "produtoId" | "quantidade" | "data" | "responsavel">
      ) {
        const u = usuarioAtual()
        const agora = new Date().toISOString()
        const antes = get().produtos
        const novos: MovEstoque[] = []
        const produtos = antes.map((p) => {
          const d = deltas.get(p.id)
          if (!d) return p
          novos.push({ id: novoId("me"), produtoId: p.id, quantidade: r4(d), data: agora, responsavel: u.nome, ...mov })
          return { ...p, estoque: r4(p.estoque + d) }
        })
        set((s) => ({ produtos, movsEstoque: [...novos, ...s.movsEstoque] }))
        for (const p of produtos) {
          const a = antes.find((x) => x.id === p.id)
          if (a && a !== p) avisarSeCruzouMinimo(a, p)
        }
      }

      function salvarEm<K extends "produtos" | "kits" | "drinks" | "contasPagar" | "contasReceber", T extends { id: string; criadoEm: string }>(
        chave: K,
        prefixo: string,
        entidade: Entidade,
        dados: Novo<T>,
        rotulo: (x: T) => string
      ): string {
        const lista = get()[chave] as unknown as T[]
        if (dados.id) {
          const antes = lista.find((x) => x.id === dados.id)
          const depois = { ...antes, ...dados } as T
          set({ [chave]: lista.map((x) => (x.id === dados.id ? depois : x)) } as Partial<DadosDemo>)
          if (antes) registrar({ entidade, entidadeId: depois.id, acao: "UPDATE", rotulo: rotulo(depois), mudancas: diff(antes, depois) })
          return depois.id
        }
        const novo = { ...dados, id: novoId(prefixo), criadoEm: hoje() } as unknown as T
        set({ [chave]: [novo, ...lista] } as Partial<DadosDemo>)
        registrar({ entidade, entidadeId: novo.id, acao: "CREATE", rotulo: rotulo(novo) })
        return novo.id
      }

      function removerDe<K extends "produtos" | "kits" | "drinks" | "contasPagar" | "contasReceber", T extends { id: string }>(
        chave: K,
        entidade: Entidade,
        id: string,
        rotulo: (x: T) => string
      ) {
        const lista = get()[chave] as unknown as T[]
        const alvo = lista.find((x) => x.id === id)
        if (!alvo) return
        set({ [chave]: lista.filter((x) => x.id !== id) } as Partial<DadosDemo>)
        registrar({ entidade, entidadeId: id, acao: "DELETE", rotulo: rotulo(alvo) })
      }

      return {
        ...gerarSeed(),
        restaurar: () => set({ ...gerarSeed() }),

        // ---------- Produtos, kits e drinks ----------
        salvarProduto: (p) => salvarEm<"produtos", Produto>("produtos", "pr", "produto", p, (x) => x.nome),
        removerProduto: (id) => removerDe<"produtos", Produto>("produtos", "produto", id, (x) => x.nome),
        salvarKit: (k) => salvarEm<"kits", Kit>("kits", "kt", "kit", k, (x) => `${x.nome} — ${formatPrice(x.precoCents)}`),
        removerKit: (id) => removerDe<"kits", Kit>("kits", "kit", id, (x) => x.nome),
        salvarDrink: (d) => salvarEm<"drinks", Drink>("drinks", "dr", "drink", d, (x) => `${x.nome} — ${formatPrice(x.precoCents)}`),
        removerDrink: (id) => removerDe<"drinks", Drink>("drinks", "drink", id, (x) => x.nome),

        // ---------- Venda ----------
        registrarVenda: (carrinho, descontoCents, forma) => {
          const s = get()
          const itensValidos = carrinho.filter((i) => i.quantidade > 0)
          const consumo = consumoDosItens(itensValidos, s.produtos, s.kits, s.drinks)
          const faltas = faltasDeEstoque(consumo, s.produtos)
          if (faltas.length > 0) {
            return { ok: false, faltas: faltas.map((f) => ({ nome: f.produto.nome, precisa: r4(f.precisa), tem: r4(f.tem) })) }
          }

          // Snapshot de nome, preço e CUSTO do momento: a margem do relatório
          // não pode mudar porque o gin ficou mais caro depois.
          const itens: ItemVenda[] = itensValidos.map((i) => {
            if (i.tipo === "produto") {
              const p = s.produtos.find((x) => x.id === i.refId)!
              return { ...i, nome: p.nome, precoUnitCents: p.precoVendaCents, custoUnitCents: p.custoCents }
            }
            if (i.tipo === "kit") {
              const k = s.kits.find((x) => x.id === i.refId)!
              return { ...i, nome: k.nome, precoUnitCents: k.precoCents, custoUnitCents: custoDoKitCents(k, s.produtos) }
            }
            const d = s.drinks.find((x) => x.id === i.refId)!
            return { ...i, nome: d.nome, precoUnitCents: d.precoCents, custoUnitCents: custoDoDrinkCents(d, s.produtos) }
          })
          const subtotal = itens.reduce((t, i) => t + i.precoUnitCents * i.quantidade, 0)
          const desconto = Math.min(Math.max(0, descontoCents), subtotal)
          const total = subtotal - desconto
          const u = usuarioAtual()
          const vendaId = novoId("vd")
          const numero = s.proximaVenda

          // A conta a receber nasce com o prazo e a taxa da forma de pagamento.
          const liq = LIQUIDACAO[forma]
          const taxa = Math.round((total * liq.taxaPct) / 100)
          const venc = somarDias(hoje(), liq.dias)
          const contaId = novoId("cr")
          const conta: ContaReceber = {
            id: contaId,
            descricao: `Venda #${numero} — ${FORMA_LABEL[forma]}`,
            valorCents: total - taxa,
            vencimento: venc,
            origem: "venda",
            cliente: "Cliente do balcão",
            recebidoEm: liq.dias === 0 ? hoje() : undefined,
            forma,
            observacoes: taxa ? `Bruto ${formatPrice(total)} − taxa ${liq.taxaPct}% (${formatPrice(taxa)})` : "",
            vendaId,
            criadoEm: hoje(),
          }
          const venda: Venda = {
            id: vendaId,
            numero,
            data: new Date().toISOString(),
            itens,
            subtotalCents: subtotal,
            descontoCents: desconto,
            totalCents: total,
            forma,
            operador: u.nome,
            status: "concluida",
            contaReceberId: contaId,
          }
          set((st) => ({
            vendas: [venda, ...st.vendas],
            contasReceber: [conta, ...st.contasReceber],
            proximaVenda: numero + 1,
          }))
          const deltas = new Map([...consumo].map(([id, q]) => [id, -q]))
          moverEstoque(deltas, { tipo: "venda", motivo: `Venda #${numero}`, vendaId })
          registrar({ entidade: "venda", entidadeId: vendaId, acao: "VENDA", rotulo: `Venda #${numero} — ${formatPrice(total)} (${FORMA_LABEL[forma]})` })
          return { ok: true, vendaId, numero }
        },

        cancelarVenda: (id, motivo) => {
          const s = get()
          const v = s.vendas.find((x) => x.id === id)
          if (!v || v.status === "cancelada") return
          set((st) => ({
            vendas: st.vendas.map((x) =>
              x.id === id ? { ...x, status: "cancelada", canceladaEm: new Date().toISOString(), motivoCancelamento: motivo } : x
            ),
            // O dinheiro que a venda ia trazer deixa de existir.
            contasReceber: st.contasReceber.filter((c) => c.id !== v.contaReceberId),
          }))
          // Estorno: devolve ao estoque o que ela consumiu (receitas de HOJE —
          // num sistema real o consumo seria gravado na venda).
          const consumo = consumoDosItens(v.itens, s.produtos, s.kits, s.drinks)
          moverEstoque(consumo, { tipo: "estorno", motivo: `Cancelamento da venda #${v.numero}: ${motivo}`, vendaId: id })
          registrar(
            { entidade: "venda", entidadeId: id, acao: "CANCELAR", rotulo: `Venda #${v.numero} — ${formatPrice(v.totalCents)}`, mudancas: [{ campo: "Motivo", de: "—", para: motivo }] },
            { tom: "alerta", titulo: "Venda cancelada", corpo: `#${v.numero} — ${formatPrice(v.totalCents)}: ${motivo}`, href: `/painel/vendas/${id}`, para: ["dono"] }
          )
        },

        // ---------- Estoque ----------
        entradaEstoque: (e) => {
          const s = get()
          const p = s.produtos.find((x) => x.id === e.produtoId)
          if (!p || e.quantidade <= 0) return
          // CUSTO MÉDIO PONDERADO: o que já tinha vale o custo antigo, o que
          // chegou vale o da nota. É o custo que o drink e o kit passam a usar.
          const base = Math.max(0, p.estoque)
          const custoMedio = Math.round((base * p.custoCents + e.quantidade * e.custoUnitCents) / (base + e.quantidade))
          const total = Math.round(e.quantidade * e.custoUnitCents)
          let contaId: string | undefined
          if (e.conta) {
            contaId = novoId("cp")
            const conta: ContaPagar = {
              id: contaId,
              descricao: `Mercadoria — ${p.nome} (${e.quantidade} ${p.unidade})`,
              valorCents: total,
              vencimento: e.conta.vencimento,
              categoria: "mercadoria",
              fornecedor: e.fornecedor,
              pagoEm: e.conta.pago ? hoje() : undefined,
              forma: e.conta.forma,
              observacoes: e.documento,
              criadoEm: hoje(),
            }
            set((st) => ({ contasPagar: [conta, ...st.contasPagar] }))
          }
          set((st) => ({ produtos: st.produtos.map((x) => (x.id === p.id ? { ...x, custoCents: custoMedio } : x)) }))
          moverEstoque(new Map([[p.id, e.quantidade]]), {
            tipo: "entrada",
            custoUnitCents: e.custoUnitCents,
            motivo: [e.documento, e.fornecedor].filter(Boolean).join(" — ") || "Entrada",
            contaPagarId: contaId,
          })
          registrar({
            entidade: "estoque",
            entidadeId: p.id,
            acao: "ENTRADA",
            rotulo: `${p.nome} — +${e.quantidade} ${p.unidade} a ${formatPrice(e.custoUnitCents)}`,
            mudancas: custoMedio !== p.custoCents ? [{ campo: "Custo médio", de: formatPrice(p.custoCents), para: formatPrice(custoMedio) }] : undefined,
          })
        },

        ajustarEstoque: (produtoId, novaQuantidade, motivo) => {
          const p = get().produtos.find((x) => x.id === produtoId)
          if (!p) return
          const delta = r4(novaQuantidade - p.estoque)
          if (delta === 0) return
          moverEstoque(new Map([[p.id, delta]]), { tipo: "ajuste", motivo })
          registrar({
            entidade: "estoque",
            entidadeId: p.id,
            acao: "AJUSTE",
            rotulo: p.nome,
            mudancas: [{ campo: "Estoque", de: String(r4(p.estoque)), para: String(r4(novaQuantidade)) }],
          })
        },

        registrarPerda: (produtoId, quantidade, motivo) => {
          const p = get().produtos.find((x) => x.id === produtoId)
          if (!p || quantidade <= 0) return
          moverEstoque(new Map([[p.id, -quantidade]]), { tipo: "perda", motivo, custoUnitCents: p.custoCents })
          registrar({ entidade: "estoque", entidadeId: p.id, acao: "PERDA", rotulo: `${p.nome} — ${quantidade} ${p.unidade} (${formatPrice(Math.round(quantidade * p.custoCents))})` })
        },

        // ---------- Contas a pagar ----------
        salvarContaPagar: (c) =>
          salvarEm<"contasPagar", ContaPagar>("contasPagar", "cp", "conta_pagar", c, (x) => `${x.descricao} — ${formatPrice(x.valorCents)}`),
        removerContaPagar: (id) => removerDe<"contasPagar", ContaPagar>("contasPagar", "conta_pagar", id, (x) => x.descricao),
        pagarConta: (id, data, forma) => {
          const c = get().contasPagar.find((x) => x.id === id)
          if (!c) return
          set((s) => ({ contasPagar: s.contasPagar.map((x) => (x.id === id ? { ...x, pagoEm: data, forma } : x)) }))
          registrar({ entidade: "conta_pagar", entidadeId: id, acao: "PAGAR", rotulo: `${c.descricao} — ${formatPrice(c.valorCents)}` })
        },
        desfazerPagamento: (id) => {
          const c = get().contasPagar.find((x) => x.id === id)
          if (!c) return
          set((s) => ({ contasPagar: s.contasPagar.map((x) => (x.id === id ? { ...x, pagoEm: undefined } : x)) }))
          registrar({ entidade: "conta_pagar", entidadeId: id, acao: "UPDATE", rotulo: c.descricao, mudancas: [{ campo: "Situação", de: "paga", para: "em aberto" }] })
        },

        // ---------- Contas a receber ----------
        salvarContaReceber: (c) =>
          salvarEm<"contasReceber", ContaReceber>("contasReceber", "cr", "conta_receber", c, (x) => `${x.descricao} — ${formatPrice(x.valorCents)}`),
        removerContaReceber: (id) => removerDe<"contasReceber", ContaReceber>("contasReceber", "conta_receber", id, (x) => x.descricao),
        receberConta: (id, data, forma) => {
          const c = get().contasReceber.find((x) => x.id === id)
          if (!c) return
          set((s) => ({ contasReceber: s.contasReceber.map((x) => (x.id === id ? { ...x, recebidoEm: data, forma } : x)) }))
          registrar({ entidade: "conta_receber", entidadeId: id, acao: "RECEBER", rotulo: `${c.descricao} — ${formatPrice(c.valorCents)}` })
        },
        desfazerRecebimento: (id) => {
          const c = get().contasReceber.find((x) => x.id === id)
          if (!c) return
          set((s) => ({ contasReceber: s.contasReceber.map((x) => (x.id === id ? { ...x, recebidoEm: undefined } : x)) }))
          registrar({ entidade: "conta_receber", entidadeId: id, acao: "UPDATE", rotulo: c.descricao, mudancas: [{ campo: "Situação", de: "recebida", para: "em aberto" }] })
        },

        // ---------- Notificações ----------
        marcarLida: (perfil, id) =>
          set((s) => ({ lidas: { ...s.lidas, [perfil]: Array.from(new Set([...(s.lidas[perfil] ?? []), id])) } })),
        marcarTodasLidas: (perfil, ids) =>
          set((s) => ({ lidas: { ...s.lidas, [perfil]: Array.from(new Set([...(s.lidas[perfil] ?? []), ...ids])) } })),
      }
    },
    {
      name: "degga-demo",
      version: 1,
      partialize: (s) => {
        const { produtos, kits, drinks, vendas, movsEstoque, contasPagar, contasReceber, auditoria, notificacoes, lidas, proximaVenda, seq } = s
        return { produtos, kits, drinks, vendas, movsEstoque, contasPagar, contasReceber, auditoria, notificacoes, lidas, proximaVenda, seq }
      },
    }
  )
)
