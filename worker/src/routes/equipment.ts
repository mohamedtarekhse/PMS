import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../utils/helpers'
import { requireAuth, requireRole } from '../middleware/auth'

const equipment = new Hono<{ Bindings: Env }>()

equipment.use('/*', requireAuth)

equipment.get('/', async (c) => {
  try {
    const status = c.req.query('status')
    const templateId = c.req.query('templateId')
    const search = c.req.query('search')

    let sql = `
      SELECT e.id, e.template_id, e.equipment_name, e.equipment_name_ar,
             e.model, e.make, e.serial_number, e.location, e.is_active,
             e.created_at, e.updated_at,
             t.name as template_name,
             MIN(es.next_due_date) as earliest_due_date,
             MAX(es.last_pm_date) as latest_pm_date,
             COUNT(es.id) as schedule_count,
             (SELECT overall_status FROM pm_records WHERE equipment_id = e.id ORDER BY submitted_at DESC LIMIT 1) as last_overall_status
      FROM equipment e
      JOIN templates t ON e.template_id = t.id
      LEFT JOIN equipment_schedules es ON e.id = es.equipment_id AND es.is_active = 1
      WHERE e.is_active = 1
    `
    const bindValues: any[] = []

    if (templateId) {
      sql += ' AND e.template_id = ?'
      bindValues.push(templateId)
    }

    if (search) {
      sql += ' AND (e.equipment_name LIKE ? OR e.model LIKE ? OR e.make LIKE ? OR e.serial_number LIKE ?)'
      const term = `%${search}%`
      bindValues.push(term, term, term, term)
    }

    sql += ' GROUP BY e.id ORDER BY e.equipment_name ASC'

    const result = await c.env.DB.prepare(sql).bind(...bindValues).all()

    let data = (result.results || []).map((r: any) => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      const dueDate = r.earliest_due_date
      let pmStatus = 'ok'
      if (dueDate) {
        if (dueDate < now) {
          pmStatus = 'overdue'
        } else {
          const sevenDaysLater = new Date()
          sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
          const sevenDaysStr = sevenDaysLater.toISOString().replace('T', ' ').slice(0, 19)
          if (dueDate <= sevenDaysStr) {
            pmStatus = 'due'
          }
        }
      }

      return {
        id: r.id,
        templateId: r.template_id,
        equipmentName: r.equipment_name,
        equipmentNameAr: r.equipment_name_ar,
        model: r.model,
        make: r.make,
        serialNumber: r.serial_number,
        location: r.location,
        templateName: r.template_name,
        pmStatus,
        nextDueDate: r.earliest_due_date,
        lastPMDate: r.latest_pm_date,
        lastOverallStatus: r.last_overall_status,
        scheduleCount: r.schedule_count,
      }
    })

    if (status && ['overdue', 'due', 'ok'].includes(status)) {
      data = data.filter((d: any) => d.pmStatus === status)
    }

    return c.json({ data })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch equipment' }, 500)
  }
})

equipment.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const eq = await c.env.DB.prepare(`
      SELECT e.*, t.name as template_name,
             (SELECT overall_status FROM pm_records WHERE equipment_id = e.id ORDER BY submitted_at DESC LIMIT 1) as last_overall_status
      FROM equipment e
      JOIN templates t ON e.template_id = t.id
      WHERE e.id = ?
    `).bind(id).first() as any

    if (!eq) {
      return c.json({ error: 'Equipment not found' }, 404)
    }

    const templateTasks = await c.env.DB.prepare(`
      SELECT * FROM template_tasks WHERE template_id = ? ORDER BY sort_order ASC
    `).bind(eq.template_id).all()

    const schedules = await c.env.DB.prepare(`
      SELECT es.*, f.name as frequency_name, f.name_ar as frequency_name_ar, f.type as frequency_type,
             f.interval_days, f.interval_hours
      FROM equipment_schedules es
      JOIN frequencies f ON es.frequency_id = f.id
      WHERE es.equipment_id = ? AND es.is_active = 1
      ORDER BY f.sort_order ASC
    `).bind(id).all()

    const recentPMs = await c.env.DB.prepare(`
      SELECT pr.id, pr.submitted_at, pr.overall_status, u.full_name as submitted_by_name
      FROM pm_records pr
      JOIN users u ON pr.submitted_by = u.id
      WHERE pr.equipment_id = ?
      ORDER BY pr.submitted_at DESC
      LIMIT 5
    `).bind(id).all()

    return c.json({
      data: {
        id: eq.id,
        templateId: eq.template_id,
        templateName: eq.template_name,
        equipmentName: eq.equipment_name,
        equipmentNameAr: eq.equipment_name_ar,
        model: eq.model,
        make: eq.make,
        serialNumber: eq.serial_number,
        location: eq.location,
        isActive: eq.is_active,
        createdAt: eq.created_at,
        updatedAt: eq.updated_at,
        lastOverallStatus: eq.last_overall_status,
        templateTasks: templateTasks.results,
        schedules: schedules.results,
        recentPMs: recentPMs.results,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch equipment' }, 500)
  }
})

