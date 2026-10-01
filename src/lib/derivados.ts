import type { TomDeEstado } from "@/components/common/status-badge"
import type {
  ContaPagar,
  ContaReceber,
  Drink,
  ItemVenda,
  Kit,
  Produto,
  Venda,
} from "@/data/tipos"
import { hoje, somarDias } from "./datas"

/**
 * Tudo que é CALCULADO e não guardado: custo de kit e de drink, margem, quanto
 * dá para montar com o estoque, situação de conta e fluxo de caixa. Guardar
 * isso seria ter duas verdades — o custo do drink tem que mudar sozinho quando
 * o gin fica mais caro.
 *
 * ⚠️ O STORE usa estas mesmas funções para baixar o estoque na venda. A tela e
 * a baixa não podem fazer contas diferentes.
 */

// ------------------------------------------------------------------ produto

/** Custo de 1 ml (centavos, com fração). Zero se o produto não é dosável. */
export function custoPorMl(p: Produto): number {
  return p.volumeMl > 0 ? p.custoCents / p.volumeMl : 0
}

/** Preço de 1 ml a partir do preço da garrafa — referência para precificar dose. */
export function precoPorMl(p: Produto): number {
  return p.volumeMl > 0 ? p.precoVendaCents / p.volumeMl : 0
}

/** Margem sobre o PREÇO (markup não): (preço − custo) / preço, em %. */
export function margemPct(precoCents: number, custoCents: number): number {
  if (precoCents <= 0) return 0
  return ((precoCents - custoCents) / precoCents) * 100
}

/** Lucro bruto por unidade vendida. */
export function lucroCents(precoCents: number, custoCents: number): number {
  return precoCents - custoCents
}

export type SituacaoEstoque = "ok" | "baixo" | "zerado"

export function situacaoEstoque(p: Pick<Produto, "estoque" | "estoqueMinimo">): SituacaoEstoque {
  if (p.estoque <= 0.0001) return "zerado"
  if (p.estoque <= p.estoqueMinimo) return "baixo"
  return "ok"
}

export const ESTOQUE_TOM: Record<SituacaoEstoque, TomDeEstado> = { ok: "ok", baixo: "espera", zerado: "alerta" }
export const ESTOQUE_LABEL: Record<SituacaoEstoque, string> = {
  ok: "Em dia",
  baixo: "Abaixo do mínimo",
  zerado: "Zerado",
}

/** Valor do estoque a custo. */
export function valorEmEstoqueCents(p: Produto): number {
  return Math.round(Math.max(0, p.estoque) * p.custoCents)
}

/**
 * "12,4 garrafas (≈ 9.300 ml)" — o estoque de produto dosável lido nas duas
 * unidades, porque o bar pensa em garrafa e o drink em ml.
 */
export function estoqueEmTexto(p: Produto): string {
  const un = p.estoque.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  if (p.volumeMl <= 0) return `${un} ${p.unidade}`
  const ml = Math.round(p.estoque * p.volumeMl).toLocaleString("pt-BR")
  return `${un} ${p.unidade} (≈ ${ml} ml)`
}

// ------------------------------------------------------------------ consumo

/** Quanto do estoque do produto (em UNIDADES) um item de receita consome. */
export function unidadesConsumidas(p: Produto, quantidade: number): number {
  return p.volumeMl > 0 ? quantidade / p.volumeMl : quantidade
}

/** Mapa produtoId -> unidades consumidas por 1 kit. */
export function consumoDoKit(kit: Kit): Map<string, number> {
  const m = new Map<string, number>()
  for (const i of kit.itens) m.set(i.produtoId, (m.get(i.produtoId) ?? 0) + i.quantidade)
  return m
}

/** Mapa produtoId -> unidades consumidas por 1 drink. */
export function consumoDoDrink(drink: Drink, produtos: Produto[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const i of drink.itens) {
    const p = produtos.find((x) => x.id === i.produtoId)
    if (!p) continue
    m.set(p.id, (m.get(p.id) ?? 0) + unidadesConsumidas(p, i.quantidade))
  }
  return m
}

/**
 * O consumo de estoque de uma lista de itens de venda (produto, kit e drink
 * juntos). É a função que a venda usa para baixar o estoque e o PDV usa para
 * avisar que falta — a mesma, para as duas concordarem.
 */
