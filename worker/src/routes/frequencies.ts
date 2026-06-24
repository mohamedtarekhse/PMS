import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../utils/helpers'
import { requireAuth, requireRole } from '../middleware/auth'

const frequencies = new Hono<{ Bindings: Env }>()

frequencies.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM frequencies WHERE is_active = 1 ORDER BY sort_order ASC'
    ).all()

    return c.json({ data: result.results })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch frequencies' }, 500)
  }
})

frequencies.use('/*', requireAuth)

const createSchema = z.object({
  name: z.string().min(1).max(100),
  nameAr: z.string().optional(),
  type: z.enum(['calendar', 'hourly', 'custom']).default('custom'),
  intervalDays: z.number().int().min(0).optional(),
  intervalHours: z.number().int().min(0).optional(),
})

frequencies.post('/', requireRole('coordinator', 'manager'), zValidator('json', createSchema), async (c) => {
  try {
    const { name, nameAr, type, intervalDays, intervalHours } = c.req.valid('json')

    const result = await c.env.DB.prepare(
      `INSERT INTO frequencies (name, name_ar, type, interval_days, interval_hours, sort_order)
       VALUES (?, ?, ?, ?, ?, 99)`
    ).bind(name, nameAr || null, type, intervalDays || null, intervalHours || null).run()

    return c.json({ data: { id: result.meta.last_row_id } }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create frequency' }, 500)
  }
})

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().optional(),
  intervalDays: z.number().int().min(0).optional(),
  intervalHours: z.number().int().min(0).optional(),
  isActive: z.union([z.literal(0), z.literal(1)]).optional(),
})

frequencies.put('/:id', requireRole('coordinator', 'manager'), zValidator('json', updateSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const updates = c.req.valid('json')

    const existing = await c.env.DB.prepare(
      'SELECT id FROM frequencies WHERE id = ?'
    ).bind(id).first()

    if (!existing) {
      return c.json({ error: 'Frequency not found' }, 404)
    }

    const setClauses: string[] = []
    const bindValues: any[] = []

    if (updates.name !== undefined) { setClauses.push('name = ?'); bindValues.push(updates.name) }
    if (updates.nameAr !== undefined) { setClauses.push('name_ar = ?'); bindValues.push(updates.nameAr) }
    if (updates.intervalDays !== undefined) { setClauses.push('interval_days = ?'); bindValues.push(updates.intervalDays) }
    if (updates.intervalHours !== undefined) { setClauses.push('interval_hours = ?'); bindValues.push(updates.intervalHours) }
    if (updates.isActive !== undefined) { setClauses.push('is_active = ?'); bindValues.push(updates.isActive) }

    if (setClauses.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    bindValues.push(id)

    await c.env.DB.prepare(
      `UPDATE frequencies SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...bindValues).run()

    return c.json({ data: { success: true } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update frequency' }, 500)
  }
})

export default frequencies
