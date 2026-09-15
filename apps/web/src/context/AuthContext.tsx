import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../lib/types'
import { login as apiLogin, logout as apiLogout, fetchMe, register as apiRegister } from '../lib/api'

const USER_STORAGE_KEY = 'ranime_user_session'

/**
 * Cached profile used for the first paint only. It is deliberately not authoritative: `loading`
 * always starts true so the server confirms the session before any protected route renders, and
 * only display fields are cached — `role` and `email` never are, so a forged entry in storage
 * cannot drive an authorization decision.
 */
function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    const parsed: Record<string, unknown> = JSON.parse(raw)
    if (typeof parsed?.id !== 'string' || typeof parsed?.username !== 'string') return null
    return {
      id: parsed.id,
      username: parsed.username,
      email: '',
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : null,
      createdAt: '',
    }
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
  const [user, setUserState] = useState<User | null>(readCachedUser)
  const [loading, setLoading] = useState(true)

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser)
    try {
      if (newUser) {
        localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify({
            id: newUser.id,
            username: newUser.username,
            avatarUrl: newUser.avatarUrl,
          }),
        )
      } else {
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    } catch {
      // Ignore storage write errors in restricted contexts
    }
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
