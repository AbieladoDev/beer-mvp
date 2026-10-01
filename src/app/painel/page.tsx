"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SituacaoContaBadge } from "@/components/apae/comum"
import { StatusBadge } from "@/components/common/status-badge"
import { GraficoAcumulado, GraficoBarras, GraficoSaldo, Ranking, type PontoBarra } from "@/components/dashboard/graficos"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import type { ContaPagar, ContaReceber, FormaPagamento, TipoItemVenda, Venda } from "@/data/tipos"
import { dataISO, hoje, mesDe, rotuloMes, somarDias, ultimosMeses } from "@/lib/datas"
import {
  ESTOQUE_LABEL,
  ESTOQUE_TOM,
  FORMA_LABEL,
  custoDaVendaCents,
  estoqueEmTexto,
  fluxoDeCaixa,
  margemPct,
  saldoRealizadoAte,
  situacaoConta,
  situacaoEstoque,
  somaCents,
} from "@/lib/derivados"
import { formatDate, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode, useUsuario } from "@/store/sessao-store"

/**
 * O DASHBOARD — vendas de hoje e do mês, o que mais vende, estoque a repor e o
 * caixa previsto. Cada bloco obedece à permissão: o caixa vê só vendas (sem
 * custo nem margem); dono e gerente veem tudo.
 *
 * ⚠️ Lucro e margem saem do CUSTO GRAVADO NA VENDA (`custoUnitCents`), não do
 * custo de hoje — a margem do mês passado não muda porque o gin subiu.
 */

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const DIAS_SEMANA_LONGO = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
const FORMAS: FormaPagamento[] = ["pix", "credito", "debito", "dinheiro"]

const diaDaVenda = (v: Venda) => dataISO(new Date(v.data))
const diasNoMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number)
  return new Date(a, m, 0).getDate()
}

interface Resumo {
  brutoCents: number
  vendas: number
  ticketCents: number
  custoCents: number
  lucroCents: number
  margem: number
}

function resumir(vs: Venda[]): Resumo {
  const bruto = somaCents(vs, (v) => v.totalCents)
  const custo = somaCents(vs, custoDaVendaCents)
  return {
    brutoCents: bruto,
    vendas: vs.length,
    ticketCents: vs.length ? Math.round(bruto / vs.length) : 0,
    custoCents: custo,
    lucroCents: bruto - custo,
    margem: margemPct(bruto, custo),
  }
}

