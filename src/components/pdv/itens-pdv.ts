import * as React from "react"

import { CATEGORIA_PRODUTO } from "@/data/catalogo"
import type { TipoItemVenda } from "@/data/tipos"
import { consumoDoDrink, consumoDoKit, estoqueEmTexto, quantosDaParaMontar } from "@/lib/derivados"
import { useDemo } from "@/store/demo-store"

/** O que aparece no PDV: produto avulso, kit ou drink, já com a disponibilidade calculada. */
export interface ItemPdv {
  chave: string
  tipo: TipoItemVenda
  refId: string
  nome: string
  /** Marca, descrição — a segunda linha do card. */
  detalhe: string
  precoCents: number
  /** Chave da categoria do chip: categoria do produto, "kit" ou "drink". */
  categoria: string
  /** Quantas unidades inteiras dá para vender agora. */
  disponivel: number
  dispTexto: string
  codigoBarras: string
}

export const chaveItem = (tipo: TipoItemVenda, refId: string) => `${tipo}:${refId}`

export function useItensPdv(): ItemPdv[] {
  const produtos = useDemo((s) => s.produtos)
  const kits = useDemo((s) => s.kits)
  const drinks = useDemo((s) => s.drinks)

  return React.useMemo(() => {
    const out: ItemPdv[] = []
    for (const p of produtos) {
      if (!p.vendeAvulso || !p.ativo) continue
      const zerado = p.estoque <= 0.0001
      out.push({
        chave: chaveItem("produto", p.id),
        tipo: "produto",
        refId: p.id,
        nome: p.nome,
        detalhe: p.marca || CATEGORIA_PRODUTO[p.categoria],
        precoCents: p.precoVendaCents,
        categoria: p.categoria,
        disponivel: Math.floor(Math.max(0, p.estoque) + 0.0001),
        dispTexto: zerado ? "Zerado" : estoqueEmTexto(p),
        codigoBarras: p.codigoBarras ?? "",
      })
    }
    for (const k of kits) {
      if (!k.ativo) continue
      const n = quantosDaParaMontar(consumoDoKit(k), produtos)
      out.push({
        chave: chaveItem("kit", k.id),
        tipo: "kit",
        refId: k.id,
        nome: k.nome,
        detalhe: k.descricao,
        precoCents: k.precoCents,
        categoria: "kit",
        disponivel: n,
        dispTexto: n > 0 ? `Dá para montar ${n}` : "Sem estoque",
        codigoBarras: "",
      })
    }
    for (const d of drinks) {
      if (!d.ativo) continue
      const n = quantosDaParaMontar(consumoDoDrink(d, produtos), produtos)
      out.push({
        chave: chaveItem("drink", d.id),
        tipo: "drink",
        refId: d.id,
        nome: d.nome,
        detalhe: d.descricao,
        precoCents: d.precoCents,
        categoria: "drink",
        disponivel: n,
        dispTexto: n > 0 ? `Dá para montar ${n}` : "Sem estoque",
        codigoBarras: "",
      })
    }
    return out
  }, [produtos, kits, drinks])
}

/** Busca por nome, detalhe ou código de barras (sem acento, sem caixa). */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function filtrarItens(itens: ItemPdv[], busca: string, categoria: string): ItemPdv[] {
  const b = norm(busca.trim())
  return itens.filter((i) => {
    if (categoria !== "tudo" && i.categoria !== categoria) return false
    if (!b) return true
    if (i.codigoBarras && i.codigoBarras === busca.trim()) return true
    return norm(`${i.nome} ${i.detalhe} ${i.codigoBarras}`).includes(b)
  })
}
