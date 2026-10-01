"use client"

import { useParams } from "next/navigation"
import { ProdutoForm } from "@/components/produtos/produto-form"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <ProdutoForm id={id} />
}
