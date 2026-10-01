"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToLine, ClipboardCheck, Eye, PackageX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { FiltroChips, classeFiltroSelect } from "@/components/common/filtro-chips"
import { RowActions } from "@/components/common/row-actions"
import { StatusBadge } from "@/components/common/status-badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FaixaIndicadores, Guard, Vazio } from "@/components/apae/comum"
import { fmtNum } from "@/components/produtos/comum"
import { CATEGORIA_PRODUTO, CATEGORIAS_PRODUTO, TIPO_MOV } from "@/data/catalogo"
import type { TipoMovEstoque } from "@/data/tipos"
import { ESTOQUE_LABEL, ESTOQUE_TOM, estoqueEmTexto, situacaoEstoque, valorEmEstoqueCents, type SituacaoEstoque } from "@/lib/derivados"
import { dataISO, hoje, mesDe, somarDias } from "@/lib/datas"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { DialogosEstoque, type TipoDialogo } from "./dialogos-estoque"
import { TabelaMovs } from "./tabela-movs"

const ORDEM: Record<SituacaoEstoque, number> = { zerado: 0, baixo: 1, ok: 2 }
const POR_PAGINA = 50

export function EstoqueTela() {
  return (
    <Guard permissao="estoque.ler" titulo="Estoque">
      <Estoque />
    </Guard>
  )
}

