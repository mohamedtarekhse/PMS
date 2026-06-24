import { Hono } from 'hono'
import type { Env } from '../utils/helpers'
import { requireAuth, requireRole } from '../middleware/auth'

const alerts = new Hono<{ Bindings: Env }>()

alerts.use('/*', requireAuth, requireRole('manager', 'coordinator'))

alerts.get('/', async (c) => {
  try {
    const unreadOnly = c.req.query('unreadOnly')

    let sql = `
      SELECT a.*, u.full_name as assigned_to_name
      FROM alerts a
      LEFT JOIN users u ON a.assigned_to = u.id
    `
    const bindValues: any[] = []

    if (unreadOnly === 'true') {
      sql += ' WHERE a.is_read = 0'
    }

    sql += ' ORDER BY a.created_at DESC'

    const result = await c.env.DB.prepare(sql).bind(...bindValues).all()

    return c.json({ data: result.results || [] })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch alerts' }, 500)
  }
})

alerts.put('/:id/read', async (c) => {
  try {
    const id = c.req.param('id')

    const existing = await c.env.DB.prepare(
      'SELECT id FROM alerts WHERE id = ?'
    ).bind(id).first()

    if (!existing) {
      return c.json({ error: 'Alert not found' }, 404)
    }

    await c.env.DB.prepare(
      'UPDATE alerts SET is_read = 1 WHERE id = ?'
    ).bind(id).run()

    return c.json({ data: { success: true } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to mark alert as read' }, 500)
  }
})

alerts.put('/read-all', async (c) => {
  try {
    await c.env.DB.prepare('UPDATE alerts SET is_read = 1 WHERE is_read = 0').run()
    return c.json({ data: { success: true } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to mark all alerts as read' }, 500)
  }
})

alerts.get('/count', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT COUNT(*) as unread FROM alerts WHERE is_read = 0'
    ).first() as any

    return c.json({ data: { unread: result?.unread || 0 } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch alert count' }, 500)
  }
})

export default alerts
