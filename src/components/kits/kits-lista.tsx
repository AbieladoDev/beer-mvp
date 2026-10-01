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
import { Margem, fmtPct } from "@/components/produtos/comum"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { usePode } from "@/store/sessao-store"
import { numerosDoKit, resumoDosItens } from "./numeros"

export function KitsLista() {
  return (
    <Guard permissao="produtos.ler" titulo="Kits e combos">
      <Lista />
    </Guard>
  )
}

function Lista() {
  const router = useRouter()
  const kits = useDemo((s) => s.kits)
  const produtos = useDemo((s) => s.produtos)
  const podeEditar = usePode("produtos.editar")
  const [busca, setBusca] = React.useState("")
  const [filtro, setFiltro] = React.useState("ativos")

  const comNumeros = kits.map((k) => ({ k, n: numerosDoKit(k, produtos) }))
  const termo = busca.trim().toLowerCase()
  const lista = comNumeros
    .filter(({ k, n }) => {
      if (filtro === "ativos" && !k.ativo) return false
      if (filtro === "inativos" && k.ativo) return false
      if (filtro === "sem" && (!k.ativo || n.daPara > 0)) return false
      return !termo || `${k.nome} ${k.descricao}`.toLowerCase().includes(termo)
    })
    .sort((a, b) => a.k.nome.localeCompare(b.k.nome, "pt-BR"))

  return (
    <DashboardLayout
      title="Kits e combos"
      description="Combos de produtos inteiros vendidos por um preço só"
      actions={
        podeEditar && (
          <Button size="sm" onClick={() => router.push("/painel/kits/cadastro")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo kit
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
              { value: "ativos", label: "Ativos", count: kits.filter((k) => k.ativo).length },
              { value: "sem", label: "Sem estoque para montar", count: comNumeros.filter(({ k, n }) => k.ativo && n.daPara === 0).length },
              { value: "inativos", label: "Inativos", count: kits.filter((k) => !k.ativo).length },
              { value: "todos", label: "Todos", count: kits.length },
            ]}
          />
          <SearchInput value={busca} onChange={setBusca} placeholder="Buscar kit" className="w-full sm:ml-auto sm:w-60" />
        </div>
      }
    >
      {lista.length === 0 ? (
        <Vazio icone={MODULOS.kits.icone} titulo="Nenhum kit com esses filtros" />
      ) : (
        <TableSurface className="first:mt-0 first:border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kit</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Custo</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Margem</TableHead>
                <TableHead className="hidden text-right md:table-cell">Avulso → combo</TableHead>
                <TableHead className="text-right">Dá para montar</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map(({ k, n }) => (
                <TableRow key={k.id} className={cn("cursor-pointer", !k.ativo && "opacity-60")} onClick={() => router.push(`/painel/kits/${k.id}`)}>
                  <TableCell className="max-w-[22rem]">
                    <p className="font-semibold">
                      {k.nome}
                      {!k.ativo && <span className="ml-2 text-xs font-normal text-muted-foreground">inativo</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{resumoDosItens(k, produtos)}</p>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatPrice(k.precoCents)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatPrice(n.custo)}</TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    <Margem pct={n.margem} />
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    <p className="tabular-nums">
                      <span className="text-muted-foreground line-through">{formatPrice(n.avulso)}</span> → {formatPrice(k.precoCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {n.economia > 0 ? `cliente economiza ${formatPrice(n.economia)} (${fmtPct(n.economiaPct)})` : "sem desconto sobre o avulso"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    {n.daPara > 0 ? <span className="font-bold tabular-nums">{n.daPara}</span> : <StatusBadge tom="alerta">Sem estoque</StatusBadge>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex">
                      <RowActions
                        actions={[
                          { label: "Ver", icon: Eye, onSelect: () => router.push(`/painel/kits/${k.id}`) },
                          { label: "Editar", icon: Pencil, onSelect: () => router.push(`/painel/kits/${k.id}/edicao`), hidden: !podeEditar },
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
