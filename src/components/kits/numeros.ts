import { fmtNum } from "@/components/produtos/comum"
import type { Kit, Produto } from "@/data/tipos"
import { consumoDoKit, custoDoKitCents, margemPct, precoAvulsoDoKitCents, quantosDaParaMontar } from "@/lib/derivados"

/** Os números do kit, calculados juntos para lista, ficha e formulário. */
export function numerosDoKit(k: Kit, produtos: Produto[]) {
  const custo = custoDoKitCents(k, produtos)
  const avulso = precoAvulsoDoKitCents(k, produtos)
  const economia = avulso - k.precoCents
  return {
    custo,
    avulso,
    economia,
    economiaPct: avulso > 0 ? (economia / avulso) * 100 : 0,
    margem: margemPct(k.precoCents, custo),
    lucro: k.precoCents - custo,
    daPara: quantosDaParaMontar(consumoDoKit(k), produtos),
  }
}

export function resumoDosItens(k: Kit, produtos: Produto[]): string {
  return k.itens.map((i) => `${fmtNum(i.quantidade)}× ${produtos.find((p) => p.id === i.produtoId)?.nome ?? "produto removido"}`).join(", ")
}