export default function Dashboard() {
  const usuario = useUsuario()
  const vendasTodas = useDemo((s) => s.vendas)
  const produtos = useDemo((s) => s.produtos)
  const contasPagar = useDemo((s) => s.contasPagar)
  const contasReceber = useDemo((s) => s.contasReceber)

  const verVendas = usePode("vendas.ler")
  const vender = usePode("pdv.vender")
  // Custo e margem são assunto de quem cuida do dinheiro — o caixa não vê.
  const verMargem = usePode("financeiro.ler")
  const verFinanceiro = verMargem
  const verEstoque = usePode("estoque.editar")

  const h = hoje()
  const mes = mesDe(h)
  const [mesAnt] = ultimosMeses(2)
  const diaDoMes = Number(h.slice(8, 10))

  const hora = new Date().getHours()
  const saudacao = hora < 5 ? "Boa noite" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite"
  const dataLonga = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })

  // ---------------------------------------------------------------- vendas
  const v = React.useMemo(() => {
    const concluidas = vendasTodas.filter((x) => x.status === "concluida")
    const porDia = new Map<string, Venda[]>()
    for (const x of concluidas) {
      const d = diaDaVenda(x)
      const l = porDia.get(d)
      if (l) l.push(x)
      else porDia.set(d, [x])
    }
    const doDia = (d: string) => porDia.get(d) ?? []
    const entre = (de: string, ate: string) => concluidas.filter((x) => { const d = diaDaVenda(x); return d >= de && d <= ate })

    const hojeR = resumir(doDia(h))
    const semanaPassadaR = resumir(doDia(somarDias(h, -7)))

    // Mês até hoje × mês anterior até o MESMO dia (comparar mês inteiro com meio mês engana).
    const fimAnt = `${mesAnt}-${String(Math.min(diaDoMes, diasNoMes(mesAnt))).padStart(2, "0")}`
    const doMes = entre(`${mes}-01`, h)
    const mesR = resumir(doMes)
    const mesAntR = resumir(entre(`${mesAnt}-01`, fimAnt))
    const mesAntCheioR = resumir(entre(`${mesAnt}-01`, `${mesAnt}-${diasNoMes(mesAnt)}`))

    // Acumulado dia a dia, os dois meses no mesmo eixo (dia 1..31).
    const acumulado = Array.from({ length: Math.max(diasNoMes(mes), diasNoMes(mesAnt)) }, (_, i) => ({ dia: i + 1 } as { dia: number; atual?: number; anterior?: number }))
    let somaA = 0
    let somaB = 0
    for (let i = 1; i <= acumulado.length; i++) {
      const dd = String(i).padStart(2, "0")
      if (i <= diaDoMes) {
        somaA += somaCents(doDia(`${mes}-${dd}`), (x) => x.totalCents)
        acumulado[i - 1].atual = somaA
      }
      if (i <= diasNoMes(mesAnt)) {
        somaB += somaCents(doDia(`${mesAnt}-${dd}`), (x) => x.totalCents)
        acumulado[i - 1].anterior = somaB
      }
    }

    // Últimos 30 dias, por dia.
    const ini30 = somarDias(h, -29)
    const ult30 = entre(ini30, h)
    const porDia30: PontoBarra[] = Array.from({ length: 30 }, (_, i) => {
      const d = somarDias(ini30, i)
      const vs = doDia(d)
      const [a, m, dia] = d.split("-").map(Number)
      const sem = new Date(a, m - 1, dia).getDay()
      return {
        rotulo: `${String(dia).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
        titulo: `${DIAS_SEMANA_LONGO[sem]}, ${formatDate(d)}`,
        valor: somaCents(vs, (x) => x.totalCents),
        extra: `${vs.length} ${vs.length === 1 ? "venda" : "vendas"}`,
      }
    })

    // Por hora e por dia da semana (últimos 30 dias).
    const horas = new Array(24).fill(0) as number[]
    const qtdHoras = new Array(24).fill(0) as number[]
    for (const x of ult30) {
      const hh = new Date(x.data).getHours()
      horas[hh] += x.totalCents
      qtdHoras[hh]++
    }
    const usadas = horas.map((t, i) => (t > 0 ? i : -1)).filter((i) => i >= 0)
    const porHora: PontoBarra[] = usadas.length
      ? Array.from({ length: usadas[usadas.length - 1] - usadas[0] + 1 }, (_, k) => {
          const i = usadas[0] + k
          return { rotulo: `${i}h`, titulo: `Das ${i}h às ${i + 1}h`, valor: horas[i], extra: `${qtdHoras[i]} vendas em 30 dias` }
        })
      : []

    // Média por dia da semana: soma ÷ quantas vezes aquele dia apareceu nos 30 dias.
    const somaSem = new Array(7).fill(0) as number[]
    const ocorrencias = new Array(7).fill(0) as number[]
    for (let i = 0; i < 30; i++) {
      const d = somarDias(ini30, i)
      const [a, m, dia] = d.split("-").map(Number)
      const sem = new Date(a, m - 1, dia).getDay()
      ocorrencias[sem]++
      somaSem[sem] += somaCents(doDia(d), (x) => x.totalCents)
    }
    const porSemana: PontoBarra[] = [1, 2, 3, 4, 5, 6, 0].map((s) => ({
      rotulo: DIAS_SEMANA[s],
      titulo: DIAS_SEMANA_LONGO[s],
      valor: ocorrencias[s] ? Math.round(somaSem[s] / ocorrencias[s]) : 0,
      extra: "média por dia",
    }))

    // Mais vendidos do mês, por tipo (receita bruta da linha, antes do desconto).
    const top: Record<TipoItemVenda, Map<string, { nome: string; receita: number; custo: number; qtd: number }>> = {
      produto: new Map(),
      drink: new Map(),
      kit: new Map(),
    }
    for (const x of doMes) {
      for (const it of x.itens) {
        const m = top[it.tipo]
        const atual = m.get(it.refId) ?? { nome: it.nome, receita: 0, custo: 0, qtd: 0 }
        atual.receita += it.precoUnitCents * it.quantidade
        atual.custo += it.custoUnitCents * it.quantidade
        atual.qtd += it.quantidade
        m.set(it.refId, atual)
      }
    }
    const ranking = (t: TipoItemVenda) => [...top[t].values()].sort((a, b) => b.receita - a.receita).slice(0, 6)

    // Formas de pagamento do mês.
    const formas = FORMAS.map((f) => {
      const vs = doMes.filter((x) => x.forma === f)
      return { forma: f, valor: somaCents(vs, (x) => x.totalCents), qtd: vs.length }
    }).sort((a, b) => b.valor - a.valor)

    return { hojeR, semanaPassadaR, mesR, mesAntR, mesAntCheioR, acumulado, porDia30, porHora, porSemana, ranking, formas, ult30: resumir(ult30) }
  }, [vendasTodas, h, mes, mesAnt, diaDoMes])

  // ---------------------------------------------------------------- estoque
  const repor = React.useMemo(
    () =>
      produtos
        .filter((p) => p.ativo && situacaoEstoque(p) !== "ok")
        .sort((a, b) => a.estoque / Math.max(a.estoqueMinimo, 0.01) - b.estoque / Math.max(b.estoqueMinimo, 0.01)),
    [produtos]
  )

  // ---------------------------------------------------------------- financeiro
  const fin = React.useMemo(() => {
    const ate7 = somarDias(h, 7)
    const pagarAbertas = contasPagar.filter((c) => !c.pagoEm)
    const vencidas = pagarAbertas.filter((c) => situacaoConta(c) === "vencida").sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    const vencendo = pagarAbertas.filter((c) => c.vencimento >= h && c.vencimento <= ate7).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    const receber7 = contasReceber
      .filter((c) => !c.recebidoEm && c.vencimento <= ate7)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    const saldoHoje = saldoRealizadoAte(contasPagar, contasReceber, somarDias(h, 1))
    const fluxo = fluxoDeCaixa(contasPagar, contasReceber, h, somarDias(h, 30), saldoRealizadoAte(contasPagar, contasReceber, h))
    const serie = fluxo.map((d) => ({ rotulo: d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7), titulo: formatDate(d.dia), saldo: d.saldoCents }))
    const menor = fluxo.reduce((m, d) => (d.saldoCents < m.saldoCents ? d : m), fluxo[0])
    return {
      vencidas,
      vencendo,
      receber7,
      saldoHoje,
      saldo30: fluxo[fluxo.length - 1]?.saldoCents ?? saldoHoje,
      menor,
      serie,
      aPagar30: somaCents(fluxo, (d) => d.aSairCents),
      aReceber30: somaCents(fluxo, (d) => d.aEntrarCents),
    }
  }, [contasPagar, contasReceber, h])

  const nomeMes = rotuloMes(mes, true).split(" de ")[0]
  const nomeMesAnt = rotuloMes(mesAnt, true).split(" de ")[0]
  const semanaPassada = new Date().toLocaleDateString("pt-BR", { weekday: "long" })

  return (
    <DashboardLayout
      title={`${saudacao}, ${usuario?.nome.split(" ")[0] ?? ""}`}
      description={`${dataLonga.charAt(0).toUpperCase()}${dataLonga.slice(1)} · ${usuario?.cargo ?? ""}`}
      actions={
        vender && (
          <Button asChild>
            <Link href="/painel/pdv">
              <ShoppingCart className="size-4" />
              Abrir PDV
            </Link>
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {verVendas && (
          <>
            {/* ---------- Hoje ---------- */}
            <section>
              <TituloBloco titulo="Hoje" detalhe={`comparado com ${semanaPassada} passada`} />
              <div className={cn("grid grid-cols-2 gap-3", verMargem ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
                <Numero rotulo="Faturamento" valor={formatPrice(v.hojeR.brutoCents)} atual={v.hojeR.brutoCents} anterior={v.semanaPassadaR.brutoCents} />
                <Numero rotulo="Vendas" valor={String(v.hojeR.vendas)} atual={v.hojeR.vendas} anterior={v.semanaPassadaR.vendas} />
                <Numero rotulo="Ticket médio" valor={formatPrice(v.hojeR.ticketCents)} atual={v.hojeR.ticketCents} anterior={v.semanaPassadaR.ticketCents} />
                {verMargem && (
                  <Numero
                    rotulo="Lucro bruto"
                    valor={formatPrice(v.hojeR.lucroCents)}
                    detalhe={`margem ${v.hojeR.margem.toFixed(1).replace(".", ",")}%`}
                    atual={v.hojeR.lucroCents}
                    anterior={v.semanaPassadaR.lucroCents}
                  />
                )}
              </div>
            </section>

            {/* ---------- Mês ---------- */}
            <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="flex flex-col">
                <TituloBloco titulo={`${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} até hoje`} detalhe={`× ${nomeMesAnt} até o dia ${diaDoMes}`} />
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <Numero rotulo="Faturamento bruto" valor={formatPrice(v.mesR.brutoCents)} atual={v.mesR.brutoCents} anterior={v.mesAntR.brutoCents} detalhe={`${nomeMesAnt} inteiro: ${formatPrice(v.mesAntCheioR.brutoCents)}`} />
                  <Numero rotulo="Vendas" valor={v.mesR.vendas.toLocaleString("pt-BR")} atual={v.mesR.vendas} anterior={v.mesAntR.vendas} />
                  <Numero rotulo="Ticket médio" valor={formatPrice(v.mesR.ticketCents)} atual={v.mesR.ticketCents} anterior={v.mesAntR.ticketCents} />
                  {verMargem ? (
                    <Numero
                      rotulo="Lucro bruto"
                      valor={formatPrice(v.mesR.lucroCents)}
                      detalhe={`margem ${v.mesR.margem.toFixed(1).replace(".", ",")}% (${nomeMesAnt}: ${v.mesAntR.margem.toFixed(1).replace(".", ",")}%)`}
                      atual={v.mesR.lucroCents}
                      anterior={v.mesAntR.lucroCents}
                    />
                  ) : (
                    <Numero rotulo="Vendas por dia" valor={(v.mesR.vendas / Math.max(diaDoMes, 1)).toFixed(1).replace(".", ",")} />
                  )}
                </div>
              </div>
              <Cartao titulo="Faturamento acumulado" detalhe={`${nomeMes} × ${nomeMesAnt}, dia a dia`}>
                <GraficoAcumulado dados={v.acumulado} rotuloAtual={nomeMes} rotuloAnterior={nomeMesAnt} altura={230} />
              </Cartao>
            </section>

            {/* ---------- Ritmo ---------- */}
            <section className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <Cartao titulo="Vendas por dia" detalhe={`últimos 30 dias · ${formatPrice(v.ult30.brutoCents)} em ${v.ult30.vendas} vendas`}>
                <GraficoBarras dados={v.porDia30} nome="Faturamento" altura={240} />
              </Cartao>
              <Cartao titulo="Quando o bar vende" detalhe="últimos 30 dias">
                <Tabs defaultValue="hora">
                  <TabsList className="mb-3">
                    <TabsTrigger value="hora">Por hora</TabsTrigger>
                    <TabsTrigger value="semana">Por dia da semana</TabsTrigger>
                  </TabsList>
                  <TabsContent value="hora">
                    <GraficoBarras dados={v.porHora} nome="Faturamento" altura={200} intervalo={0} />
                  </TabsContent>
                  <TabsContent value="semana">
                    <GraficoBarras dados={v.porSemana} nome="Média do dia" altura={200} intervalo={0} />
                  </TabsContent>
                </Tabs>
              </Cartao>
            </section>

            {/* ---------- O que vende e como pagam ---------- */}
            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              <Cartao titulo="Mais vendidos" detalhe={`receita em ${nomeMes}`} className="xl:col-span-2">
                <Tabs defaultValue="produto">
                  <TabsList className="mb-4">
                    <TabsTrigger value="produto">Produtos</TabsTrigger>
                    <TabsTrigger value="drink">Drinks</TabsTrigger>
                    <TabsTrigger value="kit">Kits e combos</TabsTrigger>
                  </TabsList>
                  {(["produto", "drink", "kit"] as TipoItemVenda[]).map((t) => (
                    <TabsContent key={t} value={t}>
                      <Ranking
                        vazio="Nada vendido neste mês ainda."
                        itens={v.ranking(t).map((r) => ({
                          rotulo: r.nome,
                          valor: r.receita,
                          detalhe:
                            `${r.qtd.toLocaleString("pt-BR")} vendidos` +
                            (verMargem ? ` · margem ${margemPct(r.receita, r.custo).toFixed(0)}%` : ""),
                        }))}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </Cartao>
              <Cartao titulo="Formas de pagamento" detalhe={`${nomeMes}, valor bruto`}>
                <Ranking
                  vazio="Nenhuma venda neste mês."
                  itens={v.formas.filter((f) => f.qtd > 0).map((f) => ({ rotulo: FORMA_LABEL[f.forma], valor: f.valor, detalhe: `${f.qtd} vendas` }))}
                />
              </Cartao>
            </section>
          </>
        )}

        {/* ---------- Estoque e contas ---------- */}
        {(verEstoque || verFinanceiro) && (
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {verEstoque && (
              <Cartao titulo="Estoque para repor" detalhe={repor.length ? `${repor.length} abaixo do mínimo` : "tudo acima do mínimo"} link={{ href: "/painel/estoque", rotulo: "Estoque" }}>
                {repor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto abaixo do mínimo.</p>
                ) : (
                  <ul className="-my-1 divide-y">
                    {repor.slice(0, 7).map((p) => {
                      const s = situacaoEstoque(p)
                      return (
                        <li key={p.id}>
                          <Link href={`/painel/produtos/${p.id}`} className="flex items-center gap-3 py-2 hover:opacity-80">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{p.nome}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {estoqueEmTexto(p)} · mínimo {p.estoqueMinimo}
                              </span>
                            </span>
                            <StatusBadge tom={ESTOQUE_TOM[s]}>{ESTOQUE_LABEL[s]}</StatusBadge>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Cartao>
            )}

            {verFinanceiro && (
              <>
                <Cartao titulo="A pagar" detalhe="vencidas e próximos 7 dias" link={{ href: "/painel/contas-a-pagar", rotulo: "Contas a pagar" }}>
                  <ListaContas
                    tipo="pagar"
                    contas={[...fin.vencidas, ...fin.vencendo]}
                    vazio="Nada vencido nem vencendo nesta semana."
                    rodape={
                      fin.vencidas.length > 0
                        ? `${fin.vencidas.length} vencida${fin.vencidas.length > 1 ? "s" : ""} · ${formatPrice(somaCents(fin.vencidas, (c) => c.valorCents))}`
                        : undefined
                    }
                  />
                </Cartao>
                <Cartao titulo="A receber" detalhe="próximos 7 dias (cartão e eventos)" link={{ href: "/painel/contas-a-receber", rotulo: "Contas a receber" }}>
                  <ListaContas tipo="receber" contas={fin.receber7} vazio="Nada a receber nos próximos 7 dias." />
                </Cartao>
                <Cartao titulo="Caixa" detalhe="realizado + o que vence em 30 dias" className="lg:col-span-2 xl:col-span-3" link={{ href: "/painel/fluxo-de-caixa", rotulo: "Fluxo de caixa" }}>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                      <Mini rotulo="Saldo hoje" valor={formatPrice(fin.saldoHoje)} />
                      <Mini rotulo="Previsto em 30 dias" valor={formatPrice(fin.saldo30)} negativo={fin.saldo30 < 0} />
                      <Mini rotulo="Entra em 30 dias" valor={formatPrice(fin.aReceber30)} />
                      <Mini rotulo="Sai em 30 dias" valor={formatPrice(fin.aPagar30)} />
                      {fin.menor && fin.menor.saldoCents < fin.saldoHoje && (
                        <p className="col-span-2 text-xs text-muted-foreground lg:col-span-1">
                          Ponto mais baixo: <span className={cn("font-medium tabular-nums", fin.menor.saldoCents < 0 ? "text-red-600" : "text-foreground")}>{formatPrice(fin.menor.saldoCents)}</span> em {formatDate(fin.menor.dia)}
                        </p>
                      )}
                    </div>
                    <GraficoSaldo dados={fin.serie} altura={200} />
                  </div>
                </Cartao>
              </>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}

/* ------------------------------------------------------------------ peças */

function TituloBloco({ titulo, detalhe }: { titulo: string; detalhe?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {detalhe && <span className="truncate text-xs text-muted-foreground">{detalhe}</span>}
    </div>
  )
}

function Cartao({
  titulo,
  detalhe,
  link,
  className,
  children,
}: {
  titulo: string
  detalhe?: string
  link?: { href: string; rotulo: string }
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border bg-card p-4 md:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {detalhe && <p className="truncate text-xs text-muted-foreground">{detalhe}</p>}
        </div>
        {link && (
          <Link href={link.href} className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
            {link.rotulo}
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

/** Um número do dia/mês com a variação contra o período de comparação. */
function Numero({ rotulo, valor, detalhe, atual, anterior }: { rotulo: string; valor: string; detalhe?: string; atual?: number; anterior?: number }) {
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-xl border bg-card p-4">
      <p className="truncate text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums">{valor}</p>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        {atual !== undefined && anterior !== undefined && <Variacao atual={atual} anterior={anterior} />}
        {detalhe && <span className="truncate text-xs text-muted-foreground">{detalhe}</span>}
      </div>
    </div>
  )
}

/** ▲ 12% / ▼ 8% — seta + texto; a cor só reforça. Sem base de comparação, não inventa número. */
function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior <= 0) return <span className="text-xs text-muted-foreground">sem base de comparação</span>
  const pct = Math.round(((atual - anterior) / Math.abs(anterior)) * 100)
  const Icone = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        pct > 0 ? "text-emerald-700" : pct < 0 ? "text-red-700" : "text-muted-foreground"
      )}
    >
      <Icone className="size-3.5" />
      {pct > 0 ? "+" : ""}
      {pct}%
    </span>
  )
}

function Mini({ rotulo, valor, negativo }: { rotulo: string; valor: string; negativo?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn("truncate text-lg font-semibold tracking-tight tabular-nums", negativo && "text-red-600")}>{valor}</p>
    </div>
  )
}

function ListaContas({
  tipo,
  contas,
  vazio,
  rodape,
}: {
  tipo: "pagar" | "receber"
  contas: (ContaPagar | ContaReceber)[]
  vazio: string
  rodape?: string
}) {
  if (contas.length === 0) return <p className="text-sm text-muted-foreground">{vazio}</p>
  const base = tipo === "pagar" ? "/painel/contas-a-pagar" : "/painel/contas-a-receber"
  return (
    <>
      <ul className="-my-1 divide-y">
        {contas.slice(0, 6).map((c) => (
          <li key={c.id}>
            <Link href={`${base}/${c.id}`} className="flex items-center gap-3 py-2 hover:opacity-80">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.descricao}</span>
                <span className="block truncate text-xs text-muted-foreground tabular-nums">
                  {formatPrice(c.valorCents)} · {formatDate(c.vencimento)}
                </span>
              </span>
              <SituacaoContaBadge conta={c} tipo={tipo} />
            </Link>
          </li>
        ))}
      </ul>
      {(rodape || contas.length > 6) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {rodape}
          {rodape && contas.length > 6 && " · "}
          {contas.length > 6 && `+${contas.length - 6} na lista`}
        </p>
      )}
    </>
  )
}
