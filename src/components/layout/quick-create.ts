"use client"

import { MODULOS } from "@/lib/modulos"
import { temPermissao, type Permissao } from "@/lib/permissoes"
import { useSessao } from "@/store/sessao-store"

export interface QuickCreateAction {
  label: string
  description: string
  icon: React.ElementType
  href: string
  permission?: Permissao
  color: string
}

const M = MODULOS

export const QUICK_CREATE: QuickCreateAction[] = [
  { label: "Nova venda", description: "Abrir o PDV", icon: M.pdv.icone, href: "/painel/pdv", permission: "pdv.vender", color: M.pdv.selo },
  { label: "Novo produto", description: "Cerveja, destilado, petisco, insumo", icon: M.produtos.icone, href: "/painel/produtos/cadastro", permission: "produtos.editar", color: M.produtos.selo },
  { label: "Novo kit", description: "Combo por um preço só", icon: M.kits.icone, href: "/painel/kits/cadastro", permission: "produtos.editar", color: M.kits.selo },
  { label: "Novo drink", description: "Receita com doses em ml", icon: M.drinks.icone, href: "/painel/drinks/cadastro", permission: "produtos.editar", color: M.drinks.selo },
  { label: "Entrada de mercadoria", description: "Nota do fornecedor no estoque", icon: M.estoque.icone, href: "/painel/estoque?entrada=1", permission: "estoque.editar", color: M.estoque.selo },
  { label: "Nova conta a pagar", description: "Boleto, aluguel, fornecedor", icon: M.pagar.icone, href: "/painel/contas-a-pagar/cadastro", permission: "financeiro.editar", color: M.pagar.selo },
  { label: "Nova conta a receber", description: "Evento, reserva, outros", icon: M.receber.icone, href: "/painel/contas-a-receber/cadastro", permission: "financeiro.editar", color: M.receber.selo },
]

export function useQuickCreateActions(): QuickCreateAction[] {
  const perfil = useSessao((s) => s.perfil)
  return QUICK_CREATE.filter((a) => temPermissao(perfil, a.permission))
}
