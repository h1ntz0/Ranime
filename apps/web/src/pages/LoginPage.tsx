import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const errParam = searchParams.get('error')
    if (errParam) {
      if (errParam === 'google_auth_failed') setError('Google authentication was cancelled or failed.')
      else if (errParam === 'google_auth_not_configured') setError('Google OAuth is not configured on the server.')
      else setError('Google sign-in failed. Please try again.')
    }
  }, [searchParams])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      const next = searchParams.get('next')
      const isSafeRedirect = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
      navigate(isSafeRedirect ? next : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Login</h1>
      <p className="mt-1 text-sm text-ink-3">Welcome back. Sign in to track your anime.</p>

      <div className="mt-6">
        <a
          href="/api/auth/google"
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-surface-3 bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.1C3.28 21.43 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.28 2.57 1.25 6.58l4.03 3.1c.95-2.83 3.6-4.93 6.72-4.93z"
            />
          </svg>
          Continue with Google
        </a>
      </div>

      <div className="relative my-6 flex items-center justify-center">
        <div className="w-full border-t border-surface-3" />
        <span className="bg-background px-3 text-xs uppercase tracking-wider text-ink-4">Or</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-3">
        No account yet?{' '}
        <Link to="/register" className="text-accent underline underline-offset-2 hover:text-accent-strong">
          Register
        </Link>
      </p>
    </div>
  )
}