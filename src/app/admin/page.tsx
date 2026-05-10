'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function AdminPage() {
  return (
    <ProtectedRoute permission="USER_MANAGE">
      <h1>Painel Admin</h1>
    </ProtectedRoute>
  )
}