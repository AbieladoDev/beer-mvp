"use client"

import * as React from "react"
import { AlertTriangle, Banknote, CreditCard, Minus, Plus, QrCode, ShoppingCart, Trash2, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import type { FormaPagamento } from "@/data/tipos"
import { consumoDosItens, faltasDeEstoque } from "@/lib/derivados"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useDemo, type ItemCarrinho } from "@/store/demo-store"
import { chaveItem, type ItemPdv } from "./itens-pdv"

export const FORMAS: { valor: FormaPagamento; rotulo: string; icone: React.ElementType }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro", icone: Banknote },
  { valor: "pix", rotulo: "Pix", icone: QrCode },
  { valor: "debito", rotulo: "Débito", icone: Wallet },
  { valor: "credito", rotulo: "Crédito", icone: CreditCard },
]

const reais = (v: string) => Math.round((parseFloat(v) || 0) * 100)

/** Estado do carrinho + contas derivadas (subtotal, desconto, troco, faltas). */
export function useCarrinho(itensPdv: ItemPdv[]) {
  const produtos = useDemo((s) => s.produtos)
  const kits = useDemo((s) => s.kits)
  const drinks = useDemo((s) => s.drinks)

  const [linhas, setLinhas] = React.useState<ItemCarrinho[]>([])
  const [descontoModo, setDescontoModo] = React.useState<"valor" | "pct">("valor")
  const [descontoValor, setDescontoValor] = React.useState("")
  const [descontoPct, setDescontoPct] = React.useState("")
  const [forma, setForma] = React.useState<FormaPagamento | null>(null)
  const [recebido, setRecebido] = React.useState("")

  const porChave = React.useMemo(() => new Map(itensPdv.map((i) => [i.chave, i])), [itensPdv])

  const adicionar = (i: ItemPdv, qtd = 1) =>
    setLinhas((ls) => {
      const existe = ls.find((l) => l.tipo === i.tipo && l.refId === i.refId)
      if (existe) return ls.map((l) => (l === existe ? { ...l, quantidade: l.quantidade + qtd } : l))
      return [...ls, { tipo: i.tipo, refId: i.refId, quantidade: qtd }]
    })

  const mudarQtd = (l: ItemCarrinho, delta: number) =>
    setLinhas((ls) => ls.map((x) => (x === l ? { ...x, quantidade: x.quantidade + delta } : x)).filter((x) => x.quantidade > 0))

  const remover = (l: ItemCarrinho) => setLinhas((ls) => ls.filter((x) => x !== l))

  const limpar = () => {
    setLinhas([])
    setDescontoValor("")
    setDescontoPct("")
    setForma(null)
    setRecebido("")
  }

  const subtotalCents = linhas.reduce((t, l) => t + (porChave.get(chaveItem(l.tipo, l.refId))?.precoCents ?? 0) * l.quantidade, 0)
  const descontoBruto =
    descontoModo === "valor" ? reais(descontoValor) : Math.round((subtotalCents * Math.min(100, parseFloat(descontoPct.replace(",", ".")) || 0)) / 100)
  const descontoCents = Math.min(Math.max(0, descontoBruto), subtotalCents)
  const totalCents = subtotalCents - descontoCents
  const recebidoCents = reais(recebido)
  const trocoCents = forma === "dinheiro" && recebido ? recebidoCents - totalCents : 0

  // Mesma conta que o store faz na baixa — o aviso e a venda concordam.
  const faltas = React.useMemo(
    () => faltasDeEstoque(consumoDosItens(linhas, produtos, kits, drinks), produtos),
    [linhas, produtos, kits, drinks]
  )

  const qtdItens = linhas.reduce((t, l) => t + l.quantidade, 0)
  const recebidoInsuficiente = forma === "dinheiro" && !!recebido && recebidoCents < totalCents
  // Com falta o botão continua ativo: quem decide é o store (devolve as faltas).
  const podeFinalizar = linhas.length > 0 && !!forma && !recebidoInsuficiente

  return {
    linhas,
    porChave,
    adicionar,
    mudarQtd,
    remover,
    limpar,
    descontoModo,
    setDescontoModo,
    descontoValor,
    setDescontoValor,
    descontoPct,
    setDescontoPct,
    forma,
    setForma,
    recebido,
    setRecebido,
    subtotalCents,
    descontoCents,
    totalCents,
    trocoCents,
    faltas,
    qtdItens,
    recebidoInsuficiente,
    podeFinalizar,
  }
}

