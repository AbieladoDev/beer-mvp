"use client"

import * as React from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Produto } from "@/data/tipos"
import { cn } from "@/lib/utils"

/**
 * Peças de produtos, kits e drinks: número com vírgula, margem, a linha de
 * quantidade da receita e o cartão de prévia de preço dos formulários.
 */

/** Campo de quantidade (o `NumberInput` devolve "1.5") -> número. Aceita vírgula também. */
export function campoParaQtd(v: string): number {
  const n = parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

export function qtdParaCampo(n: number | undefined): string {
  return n ? String(n) : ""
}

export function fmtNum(n: number, max = 2): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: max })
}

export function fmtPct(n: number): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
}

/** Centavos com fração (custo por ml) -> "R$ 0,0158". */
export function fmtCentavosFrac(c: number): string {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

/** Unidade em que a quantidade de um item de RECEITA é digitada. */
export function unidadeDaReceita(p: Produto | undefined): string {
  if (!p) return ""
  return p.volumeMl > 0 ? "ml" : p.unidade
}

/** "50 ml" ou "0,5 un" — quantidade de um item de drink. */
export function qtdDaReceita(p: Produto, quantidade: number): string {
  return `${fmtNum(quantidade, 3)} ${unidadeDaReceita(p)}`
}

/** Margem colorida só quando preocupa: negativa em vermelho, abaixo de 30% em âmbar. */
export function Margem({ pct, className }: { pct: number; className?: string }) {
  return (
    <span className={cn("tabular-nums", pct < 0 ? "text-destructive" : pct < 30 ? "text-amber-700" : undefined, className)}>
      {fmtPct(pct)}
    </span>
  )
}

/** Escolha de produto por nome — mostra o estoque ao lado. */
export function SeletorProduto({
  produtos,
  valor,
  onChange,
  placeholder = "Escolha o produto",
  error,
  className,
}: {
  produtos: Produto[]
  valor: string
  onChange: (id: string) => void
  placeholder?: string
  error?: boolean
  className?: string
}) {
  const ordenados = React.useMemo(() => [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [produtos])
  return (
    <Select value={valor || undefined} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full min-w-0", className)} aria-invalid={error || undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {ordenados.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.nome}
            <span className="text-xs text-muted-foreground">
              {fmtNum(p.estoque)} {p.unidade}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export interface LinhaPrevia {
  rotulo: string
  valor: React.ReactNode
  dica?: string
  forte?: boolean
}

/** Cartão de prévia ao vivo (margem, lucro, custo por ml…) ao lado dos campos de preço. */
export function Previa({ titulo, linhas, className }: { titulo: string; linhas: LinhaPrevia[]; className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-muted/40 px-4 py-3 sm:col-span-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-3">
        {linhas.map((l) => (
          <div key={l.rotulo} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{l.rotulo}</dt>
            <dd className={cn("truncate tabular-nums", l.forte ? "text-lg font-extrabold" : "text-sm font-semibold")}>{l.valor}</dd>
            {l.dica && <p className="text-[11px] leading-snug text-muted-foreground">{l.dica}</p>}
          </div>
        ))}
      </dl>
    </div>
  )
}
