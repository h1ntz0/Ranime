import crypto from 'node:crypto'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { passwordResetTokens, users, type User } from '../../database/schema.js'
import { AppError, unauthorized } from '../../lib/errors.js'
import type { EmailSender } from '../../services/email.service.js'

export interface AuthTokens {
  sign(userId: string): string
}

export class AuthService {
  private db: NodePgDatabase<Record<string, unknown>>
  private emailService?: EmailSender

  constructor(
    private options: {
      pool: Pool
      db?: NodePgDatabase<Record<string, unknown>>
      jwtSecret: string
      tokenTtl: string
      emailService?: EmailSender
    },
  ) {
    this.db = options.db ?? drizzle(options.pool)
    this.emailService = options.emailService
  }

  async register(input: { username: string; email: string; password: string }): Promise<User> {
    const username = input.username.trim()
    const email = input.email.trim().toLowerCase()

    const existing = await this.db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))

    const hasUsername = existing.some((u) => u.username === username)
    const hasEmail = existing.some((u) => u.email === email)
    if (hasUsername || hasEmail) {
      throw new AppError(409, 'CONFLICT', 'Username or email already registered')
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id })
    const isAdminEmail = email === 'arrofi.zein12@gmail.com'
    const [row] = await this.db
      .insert(users)
      .values({ username, email, passwordHash, role: isAdminEmail ? 'ADMIN' : 'USER' })
      .returning()
    return row!
  }

  async login(email: string, password: string): Promise<User> {
    const user = (
      await this.db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
    )[0]
    if (!user) throw unauthorized('Invalid email or password')

    let valid = false
    if (user.passwordHash) {
      try {
        valid = await argon2.verify(user.passwordHash, password)
      } catch {
        valid = false
      }
    }
    if (!valid) throw unauthorized('Invalid email or password')

    return user
  }

  async findOrCreateGoogleUser(googleUser: {
    googleId: string
    email: string
    name?: string
    avatarUrl?: string
  }): Promise<User> {
    const email = googleUser.email.trim().toLowerCase()
    const isAdminEmail = email === 'arrofi.zein12@gmail.com'

    const [byGoogleId] = await this.db
      .select()
      .from(users)
      .where(eq(users.googleId, googleUser.googleId))

    if (byGoogleId) {
      const updates: Partial<typeof users.$inferInsert> = {}
      if (googleUser.avatarUrl && !byGoogleId.avatarUrl) updates.avatarUrl = googleUser.avatarUrl
      if (isAdminEmail && byGoogleId.role !== 'ADMIN') updates.role = 'ADMIN'

      if (Object.keys(updates).length > 0) {
        const [updated] = await this.db
          .update(users)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(users.id, byGoogleId.id))
          .returning()
        return updated ?? byGoogleId
      }
      return byGoogleId
    }

    const [byEmail] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))

    if (byEmail) {
      const [updated] = await this.db
        .update(users)
        .set({
          googleId: googleUser.googleId,
          avatarUrl: byEmail.avatarUrl ?? googleUser.avatarUrl,
          role: isAdminEmail ? 'ADMIN' : byEmail.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail.id))
        .returning()
      return updated ?? byEmail
    }

    let baseUsername = (googleUser.name || email.split('@')[0] || 'user')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 24)
    if (baseUsername.length < 3) baseUsername = `user_${baseUsername}`.slice(0, 24)

    let username = baseUsername
    let counter = 1
    while (true) {
      const [existing] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
      if (!existing) break
      username = `${baseUsername.slice(0, 20)}_${counter++}`
    }

    const [created] = await this.db
      .insert(users)
      .values({
        username,
        email,
        googleId: googleUser.googleId,
        role: isAdminEmail ? 'ADMIN' : 'USER',
        avatarUrl: googleUser.avatarUrl,
      })
      .returning()
    return created!
  }

  async getUserById(id: string): Promise<User | undefined> {
    return (await this.db.select().from(users).where(eq(users.id, id)))[0]
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return (await this.db.select().from(users).where(eq(users.username, username)))[0]
  }

  signToken(user: User): string {
    return jwt.sign({ sub: user.id }, this.options.jwtSecret, {
      expiresIn: this.options.tokenTtl,
    } as jwt.SignOptions)
  }

  verifyToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, this.options.jwtSecret) as { sub?: string }
      return payload.sub ?? null
    } catch {
      return null
    }
  }

  async requestPasswordResetOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase()
    const [user] = await this.db.select().from(users).where(eq(users.email, cleanEmail))

    // Always return generic success to avoid email enumeration
    if (!user) {
      return { success: true, message: 'If that email exists, an OTP code has been sent.' }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    // Invalidate prior unused OTPs for this user
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)))

    await this.db.insert(passwordResetTokens).values({
      userId: user.id,
      email: cleanEmail,
      otpHash,
      expiresAt,
    })

    if (this.emailService && 'sendPasswordResetOtp' in this.emailService) {
      await (this.emailService as any).sendPasswordResetOtp(cleanEmail, otp)
    }

    return { success: true, message: 'If that email exists, an OTP code has been sent.' }
  }

  async verifyPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<{ resetToken: string }> {
    const cleanEmail = email.trim().toLowerCase()
    const otpHash = crypto.createHash('sha256').update(otp.trim()).digest('hex')
    const now = new Date()

    const [tokenRow] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.email, cleanEmail),
          eq(passwordResetTokens.otpHash, otpHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1)

    if (!tokenRow) {
      throw new AppError(400, 'INVALID_OTP', 'Invalid or expired verification code')
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    await this.db
      .update(passwordResetTokens)
      .set({ resetToken })
      .where(eq(passwordResetTokens.id, tokenRow.id))

    return { resetToken }
  }

  async resetPasswordWithToken(input: {
    resetToken: string
    newPassword: string
  }): Promise<{ success: boolean }> {
    const now = new Date()
    const [tokenRow] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.resetToken, input.resetToken),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1)

    if (!tokenRow) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid or expired reset session')
    }

    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id })

    await this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, tokenRow.userId))

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, tokenRow.id))
    })

    return { success: true }
  }
}
