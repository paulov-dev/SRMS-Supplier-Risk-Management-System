'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

type User = {
  id: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
}

type AuthContextType = {
  user: User | null
  loading: boolean

  refreshUser: () => Promise<void>
  logout: () => Promise<void>

  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
)

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    try {
      const res = await fetch('/api/me', {
        credentials: 'include',
      })

      if (!res.ok) {
        setUser(null)
        return
      }

      const data = await res.json()

      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    setUser(null)
  }

  function hasPermission(permission: string) {
    if (!user) return false

    return user.permissions.includes(permission)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}