export function consumoDosItens(
  itens: Pick<ItemVenda, "tipo" | "refId" | "quantidade">[],
  produtos: Produto[],
  kits: Kit[],
  drinks: Drink[]
): Map<string, number> {
  const total = new Map<string, number>()
  const somar = (m: Map<string, number>, vezes: number) => {
    for (const [id, q] of m) total.set(id, (total.get(id) ?? 0) + q * vezes)
  }
  for (const it of itens) {
    if (it.tipo === "produto") {
      total.set(it.refId, (total.get(it.refId) ?? 0) + it.quantidade)
    } else if (it.tipo === "kit") {
      const k = kits.find((x) => x.id === it.refId)
      if (k) somar(consumoDoKit(k), it.quantidade)
    } else {
      const d = drinks.find((x) => x.id === it.refId)
      if (d) somar(consumoDoDrink(d, produtos), it.quantidade)
    }
  }
  return total
}

/** Produtos que não têm estoque para o consumo pedido (nome + falta). */
export function faltasDeEstoque(
  consumo: Map<string, number>,
  produtos: Produto[]
): { produto: Produto; precisa: number; tem: number }[] {
  const out: { produto: Produto; precisa: number; tem: number }[] = []
  for (const [id, precisa] of consumo) {
    const p = produtos.find((x) => x.id === id)
    if (p && p.estoque + 0.0001 < precisa) out.push({ produto: p, precisa, tem: p.estoque })
  }
  return out
}

// ------------------------------------------------------------------ kit e drink

export function custoDoKitCents(kit: Kit, produtos: Produto[]): number {
  let total = 0
  for (const i of kit.itens) {
    const p = produtos.find((x) => x.id === i.produtoId)
    if (p) total += p.custoCents * i.quantidade
  }
  return Math.round(total)
}

/** Soma dos preços avulsos — o "de" do "de/por" do combo. */
export function precoAvulsoDoKitCents(kit: Kit, produtos: Produto[]): number {
  let total = 0
  for (const i of kit.itens) {
    const p = produtos.find((x) => x.id === i.produtoId)
    if (p) total += p.precoVendaCents * i.quantidade
  }
  return total
}

export function custoDoDrinkCents(drink: Drink, produtos: Produto[]): number {
  let total = 0
  for (const i of drink.itens) {
    const p = produtos.find((x) => x.id === i.produtoId)
    if (!p) continue
    total += p.volumeMl > 0 ? custoPorMl(p) * i.quantidade : p.custoCents * i.quantidade
  }
  return Math.round(total)
}

/** Custo de UMA linha de receita — para a tabela de ingredientes do drink. */
export function custoDoIngredienteCents(p: Produto, quantidade: number): number {
  return Math.round(p.volumeMl > 0 ? custoPorMl(p) * quantidade : p.custoCents * quantidade)
}

/** Quantas unidades dá para montar com o estoque atual (o gargalo manda). */
export function quantosDaParaMontar(consumoUnitario: Map<string, number>, produtos: Produto[]): number {
  let min = Infinity
  for (const [id, q] of consumoUnitario) {
    if (q <= 0) continue
    const p = produtos.find((x) => x.id === id)
    if (!p) return 0
    min = Math.min(min, Math.floor((Math.max(0, p.estoque) + 0.0001) / q))
  }
  return min === Infinity ? 0 : min
}

// ------------------------------------------------------------------ vendas

export function custoDaVendaCents(v: Venda): number {
  return v.itens.reduce((t, i) => t + i.custoUnitCents * i.quantidade, 0)
}

export const FORMA_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  boleto: "Boleto",
  transferencia: "Transferência",
  cartao: "Cartão",
}

/**
 * Quando o dinheiro da venda cai, e quanto a maquininha fica. Dinheiro e Pix
 * na hora; débito D+1; crédito D+30. Taxas fictícias, mas plausíveis — é o que
 * faz o fluxo de caixa mostrar "vendi 100, entrou 97".
 */
export const LIQUIDACAO: Record<"dinheiro" | "pix" | "debito" | "credito", { dias: number; taxaPct: number }> = {
  dinheiro: { dias: 0, taxaPct: 0 },
  pix: { dias: 0, taxaPct: 0 },
  debito: { dias: 1, taxaPct: 1.6 },
  credito: { dias: 30, taxaPct: 3.4 },
}

