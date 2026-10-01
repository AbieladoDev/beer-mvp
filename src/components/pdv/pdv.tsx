"use client"

import * as React from "react"
import { toast } from "sonner"
import { Martini, Package, Boxes, Search, ShoppingCart, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { FiltroChips } from "@/components/common/filtro-chips"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard } from "@/components/vendas/comum"
import { CATEGORIA_PRODUTO } from "@/data/catalogo"
import type { CategoriaProduto } from "@/data/tipos"
import { formatPrice } from "@/lib/format"
import { MODULOS } from "@/lib/modulos"
import { cn } from "@/lib/utils"
import { useDemo } from "@/store/demo-store"
import { useUsuario } from "@/store/sessao-store"
import { PainelCarrinho, useCarrinho } from "./carrinho"
import { filtrarItens, useItensPdv, type ItemPdv } from "./itens-pdv"
import { ReciboDialog } from "./recibo-dialog"

export function Pdv() {
  return (
    <Guard permissao="pdv.vender" titulo={MODULOS.pdv.titulo}>
      <Conteudo />
    </Guard>
  )
}

function Conteudo() {
  const usuario = useUsuario()
  const registrarVenda = useDemo((s) => s.registrarVenda)
  const itens = useItensPdv()
  const c = useCarrinho(itens)

  const [busca, setBusca] = React.useState("")
  const [categoria, setCategoria] = React.useState("tudo")
  const [carrinhoAberto, setCarrinhoAberto] = React.useState(false)
  const [recibo, setRecibo] = React.useState<{ vendaId: string; trocoCents: number } | null>(null)
  const buscaRef = React.useRef<HTMLInputElement>(null)

  const visiveis = React.useMemo(() => filtrarItens(itens, busca, categoria), [itens, busca, categoria])

  // Chips: Tudo, Drinks, Kits e só as categorias de produto que têm item no PDV.
  const chips = React.useMemo(() => {
    const presentes = new Set(itens.map((i) => i.categoria))
    const cats = (Object.keys(CATEGORIA_PRODUTO) as CategoriaProduto[]).filter((k) => presentes.has(k))
    return [
      { value: "tudo", label: "Tudo" },
      ...(presentes.has("drink") ? [{ value: "drink", label: "Drinks" }] : []),
      ...(presentes.has("kit") ? [{ value: "kit", label: "Kits" }] : []),
      ...cats.map((k) => ({ value: k, label: CATEGORIA_PRODUTO[k] })),
    ]
  }, [itens])

  // F2 volta para a busca de qualquer lugar da tela.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault()
        buscaRef.current?.focus()
        buscaRef.current?.select()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function adicionar(i: ItemPdv) {
    if (i.disponivel <= 0) {
      toast.error(`${i.nome} está sem estoque`)
      return
    }
    c.adicionar(i)
  }

  // Enter na busca: leitor de código de barras ou "digita e confirma".
  function onEnterBusca() {
    const alvo = visiveis.find((i) => i.codigoBarras && i.codigoBarras === busca.trim()) ?? visiveis.find((i) => i.disponivel > 0)
    if (!alvo) {
      if (busca.trim()) toast.error("Nada encontrado para vender com essa busca")
      return
    }
    adicionar(alvo)
    setBusca("")
  }

  function finalizar() {
    if (!c.forma) return
    const troco = c.trocoCents
    const r = registrarVenda(c.linhas, c.descontoCents, c.forma)
    if (!r.ok) {
      toast.error("Estoque insuficiente — a venda não foi registrada", {
        description: r.faltas
          .map((f) => `${f.nome}: precisa ${f.precisa.toLocaleString("pt-BR")}, tem ${Math.max(0, f.tem).toLocaleString("pt-BR")}`)
          .join(" · "),
      })
      return
    }
    setCarrinhoAberto(false)
    setRecibo({ vendaId: r.vendaId, trocoCents: Math.max(0, troco) })
    c.limpar()
  }

  function novaVenda() {
    setRecibo(null)
    setTimeout(() => buscaRef.current?.focus(), 0)
  }

  return (
    <DashboardLayout title={MODULOS.pdv.titulo} bare fill>
      <div className="flex h-full min-h-0">
        {/* Catálogo */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 border-b bg-card px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-muted sm:flex">
                <ShoppingCart className="size-4.5" />
              </span>
              <div className="relative min-w-0 flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={buscaRef}
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      onEnterBusca()
                    } else if (e.key === "Escape") setBusca("")
                  }}
                  placeholder="Buscar por nome ou código de barras"
                  className="h-11 w-full rounded-lg border bg-background pr-16 pl-9 text-base focus:ring-2 focus:ring-ring focus:outline-none"
                />
                {busca ? (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={() => {
                      setBusca("")
                      buscaRef.current?.focus()
                    }}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <Kbd className="absolute top-1/2 right-3 hidden -translate-y-1/2 md:inline-flex">F2</Kbd>
                )}
              </div>
              <div className="hidden text-right md:block">
                <p className="text-xs text-muted-foreground">Operador</p>
                <p className="text-sm font-medium">{usuario?.nome ?? "—"}</p>
              </div>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
              <FiltroChips ariaLabel="Categoria" value={categoria} onChange={setCategoria} options={chips} className="flex-nowrap [&>button]:h-9 [&>button]:shrink-0 [&>button]:px-3.5 [&>button]:text-sm" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {visiveis.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
                <Search className="size-6 opacity-40" />
                Nada encontrado{busca && ` para "${busca}"`}.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visiveis.map((i) => (
                  <CardItem key={i.chave} item={i} noCarrinho={c.linhas.find((l) => l.tipo === i.tipo && l.refId === i.refId)?.quantidade ?? 0} onClick={() => adicionar(i)} />
                ))}
              </div>
            )}
          </div>

          {/* Celular / tablet em pé: o carrinho vira uma folha de baixo. */}
          <div className="shrink-0 border-t bg-card p-3 lg:hidden">
            <Button size="lg" className="h-12 w-full justify-between text-base" onClick={() => setCarrinhoAberto(true)}>
              <span className="flex items-center gap-2">
                <ShoppingCart className="size-5" />
                Carrinho {c.qtdItens > 0 && `(${c.qtdItens})`}
              </span>
              <span className="tabular-nums">{formatPrice(c.totalCents)}</span>
            </Button>
          </div>
        </div>

        {/* Carrinho fixo à direita no desktop / tablet deitado */}
        <PainelCarrinho c={c} onFinalizar={finalizar} className="hidden w-[24rem] shrink-0 border-l bg-background lg:flex" />
      </div>

      <Sheet open={carrinhoAberto} onOpenChange={setCarrinhoAberto}>
        <SheetContent side="bottom" className="h-[90svh] gap-0 rounded-t-2xl p-0 lg:hidden">
          <SheetTitle className="sr-only">Carrinho</SheetTitle>
          <PainelCarrinho c={c} onFinalizar={finalizar} className="h-full pt-2" />
        </SheetContent>
      </Sheet>

      <ReciboDialog vendaId={recibo?.vendaId ?? null} trocoCents={recibo?.trocoCents ?? 0} onNovaVenda={novaVenda} />
    </DashboardLayout>
  )
}

