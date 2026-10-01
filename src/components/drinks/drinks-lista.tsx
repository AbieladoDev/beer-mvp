"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, Pencil, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSurface } from "@/components/ui/table"
import { FiltroChips } from "@/components/common/filtro-chips"
import { RowActions } from "@/components/common/row-actions"
import { StatusBadge } from "@/components/common/status-badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, Vazio } from "@/components/apae/comum"
import { Margem } from "@/components/produtos/comum"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { numerosDoDrink, resumoDaReceita } from "./numeros"

export function DrinksLista() {
  return (
    <Guard permissao="produtos.ler" titulo="Drinks">
      <Lista />
    </Guard>
  )
}

function Lista() {
  const router = useRouter()
  const drinks = useDemo((s) => s.drinks)
  const produtos = useDemo((s) => s.produtos)
  const podeEditar = usePode("produtos.editar")
  const [busca, setBusca] = React.useState("")
  const [filtro, setFiltro] = React.useState("ativos")

  const comNumeros = drinks.map((d) => ({ d, n: numerosDoDrink(d, produtos) }))
  const termo = busca.trim().toLowerCase()
  const lista = comNumeros
    .filter(({ d, n }) => {
      if (filtro === "ativos" && !d.ativo) return false
      if (filtro === "inativos" && d.ativo) return false
      if (filtro === "sem" && (!d.ativo || n.daPara > 0)) return false
      return !termo || `${d.nome} ${d.descricao}`.toLowerCase().includes(termo)
    })
    .sort((a, b) => a.d.nome.localeCompare(b.d.nome, "pt-BR"))

  return (
    <DashboardLayout
      title="Drinks"
      description="Receitas em dose: o custo sai do ml de cada ingrediente"
      actions={
        podeEditar && (
          <Button size="sm" onClick={() => router.push("/painel/drinks/cadastro")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo drink
          </Button>
        )
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <FiltroChips
            ariaLabel="Situação"
            value={filtro}
            onChange={setFiltro}
            options={[
              { value: "ativos", label: "Ativos", count: drinks.filter((d) => d.ativo).length },
              { value: "sem", label: "Sem estoque para montar", count: comNumeros.filter(({ d, n }) => d.ativo && n.daPara === 0).length },
              { value: "inativos", label: "Inativos", count: drinks.filter((d) => !d.ativo).length },
              { value: "todos", label: "Todos", count: drinks.length },
            ]}
          />
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar drink" className="w-full sm:ml-auto sm:w-60" />
        </div>
      }
    >
      {lista.length === 0 ? (
        <Vazio icone={MODULOS.drinks.icone} titulo="Nenhum drink com esses filtros" />
      ) : (
        <TableSurface className="first:mt-0 first:border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drink</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Custo</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Margem</TableHead>
                <TableHead className="text-right">Dá para montar</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map(({ d, n }) => (
                <TableRow key={d.id} className={cn("cursor-pointer", !d.ativo && "opacity-60")} onClick={() => router.push(`/painel/drinks/${d.id}`)}>
                  <TableCell className="max-w-[22rem]">
                    <p className="font-semibold">
                      {d.nome}
                      {!d.ativo && <span className="ml-2 text-xs font-normal text-muted-foreground">inativo</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{resumoDaReceita(d, produtos)}</p>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatPrice(d.precoCents)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatPrice(n.custo)}</TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    <Margem pct={n.margem} />
                  </TableCell>
                  <TableCell className="text-right">
                    {n.daPara > 0 ? <span className="font-bold tabular-nums">{n.daPara}</span> : <StatusBadge tom="alerta">Sem estoque</StatusBadge>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex">
                      <RowActions
                        actions={[
                          { label: "Ver", icon: Eye, onSelect: () => router.push(`/painel/drinks/${d.id}`) },
                          { label: "Editar", icon: Pencil, onSelect: () => router.push(`/painel/drinks/${d.id}/edicao`), hidden: !podeEditar },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </DashboardLayout>
  )
}