const createSchema = z.object({
  templateId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  nameAr: z.string().optional(),
  model: z.string().optional(),
  make: z.string().optional(),
  serialNumber: z.string().optional(),
  frequencies: z.array(z.object({
    frequencyId: z.number().int().positive(),
    customDescription: z.string().optional(),
  })).optional(),
})

equipment.post('/', requireRole('coordinator', 'manager'), zValidator('json', createSchema), async (c) => {
  try {
    const { templateId, name, nameAr, model, make, serialNumber, frequencies: freqs } = c.req.valid('json')

    const result = await c.env.DB.prepare(
      `INSERT INTO equipment (template_id, equipment_name, equipment_name_ar, model, make, serial_number)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(templateId, name, nameAr || null, model || null, make || null, serialNumber || null).run()

    const equipmentId = result.meta.last_row_id as number

    if (freqs && freqs.length > 0) {
      const insertStmt = c.env.DB.prepare(
        `INSERT INTO equipment_schedules (equipment_id, frequency_id, custom_description)
         VALUES (?, ?, ?)`
      )
      for (const f of freqs) {
        await insertStmt.bind(equipmentId, f.frequencyId, f.customDescription || null).run()
      }
    }

    return c.json({ data: { id: equipmentId } }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create equipment' }, 500)
  }
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().optional(),
  model: z.string().optional(),
  make: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  isActive: z.union([z.literal(0), z.literal(1)]).optional(),
})

equipment.put('/:id', requireRole('coordinator', 'manager'), zValidator('json', updateSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const updates = c.req.valid('json')

    const existing = await c.env.DB.prepare(
      'SELECT id FROM equipment WHERE id = ?'
    ).bind(id).first()

    if (!existing) {
      return c.json({ error: 'Equipment not found' }, 404)
    }

    const setClauses: string[] = []
    const bindValues: any[] = []

    if (updates.name !== undefined) { setClauses.push('equipment_name = ?'); bindValues.push(updates.name) }
    if (updates.nameAr !== undefined) { setClauses.push('equipment_name_ar = ?'); bindValues.push(updates.nameAr) }
    if (updates.model !== undefined) { setClauses.push('model = ?'); bindValues.push(updates.model) }
    if (updates.make !== undefined) { setClauses.push('make = ?'); bindValues.push(updates.make) }
    if (updates.serialNumber !== undefined) { setClauses.push('serial_number = ?'); bindValues.push(updates.serialNumber) }
    if (updates.location !== undefined) { setClauses.push('location = ?'); bindValues.push(updates.location) }
    if (updates.isActive !== undefined) { setClauses.push('is_active = ?'); bindValues.push(updates.isActive) }

    if (setClauses.length === 0) {
      return c.json({ error: 'No fields to update' }, 400)
    }

    setClauses.push("updated_at = datetime('now')")
    bindValues.push(id)

    await c.env.DB.prepare(
      `UPDATE equipment SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...bindValues).run()

    return c.json({ data: { success: true } })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update equipment' }, 500)
  }
})

const scheduleSchema = z.object({
  frequencies: z.array(z.object({
    frequencyId: z.number().int().positive(),
    customDescription: z.string().optional(),
  })),
})

equipment.post('/:id/schedules', requireRole('coordinator', 'manager'), zValidator('json', scheduleSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const { frequencies: freqs } = c.req.valid('json')

    const existing = await c.env.DB.prepare(
      'SELECT id FROM equipment WHERE id = ?'
    ).bind(id).first()

    if (!existing) {
      return c.json({ error: 'Equipment not found' }, 404)
    }

    const insertStmt = c.env.DB.prepare(
      `INSERT OR REPLACE INTO equipment_schedules (equipment_id, frequency_id, custom_description)
       VALUES (?, ?, ?)`
    )
    for (const f of freqs) {
      await insertStmt.bind(Number(id), f.frequencyId, f.customDescription || null).run()
    }

    return c.json({ data: { success: true } }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to assign schedules' }, 500)
  }
})

export default equipment
