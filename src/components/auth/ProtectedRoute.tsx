'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type Props = {
  children: React.ReactNode
  permission?: string
}

export function ProtectedRoute({
  children,
  permission,
}: Props) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Não autenticado
    if (!user) {
      router.push('/login')
      return
    }

    // Sem permissão
    if (
      permission &&
      !user.permissions.includes(permission)
    ) {
      router.push('/403')
    }
  }, [user, loading, permission, router])

  if (loading) {
    return <p>Carregando...</p>
  }

  if (!user) {
    return null
  }

  if (
    permission &&
    !user.permissions.includes(permission)
  ) {
    return null
  }

  return <>{children}</>
}