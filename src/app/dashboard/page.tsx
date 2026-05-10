'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>
    </ProtectedRoute>
  )
}