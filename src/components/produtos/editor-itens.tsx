"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NumberInput } from "@/components/ui/currency-input"
import type { Produto } from "@/data/tipos"
import { custoDoIngredienteCents, custoPorMl } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { SeletorProduto, campoParaQtd, fmtCentavosFrac, unidadeDaReceita } from "./comum"

/**
 * Editor de composição — o mesmo para kit (produtos inteiros) e drink
 * (receita: ml quando o produto tem volume, unidade quando não tem).
 */

export interface LinhaItem {
  chave: number
  produtoId: string
  qtd: string
}

let proximaChave = 1
export function novaLinha(produtoId = "", quantidade?: number): LinhaItem {
  return { chave: proximaChave++, produtoId, qtd: quantidade ? String(quantidade) : "" }
}

/** Linhas válidas -> itens, somando produto repetido. */
export function linhasParaItens(linhas: LinhaItem[]): { produtoId: string; quantidade: number }[] {
  const m = new Map<string, number>()
  for (const l of linhas) {
    const q = campoParaQtd(l.qtd)
    if (!l.produtoId || q <= 0) continue
    m.set(l.produtoId, (m.get(l.produtoId) ?? 0) + q)
  }
  return [...m].map(([produtoId, quantidade]) => ({ produtoId, quantidade }))
}

export function EditorItens({
  modo,
  linhas,
  onChange,
  produtos,
  erro,
}: {
  modo: "kit" | "drink"
  linhas: LinhaItem[]
  onChange: (l: LinhaItem[]) => void
  /** Produtos que podem ser escolhidos (ativos). */
  produtos: Produto[]
  erro?: string
}) {
  const mudar = (chave: number, campo: Partial<LinhaItem>) => onChange(linhas.map((l) => (l.chave === chave ? { ...l, ...campo } : l)))

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="hidden grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_2.25rem] gap-2 px-1 text-xs font-semibold text-muted-foreground sm:grid">
        <span>Produto</span>
        <span>Quantidade</span>
        <span className="text-right">{modo === "kit" ? "Custo · avulso" : "Custo"}</span>
        <span />
      </div>
      {linhas.map((l) => {
        const p = produtos.find((x) => x.id === l.produtoId)
        const q = campoParaQtd(l.qtd)
        const custo = p ? (modo === "kit" ? Math.round(p.custoCents * q) : custoDoIngredienteCents(p, q)) : 0
        return (
          <div key={l.chave} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_2.25rem] sm:items-center sm:border-0 sm:p-0">
            <SeletorProduto produtos={produtos} valor={l.produtoId} onChange={(id) => mudar(l.chave, { produtoId: id })} />
            <Button type="button" variant="ghost" size="icon" className="sm:order-last" onClick={() => onChange(linhas.filter((x) => x.chave !== l.chave))} aria-label="Tirar item">
              <X className="size-4" />
            </Button>
            <NumberInput value={l.qtd} onChange={(v) => mudar(l.chave, { qtd: v })} suffix={modo === "kit" ? p?.unidade : unidadeDaReceita(p)} />
            <div className="text-right text-sm tabular-nums">
              {p && q > 0 ? (
                <>
                  <p className="font-semibold">{formatPrice(custo)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {modo === "kit"
                      ? p.vendeAvulso
                        ? `avulso ${formatPrice(Math.round(p.precoVendaCents * q))}`
                        : "não vende avulso"
                      : p.volumeMl > 0
                        ? `${fmtCentavosFrac(custoPorMl(p))}/ml`
                        : `${formatPrice(p.custoCents)}/${p.unidade}`}
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        )
      })}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...linhas, novaLinha()])}>
        <Plus className="mr-1.5 h-4 w-4" />
        {modo === "kit" ? "Adicionar produto" : "Adicionar ingrediente"}
      </Button>
    </div>
  )
}