function Estoque() {
  const router = useRouter()
  const produtos = useDemo((s) => s.produtos)
  const movsEstoque = useDemo((s) => s.movsEstoque)
  const podeEditar = usePode("estoque.editar")
  const [visao, setVisao] = React.useState("posicao")
  const [dialogo, setDialogo] = React.useState<{ tipo: TipoDialogo; produtoId?: string } | null>(null)
  // posição
  const [busca, setBusca] = React.useState("")
  const [categoria, setCategoria] = React.useState("todas")
  const [situacao, setSituacao] = React.useState("todos")
  // movimentações
  const [tipo, setTipo] = React.useState("todos")
  const [periodo, setPeriodo] = React.useState("30")
  const [produtoMov, setProdutoMov] = React.useState("todos")
  const [pagina, setPagina] = React.useState(1)

  // Atalho do menu "Entrada de mercadoria": /painel/estoque?entrada=1
  React.useEffect(() => {
    if (podeEditar && new URLSearchParams(window.location.search).get("entrada")) setDialogo({ tipo: "entrada" })
  }, [podeEditar])

  const ativos = produtos.filter((p) => p.ativo)
  const termo = busca.trim().toLowerCase()
  const posicao = ativos
    .filter((p) => {
      const s = situacaoEstoque(p)
      if (situacao === "repor" && s === "ok") return false
      if (situacao === "zerado" && s !== "zerado") return false
      if (categoria !== "todas" && p.categoria !== categoria) return false
      return !termo || `${p.nome} ${p.marca} ${p.fornecedor}`.toLowerCase().includes(termo)
    })
    .sort((a, b) => ORDEM[situacaoEstoque(a)] - ORDEM[situacaoEstoque(b)] || a.nome.localeCompare(b.nome, "pt-BR"))

  const desde = periodo === "todos" ? "" : somarDias(hoje(), -Number(periodo) + 1)
  const movs = movsEstoque.filter((m) => {
    if (tipo !== "todos" && m.tipo !== tipo) return false
    if (produtoMov !== "todos" && m.produtoId !== produtoMov) return false
    return !desde || dataISO(new Date(m.data)) >= desde
  })
  const totalPaginas = Math.max(1, Math.ceil(movs.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const movsPagina = movs.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  const mes = mesDe(hoje())
  const movsMes = movsEstoque.filter((m) => mesDe(dataISO(new Date(m.data))) === mes)
  const perdasMes = movsMes
    .filter((m) => m.tipo === "perda")
    .reduce((t, m) => t + Math.abs(m.quantidade) * (m.custoUnitCents ?? produtos.find((p) => p.id === m.produtoId)?.custoCents ?? 0), 0)

  const filtrarMov = (f: () => void) => {
    f()
    setPagina(1)
  }

  return (
    <DashboardLayout
      title="Estoque"
      description="Posição de cada produto a custo, e tudo o que entrou e saiu"
      actions={
        podeEditar && (
          <>
            <Button size="sm" onClick={() => setDialogo({ tipo: "entrada" })}>
              <ArrowDownToLine className="mr-1.5 h-4 w-4" />
              Entrada de mercadoria
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo: "ajuste" })}>
              <ClipboardCheck className="mr-1.5 h-4 w-4" />
              Ajuste de inventário
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo: "perda" })}>
              <PackageX className="mr-1.5 h-4 w-4" />
              Perda / quebra
            </Button>
          </>
        )
      }
      toolbar={
        <div className="flex flex-col gap-2">
          <FiltroChips
            ariaLabel="Visão"
            value={visao}
            onChange={setVisao}
            options={[
              { value: "posicao", label: "Posição", count: ativos.length },
              { value: "movs", label: "Movimentações", count: movsEstoque.length },
            ]}
          />
          {visao === "posicao" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger size="sm" className={cn("w-44", classeFiltroSelect(situacao !== "todos"))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer situação</SelectItem>
                  <SelectItem value="repor">Precisa repor</SelectItem>
                  <SelectItem value="zerado">Zerados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger size="sm" className={cn("w-44", classeFiltroSelect(categoria !== "todas"))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {CATEGORIAS_PRODUTO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_PRODUTO[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SearchInput value={busca} onChange={setBusca} placeholder="Buscar produto" className="w-full sm:ml-auto sm:w-60" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={tipo} onValueChange={(v) => filtrarMov(() => setTipo(v))}>
                <SelectTrigger size="sm" className={cn("w-40", classeFiltroSelect(tipo !== "todos"))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {(Object.keys(TIPO_MOV) as TipoMovEstoque[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_MOV[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={periodo} onValueChange={(v) => filtrarMov(() => setPeriodo(v))}>
                <SelectTrigger size="sm" className={cn("w-40", classeFiltroSelect(periodo !== "30"))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="todos">Todo o período</SelectItem>
                </SelectContent>
              </Select>
              <Select value={produtoMov} onValueChange={(v) => filtrarMov(() => setProdutoMov(v))}>
                <SelectTrigger size="sm" className={cn("w-56", classeFiltroSelect(produtoMov !== "todos"))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtos</SelectItem>
                  {[...produtos]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      }
    >
      <FaixaIndicadores
        className="mb-5"
        itens={[
          { rotulo: "Valor em estoque (a custo)", valor: formatPrice(ativos.reduce((t, p) => t + valorEmEstoqueCents(p), 0)), cor: "bg-foreground" },
          { rotulo: "Abaixo do mínimo", valor: String(ativos.filter((p) => situacaoEstoque(p) === "baixo").length), cor: "bg-amber-400" },
          { rotulo: "Zerados", valor: String(ativos.filter((p) => situacaoEstoque(p) === "zerado").length), cor: "bg-red-500" },
          {
            rotulo: "Perdas no mês",
            valor: formatPrice(Math.round(perdasMes)),
            detalhe: `${movsMes.filter((m) => m.tipo === "entrada").length} entradas no mês`,
            cor: "bg-muted-foreground",
          },
        ]}
      />

      {visao === "posicao" ? (
        posicao.length === 0 ? (
          <Vazio icone={MODULOS.estoque.icone} titulo="Nenhum produto com esses filtros" />
        ) : (
          <TableSurface className="first:mt-0 first:border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Mínimo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Custo</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Valor a custo</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posicao.map((p) => {
                  const s = situacaoEstoque(p)
                  const pct = Math.min(100, (Math.max(0, p.estoque) / Math.max(p.estoqueMinimo * 2, 1)) * 100)
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/painel/produtos/${p.id}`)}>
                      <TableCell>
                        <p className="font-semibold">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{p.fornecedor || p.marca}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{CATEGORIA_PRODUTO[p.categoria]}</TableCell>
                      <TableCell>
                        <p className="whitespace-nowrap text-sm font-semibold tabular-nums">{estoqueEmTexto(p)}</p>
                        <div className="mt-1 h-1.5 w-28 rounded-full bg-muted">
                          <div
                            className={cn("h-1.5 rounded-full", s === "ok" ? "bg-foreground/70" : s === "baixo" ? "bg-amber-400" : "bg-red-500")}
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {fmtNum(p.estoqueMinimo)} {p.unidade}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tom={ESTOQUE_TOM[s]}>{ESTOQUE_LABEL[s]}</StatusBadge>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatPrice(p.custoCents)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatPrice(valorEmEstoqueCents(p))}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex">
                          <RowActions
                            actions={[
                              { label: "Ver produto", icon: Eye, onSelect: () => router.push(`/painel/produtos/${p.id}`) },
                              { label: "Dar entrada", icon: ArrowDownToLine, onSelect: () => setDialogo({ tipo: "entrada", produtoId: p.id }), hidden: !podeEditar },
                              { label: "Ajustar (contagem)", icon: ClipboardCheck, onSelect: () => setDialogo({ tipo: "ajuste", produtoId: p.id }), hidden: !podeEditar },
                              { label: "Registrar perda", icon: PackageX, onSelect: () => setDialogo({ tipo: "perda", produtoId: p.id }), hidden: !podeEditar },
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
        )
      ) : movs.length === 0 ? (
        <Vazio icone={MODULOS.estoque.icone} titulo="Nenhuma movimentação com esses filtros" descricao="Amplie o período ou tire o filtro de tipo." />
      ) : (
        <>
          <TabelaMovs movs={movsPagina} produtos={produtos} mostrarProduto />
          {totalPaginas > 1 && (
            <PaginationBar
              meta={{ page: paginaAtual, perPage: POR_PAGINA, total: movs.length, totalPages: totalPaginas }}
              onPageChange={setPagina}
            />
          )}
        </>
      )}

      <DialogosEstoque aberto={dialogo?.tipo ?? null} produtoId={dialogo?.produtoId} onClose={() => setDialogo(null)} />
    </DashboardLayout>
  )
}
