"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { StatusBadge } from "@/components/common/status-badge"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import type { ItemVenda, StatusVenda, Venda } from "@/data/tipos"
import { custoDaVendaCents } from "@/lib/derivados"
import { dataISO } from "@/lib/datas"
import type { Permissao } from "@/lib/permissoes"
import { cn } from "@/lib/utils"
import { usePode } from "@/store/sessao-store"

/*
 * Peças comuns de PDV e Vendas. Guard/Vazio moram aqui (e não em
 * `components/apae/comum`) porque aquele arquivo ainda é do projeto de origem.
 */

export function Vazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: React.ElementType
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  className?: string
}) {
  return (
    <Empty className={cn("border bg-card", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icone />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        {descricao && <EmptyDescription>{descricao}</EmptyDescription>}
      </EmptyHeader>
      {acao && <EmptyContent>{acao}</EmptyContent>}
    </Empty>
  )
}

/** Tela inteira bloqueada para o perfil sem a permissão. */
export function Guard({ permissao, titulo, children }: { permissao: Permissao; titulo: string; children: React.ReactNode }) {
  const pode = usePode(permissao)
  if (pode) return <>{children}</>
  return (
    <DashboardLayout title={titulo}>
      <Vazio
        icone={Lock}
        titulo="Seu perfil não tem acesso a esta tela"
        descricao="Troque de perfil no menu do seu nome para ver esta parte da demonstração."
        acao={
          <Button asChild variant="outline" size="sm">
            <Link href="/painel">Voltar ao início</Link>
          </Button>
        }
      />
    </DashboardLayout>
  )
}

export function NaoEncontrado({ titulo, voltar }: { titulo: string; voltar: string }) {
  return (
    <DashboardLayout title={titulo}>
      <Vazio
        icone={SearchX}
        titulo="Registro não encontrado"
        descricao="Se você restaurou os dados de demonstração, os registros criados foram apagados."
        acao={
          <Button asChild variant="outline" size="sm">
            <Link href={voltar}>Voltar para a lista</Link>
          </Button>
        }
      />
    </DashboardLayout>
  )
}

export function StatusVendaBadge({ status }: { status: StatusVenda }) {
  return status === "concluida" ? <StatusBadge tom="ok">Concluída</StatusBadge> : <StatusBadge tom="neutro">Cancelada</StatusBadge>
}

/** "2× Heineken, 1× Gin tônica +3" */
export function resumoItens(itens: ItemVenda[], max = 2): string {
  const partes = itens.slice(0, max).map((i) => `${i.quantidade}× ${i.nome}`)
  const resto = itens.length - max
  return partes.join(", ") + (resto > 0 ? ` +${resto}` : "")
}

/** Dia LOCAL da venda (a `data` é ISO em UTC). */
export const diaDaVenda = (v: Venda) => dataISO(new Date(v.data))

export const lucroDaVendaCents = (v: Venda) => v.totalCents - custoDaVendaCents(v)

export const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

/** Faixa de números no topo da lista: uma linha dividida, sem cartões. */
export function FaixaNumeros({ itens, className }: { itens: { rotulo: string; valor: string; detalhe?: string }[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-5", className)}>
      {itens.map((i) => (
        <div key={i.rotulo} className="min-w-0 bg-card px-4 py-3 last:col-span-2 md:px-5 md:last:col-span-1">
          <p className="text-xs font-semibold text-muted-foreground">{i.rotulo}</p>
          <p className="mt-1 truncate text-lg font-extrabold tabular-nums md:text-xl">{i.valor}</p>
          {i.detalhe && <p className="truncate text-xs text-muted-foreground">{i.detalhe}</p>}
        </div>
      ))}
    </div>
  )
}
