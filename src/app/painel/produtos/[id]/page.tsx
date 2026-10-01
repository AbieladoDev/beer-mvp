"use client"

import { useParams } from "next/navigation"
import { ProdutoDetalhe } from "@/components/produtos/produto-detalhe"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <ProdutoDetalhe id={id} />
}
