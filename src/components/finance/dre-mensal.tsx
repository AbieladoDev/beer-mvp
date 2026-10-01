"use client"

import * as React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { CATEGORIA_DESPESA, CATEGORIAS_DESPESA } from "@/data/catalogo"
import type { CategoriaDespesa, ContaPagar, ContaReceber, Venda } from "@/data/tipos"
import { dataISO, mesDe, rotuloMes, ultimosMeses } from "@/lib/datas"
import { LIQUIDACAO, custoDaVendaCents } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * DRE SIMPLIFICADO, por COMPETÊNCIA (não é caixa):
 * - receita e CMV vêm das VENDAS concluídas, pelo mês da venda, com o custo
 *   congelado no item (`custoUnitCents`);
 * - taxa da maquininha é calculada da venda pela tabela `LIQUIDACAO`;
 * - despesas e outras receitas vêm das contas pelo mês do VENCIMENTO, pagas
 *   ou não. Mercadoria fica de fora: ela já entra como CMV quando é vendida —
 *   contar a nota também seria pagar o mesmo gin duas vezes.
 */
interface LinhaMes {
  receita: number
  cmv: number
  taxas: number
  outras: number
  despesas: Record<CategoriaDespesa, number>
}

const CATEGORIAS_DRE = CATEGORIAS_DESPESA.filter((c) => c !== "mercadoria")

function vazio(): LinhaMes {
  return {
    receita: 0,
    cmv: 0,
    taxas: 0,
    outras: 0,
    despesas: Object.fromEntries(CATEGORIAS_DESPESA.map((c) => [c, 0])) as Record<CategoriaDespesa, number>,
  }
}

export function DreMensal({ vendas, pagar, receber }: { vendas: Venda[]; pagar: ContaPagar[]; receber: ContaReceber[] }) {
  const meses = React.useMemo(() => ultimosMeses(6), [])
  const porMes = React.useMemo(() => {
    const m = new Map(meses.map((x) => [x, vazio()]))
    for (const v of vendas) {
      if (v.status !== "concluida") continue
      const l = m.get(mesDe(dataISO(new Date(v.data))))
      if (!l) continue
      l.receita += v.totalCents
      l.cmv += custoDaVendaCents(v)
      l.taxas += Math.round((v.totalCents * LIQUIDACAO[v.forma].taxaPct) / 100)
    }
    for (const c of receber) {
      if (c.origem === "venda") continue // já está na receita de vendas
      const l = m.get(mesDe(c.vencimento))
      if (l) l.outras += c.valorCents
    }
    for (const c of pagar) {
      const l = m.get(mesDe(c.vencimento))
      if (l) l.despesas[c.categoria] += c.valorCents
    }
    return m
  }, [meses, vendas, pagar, receber])

  const cols = meses.map((x) => porMes.get(x)!)
  const total = (f: (l: LinhaMes) => number) => cols.reduce((t, l) => t + f(l), 0)
  const bruto = (l: LinhaMes) => l.receita - l.cmv
  const despesasOp = (l: LinhaMes) => CATEGORIAS_DRE.reduce((t, c) => t + l.despesas[c], 0)
  const resultado = (l: LinhaMes) => bruto(l) - l.taxas + l.outras - despesasOp(l)
  // Só mostra categoria que teve valor em algum mês.
  const categorias = CATEGORIAS_DRE.filter((c) => total((l) => l.despesas[c]) > 0)

  const linha = (rotulo: string, f: (l: LinhaMes) => number, opts: { sinal?: "-" | "+"; forte?: boolean; recuo?: boolean; pct?: (l: LinhaMes) => number | null } = {}) => (
    <TableRow key={rotulo} className={cn(opts.forte && "bg-muted/40 font-semibold")}>
      <TableCell className={cn("whitespace-nowrap", opts.recuo && "pl-8 text-muted-foreground")}>
        {opts.sinal && <span className="mr-1 text-muted-foreground">({opts.sinal})</span>}
        {rotulo}
      </TableCell>
      {cols.map((l, i) => {
        const v = f(l)
        const p = opts.pct?.(l)
        return (
          <TableCell key={meses[i]} className={cn("text-right tabular-nums", v < 0 && "text-destructive")}>
            {v === 0 ? <span className="text-muted-foreground">—</span> : formatPrice(v)}
            {p != null && <span className="block text-[11px] font-normal text-muted-foreground">{p.toFixed(0)}%</span>}
          </TableCell>
        )
      })}
      <TableCell className={cn("text-right font-semibold tabular-nums", total(f) < 0 && "text-destructive")}>{formatPrice(total(f))}</TableCell>
    </TableRow>
  )

  const margem = (l: LinhaMes) => (l.receita > 0 ? (bruto(l) / l.receita) * 100 : null)

  return (
    <TableSurface>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48" />
            {meses.map((x) => (
              <TableHead key={x} className="text-right">
                {rotuloMes(x)}
              </TableHead>
            ))}
            <TableHead className="text-right">6 meses</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linha("Receita de vendas", (l) => l.receita)}
          {linha("CMV (custo do que foi vendido)", (l) => l.cmv, { sinal: "-" })}
          {linha("Lucro bruto", bruto, { forte: true, pct: margem })}
          {linha("Taxas da maquininha", (l) => l.taxas, { sinal: "-" })}
          {linha("Outras receitas (eventos, outros)", (l) => l.outras, { sinal: "+" })}
          {linha("Despesas operacionais", despesasOp, { sinal: "-" })}
          {categorias.map((c) => linha(CATEGORIA_DESPESA[c], (l) => l.despesas[c], { recuo: true }))}
          {linha("Resultado", resultado, { forte: true })}
        </TableBody>
      </Table>
    </TableSurface>
  )
}
