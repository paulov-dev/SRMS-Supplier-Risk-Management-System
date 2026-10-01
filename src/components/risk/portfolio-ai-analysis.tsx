"use client"

import { useState } from "react"

import {
    SupplierAIAnalysis,
} from "@/components/suppliers/supplier-ai-analysis"

export function PortfolioAIAnalysis() {
    const [scope, setScope] = useState("all")

    return (
        <section
            aria-label="Análise de IA da carteira"
            className="space-y-3"
        >
            <label className="flex flex-wrap items-center gap-3 text-sm">
                Escopo da análise

                <select
                    value={scope}
                    onChange={(event) =>
                        setScope(event.target.value)
                    }
                    className="rounded-md border bg-background p-2"
                >
                    <option value="all">
                        Todas as RMs abertas da carteira
                    </option>

                    <option value="mine">
                        Somente as RMs abertas atribuídas a mim
                    </option>
                </select>
            </label>

            <SupplierAIAnalysis
                key={scope}
                endpoint={`/api/risk/ai-analysis?scope=${scope}`}
                title="Visão geral das RMs abertas por IA"
                description="A análise inclui os indicadores resumidos de todas as RMs abertas e de todos os fornecedores do escopo escolhido, sem corte por quantidade e independentemente dos filtros e da página da listagem. Ao gerar, indicadores são enviados à OpenAI, sem nomes, contatos ou descrições livres. Nenhum registro é alterado."
            />
        </section>
    )
}