import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../lib/types'
import { login as apiLogin, logout as apiLogout, fetchMe, register as apiRegister } from '../lib/api'

const USER_STORAGE_KEY = 'ranime_user_session'

function getInitialUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

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
  const [user, setUserState] = useState<User | null>(getInitialUser)
  const [loading, setLoading] = useState(() => !getInitialUser())

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser)
    try {
      if (newUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
      } else {
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    } catch {}
  }, [])

  useEffect(() => {
    let active = true
    fetchMe()
      .then((u) => {
        if (active) {
          setUser(u)
        }
      })
      .catch(() => {
        if (active) {
          setUser(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [setUser])

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await apiLogin({ email, password })
      setUser(u)
      return u
    },
    [setUser],
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const u = await apiRegister({ username, email, password })
      setUser(u)
      return u
    },
    [setUser],
  )

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }, [setUser])

  const value = useMemo(
    () => ({ user, loading, setUser, login, register, logout }),
    [user, loading, setUser, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
