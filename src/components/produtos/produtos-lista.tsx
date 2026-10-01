"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToLine, Eye, Pencil, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { FiltroChips, classeFiltroSelect } from "@/components/common/filtro-chips"
import { RowActions } from "@/components/common/row-actions"
import { StatusBadge } from "@/components/common/status-badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FaixaIndicadores, Guard, Vazio } from "@/components/apae/comum"
import { DialogosEstoque, type TipoDialogo } from "@/components/estoque/dialogos-estoque"
import { CATEGORIA_PRODUTO, CATEGORIAS_PRODUTO } from "@/data/catalogo"
import { ESTOQUE_LABEL, ESTOQUE_TOM, estoqueEmTexto, margemPct, situacaoEstoque, valorEmEstoqueCents } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { Margem } from "./comum"

export function ProdutosLista() {
  return (
    <Guard permissao="produtos.ler" titulo="Produtos">
      <Lista />
    </Guard>
  )
}

function Lista() {
  const router = useRouter()
  const produtos = useDemo((s) => s.produtos)
  const podeEditar = usePode("produtos.editar")
  const podeEstoque = usePode("estoque.editar")
  const [busca, setBusca] = React.useState("")
  const [categoria, setCategoria] = React.useState("todas")
  const [situacao, setSituacao] = React.useState("todas")
  const [ativo, setAtivo] = React.useState("ativos")
  const [dialogo, setDialogo] = React.useState<{ tipo: TipoDialogo; produtoId?: string } | null>(null)

  const doAtivo = produtos.filter((p) => (ativo === "ativos" ? p.ativo : ativo === "inativos" ? !p.ativo : true))
  const termo = busca.trim().toLowerCase()
  const lista = doAtivo
    .filter((p) => {
      if (categoria !== "todas" && p.categoria !== categoria) return false
      if (situacao !== "todas" && situacaoEstoque(p) !== situacao) return false
      return !termo || `${p.nome} ${p.marca} ${p.fornecedor} ${p.codigoBarras}`.toLowerCase().includes(termo)
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

  const ativos = produtos.filter((p) => p.ativo)
  const valorTotal = ativos.reduce((t, p) => t + valorEmEstoqueCents(p), 0)

  return (
    <DashboardLayout
      title="Produtos"
      description="Tudo o que a casa compra e vende — custo, preço, margem e estoque"
      actions={
        <>
          {podeEstoque && (
            <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo: "entrada" })}>
              <ArrowDownToLine className="mr-1.5 h-4 w-4" />
              Entrada de mercadoria
            </Button>
          )}
          {podeEditar && (
            <Button size="sm" onClick={() => router.push("/painel/produtos/cadastro")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo produto
            </Button>
          )}
        </>
      }
      toolbar={
        <div className="flex flex-col gap-2">
          <FiltroChips
            ariaLabel="Categoria"
            value={categoria}
            onChange={setCategoria}
            options={[
              { value: "todas", label: "Todas", count: doAtivo.length },
              ...CATEGORIAS_PRODUTO.map((c) => ({ value: c, label: CATEGORIA_PRODUTO[c], count: doAtivo.filter((p) => p.categoria === c).length })),
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger size="sm" className={cn("w-44", classeFiltroSelect(situacao !== "todas"))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Qualquer estoque</SelectItem>
                <SelectItem value="ok">{ESTOQUE_LABEL.ok}</SelectItem>
                <SelectItem value="baixo">{ESTOQUE_LABEL.baixo}</SelectItem>
                <SelectItem value="zerado">{ESTOQUE_LABEL.zerado}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ativo} onValueChange={setAtivo}>
              <SelectTrigger size="sm" className={cn("w-32", classeFiltroSelect(ativo !== "ativos"))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <SearchInput value={busca} onChange={setBusca} placeholder="Buscar nome, marca, fornecedor" className="w-full sm:ml-auto sm:w-72" />
          </div>
        </div>
      }
    >
      <FaixaIndicadores
        className="mb-5"
        itens={[
          { rotulo: "Produtos ativos", valor: String(ativos.length), detalhe: `${ativos.filter((p) => p.vendeAvulso).length} vendem no PDV`, cor: "bg-foreground" },
          { rotulo: "Valor em estoque (a custo)", valor: formatPrice(valorTotal), cor: "bg-foreground" },
          { rotulo: "Abaixo do mínimo", valor: String(ativos.filter((p) => situacaoEstoque(p) === "baixo").length), cor: "bg-amber-400" },
          { rotulo: "Zerados", valor: String(ativos.filter((p) => situacaoEstoque(p) === "zerado").length), cor: "bg-red-500" },
        ]}
      />
      {lista.length === 0 ? (
        <Vazio icone={MODULOS.produtos.icone} titulo="Nenhum produto com esses filtros" descricao="Mude a categoria, a situação ou a busca." />
      ) : (
        <TableSurface className="first:mt-0 first:border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Custo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Margem</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Valor em estoque</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((p) => {
                const s = situacaoEstoque(p)
                return (
                  <TableRow key={p.id} className={cn("cursor-pointer", !p.ativo && "opacity-60")} onClick={() => router.push(`/painel/produtos/${p.id}`)}>
                    <TableCell>
                      <p className="font-semibold">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.marca, p.ativo ? null : "inativo"].filter(Boolean).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{CATEGORIA_PRODUTO[p.categoria]}</TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap text-sm font-semibold tabular-nums">{estoqueEmTexto(p)}</p>
                      <StatusBadge tom={ESTOQUE_TOM[s]} className="mt-1">
                        {ESTOQUE_LABEL[s]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatPrice(p.custoCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.vendeAvulso ? formatPrice(p.precoVendaCents) : <span className="text-xs text-muted-foreground">não vende avulso</span>}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {p.vendeAvulso ? <Margem pct={margemPct(p.precoVendaCents, p.custoCents)} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatPrice(valorEmEstoqueCents(p))}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex">
                        <RowActions
                          actions={[
                            { label: "Ver", icon: Eye, onSelect: () => router.push(`/painel/produtos/${p.id}`) },
                            { label: "Dar entrada", icon: ArrowDownToLine, onSelect: () => setDialogo({ tipo: "entrada", produtoId: p.id }), hidden: !podeEstoque },
                            { label: "Editar", icon: Pencil, onSelect: () => router.push(`/painel/produtos/${p.id}/edicao`), hidden: !podeEditar },
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
      )}
      <DialogosEstoque aberto={dialogo?.tipo ?? null} produtoId={dialogo?.produtoId} onClose={() => setDialogo(null)} />
    </DashboardLayout>
  )
}
