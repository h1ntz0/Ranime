import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../lib/types'
import { login as apiLogin, logout as apiLogout, fetchMe, register as apiRegister } from '../lib/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<User>
  register: (username: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useMemo(() => {
    let active = true
    fetchMe()
      .then((u) => {
        if (active) setUser(u)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin({ email, password })
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const u = await apiRegister({ username, email, password })
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, setUser, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
