import {
  ArrowDownCircle,
  ArrowUpCircle,
  Bell,
  Boxes,
  CupSoda,
  History,
  LayoutDashboard,
  Martini,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

/**
 * A IDENTIDADE DE CADA MÓDULO — ícone e cor.
 *
 * ⚠️ Visual da casa (o admin da TodosDan): monocromático. O selo do cabeçalho
 * e o menu são neutros; a cor (`hex`) fica só para os GRÁFICOS, onde ela
 * separa as séries.
 *
 * ⚠️ Classes LITERAIS: o Tailwind só gera o que encontra escrito no código.
 */
export interface Modulo {
  titulo: string
  url: string
  icone: LucideIcon
  /** fundo suave + texto: selo do ícone */
  selo: string
  /** cor sólida: barra, ponto, destaque */
  solido: string
  /** cor do ícone sobre a barra lateral */
  naBarra: string
  /** hex para gráficos */
  hex: string
}

const NEUTRO = { selo: "bg-muted text-foreground", solido: "bg-foreground", naBarra: "text-sidebar-foreground/80" }

export const MODULOS = {
  dashboard: { titulo: "Dashboard", url: "/painel", icone: LayoutDashboard, ...NEUTRO, hex: "#09090b" },
  pdv: { titulo: "PDV", url: "/painel/pdv", icone: ShoppingCart, ...NEUTRO, hex: "#d97706" },
  vendas: { titulo: "Vendas", url: "/painel/vendas", icone: Receipt, ...NEUTRO, hex: "#d97706" },
  produtos: { titulo: "Produtos", url: "/painel/produtos", icone: Package, ...NEUTRO, hex: "#0f766e" },
  kits: { titulo: "Kits e combos", url: "/painel/kits", icone: Boxes, ...NEUTRO, hex: "#7c3aed" },
  drinks: { titulo: "Drinks", url: "/painel/drinks", icone: Martini, ...NEUTRO, hex: "#db2777" },
  estoque: { titulo: "Estoque", url: "/painel/estoque", icone: CupSoda, ...NEUTRO, hex: "#0f766e" },
  pagar: { titulo: "Contas a pagar", url: "/painel/contas-a-pagar", icone: ArrowDownCircle, ...NEUTRO, hex: "#ea580c" },
  receber: { titulo: "Contas a receber", url: "/painel/contas-a-receber", icone: ArrowUpCircle, ...NEUTRO, hex: "#2563eb" },
  fluxo: { titulo: "Fluxo de caixa", url: "/painel/fluxo-de-caixa", icone: TrendingUp, ...NEUTRO, hex: "#2563eb" },
  historico: { titulo: "Histórico", url: "/painel/historico", icone: History, ...NEUTRO, hex: "#64748b" },
  notificacoes: { titulo: "Notificações", url: "/painel/notificacoes", icone: Bell, ...NEUTRO, hex: "#64748b" },
} satisfies Record<string, Modulo>

export type ChaveModulo = keyof typeof MODULOS

/** O módulo dono de uma rota — para o selo do cabeçalho. */
export function moduloDaUrl(pathname: string): Modulo | null {
  let melhor: Modulo | null = null
  for (const m of Object.values(MODULOS) as Modulo[]) {
    if (m.url === "/painel") continue
    if (pathname === m.url || pathname.startsWith(m.url + "/")) {
      if (!melhor || m.url.length > melhor.url.length) melhor = m
    }
  }
  return melhor ?? (pathname === "/painel" ? MODULOS.dashboard : null)
}
