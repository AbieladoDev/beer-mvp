"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatPrice } from "@/lib/format"

/**
 * Gráficos do dashboard. Visual da casa: MONOCROMÁTICO — série única em
 * `--foreground`. Onde há duas séries (mês atual × anterior) a segunda é cinza
 * e TRACEJADA, com legenda: a diferença não depende só do tom de cinza.
 */

const PRETO = "var(--foreground)"
const CINZA = "#71717a"

/** "R$ 1,2 mil" no eixo — o valor exato fica no tooltip. */
function moedaCurta(cents: number): string {
  const r = cents / 100
  if (Math.abs(r) >= 1000) return `R$ ${(r / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
  return `R$ ${Math.round(r)}`
}

/** O ponto de dados por trás do tooltip (o tipo do recharts não o expõe). */
function carga<T>(p: unknown): T | undefined {
  return (p as { payload?: T }[] | undefined)?.[0]?.payload
}

function LinhaTooltip({ rotulo, valor, extra }: { rotulo: string; valor: string; extra?: string }) {
  return (
    <span className="flex w-full flex-col gap-0.5">
      <span className="flex justify-between gap-4">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="font-semibold tabular-nums">{valor}</span>
      </span>
      {extra && <span className="text-muted-foreground">{extra}</span>}
    </span>
  )
}

export interface PontoBarra {
  rotulo: string
  /** Rótulo longo para o tooltip (data por extenso, "Sexta-feira"…). */
  titulo?: string
  valor: number
  extra?: string
}

/** Barras de uma série (vendas por dia, por hora, por dia da semana). */
export function GraficoBarras({
  dados,
  nome,
  altura = 220,
  formato = "moeda",
  intervalo,
}: {
  dados: PontoBarra[]
  nome: string
  altura?: number
  formato?: "moeda" | "numero"
  /** De quantos em quantos rótulos o eixo X mostra (0 = todos). */
  intervalo?: number
}) {
  const config = { valor: { label: nome, color: PRETO } } satisfies ChartConfig
  const fmt = (v: number) => (formato === "moeda" ? formatPrice(v) : v.toLocaleString("pt-BR"))
  return (
    <ChartContainer config={config} className="w-full" style={{ height: altura }}>
      <BarChart data={dados} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tickMargin={8} interval={intervalo ?? "preserveStartEnd"} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={64} fontSize={11} tickFormatter={(v) => (formato === "moeda" ? moedaCurta(Number(v)) : String(v))} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.7 }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, p) => carga<PontoBarra>(p)?.titulo ?? carga<PontoBarra>(p)?.rotulo}
              formatter={(v, _n, item) => <LinhaTooltip rotulo={nome} valor={fmt(Number(v))} extra={(item.payload as PontoBarra).extra} />}
            />
          }
        />
        <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export interface PontoAcumulado {
  dia: number
  atual?: number
  anterior?: number
}

/** Faturamento ACUMULADO no mês, dia a dia, contra o mês anterior. */
export function GraficoAcumulado({
  dados,
  rotuloAtual,
  rotuloAnterior,
  altura = 200,
}: {
  dados: PontoAcumulado[]
  rotuloAtual: string
  rotuloAnterior: string
  altura?: number
}) {
  const config = {
    atual: { label: rotuloAtual, color: PRETO },
    anterior: { label: rotuloAnterior, color: CINZA },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: altura }}>
      <LineChart data={dados} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval={4} />
        <YAxis tickLine={false} axisLine={false} width={64} fontSize={11} tickFormatter={(v) => moedaCurta(Number(v))} />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => `Até o dia ${carga<PontoAcumulado>(p)?.dia}`}
              formatter={(v, n) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{n === "atual" ? rotuloAtual : rotuloAnterior}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(Number(v))}</span>
                </span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="anterior" type="monotone" stroke="var(--color-anterior)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
        <Line dataKey="atual" type="monotone" stroke="var(--color-atual)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  )
}

/** Saldo previsto dia a dia (realizado + o que vence). */
export function GraficoSaldo({ dados, altura = 160 }: { dados: { rotulo: string; titulo: string; saldo: number }[]; altura?: number }) {
  const config = { saldo: { label: "Saldo previsto", color: PRETO } } satisfies ChartConfig
  const temNegativo = dados.some((d) => d.saldo < 0)
  return (
    <ChartContainer config={config} className="w-full" style={{ height: altura }}>
      <AreaChart data={dados} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} interval={6} />
        <YAxis tickLine={false} axisLine={false} width={64} fontSize={11} tickFormatter={(v) => moedaCurta(Number(v))} />
        {temNegativo && <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="3 3" />}
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, p) => carga<{ titulo: string }>(p)?.titulo}
              formatter={(v) => <LinhaTooltip rotulo="Saldo previsto" valor={formatPrice(Number(v))} />}
            />
          }
        />
        <Area dataKey="saldo" type="stepAfter" stroke="var(--color-saldo)" strokeWidth={2} fill="var(--color-saldo)" fillOpacity={0.06} />
      </AreaChart>
    </ChartContainer>
  )
}

/**
 * Ranking em barras horizontais (itens mais vendidos, formas de pagamento).
 * Uma série só: o nome está escrito ao lado de cada barra.
 */
export function Ranking({
  itens,
  vazio,
}: {
  itens: { rotulo: string; valor: number; detalhe?: string }[]
  vazio: string
}) {
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">{vazio}</p>
  const maior = Math.max(...itens.map((i) => i.valor), 1)
  const total = itens.reduce((t, i) => t + i.valor, 0) || 1
  return (
    <ul className="space-y-3">
      {itens.map((i) => (
        <li key={i.rotulo} title={`${i.rotulo}: ${formatPrice(i.valor)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{i.rotulo}</span>
            <span className="shrink-0 tabular-nums">
              {formatPrice(i.valor)} <span className="text-xs text-muted-foreground">{Math.round((i.valor / total) * 100)}%</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-foreground" style={{ width: `${Math.max((i.valor / maior) * 100, 1.5)}%` }} />
          </div>
          {i.detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{i.detalhe}</p>}
        </li>
      ))}
    </ul>
  )
}
