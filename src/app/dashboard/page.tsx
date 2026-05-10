'use client'

import { LogoutButton } from '@/components/auth/LogoutButton'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      <h1>Dashboard</h1>    

      <div>
        <h1>Bem-vindo, {user?.name}!</h1>
      </div>

      <LogoutButton /> 
      
    </ProtectedRoute>
  )
}