import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { requestForgotPasswordOtp, verifyForgotPasswordOtp } from '../lib/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Masukkan alamat email terdaftar.')
      return
    }
    setSubmitting(true)
    try {
      await requestForgotPasswordOtp(email.trim())
      setStep('verify')
      setInfo('Kode verifikasi 6 digit telah dikirim ke email Anda.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim kode reset')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (otp.trim().length !== 6) {
      setError('Kode verifikasi harus 6 digit angka.')
      return
    }
    setSubmitting(true)
    try {
      const res = await verifyForgotPasswordOtp({ email: email.trim(), otp: otp.trim() })
      navigate(`/reset-password?token=${encodeURIComponent(res.resetToken)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kode OTP tidak valid atau kedaluwarsa')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Login
        </Link>
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-ink">Lupa Password</h1>
      <p className="mt-1 text-sm text-ink-3">
        {step === 'request'
          ? 'Masukkan email akun Anda untuk menerima kode OTP reset password.'
          : `Masukkan kode 6 digit yang dikirim ke ${email}`}
      </p>

      {info ? (
        <div className="mt-4 rounded-sm border border-accent/20 bg-accent/10 p-3 text-xs text-accent-strong">
          {info}
        </div>
      ) : null}

      {step === 'request' ? (
        <form onSubmit={handleRequestOtp} className="mt-6 space-y-4" noValidate>
          <Field label="Alamat Email" htmlFor="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Mengirim kode…' : 'Kirim Kode OTP'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4" noValidate>
          <Field label="Kode OTP (6 Digit)" htmlFor="otp-code">
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoComplete="one-time-code"
              placeholder="123456"
              className="text-center font-mono tracking-widest text-lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Memverifikasi…' : 'Verifikasi & Lanjut'}
          </Button>
          <div className="flex justify-between items-center text-xs text-ink-3 mt-2">
            <button
              type="button"
              onClick={() => {
                setStep('request')
                setError('')
              }}
              className="hover:text-ink underline underline-offset-2"
            >
              Ganti email
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleRequestOtp}
              className="text-accent hover:text-accent-strong underline underline-offset-2"
            >
              Kirim ulang kode
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