export type Carrinho = ReturnType<typeof useCarrinho>

const fmtQtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })

export function PainelCarrinho({ c, onFinalizar, className }: { c: Carrinho; onFinalizar: () => void; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" />
          Carrinho
          {c.qtdItens > 0 && <span className="text-muted-foreground tabular-nums">· {c.qtdItens}</span>}
        </p>
        {c.linhas.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={c.limpar}>
            Limpar
          </Button>
        )}
      </div>

      {/* Linhas */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {c.linhas.length === 0 ? (
          <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1 p-6 text-center text-sm text-muted-foreground">
            <ShoppingCart className="size-6 opacity-40" />
            Toque num produto para começar a venda.
          </div>
        ) : (
          <ul className="divide-y">
            {c.linhas.map((l) => {
              const item = c.porChave.get(chaveItem(l.tipo, l.refId))
              const preco = item?.precoCents ?? 0
              return (
                <li key={chaveItem(l.tipo, l.refId)} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item?.nome ?? "Item indisponível"}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatPrice(preco)} · <span className="font-semibold text-foreground">{formatPrice(preco * l.quantidade)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" aria-label="Diminuir" onClick={() => c.mudarQtd(l, -1)}>
                      <Minus />
                    </Button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.quantidade}</span>
                    <Button variant="outline" size="icon-sm" aria-label="Aumentar" onClick={() => c.mudarQtd(l, 1)}>
                      <Plus />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Remover" className="text-muted-foreground hover:text-destructive" onClick={() => c.remover(l)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Fechamento */}
      <div className="shrink-0 space-y-3 border-t bg-card px-4 py-3">
        {c.faltas.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">Estoque insuficiente</p>
              <ul className="mt-0.5 space-y-0.5">
                {c.faltas.map((f) => (
                  <li key={f.produto.id} className="truncate">
                    {f.produto.nome}: precisa {fmtQtd(f.precisa)}, tem {fmtQtd(Math.max(0, f.tem))} {f.produto.unidade}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{formatPrice(c.subtotalCents)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Desconto</span>
          <div className="ml-auto flex overflow-hidden rounded-md border text-xs">
            {(["valor", "pct"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => c.setDescontoModo(m)}
                className={cn("h-8 px-2.5 font-medium", c.descontoModo === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {m === "valor" ? "R$" : "%"}
              </button>
            ))}
          </div>
          {c.descontoModo === "valor" ? (
            <CurrencyInput value={c.descontoValor} onChange={c.setDescontoValor} className="h-8 w-28 text-right" />
          ) : (
            <Input
              inputMode="decimal"
              value={c.descontoPct}
              onChange={(e) => c.setDescontoPct(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              className="h-8 w-28 text-right"
            />
          )}
        </div>
        {c.descontoCents > 0 && (
          <p className="-mt-2 text-right text-xs text-muted-foreground tabular-nums">− {formatPrice(c.descontoCents)}</p>
        )}

        <div className="flex items-baseline justify-between border-t pt-2">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-2xl font-extrabold tabular-nums">{formatPrice(c.totalCents)}</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Forma de pagamento">
          {FORMAS.map((f) => {
            const ativo = c.forma === f.valor
            return (
              <button
                key={f.valor}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => c.setForma(f.valor)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium transition-colors",
                  ativo ? "border-foreground bg-foreground text-background" : "bg-background hover:border-foreground/40"
                )}
              >
                <f.icone className="size-4" />
                {f.rotulo}
              </button>
            )
          })}
        </div>

        {c.forma === "dinheiro" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Recebido</span>
            <CurrencyInput value={c.recebido} onChange={c.setRecebido} className="ml-auto h-9 w-32 text-right" error={c.recebidoInsuficiente} />
            <div className="w-28 text-right">
              <p className="text-[11px] text-muted-foreground">{c.recebidoInsuficiente ? "Falta" : "Troco"}</p>
              <p className={cn("text-sm font-bold tabular-nums", c.recebidoInsuficiente && "text-destructive")}>
                {formatPrice(Math.abs(c.trocoCents))}
              </p>
            </div>
          </div>
        )}

        <Button size="lg" className="h-12 w-full text-base" disabled={!c.podeFinalizar} onClick={onFinalizar}>
          Finalizar venda
        </Button>
        {c.linhas.length > 0 && !c.forma && <p className="-mt-1 text-center text-xs text-muted-foreground">Escolha a forma de pagamento.</p>}
      </div>
    </div>
  )
}
