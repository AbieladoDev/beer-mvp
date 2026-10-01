"use client"

import { useParams } from "next/navigation"
import { VendaDetalhe } from "@/components/vendas/venda-detalhe"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <VendaDetalhe id={id} />
}
