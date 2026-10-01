"use client"

import { Area, AreaChart, Bar, BarChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { DiaDoFluxo } from "@/lib/derivados"
import { formatDate, formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"

/**
 * Entrou × saiu em AZUL × LARANJA (hex dos módulos receber/pagar): o par
 * verde/vermelho falhou no validador de daltonismo no apae-mvp. O previsto é a
 * mesma cor, mais clara — é a mesma coisa, só que ainda não aconteceu.
 *
 * ⚠️ Saldo num gráfico SEPARADO, nunca segundo eixo Y: a escala do saldo
 * acumulado esmagaria as barras do dia.
 */
const COR_ENTRA = MODULOS.receber.hex
const COR_SAI = MODULOS.pagar.hex

const CONFIG_MOV = {
  entrou: { label: "Entrou", color: COR_ENTRA },
  aEntrar: { label: "A entrar", color: COR_ENTRA },
  saiu: { label: "Saiu", color: COR_SAI },
  aSair: { label: "A sair", color: COR_SAI },
} satisfies ChartConfig

const CONFIG_SALDO = {
  saldo: { label: "Saldo", color: "var(--foreground)" },
} satisfies ChartConfig

const curto = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const compacto = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 })

/** Movimento do dia espelhado no zero: entradas acima, saídas abaixo. */
export function GraficoMovimento({ dias }: { dias: DiaDoFluxo[] }) {
  const dados = dias.map((d) => ({
    dia: d.dia,
    entrou: d.entrouCents,
    aEntrar: d.aEntrarCents,
    // Negativo só para o desenho; o tooltip volta a positivo.
    saiu: -d.saiuCents,
    aSair: -d.aSairCents,
  }))
  return (
    <ChartContainer config={CONFIG_MOV} className="h-[240px] w-full">
      <BarChart data={dados} margin={{ left: 4, right: 4, top: 8 }} stackOffset="sign" barCategoryGap="18%">
        <ReferenceLine y={0} stroke="var(--border)" />
        <XAxis dataKey="dia" tickFormatter={(v) => curto(String(v))} tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => compacto(Math.abs(Number(v)))} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatDate(String(v))}
              formatter={(v, n) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{CONFIG_MOV[n as keyof typeof CONFIG_MOV]?.label ?? n}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(Math.abs(Number(v)))}</span>
                </span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="entrou" stackId="e" fill="var(--color-entrou)" maxBarSize={18} />
        <Bar dataKey="aEntrar" stackId="e" fill="var(--color-aEntrar)" fillOpacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={18} />
        <Bar dataKey="saiu" stackId="s" fill="var(--color-saiu)" maxBarSize={18} />
        <Bar dataKey="aSair" stackId="s" fill="var(--color-aSair)" fillOpacity={0.35} radius={[0, 0, 3, 3]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  )
}

/** Saldo acumulado (realizado + previsto) dia a dia. */
export function GraficoSaldo({ dias }: { dias: DiaDoFluxo[] }) {
  const dados = dias.map((d) => ({ dia: d.dia, saldo: d.saldoCents }))
  return (
    <ChartContainer config={CONFIG_SALDO} className="h-[160px] w-full">
      <AreaChart data={dados} margin={{ left: 4, right: 4, top: 8 }}>
        <ReferenceLine y={0} stroke="var(--border)" />
        <XAxis dataKey="dia" tickFormatter={(v) => curto(String(v))} tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => compacto(Number(v))} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatDate(String(v))}
              formatter={(v) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className="font-semibold tabular-nums">{formatPrice(Number(v))}</span>
                </span>
              )}
            />
          }
        />
        <Area dataKey="saldo" type="monotone" stroke="var(--color-saldo)" strokeWidth={2} fill="var(--color-saldo)" fillOpacity={0.06} />
      </AreaChart>
    </ChartContainer>
  )
}

/**
 * Ranking em barras horizontais. Uma série só, uma cor só: o nome está
 * escrito ao lado de cada barra.
 */
export function Ranking({ itens, cor, vazio }: { itens: { rotulo: string; valor: number; detalhe?: string }[]; cor: string; vazio: string }) {
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">{vazio}</p>
  const maior = Math.max(...itens.map((i) => i.valor), 1)
  const total = itens.reduce((t, i) => t + i.valor, 0)
  return (
    <ul className="space-y-3">
      {itens.map((i) => (
        <li key={i.rotulo} title={`${i.rotulo}: ${formatPrice(i.valor)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{i.rotulo}</span>
            <span className="shrink-0 tabular-nums">
              {formatPrice(i.valor)} <span className="text-xs text-muted-foreground">{total ? Math.round((i.valor / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.max((i.valor / maior) * 100, 1.5)}%`, background: cor }} />
          </div>
          {i.detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{i.detalhe}</p>}
        </li>
      ))}
    </ul>
  )
}

export { COR_ENTRA, COR_SAI }
