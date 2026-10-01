"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ban, Eye, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { FiltroChips, classeFiltroSelect } from "@/components/common/filtro-chips"
import { RowActions } from "@/components/common/row-actions"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import type { Venda } from "@/data/tipos"
import { FORMA_LABEL, custoDaVendaCents, somaCents } from "@/lib/derivados"
import { hoje, mesDe, somarDias } from "@/lib/datas"
import { formatDate, formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { CancelarVendaDialog } from "./cancelar-venda-dialog"
import { FaixaNumeros, Guard, StatusVendaBadge, Vazio, diaDaVenda, hora, lucroDaVendaCents, resumoItens } from "./comum"

const POR_PAGINA = 50

const PERIODOS = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "mes", label: "Mês" },
  { value: "tudo", label: "Tudo" },
]

export function VendasLista() {
  return (
    <Guard permissao="vendas.ler" titulo={MODULOS.vendas.titulo}>
      <Conteudo />
    </Guard>
  )
}

function Conteudo() {
  const router = useRouter()
  const vendas = useDemo((s) => s.vendas)
  const podeVender = usePode("pdv.vender")
  const podeCancelar = usePode("vendas.cancelar")

  const [periodo, setPeriodo] = React.useState("7d")
  const [forma, setForma] = React.useState("todas")
  const [status, setStatus] = React.useState("todos")
  const [busca, setBusca] = React.useState("")
  const [pagina, setPagina] = React.useState(1)
  const [cancelando, setCancelando] = React.useState<Venda | null>(null)

  // Filtro mudou = volta para a primeira página.
  const filtrar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPagina(1)
  }

  const doPeriodo = React.useMemo(() => {
    const h = hoje()
    const desde = periodo === "hoje" ? h : periodo === "7d" ? somarDias(h, -6) : periodo === "mes" ? `${mesDe(h)}-01` : ""
    return vendas.filter((v) => !desde || diaDaVenda(v) >= desde)
  }, [vendas, periodo])

  const filtradas = React.useMemo(() => {
    const b = busca.replace(/\D/g, "")
    return doPeriodo
      .filter((v) => {
        if (forma !== "todas" && v.forma !== forma) return false
        if (status !== "todos" && v.status !== status) return false
        if (b && !String(v.numero).includes(b)) return false
        return true
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [doPeriodo, forma, status, busca])

  // Números só das concluídas — venda cancelada não faturou.
  const concluidas = filtradas.filter((v) => v.status === "concluida")
  const faturamento = somaCents(concluidas, (v) => v.totalCents)
  const lucro = faturamento - somaCents(concluidas, custoDaVendaCents)
  const canceladas = filtradas.length - concluidas.length

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const pagina_ = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  return (
    <DashboardLayout
      title={MODULOS.vendas.titulo}
      description="Tudo o que passou pelo caixa"
      actions={
        podeVender && (
          <Button asChild size="sm">
            <Link href={MODULOS.pdv.url}>
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              Abrir PDV
            </Link>
          </Button>
        )
      }
      toolbar={
        <div className="flex flex-col gap-3">
          <FiltroChips ariaLabel="Período" value={periodo} onChange={filtrar(setPeriodo)} options={PERIODOS} />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={busca} onChange={filtrar(setBusca)} placeholder="Buscar pelo número da venda" className="w-full sm:w-64" />
            <Select value={forma} onValueChange={filtrar(setForma)}>
              <SelectTrigger size="sm" className={cn("w-40", classeFiltroSelect(forma !== "todas"))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as formas</SelectItem>
                {(["dinheiro", "pix", "debito", "credito"] as const).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FORMA_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={filtrar(setStatus)}>
              <SelectTrigger size="sm" className={cn("w-40", classeFiltroSelect(status !== "todos"))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <FaixaNumeros
        className="mb-4"
        itens={[
          { rotulo: "Vendas", valor: concluidas.length.toLocaleString("pt-BR"), detalhe: canceladas ? `${canceladas} cancelada${canceladas > 1 ? "s" : ""}` : undefined },
          { rotulo: "Faturamento", valor: formatPrice(faturamento) },
          { rotulo: "Ticket médio", valor: formatPrice(concluidas.length ? Math.round(faturamento / concluidas.length) : 0) },
          { rotulo: "Lucro bruto", valor: formatPrice(lucro), detalhe: "faturamento − custo" },
          { rotulo: "Margem", valor: `${(faturamento > 0 ? (lucro / faturamento) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` },
        ]}
      />

      {filtradas.length === 0 ? (
        <Vazio icone={MODULOS.vendas.icone} titulo="Nenhuma venda com esses filtros" descricao="Troque o período ou limpe os filtros." />
      ) : (
        <>
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="hidden md:table-cell">Itens</TableHead>
                  <TableHead className="hidden sm:table-cell">Forma</TableHead>
                  <TableHead className="hidden lg:table-cell">Operador</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Lucro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagina_.map((v) => {
                  const cancelada = v.status === "cancelada"
                  return (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => router.push(`${MODULOS.vendas.url}/${v.id}`)}>
                      <TableCell className="font-semibold tabular-nums">#{v.numero}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatDate(diaDaVenda(v))}
                        <span className="ml-1.5 text-muted-foreground">{hora(v.data)}</span>
                      </TableCell>
                      <TableCell className="hidden max-w-[20rem] md:table-cell">
                        <p className="truncate text-sm">{resumoItens(v.itens)}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{FORMA_LABEL[v.forma]}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{v.operador}</TableCell>
                      <TableCell className={cn("text-right font-bold tabular-nums", cancelada && "text-muted-foreground line-through")}>
                        {formatPrice(v.totalCents)}
                      </TableCell>
                      <TableCell className={cn("hidden text-right tabular-nums lg:table-cell", cancelada && "text-muted-foreground line-through")}>
                        {formatPrice(lucroDaVendaCents(v))}
                      </TableCell>
                      <TableCell>
                        <StatusVendaBadge status={v.status} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex">
                          <RowActions
                            actions={[
                              { label: "Ver", icon: Eye, onSelect: () => router.push(`${MODULOS.vendas.url}/${v.id}`) },
                              { label: "Cancelar venda", icon: Ban, onSelect: () => setCancelando(v), destructive: true, hidden: !podeCancelar || cancelada },
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableSurface>
          <div className="mt-4">
            <PaginationBar
              meta={{ page: paginaAtual, perPage: POR_PAGINA, total: filtradas.length, totalPages: totalPaginas }}
              onPageChange={setPagina}
            />
          </div>
        </>
      )}

      <CancelarVendaDialog venda={cancelando} onOpenChange={(v) => !v && setCancelando(null)} />
    </DashboardLayout>
  )
}
