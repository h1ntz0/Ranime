import type { Env } from '../config/env.js'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailSender {
  sendEmail(options: SendEmailOptions): Promise<boolean>
}

export class EmailService implements EmailSender {
  constructor(private env: Env) {}

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject, html, text } = options

    if (this.env.RESEND_API_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.env.SMTP_FROM,
            to: [to],
            subject,
            html,
            text,
          }),
        })
        if (!res.ok) {
          const err = await res.text()
          console.error('[EmailService] Resend API error:', res.status, err)
          return false
        }
        return true
      } catch (err) {
        console.error('[EmailService] Resend request failed:', err)
        return false
      }
    }

    if (this.env.NODE_ENV !== 'production') {
      console.log(`\n================== [DEV EMAIL] ==================`)
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`Content:\n${text || html}`)
      console.log(`=================================================\n`)
      return true
    }

    console.warn('[EmailService] No email provider (RESEND_API_KEY) configured.')
    return false
  }

  async sendPasswordResetOtp(to: string, otp: string): Promise<boolean> {
    const subject = `Kode Reset Password Ranime: ${otp}`
    const text = `Kode verifikasi reset password Ranime Anda adalah: ${otp}\n\nKode ini berlaku selama 15 menit. Jika Anda tidak meminta reset password, abaikan email ini.`
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background-color: #0f1117; color: #e2e8f0; border-radius: 12px; border: 1px solid #1e2433;">
        <h2 style="margin-top: 0; color: #f8fafc; font-size: 20px; font-weight: 600;">Reset Password Ranime</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          Kami menerima permintaan untuk mereset kata sandi akun Anda. Gunakan kode OTP 6 digit berikut:
        </p>
        <div style="background-color: #161b26; border: 1px solid #2d3748; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #38bdf8;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
          Kode ini berlaku selama 15 menit. Jangan bagikan kode ini kepada siapapun. Jika Anda tidak melakukan permintaan ini, abaikan email ini secara aman.
        </p>
      </div>
    `
    return this.sendEmail({ to, subject, text, html })
  }
}
