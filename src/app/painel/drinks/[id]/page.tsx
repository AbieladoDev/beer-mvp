"use client"

import { useParams } from "next/navigation"
import { DrinkDetalhe } from "@/components/drinks/drink-detalhe"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <DrinkDetalhe id={id} />
}
