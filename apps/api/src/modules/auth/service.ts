import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { users, type User } from '../../database/schema.js'
import { AppError, unauthorized } from '../../lib/errors.js'

export interface AuthTokens {
  sign(userId: string): string
}

export class AuthService {
  private db: NodePgDatabase<Record<string, unknown>>

  constructor(
    private options: {
      pool: Pool
      db?: NodePgDatabase<Record<string, unknown>>
      jwtSecret: string
      tokenTtl: string
    },
  ) {
    this.db = options.db ?? drizzle(options.pool)
  }

  async register(input: { username: string; email: string; password: string }): Promise<User> {
    const username = input.username.trim()
    const email = input.email.trim().toLowerCase()

    const existing = await this.db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(and(eq(users.username, username), eq(users.email, email)))

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
}
