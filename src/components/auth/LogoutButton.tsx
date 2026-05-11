'use client'

import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const { logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()

    router.push('/')
  }

  return (
    <Button
      variant="destructive"
      onClick={handleLogout}
    >
      Sair
    </Button>
  )
}