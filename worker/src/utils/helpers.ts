import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { Context } from 'hono'

export interface Env {
  DB: D1Database
  JWT_SECRET: string
  RESEND_API_KEY: string
  MANAGER_EMAIL: string
  APP_URL: string
}

export function generateToken(user: { id: number; role: string; email: string; fullName: string }, secret: string): string {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, fullName: user.fullName },
    secret,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string, secret: string): any {
  return jwt.verify(token, secret)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateInviteToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function parsePagination(c: Context): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1)
  const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '20') || 20), 100)
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function getISTNow(): string {
  const now = new Date()
  return now.toISOString().replace('T', ' ').slice(0, 19)
}
