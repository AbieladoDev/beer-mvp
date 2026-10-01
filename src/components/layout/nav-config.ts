"use client"

import * as React from "react"

import { MODULOS, type Modulo } from "@/lib/modulos"
import { temPermissao, type Permissao } from "@/lib/permissoes"
import { useSessao } from "@/store/sessao-store"

export interface NavLink {
  title: string
  url: string
  icon: React.ElementType
  /** cor do ícone sobre a barra */
  cor?: string
  permission?: Permissao
  exact?: boolean
  description?: string
  items?: NavLink[]
  activeOn?: string[]
}

export interface NavSection {
  label?: string
  items: NavLink[]
}

function link(m: Modulo, extra: Partial<NavLink> = {}): NavLink {
  return { title: m.titulo, url: m.url, icon: m.icone, cor: m.naBarra, ...extra }
}

/** A navegação inteira, numa fonte só (menu, celular, trilha e busca leem daqui). */
export const navSections: NavSection[] = [
  {
    label: "Visão geral",
    items: [link(MODULOS.dashboard, { exact: true, description: "Como o bar está hoje e no mês" })],
  },
  {
    label: "Vendas",
    items: [
      link(MODULOS.pdv, { permission: "pdv.vender", description: "Registrar a venda do balcão" }),
      link(MODULOS.vendas, { permission: "vendas.ler", description: "Vendas feitas, cupom e cancelamento" }),
    ],
  },
  {
    label: "Cardápio e estoque",
    items: [
      link(MODULOS.produtos, { permission: "produtos.ler", description: "Cervejas, destilados, petiscos e insumos" }),
      link(MODULOS.kits, { permission: "produtos.ler", description: "Combos de produtos por um preço só" }),
      link(MODULOS.drinks, { permission: "produtos.ler", description: "Receitas com custo por ml" }),
      link(MODULOS.estoque, { permission: "estoque.ler", description: "Entradas, ajustes e perdas" }),
    ],
  },
  {
    label: "Financeiro",
    items: [
      link(MODULOS.pagar, { permission: "financeiro.ler", description: "Fornecedores, aluguel, folha" }),
      link(MODULOS.receber, { permission: "financeiro.ler", description: "Vendas a liquidar e eventos" }),
      link(MODULOS.fluxo, { permission: "financeiro.ler", description: "Entrou, saiu e o saldo previsto" }),
    ],
  },
]

export function useFilteredNavigation(): NavSection[] {
  const perfil = useSessao((s) => s.perfil)
  return React.useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => temPermissao(perfil, item.permission)),
        }))
        .filter((section) => section.items.length > 0),
    [perfil]
  )
}

export function isNavItemActive(url: string, pathname: string, exact = false): boolean {
  if (url === "/painel" || exact) return pathname === url
  return pathname === url || pathname.startsWith(url + "/")
}

export function isModuloAberto(item: NavLink, pathname: string): boolean {
  if (isNavItemActive(item.url, pathname, item.exact)) return true
  if (item.activeOn?.some((url) => isNavItemActive(url, pathname))) return true
  return item.items?.some((sub) => isNavItemActive(sub.url, pathname, sub.exact)) ?? false
}

/** O módulo de uma rota interna — o degrau do meio da trilha. */
export function moduloDaRota(pathname: string): { title: string; url: string } | null {
  const extras = [MODULOS.historico, MODULOS.notificacoes].map((m) => link(m))
  for (const item of [...navSections.flatMap((s) => s.items), ...extras]) {
    if (pathname === item.url) return null
    if (isModuloAberto(item, pathname)) return { title: item.title, url: item.url }
  }
  return null
}
