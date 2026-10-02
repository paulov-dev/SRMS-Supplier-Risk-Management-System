"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/contexts/AuthContext"
import { recentTarget } from "@/lib/home-data"

export function RecentAccessTracker() {
  const path = usePathname()
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId || !recentTarget(path)) return

    // Evita o efeito duplicado do Strict Mode
    // antes do envio.
    const timer = window.setTimeout(() => {
      fetch("/api/dashboard", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      })
        .then(async response => {
          if (!response.ok) {
            throw new Error(
              "Não foi possível registrar o acesso no histórico."
            )
          }
        })
        .catch(() => {
          toast.error(
            "Não foi possível registrar o acesso no histórico.",
            {
              id: "recent-access-error",
            }
          )
        })
    }, 100)

    return () => window.clearTimeout(timer)
  }, [path, userId])

  return null
}