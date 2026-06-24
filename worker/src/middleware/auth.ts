import { createMiddleware } from 'hono/factory'
import type { Env } from '../utils/helpers'
import { verifyToken } from '../utils/helpers'
import type { Context } from 'hono'

export interface UserPayload {
  id: number
  role: string
  email: string
  fullName: string
}

type AuthMiddleware = {
  Bindings: Env
  Variables: { user: UserPayload }
}

export const requireAuth = createMiddleware<AuthMiddleware>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authHeader.slice(7)
  try {
    const payload = verifyToken(token, c.env.JWT_SECRET) as UserPayload
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

export function requireRole(...roles: string[]) {
  return createMiddleware<AuthMiddleware>(async (c, next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden: insufficient permissions' }, 403)
    }
    await next()
  })
}

export function getUser(c: Context): UserPayload | undefined {
  return c.get('user') as UserPayload | undefined
}
