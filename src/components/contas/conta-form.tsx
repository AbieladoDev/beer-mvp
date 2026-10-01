"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bloco, CampoEmpilhado, FORM_MOLDE, FormFooter, Interruptor } from "@/components/common/form-layout"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Guard, NaoEncontrado, campoParaCents, centsParaCampo } from "@/components/apae/comum"
import { dataISO, hoje } from "@/lib/datas"
import { TIPO, rotuloForma, useContas, type FormaConta, type TipoConta } from "./tipo-conta"

export function ContaForm({ tipo, id }: { tipo: TipoConta; id?: string }) {
  const t = TIPO[tipo]
  return (
    <Guard permissao="financeiro.editar" titulo={id ? "Editar conta" : t.nova}>
      <Formulario tipo={tipo} id={id} />
    </Guard>
  )
}

function Formulario({ tipo, id }: { tipo: TipoConta; id?: string }) {
  const t = TIPO[tipo]
  const router = useRouter()
  const { lista, salvar } = useContas(tipo)
  const existente = id ? lista.find((c) => c.id === id) : undefined

  const [descricao, setDescricao] = React.useState(existente?.descricao ?? "")
  const [valor, setValor] = React.useState(centsParaCampo(existente?.valorCents))
  const [contraparte, setContraparte] = React.useState(existente?.contraparte ?? "")
  const [classe, setClasse] = React.useState(existente?.classe ?? "")
  const [observacoes, setObservacoes] = React.useState(existente?.observacoes ?? "")
  const [vencimento, setVencimento] = React.useState(existente?.vencimento ?? "")
  const [jaQuitada, setJaQuitada] = React.useState(false)
  const [quitadoEm, setQuitadoEm] = React.useState(hoje())
  const [forma, setForma] = React.useState<FormaConta>(existente?.forma ?? "pix")
  const [erros, setErros] = React.useState<Record<string, string>>({})

  // Sugestões de contraparte: quem já aparece nas contas deste tipo.
  const contrapartes = React.useMemo(() => [...new Set(lista.map((c) => c.contraparte).filter(Boolean))].sort(), [lista])

  if (id && !existente) return <NaoEncontrado titulo="Editar conta" voltar={t.base} />

  function validar() {
    const e: Record<string, string> = {}
    if (!descricao.trim()) e.descricao = "Diga do que é a conta."
    if (campoParaCents(valor) <= 0) e.valor = "Informe o valor."
    if (!vencimento) e.vencimento = tipo === "pagar" ? "Informe o vencimento." : "Informe a data prevista."
    if (!classe) e.classe = `Escolha ${tipo === "pagar" ? "a categoria" : "a origem"}.`
    setErros(e)
    return Object.keys(e).length === 0
  }

  function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validar()) {
      toast.error("Faltam informações — veja os campos marcados.")
      return
    }
    const quitada = existente ? existente.quitadoEm : jaQuitada ? quitadoEm : undefined
    const novoId = salvar({
      id,
      descricao: descricao.trim(),
      valorCents: campoParaCents(valor),
      vencimento,
      classe,
      contraparte: contraparte.trim(),
      quitadoEm: quitada,
      // Forma só faz sentido em conta quitada (ou que já tinha uma).
      forma: quitada || existente?.forma ? forma : undefined,
      observacoes,
      vendaId: existente?.vendaId,
      entradaId: existente?.entradaId,
    })
    toast.success(id ? "Conta atualizada" : tipo === "pagar" ? "Conta a pagar lançada" : "Conta a receber lançada")
    router.push(`${t.base}/${novoId}`)
  }

  const erro = (k: string) => erros[k] && <p className="text-xs text-destructive">{erros[k]}</p>

  return (
    <DashboardLayout
      title={id ? "Editar conta" : t.nova}
      description={id ? existente?.descricao : "Os campos com * são obrigatórios"}
      degrauExtra={id && existente ? { title: existente.descricao, url: `${t.base}/${id}` } : undefined}
    >
      <form onSubmit={enviar} className={FORM_MOLDE}>
        <div className="grid flex-1 bg-card md:grid-cols-2 md:divide-x">
          <div className="space-y-8 px-4 py-6 md:px-6">
            <Bloco titulo={tipo === "pagar" ? "A conta" : "O recebimento"} descricao={tipo === "pagar" ? "O que é, quanto custa e para quem." : "O que entra, quanto e de quem."}>
              {existente?.vendaId && (
                <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
                  Esta conta foi gerada por uma venda do PDV. Alterar o valor aqui não altera a venda.
                </p>
              )}
              <CampoEmpilhado label="Descrição" required largo>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder={tipo === "pagar" ? "Ex.: Energia elétrica de outubro" : "Ex.: Reserva aniversário — sexta"}
                  aria-invalid={!!erros.descricao}
                />
                {erro("descricao")}
              </CampoEmpilhado>
              <CampoEmpilhado label="Valor" required>
                <CurrencyInput value={valor} onChange={setValor} error={!!erros.valor} />
                {erro("valor")}
              </CampoEmpilhado>
              <CampoEmpilhado label={t.classeRotulo} required>
                <Select value={classe} onValueChange={setClasse}>
                  <SelectTrigger className="w-full" aria-invalid={!!erros.classe}>
                    <SelectValue placeholder={tipo === "pagar" ? "Escolha a categoria" : "Escolha a origem"} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(t.classes).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {erro("classe")}
              </CampoEmpilhado>
              <CampoEmpilhado label={t.contraparteRotulo} largo>
                <Input value={contraparte} onChange={(e) => setContraparte(e.target.value)} placeholder={t.contrapartePlaceholder} list="contrapartes" />
                <datalist id="contrapartes">
                  {contrapartes.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </CampoEmpilhado>
              <CampoEmpilhado label="Observações" largo>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} placeholder="Número da nota, combinado com o fornecedor…" />
              </CampoEmpilhado>
            </Bloco>
          </div>

          <div className="space-y-8 border-t px-4 py-6 md:border-t-0 md:px-6">
            <Bloco titulo="Quando" descricao={tipo === "pagar" ? "O vencimento é o que entra no fluxo de caixa previsto." : "A data prevista é quando o dinheiro deve cair."}>
              <CampoEmpilhado label={tipo === "pagar" ? "Vencimento" : "Data prevista"} required>
                <DatePicker value={vencimento} onChange={(d) => setVencimento(d ? dataISO(d) : "")} error={!!erros.vencimento} />
                {erro("vencimento")}
              </CampoEmpilhado>
              <CampoEmpilhado label="Forma">
                <Select value={forma} onValueChange={(v) => setForma(v as FormaConta)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {t.formas.map((v) => (
                      <SelectItem key={v} value={v}>
                        {rotuloForma(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CampoEmpilhado>

              {!id && (
                <Interruptor
                  rotulo={tipo === "pagar" ? "Já foi paga?" : "Já foi recebida?"}
                  descricao="Para lançar algo que já aconteceu."
                  marcado={jaQuitada}
                  onMarcar={setJaQuitada}
                >
                  <CampoEmpilhado label={t.quitadoEm}>
                    <DatePicker value={quitadoEm} onChange={(d) => d && setQuitadoEm(dataISO(d))} />
                  </CampoEmpilhado>
                </Interruptor>
              )}
            </Bloco>
          </div>
        </div>
        <FormFooter submitLabel={id ? "Salvar alterações" : t.lancar} onCancel={() => router.back()} />
      </form>
    </DashboardLayout>
  )
}
