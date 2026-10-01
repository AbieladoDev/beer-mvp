"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencyInput, NumberInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Interruptor } from "@/components/common/form-layout"
import { campoParaCents, centsParaCampo } from "@/components/apae/comum"
import { SeletorProduto, campoParaQtd, fmtNum } from "@/components/produtos/comum"
import { MEIO_PAGAMENTO } from "@/data/catalogo"
import type { MeioPagamento } from "@/data/tipos"
import { dataISO, hoje, somarDias } from "@/lib/datas"
import { formatPrice } from "@/lib/format"
import { useDemo } from "@/store/demo-store"

/**
 * Os três jeitos de mexer no estoque fora da venda: ENTRADA (nota do
 * fornecedor, recalcula o custo médio e pode gerar a conta a pagar), AJUSTE
 * (inventário: digita o que contou) e PERDA (quebra, vencido, cortesia).
 */

interface PropsDialogo {
  aberto: boolean
  onOpenChange: (v: boolean) => void
  produtoInicial?: string
}

function Campo({ rotulo, children, className }: { rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label>{rotulo}</Label>
      {children}
    </div>
  )
}

export function DialogoEntrada({ aberto, onOpenChange, produtoInicial }: PropsDialogo) {
  const produtos = useDemo((s) => s.produtos)
  const entradaEstoque = useDemo((s) => s.entradaEstoque)
  const [produtoId, setProdutoId] = React.useState("")
  const [qtd, setQtd] = React.useState("")
  const [custo, setCusto] = React.useState("")
  const [fornecedor, setFornecedor] = React.useState("")
  const [documento, setDocumento] = React.useState("")
  const [gerarConta, setGerarConta] = React.useState(true)
  const [vencimento, setVencimento] = React.useState(somarDias(hoje(), 28))
  const [pago, setPago] = React.useState(false)
  const [forma, setForma] = React.useState<MeioPagamento>("boleto")

  function escolherProduto(id: string) {
    setProdutoId(id)
    const p = produtos.find((x) => x.id === id)
    setCusto(centsParaCampo(p?.custoCents))
    setFornecedor(p?.fornecedor ?? "")
  }

  React.useEffect(() => {
    if (!aberto) return
    const p = produtos.find((x) => x.id === produtoInicial)
    setProdutoId(p?.id ?? "")
    setCusto(centsParaCampo(p?.custoCents))
    setFornecedor(p?.fornecedor ?? "")
    setQtd("")
    setDocumento("")
    setGerarConta(true)
    setVencimento(somarDias(hoje(), 28))
    setPago(false)
    setForma("boleto")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reabrir zera o diálogo; mudar o estoque com ele aberto não
  }, [aberto, produtoInicial])

  const produto = produtos.find((x) => x.id === produtoId)
  const n = campoParaQtd(qtd)
  const custoCents = campoParaCents(custo)
  const total = Math.round(n * custoCents)
  const base = Math.max(0, produto?.estoque ?? 0)
  const custoMedio = produto && n > 0 ? Math.round((base * produto.custoCents + n * custoCents) / (base + n)) : 0
  const valido = !!produto && n > 0 && custoCents > 0 && (!gerarConta || !!vencimento)

  function confirmar() {
    if (!produto || !valido) return
    entradaEstoque({
      produtoId: produto.id,
      quantidade: n,
      custoUnitCents: custoCents,
      fornecedor: fornecedor.trim(),
      documento: documento.trim(),
      conta: gerarConta ? { vencimento, pago, forma } : undefined,
    })
    toast.success(`Entrada de ${fmtNum(n)} ${produto.unidade} registrada`, {
      description: gerarConta ? `Conta a pagar de ${formatPrice(total)} ${pago ? "lançada como paga" : "lançada"}.` : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Entrada de mercadoria</DialogTitle>
          <DialogDescription>O que chegou do fornecedor. O custo do produto passa a ser a média entre o que já havia e o da nota.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Produto" className="space-y-1.5 sm:col-span-2">
            <SeletorProduto produtos={produtos} valor={produtoId} onChange={escolherProduto} />
          </Campo>
          <Campo rotulo="Quantidade">
            <NumberInput value={qtd} onChange={setQtd} suffix={produto?.unidade} />
          </Campo>
          <Campo rotulo="Custo unitário">
            <CurrencyInput value={custo} onChange={setCusto} />
          </Campo>
          <Campo rotulo="Fornecedor">
            <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </Campo>
          <Campo rotulo="Nº da NF / documento">
            <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Ex.: NF 4821" />
          </Campo>
        </div>

        {produto && n > 0 && custoCents > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total da nota</p>
              <p className="font-extrabold tabular-nums">{formatPrice(total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo médio</p>
              <p className="font-extrabold tabular-nums">
                {formatPrice(produto.custoCents)} → {formatPrice(custoMedio)}
              </p>
            </div>
          </div>
        )}

        <Interruptor rotulo="Gerar conta a pagar" descricao="Lança a nota no Contas a pagar, categoria Mercadoria." marcado={gerarConta} onMarcar={setGerarConta}>
          <Campo rotulo="Vencimento">
            <DatePicker value={vencimento} onChange={(d) => setVencimento(d ? dataISO(d) : "")} />
          </Campo>
          <Campo rotulo="Forma">
            <Select value={forma} onValueChange={(v) => setForma(v as MeioPagamento)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEIO_PAGAMENTO).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <div className="sm:col-span-2">
            <Interruptor rotulo="Já está paga" descricao="Paga hoje, na entrega." marcado={pago} onMarcar={setPago} />
          </div>
        </Interruptor>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!valido}>
            Registrar entrada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Inventário: a pessoa digita o que CONTOU e o sistema lança a diferença. */
export function DialogoAjuste({ aberto, onOpenChange, produtoInicial }: PropsDialogo) {
  const produtos = useDemo((s) => s.produtos)
  const ajustarEstoque = useDemo((s) => s.ajustarEstoque)
  const [produtoId, setProdutoId] = React.useState("")
  const [contado, setContado] = React.useState("")
  const [motivo, setMotivo] = React.useState("")

  function escolherProduto(id: string) {
    setProdutoId(id)
    setContado(String(produtos.find((x) => x.id === id)?.estoque ?? ""))
  }

  React.useEffect(() => {
    if (!aberto) return
    const p = produtos.find((x) => x.id === produtoInicial)
    setProdutoId(p?.id ?? "")
    setContado(p ? String(p.estoque) : "")
    setMotivo("Contagem de inventário")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reabrir zera o diálogo
  }, [aberto, produtoInicial])

  const produto = produtos.find((x) => x.id === produtoId)
  const n = campoParaQtd(contado)
  const diferenca = produto ? Math.round((n - produto.estoque) * 10000) / 10000 : 0
  const valido = !!produto && contado.trim() !== "" && n >= 0 && diferenca !== 0 && !!motivo.trim()

  function confirmar() {
    if (!produto || !valido) return
    ajustarEstoque(produto.id, n, motivo.trim())
    toast.success(`Estoque de ${produto.nome} ajustado para ${fmtNum(n)} ${produto.unidade}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajuste de inventário</DialogTitle>
          <DialogDescription>Digite quanto há de fato na prateleira. A diferença vira uma movimentação de ajuste.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Produto" className="space-y-1.5 sm:col-span-2">
            <SeletorProduto produtos={produtos} valor={produtoId} onChange={escolherProduto} />
          </Campo>
          <Campo rotulo="Quantidade contada">
            <NumberInput value={contado} onChange={setContado} suffix={produto?.unidade} />
          </Campo>
          <div className="space-y-1.5">
            <Label>Diferença</Label>
            <p className="flex h-9 items-center text-sm font-bold tabular-nums">
              {produto ? `${diferenca > 0 ? "+" : ""}${fmtNum(diferenca, 4)} ${produto.unidade}` : "—"}
              {produto && diferenca !== 0 && (
                <span className="ml-2 font-normal text-muted-foreground">({formatPrice(Math.round(Math.abs(diferenca) * produto.custoCents))} a custo)</span>
              )}
            </p>
          </div>
          <Campo rotulo="Motivo" className="space-y-1.5 sm:col-span-2">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
        </div>
        {produto && <p className="text-xs text-muted-foreground">No sistema: {fmtNum(produto.estoque, 4)} {produto.unidade}.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!valido}>
            Ajustar estoque
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DialogoPerda({ aberto, onOpenChange, produtoInicial }: PropsDialogo) {
  const produtos = useDemo((s) => s.produtos)
  const registrarPerda = useDemo((s) => s.registrarPerda)
  const [produtoId, setProdutoId] = React.useState("")
  const [qtd, setQtd] = React.useState("")
  const [motivo, setMotivo] = React.useState("")

  React.useEffect(() => {
    if (!aberto) return
    setProdutoId(produtos.some((x) => x.id === produtoInicial) ? produtoInicial! : "")
    setQtd("")
    setMotivo("")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reabrir zera o diálogo
  }, [aberto, produtoInicial])

  const produto = produtos.find((x) => x.id === produtoId)
  const n = campoParaQtd(qtd)
  const excede = !!produto && n > produto.estoque + 0.0001
  const valido = !!produto && n > 0 && !excede && !!motivo.trim()

  function confirmar() {
    if (!produto || !valido) return
    registrarPerda(produto.id, n, motivo.trim())
    toast.success(`Perda de ${fmtNum(n)} ${produto.unidade} registrada`)
    onOpenChange(false)
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Perda / quebra</DialogTitle>
          <DialogDescription>Garrafa quebrada, produto vencido, barril que perdeu pressão. Sai do estoque e entra no relatório de perdas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Produto" className="space-y-1.5 sm:col-span-2">
            <SeletorProduto produtos={produtos} valor={produtoId} onChange={setProdutoId} />
          </Campo>
          <Campo rotulo="Quantidade perdida">
            <NumberInput value={qtd} onChange={setQtd} suffix={produto?.unidade} error={excede} />
          </Campo>
          <div className="space-y-1.5">
            <Label>Prejuízo a custo</Label>
            <p className="flex h-9 items-center text-sm font-bold tabular-nums">{produto && n > 0 ? formatPrice(Math.round(n * produto.custoCents)) : "—"}</p>
          </div>
          <Campo rotulo="Motivo" className="space-y-1.5 sm:col-span-2">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: 2 garrafas quebradas na reposição" />
          </Campo>
        </div>
        {excede && (
          <p className="text-sm text-destructive">
            Só há {fmtNum(produto!.estoque, 4)} {produto!.unidade} no estoque.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!valido}>
            Registrar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type TipoDialogo = "entrada" | "ajuste" | "perda"

/** Os três diálogos de uma vez — a tela só guarda qual está aberto e para qual produto. */
export function DialogosEstoque({
  aberto,
  produtoId,
  onClose,
}: {
  aberto: TipoDialogo | null
  produtoId?: string
  onClose: () => void
}) {
  const fechar = (v: boolean) => !v && onClose()
  return (
    <>
      <DialogoEntrada aberto={aberto === "entrada"} onOpenChange={fechar} produtoInicial={produtoId} />
      <DialogoAjuste aberto={aberto === "ajuste"} onOpenChange={fechar} produtoInicial={produtoId} />
      <DialogoPerda aberto={aberto === "perda"} onOpenChange={fechar} produtoInicial={produtoId} />
    </>
  )
}
