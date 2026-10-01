"use client"

import { useParams } from "next/navigation"
import { DrinkForm } from "@/components/drinks/drink-form"

export default function Page() {
  const { id } = useParams<{ id: string }>()
  return <DrinkForm id={id} />
}
