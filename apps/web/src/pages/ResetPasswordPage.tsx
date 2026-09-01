import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { resetPassword } from '../lib/api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Token reset password tidak ditemukan atau tidak valid.')
      return
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password harus memiliki huruf besar, huruf kecil, angka, dan simbol.')
      return
    }
    if (/password/i.test(password)) {
      setError('Password tidak boleh mengandung kata "password".')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ resetToken: token, password })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset password.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Password Berhasil Diubah</h1>
        <p className="mt-2 text-sm text-ink-3">
          Kata sandi baru Anda telah aktif. Silakan masuk menggunakan kata sandi baru.
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate('/login')} className="w-full">
            Masuk ke Akun
          </Button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Sesi Tidak Valid</h1>
        <p className="mt-2 text-sm text-ink-3">
          Tautan reset password tidak valid atau sesi Anda telah kedaluwarsa.
        </p>
        <div className="mt-6">
          <Link to="/forgot-password">
            <Button className="w-full">Minta Kode Baru</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Buat Password Baru</h1>
      <p className="mt-1 text-sm text-ink-3">Masukkan kata sandi baru yang kuat untuk akun Anda.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Password Baru" htmlFor="new-password" hint="Min 8 karakter, kombinasi huruf besar, kecil, angka & simbol.">
          <Input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Konfirmasi Password Baru" htmlFor="confirm-new-password">
          <Input
            id="confirm-new-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Menyimpan password…' : 'Simpan Password Baru'}
        </Button>
      </form>
    </div>
  )
}