// ------------------------------------------------------------------ contas

export type SituacaoConta = "quitada" | "vencida" | "hoje" | "semana" | "aberta"

export function situacaoConta(c: { vencimento: string; pagoEm?: string; recebidoEm?: string }): SituacaoConta {
  if (c.pagoEm || c.recebidoEm) return "quitada"
  const h = hoje()
  if (c.vencimento < h) return "vencida"
  if (c.vencimento === h) return "hoje"
  if (c.vencimento <= somarDias(h, 7)) return "semana"
  return "aberta"
}

export const SITUACAO_TOM: Record<SituacaoConta, TomDeEstado> = {
  quitada: "ok",
  vencida: "alerta",
  hoje: "espera",
  semana: "andamento",
  aberta: "neutro",
}

export function rotuloSituacao(s: SituacaoConta, tipo: "pagar" | "receber"): string {
  switch (s) {
    case "quitada":
      return tipo === "pagar" ? "Paga" : "Recebida"
    case "vencida":
      return "Vencida"
    case "hoje":
      return "Vence hoje"
    case "semana":
      return "Vence em 7 dias"
    default:
      return tipo === "pagar" ? "A pagar" : "A receber"
  }
}

export function somaCents<T>(lista: T[], f: (x: T) => number): number {
  return lista.reduce((t, x) => t + f(x), 0)
}

// ------------------------------------------------------------------ fluxo de caixa

export interface DiaDoFluxo {
  dia: string
  entrouCents: number
  saiuCents: number
  /** Previsto = em aberto com vencimento no dia (só do dia de hoje em diante). */
  aEntrarCents: number
  aSairCents: number
  saldoCents: number
}

/**
 * O fluxo de caixa dia a dia: o REALIZADO pelo dia em que pagou/recebeu e o
 * PREVISTO pelo vencimento do que está em aberto. O saldo acumula realizado e
 * previsto juntos — é a pergunta "vai faltar dinheiro dia 10?".
 *
 * ⚠️ Conta em aberto e VENCIDA entra no previsto de HOJE: ela não sumiu, só
 * atrasou. Jogá-la no passado faria o caixa de hoje parecer melhor do que é.
 */
export function fluxoDeCaixa(
  pagar: ContaPagar[],
  receber: ContaReceber[],
  de: string,
  ate: string,
  saldoInicialCents = 0
): DiaDoFluxo[] {
  const h = hoje()
  const dias: DiaDoFluxo[] = []
  for (let d = de; d <= ate; d = somarDias(d, 1)) {
    dias.push({ dia: d, entrouCents: 0, saiuCents: 0, aEntrarCents: 0, aSairCents: 0, saldoCents: 0 })
  }
  const idx = new Map(dias.map((d, i) => [d.dia, i]))
  const noDia = (d: string) => idx.get(d)

  for (const c of receber) {
    if (c.recebidoEm) {
      const i = noDia(c.recebidoEm)
      if (i !== undefined) dias[i].entrouCents += c.valorCents
    } else {
      const i = noDia(c.vencimento < h ? h : c.vencimento)
      if (i !== undefined) dias[i].aEntrarCents += c.valorCents
    }
  }
  for (const c of pagar) {
    if (c.pagoEm) {
      const i = noDia(c.pagoEm)
      if (i !== undefined) dias[i].saiuCents += c.valorCents
    } else {
      const i = noDia(c.vencimento < h ? h : c.vencimento)
      if (i !== undefined) dias[i].aSairCents += c.valorCents
    }
  }
  let saldo = saldoInicialCents
  for (const d of dias) {
    saldo += d.entrouCents - d.saiuCents + d.aEntrarCents - d.aSairCents
    d.saldoCents = saldo
  }
  return dias
}

/** Saldo realizado até (exclusive) uma data — o ponto de partida do fluxo. */
export function saldoRealizadoAte(pagar: ContaPagar[], receber: ContaReceber[], antesDe: string, saldoBaseCents = 0): number {
  const entrou = somaCents(receber.filter((c) => c.recebidoEm && c.recebidoEm < antesDe), (c) => c.valorCents)
  const saiu = somaCents(pagar.filter((c) => c.pagoEm && c.pagoEm < antesDe), (c) => c.valorCents)
  return saldoBaseCents + entrou - saiu
}
