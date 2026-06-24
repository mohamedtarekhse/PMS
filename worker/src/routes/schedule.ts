import { Hono } from 'hono'
import type { Env } from '../utils/helpers'
import { requireAuth, requireRole } from '../middleware/auth'
import { calculateAllDueDates } from '../services/scheduler'

const schedule = new Hono<{ Bindings: Env }>()

schedule.use('/*', requireAuth, requireRole('coordinator', 'manager'))

schedule.get('/', async (c) => {
  try {
    const range = parseInt(c.req.query('range') || '30')

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + range)
    const futureStr = futureDate.toISOString().replace('T', ' ').slice(0, 19)

    const result = await c.env.DB.prepare(`
      SELECT es.*, e.equipment_name, e.equipment_name_ar, e.model, e.make, e.serial_number,
             f.name as frequency_name, f.name_ar as frequency_name_ar, f.type as frequency_type,
             f.interval_days, f.interval_hours
      FROM equipment_schedules es
      JOIN equipment e ON es.equipment_id = e.id
      JOIN frequencies f ON es.frequency_id = f.id
      WHERE es.is_active = 1
        AND e.is_active = 1
        AND es.next_due_date IS NOT NULL
        AND es.next_due_date BETWEEN ? AND ?
      ORDER BY es.next_due_date ASC
    `).bind(now, futureStr).all()

    return c.json({ data: result.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch schedule' }, 500)
  }
})

schedule.get('/overdue', async (c) => {
  try {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    const result = await c.env.DB.prepare(`
      SELECT es.*, e.equipment_name, e.equipment_name_ar, e.model, e.make, e.serial_number,
             f.name as frequency_name, f.name_ar as frequency_name_ar, f.type as frequency_type,
             f.interval_days, f.interval_hours
      FROM equipment_schedules es
      JOIN equipment e ON es.equipment_id = e.id
      JOIN frequencies f ON es.frequency_id = f.id
      WHERE es.is_active = 1
        AND e.is_active = 1
        AND es.next_due_date IS NOT NULL
        AND es.next_due_date < ?
      ORDER BY es.next_due_date ASC
    `).bind(now).all()

    return c.json({ data: result.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch overdue schedule' }, 500)
  }
})

schedule.post('/calculate', async (c) => {
  try {
    const count = await calculateAllDueDates(c.env)
    return c.json({ data: { updatedCount: count } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to recalculate due dates' }, 500)
  }
})

export default schedule
