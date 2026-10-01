import { qtdDaReceita } from "@/components/produtos/comum"
import type { Drink, Produto } from "@/data/tipos"
import { consumoDoDrink, custoDoDrinkCents, margemPct, quantosDaParaMontar } from "@/lib/derivados"

/** Margem-alvo do preço sugerido do drink — referência, não regra. */
export const MARGEM_ALVO_DRINK = 0.75

export function numerosDoDrink(d: Drink, produtos: Produto[]) {
  const custo = custoDoDrinkCents(d, produtos)
  return {
    custo,
    margem: margemPct(d.precoCents, custo),
    lucro: d.precoCents - custo,
    sugerido: Math.round(custo / (1 - MARGEM_ALVO_DRINK)),
    daPara: quantosDaParaMontar(consumoDoDrink(d, produtos), produtos),
  }
}

export function resumoDaReceita(d: Drink, produtos: Produto[]): string {
  return d.itens
    .map((i) => {
      const p = produtos.find((x) => x.id === i.produtoId)
      return p ? `${qtdDaReceita(p, i.quantidade)} ${p.nome}` : "produto removido"
    })
    .join(", ")
}