const ICONE_TIPO = { produto: Package, kit: Boxes, drink: Martini }

function CardItem({ item, noCarrinho, onClick }: { item: ItemPdv; noCarrinho: number; onClick: () => void }) {
  const indisponivel = item.disponivel <= 0
  const pouco = !indisponivel && item.disponivel <= 5
  const Icone = ICONE_TIPO[item.tipo]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={indisponivel}
      className={cn(
        "relative flex min-h-28 flex-col rounded-xl border bg-card p-3 text-left transition-colors active:scale-[0.98]",
        indisponivel ? "cursor-not-allowed opacity-50" : "hover:border-foreground/40",
        noCarrinho > 0 && "border-foreground ring-1 ring-foreground"
      )}
    >
      {noCarrinho > 0 && (
        <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background tabular-nums">
          {noCarrinho}
        </span>
      )}
      <div className="flex items-start gap-2">
        <Icone className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="line-clamp-2 text-sm leading-snug font-semibold">{item.nome}</p>
      </div>
      <p className="mt-0.5 truncate pl-5.5 text-xs text-muted-foreground">{item.detalhe}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <span className="text-base font-extrabold tabular-nums">{formatPrice(item.precoCents)}</span>
        <span
          className={cn(
            "truncate text-right text-[11px]",
            indisponivel ? "font-semibold text-red-600" : pouco ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          {item.dispTexto}
        </span>
      </div>
    </button>
  )
}
