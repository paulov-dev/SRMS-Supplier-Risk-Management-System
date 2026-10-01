"use client"

import { useState } from "react"

import {
    SupplierAIAnalysis,
} from "@/components/suppliers/supplier-ai-analysis"

export function PNAIAnalysis() {
    const [scope, setScope] = useState("mine")

    const description =
        (
            scope === "all"
                ? "Inclui todos os PNs cadastrados, mesmo sem RM. PN sem RM é uma situação normal. "
                : "Inclui cada PN que tenha alguma RM atribuída a você ou algum vínculo PN–RM atribuído a você. Todos os vínculos desses PNs entram como contexto, inclusive de outros responsáveis. "
        ) +
        "Considera RMs abertas, encerradas e canceladas, sem limitar pela paginação ou filtros da listagem. Os dados são enviados à OpenAI. Todas as solicitações autenticadas são auditadas."

    return (
        <section
            aria-label="Análise por IA dos PNs"
            className="space-y-3"
        >

            <SupplierAIAnalysis
                key={scope}
                endpoint={`/api/part-numbers/ai-analysis?scope=${scope}`}
                title={
                    scope === "all"
                        ? "Análise de todos os PNs por IA"
                        : "Análise dos PNs ligados às minhas responsabilidades"
                }
                description={description}
            />
        </section>
    )
}