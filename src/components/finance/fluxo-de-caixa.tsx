"use client"

import * as React from "react"

import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FiltroChips } from "@/components/common/filtro-chips"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard } from "@/components/apae/comum"
import { CATEGORIA_DESPESA, ORIGEM_RECEITA } from "@/data/catalogo"
import type { ContaPagar, ContaReceber } from "@/data/tipos"
import { dataISO, hoje, somarDias } from "@/lib/datas"
import { FORMA_LABEL, fluxoDeCaixa, saldoRealizadoAte, somaCents } from "@/lib/derivados"
import { formatDate, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { DreMensal } from "./dre-mensal"
import { COR_ENTRA, COR_SAI, GraficoMovimento, GraficoSaldo, Ranking } from "./graficos-fluxo"

type Preset = "mes" | "prox30" | "ult90" | "custom"

function intervalo(p: Preset): { de: string; ate: string } {
  const h = hoje()
  if (p === "prox30") return { de: h, ate: somarDias(h, 30) }
  if (p === "ult90") return { de: somarDias(h, -89), ate: h }
  const d = new Date()
  return { de: dataISO(new Date(d.getFullYear(), d.getMonth(), 1)), ate: dataISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
}

/** O dia em que a conta pesa no fluxo: quitação, ou vencimento (vencida em aberto cai em hoje — mesma regra de `fluxoDeCaixa`). */
const diaNoFluxo = (quitadoEm: string | undefined, vencimento: string) => quitadoEm ?? (vencimento < hoje() ? hoje() : vencimento)

export function FluxoDeCaixa() {
  return (
    <Guard permissao="financeiro.ler" titulo="Fluxo de caixa">
      <Conteudo />
    </Guard>
  )
}

function Conteudo() {
  const pagar = useDemo((s) => s.contasPagar)
  const receber = useDemo((s) => s.contasReceber)
  const vendas = useDemo((s) => s.vendas)

  const [preset, setPreset] = React.useState<Preset>("mes")
  const [custom, setCustom] = React.useState(() => intervalo("mes"))
  const [porForma, setPorForma] = React.useState(false)
  const { de, ate } = preset === "custom" ? custom : intervalo(preset)

  /**
   * SALDO INICIAL: o demo não tem saldo bancário de abertura. Assume-se saldo
   * ZERO no primeiro dia de dados do seed (~90 dias atrás) e soma-se tudo que
   * foi pago/recebido antes de `de` (`saldoRealizadoAte`). Previsto em aberto
   * de antes do período não entra aqui: o `fluxoDeCaixa` já joga o vencido em
   * aberto no dia de hoje.
   */
  const saldoInicial = React.useMemo(() => saldoRealizadoAte(pagar, receber, de), [pagar, receber, de])
  const dias = React.useMemo(() => (de <= ate ? fluxoDeCaixa(pagar, receber, de, ate, saldoInicial) : []), [pagar, receber, de, ate, saldoInicial])

  const entrou = somaCents(dias, (d) => d.entrouCents)
  const saiu = somaCents(dias, (d) => d.saiuCents)
  const aEntrar = somaCents(dias, (d) => d.aEntrarCents)
  const aSair = somaCents(dias, (d) => d.aSairCents)
  const saldoFinal = dias.at(-1)?.saldoCents ?? saldoInicial
  const menor = dias.reduce<{ dia: string; saldo: number } | null>((m, d) => (!m || d.saldoCents < m.saldo ? { dia: d.dia, saldo: d.saldoCents } : m), null)
  const comMovimento = dias.filter((d) => d.entrouCents || d.saiuCents || d.aEntrarCents || d.aSairCents)

  // Contas que pesam no período (realizado + previsto), para os rankings.
  const noPeriodo = <T extends { vencimento: string }>(lista: T[], quitado: (c: T) => string | undefined) =>
    lista.filter((c) => {
      const d = diaNoFluxo(quitado(c), c.vencimento)
      return d >= de && d <= ate
    })
  const pagarP = noPeriodo<ContaPagar>(pagar, (c) => c.pagoEm)
  const receberP = noPeriodo<ContaReceber>(receber, (c) => c.recebidoEm)

  const agrupar = <T,>(lista: T[], chave: (c: T) => string, rotulo: (k: string) => string, valor: (c: T) => number, quitado: (c: T) => boolean) => {
    const m = new Map<string, { total: number; feito: number }>()
    for (const c of lista) {
      const k = chave(c)
      const g = m.get(k) ?? { total: 0, feito: 0 }
      g.total += valor(c)
      if (quitado(c)) g.feito += valor(c)
      m.set(k, g)
    }
    return [...m.entries()]
      .map(([k, g]) => ({ rotulo: rotulo(k), valor: g.total, detalhe: g.feito === g.total ? undefined : `${formatPrice(g.feito)} realizado · ${formatPrice(g.total - g.feito)} previsto` }))
      .sort((a, b) => b.valor - a.valor)
  }

  const saidasPorCategoria = agrupar(pagarP, (c) => c.categoria, (k) => CATEGORIA_DESPESA[k as keyof typeof CATEGORIA_DESPESA] ?? k, (c) => c.valorCents, (c) => !!c.pagoEm)
  const entradas = porForma
    ? agrupar(receberP, (c) => c.forma ?? "", (k) => (k ? (FORMA_LABEL[k] ?? k) : "Forma a definir"), (c) => c.valorCents, (c) => !!c.recebidoEm)
    : agrupar(receberP, (c) => c.origem, (k) => ORIGEM_RECEITA[k as keyof typeof ORIGEM_RECEITA] ?? k, (c) => c.valorCents, (c) => !!c.recebidoEm)

  const h = hoje()

  return (
    <DashboardLayout
      title="Fluxo de caixa"
      description="O que entrou e saiu, o que ainda vai entrar e sair, e onde o saldo chega"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <FiltroChips
            ariaLabel="Período"
            value={preset}
            onChange={(v) => {
              if (v === "custom") setCustom({ de, ate })
              setPreset(v as Preset)
            }}
            options={[
              { value: "mes", label: "Este mês" },
              { value: "prox30", label: "Próximos 30 dias" },
              { value: "ult90", label: "Últimos 90 dias" },
              { value: "custom", label: "Personalizado" },
            ]}
          />
          {preset === "custom" ? (
            <div className="flex items-center gap-2">
              <DatePicker compact value={custom.de} onChange={(d) => d && setCustom((c) => ({ ...c, de: dataISO(d) }))} className="w-36" />
              <span className="text-xs text-muted-foreground">até</span>
              <DatePicker compact value={custom.ate} onChange={(d) => d && setCustom((c) => ({ ...c, ate: dataISO(d) }))} className="w-36" />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDate(de)} a {formatDate(ate)}
            </span>
          )}
        </div>
      }
    >
      {/* Fileira de números, em linhas e não em cartões (padrão do financeiro da TodosDan). */}
      <section className="-mx-4 -mt-4 grid grid-cols-2 border-b md:-mx-6 md:grid-cols-3 xl:grid-cols-6">
        <Kpi rotulo="Saldo inicial" valor={saldoInicial} apoio={`em ${formatDate(de)}`} />
        <Kpi rotulo="Entrou" valor={entrou} ponto={COR_ENTRA} />
        <Kpi rotulo="Saiu" valor={saiu} ponto={COR_SAI} />
        <Kpi rotulo="A entrar" valor={aEntrar} ponto={COR_ENTRA} claro apoio="em aberto no período" />
        <Kpi rotulo="A sair" valor={aSair} ponto={COR_SAI} claro apoio="inclui vencidas" />
        <Kpi rotulo="Saldo final previsto" valor={saldoFinal} forte apoio={`em ${formatDate(ate)}`} />
      </section>

      {de > ate ? (
        <p className="mt-6 text-sm text-muted-foreground">A data inicial está depois da final.</p>
      ) : (
        <div className="mt-6 space-y-10">
          <section>
            <Cabecalho titulo="Movimento por dia" apoio="entradas acima, saídas abaixo · claro = previsto" />
            <GraficoMovimento dias={dias} />
          </section>

          <section>
            <Cabecalho
              titulo="Saldo acumulado"
              apoio={menor && menor.saldo < 0 ? `fica negativo — menor saldo ${formatPrice(menor.saldo)} em ${formatDate(menor.dia)}` : menor ? `menor saldo ${formatPrice(menor.saldo)} em ${formatDate(menor.dia)}` : undefined}
              alerta={!!menor && menor.saldo < 0}
            />
            <GraficoSaldo dias={dias} />
          </section>

          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <Cabecalho titulo="Saídas por categoria" apoio="realizado + previsto no período" />
              <Ranking itens={saidasPorCategoria} cor={COR_SAI} vazio="Nenhuma saída no período." />
            </section>
            <section>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Cabecalho titulo={porForma ? "Entradas por forma" : "Entradas por origem"} apoio="realizado + previsto no período" />
                <Tabs value={porForma ? "forma" : "origem"} onValueChange={(v) => setPorForma(v === "forma")}>
                  <TabsList className="mb-3 h-7">
                    <TabsTrigger value="origem" className="text-xs">
                      Origem
                    </TabsTrigger>
                    <TabsTrigger value="forma" className="text-xs">
                      Forma
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Ranking itens={entradas} cor={COR_ENTRA} vazio="Nenhuma entrada no período." />
            </section>
          </div>

          <section>
            <Cabecalho titulo="Dia a dia" apoio={`${comMovimento.length} dia(s) com movimento`} />
            {comMovimento.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum movimento no período.</p>
            ) : (
              <TableSurface>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead className="text-right">Entrou</TableHead>
                      <TableHead className="text-right">Saiu</TableHead>
                      <TableHead className="hidden text-right md:table-cell">A entrar</TableHead>
                      <TableHead className="hidden text-right md:table-cell">A sair</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comMovimento.map((d) => (
                      <TableRow key={d.dia} className={cn(d.dia === h && "bg-muted/50")}>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatDate(d.dia)}
                          {d.dia === h && <span className="ml-2 text-xs font-semibold">hoje</span>}
                        </TableCell>
                        <Valor v={d.entrouCents} />
                        <Valor v={d.saiuCents} />
                        <Valor v={d.aEntrarCents} className="hidden text-muted-foreground md:table-cell" />
                        <Valor v={d.aSairCents} className="hidden text-muted-foreground md:table-cell" />
                        <TableCell className={cn("text-right font-semibold tabular-nums", d.saldoCents < 0 && "text-destructive")}>{formatPrice(d.saldoCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableSurface>
            )}
          </section>
        </div>
      )}

      <section className="mt-10">
        <Cabecalho titulo="Resultado dos últimos 6 meses" apoio="por competência: vendas pelo dia da venda, contas pelo vencimento" />
        <DreMensal vendas={vendas} pagar={pagar} receber={receber} />
      </section>
    </DashboardLayout>
  )
}

function Kpi({ rotulo, valor, apoio, ponto, claro, forte }: { rotulo: string; valor: number; apoio?: string; ponto?: string; claro?: boolean; forte?: boolean }) {
  return (
    <div className="min-w-0 border-r border-b px-4 py-4 last:border-r-0 md:px-5 xl:border-b-0">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {ponto && <span className="size-2 rounded-full" style={{ background: ponto, opacity: claro ? 0.4 : 1 }} />}
        {rotulo}
      </p>
      <p className={cn("mt-1 truncate text-xl tabular-nums", forte ? "font-bold" : "font-semibold", valor < 0 && "text-destructive")}>{formatPrice(valor)}</p>
      {apoio && <p className="truncate text-xs text-muted-foreground">{apoio}</p>}
    </div>
  )
}

function Cabecalho({ titulo, apoio, alerta }: { titulo: string; apoio?: string; alerta?: boolean }) {
  return (
    <div className="mb-3">
      <p className="text-sm font-semibold">{titulo}</p>
      {apoio && <p className={cn("text-xs text-muted-foreground", alerta && "font-medium text-destructive")}>{apoio}</p>}
    </div>
  )
}

function Valor({ v, className }: { v: number; className?: string }) {
  return <TableCell className={cn("text-right tabular-nums", className)}>{v ? formatPrice(v) : <span className="text-muted-foreground">—</span>}</TableCell>
}
