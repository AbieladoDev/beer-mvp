"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useFilteredNavigation } from "@/components/layout/nav-config"
import { MODULOS, type Modulo } from "@/lib/modulos"
import { CATEGORIA_PRODUTO } from "@/data/catalogo"
import { FORMA_LABEL, estoqueEmTexto } from "@/lib/derivados"
import { formatDateTime, formatPrice } from "@/lib/format"
import { temPermissao, type Permissao } from "@/lib/permissoes"
import { useDemo } from "@/store/demo-store"
import { useSessao } from "@/store/sessao-store"

interface Resultado {
  id: string
  titulo: string
  detalhe: string
  href: string
  modulo: Modulo
  /** Texto a mais só para casar a busca (código de barras, nº da venda). */
  extra?: string
}

/**
 * Busca global (Ctrl+K): módulos e registros de todos os cadastros que o
 * perfil pode ver. Na demo a busca é local; no sistema real vira o endpoint
 * de busca da API, como na TodosDan.
 */
export function CommandSearch() {
  const router = useRouter()
  const [aberto, setAberto] = React.useState(false)
  const perfil = useSessao((s) => s.perfil)
  const navegacao = useFilteredNavigation()
  const nav = React.useMemo(() => {
    const extras = [MODULOS.notificacoes, ...(temPermissao(perfil, "historico.ler") ? [MODULOS.historico] : [])]
    return [...navegacao.flatMap((s) => s.items), ...extras.map((m) => ({ title: m.titulo, url: m.url, icon: m.icone }))]
  }, [navegacao, perfil])
  const d = useDemo()

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setAberto((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const grupos = React.useMemo(() => {
    const pode = (p: Permissao) => temPermissao(perfil, p)
    const g: { titulo: string; itens: Resultado[] }[] = []
    if (pode("produtos.ler")) {
      g.push({
        titulo: "Produtos",
        itens: d.produtos.map((p) => ({
          id: p.id,
          titulo: p.nome,
          detalhe: `${CATEGORIA_PRODUTO[p.categoria]} · ${p.marca} · ${estoqueEmTexto(p)}`,
          href: `/painel/produtos/${p.id}`,
          modulo: MODULOS.produtos,
          extra: p.codigoBarras,
        })),
      })
      g.push({ titulo: "Kits e combos", itens: d.kits.map((k) => ({ id: k.id, titulo: k.nome, detalhe: formatPrice(k.precoCents), href: `/painel/kits/${k.id}`, modulo: MODULOS.kits })) })
      g.push({ titulo: "Drinks", itens: d.drinks.map((x) => ({ id: x.id, titulo: x.nome, detalhe: formatPrice(x.precoCents), href: `/painel/drinks/${x.id}`, modulo: MODULOS.drinks })) })
    }
    if (pode("vendas.ler")) {
      g.push({
        titulo: "Vendas",
        itens: d.vendas.slice(0, 80).map((v) => ({
          id: v.id,
          titulo: `Venda #${v.numero}${v.status === "cancelada" ? " (cancelada)" : ""}`,
          detalhe: `${formatPrice(v.totalCents)} · ${FORMA_LABEL[v.forma]} · ${formatDateTime(v.data)}`,
          href: `/painel/vendas/${v.id}`,
          modulo: MODULOS.vendas,
          extra: `#${v.numero} ${v.numero}`,
        })),
      })
    }
    if (pode("financeiro.ler")) {
      g.push({
        titulo: "Contas a pagar",
        itens: d.contasPagar.slice(0, 60).map((c) => ({ id: c.id, titulo: c.descricao, detalhe: `${formatPrice(c.valorCents)} · ${c.fornecedor}`, href: `/painel/contas-a-pagar/${c.id}`, modulo: MODULOS.pagar })),
      })
      g.push({
        titulo: "Contas a receber",
        itens: d.contasReceber.slice(0, 60).map((c) => ({ id: c.id, titulo: c.descricao, detalhe: `${formatPrice(c.valorCents)} · ${c.cliente}`, href: `/painel/contas-a-receber/${c.id}`, modulo: MODULOS.receber })),
      })
    }
    return g.filter((x) => x.itens.length > 0)
  }, [d, perfil])

  function ir(href: string) {
    setAberto(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-8 w-9 items-center justify-center gap-2 rounded-full bg-sidebar-accent text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground md:w-[26rem] md:justify-start md:px-3"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden flex-1 truncate text-left md:inline">Buscar produto, drink, venda, conta…</span>
        <kbd className="hidden rounded bg-sidebar px-1.5 py-0.5 text-[10px] font-medium md:inline">Ctrl K</kbd>
      </button>
      <CommandDialog open={aberto} onOpenChange={setAberto} title="Buscar" description="Busque em todos os módulos">
        <CommandInput placeholder="O que você procura?" />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>Nada encontrado com esse termo.</CommandEmpty>
          <CommandGroup heading="Ir para">
            {nav.map((n) => {
              const Icone = n.icon
              return (
                <CommandItem key={n.url} value={`ir ${n.title}`} onSelect={() => ir(n.url)}>
                  <Icone className="size-4" />
                  {n.title}
                </CommandItem>
              )
            })}
          </CommandGroup>
          {grupos.map((g) => (
            <CommandGroup key={g.titulo} heading={g.titulo}>
              {g.itens.map((r) => {
                const Icone = r.modulo.icone
                return (
                  <CommandItem key={r.id} value={`${r.titulo} ${r.detalhe} ${r.extra ?? ""} ${r.id}`} onSelect={() => ir(r.href)}>
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${r.modulo.selo}`}>
                      <Icone className="!size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.titulo}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.detalhe}</span>
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
