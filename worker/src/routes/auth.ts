import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../utils/helpers'
import { generateToken, hashPassword, comparePassword, generateInviteToken } from '../utils/helpers'
import { requireAuth, requireRole, getUser } from '../middleware/auth'

const auth = new Hono<{ Bindings: Env }>()

const registerSchema = z.object({
  token: z.string().min(1),
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  fullName: z.string().min(1).max(100),
  preferredLang: z.enum(['en', 'ar']).default('en'),
})

const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1),
}).refine(d => d.email || d.username, { message: 'Email or username is required' })

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['technician', 'coordinator', 'manager']),
  fullName: z.string().min(1).max(100),
})

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  preferredLang: z.enum(['en', 'ar']).optional(),
})

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { token, username, password, fullName, preferredLang } = c.req.valid('json')

    const invite = await c.env.DB.prepare(
      'SELECT * FROM invitations WHERE token = ? AND used_at IS NULL AND expires_at > datetime(\'now\')'
    ).bind(token).first() as any

    if (!invite) {
      return c.json({ error: 'Invalid or expired invitation token' }, 400)
    }

    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? OR username = ?'
    ).bind(invite.email, username).first()

    if (existingUser) {
      return c.json({ error: 'Email or username already registered' }, 409)
    }

    const passwordHash = await hashPassword(password)

    const userResult = await c.env.DB.prepare(
      `INSERT INTO users (username, email, password_hash, role, full_name, preferred_lang, invite_token, invite_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      username, invite.email, passwordHash, invite.role, fullName, preferredLang,
      token, invite.expires_at
    ).run()

    const userId = userResult.meta.last_row_id as number

    await c.env.DB.prepare(
      'UPDATE invitations SET used_at = datetime(\'now\') WHERE id = ?'
    ).bind(invite.id).run()

    const jwt = generateToken(
      { id: userId, role: invite.role, email: invite.email, fullName },
      c.env.JWT_SECRET
    )

    return c.json({
      data: {
        token: jwt,
        user: { id: userId, username, email: invite.email, role: invite.role, fullName, preferredLang },
      },
    }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Registration failed' }, 500)
  }
})

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, username, password } = c.req.valid('json')

    const user = await c.env.DB.prepare(
      email
        ? 'SELECT * FROM users WHERE email = ? AND is_active = 1'
        : 'SELECT * FROM users WHERE username = ? AND is_active = 1'
    ).bind(email || username!).first() as any

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const valid = await comparePassword(password, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const jwt = generateToken(
      { id: user.id, role: user.role, email: user.email, fullName: user.full_name },
      c.env.JWT_SECRET
    )

    return c.json({
      data: {
        token: jwt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
          preferredLang: user.preferred_lang,
        },
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500)
  }
})

auth.use('/*', requireAuth)

auth.post('/invite', requireRole('manager'), zValidator('json', inviteSchema), async (c) => {
  try {
    const { email, role, fullName } = c.req.valid('json')
    const currentUser = getUser(c)!

    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first()

    if (existing) {
      return c.json({ error: 'User with this email already exists' }, 409)
    }

    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await c.env.DB.prepare(
      `INSERT INTO invitations (email, role, full_name, token, expires_at, invited_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(email, role, fullName, token, expiresAt.toISOString().replace('T', ' ').slice(0, 19), currentUser.id).run()

    const inviteLink = `${c.env.APP_URL}/register?token=${token}`

    return c.json({ data: { inviteLink, token, email, role, fullName, expiresAt } }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create invitation' }, 500)
  }
})

auth.get('/me', async (c) => {
  try {
    const currentUser = getUser(c)!
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, role, full_name, preferred_lang, is_active, created_at FROM users WHERE id = ?'
    ).bind(currentUser.id).first() as any

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        preferredLang: user.preferred_lang,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch user' }, 500)
  }
})

auth.get('/users', requireRole('manager', 'coordinator'), async (c) => {
  try {
    const users = await c.env.DB.prepare(
      'SELECT id, username, email, role, full_name, preferred_lang, is_active, created_at FROM users ORDER BY full_name ASC'
    ).all()

    return c.json({ data: users.results })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch users' }, 500)
  }
})

auth.put('/me', zValidator('json', updateUserSchema), async (c) => {
  try {
    const currentUser = getUser(c)!
    const updates = c.req.valid('json')

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    const setClauses: string[] = []
    const bindValues: any[] = []

    if (updates.fullName) {
      setClauses.push('full_name = ?')
      bindValues.push(updates.fullName)
    }
    if (updates.preferredLang) {
      setClauses.push('preferred_lang = ?')
      bindValues.push(updates.preferredLang)
    }

    setClauses.push("updated_at = datetime('now')")
    bindValues.push(currentUser.id)

    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...bindValues).run()

    return c.json({ data: { success: true } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update user' }, 500)
  }
})

export default auth
