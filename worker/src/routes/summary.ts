import { Hono } from 'hono'
import type { Env } from '../utils/helpers'
import { requireAuth, requireRole } from '../middleware/auth'

const summary = new Hono<{ Bindings: Env }>()

summary.use('/*', requireAuth, requireRole('manager', 'coordinator'))

summary.get('/', async (c) => {
  try {
    const status = c.req.query('status')
    const dateFrom = c.req.query('dateFrom')
    const dateTo = c.req.query('dateTo')
    const equipmentId = c.req.query('equipmentId')

    let sql = `
      SELECT
        e.id as equipment_id,
        e.equipment_name,
        e.equipment_name_ar,
        e.model,
        e.make,
        e.serial_number,
        t.name as template_name,
        (SELECT pr.overall_status FROM pm_records pr WHERE pr.equipment_id = e.id ORDER BY pr.submitted_at DESC LIMIT 1) as last_pm_status,
        (SELECT pr.submitted_at FROM pm_records pr WHERE pr.equipment_id = e.id ORDER BY pr.submitted_at DESC LIMIT 1) as last_pm_date,
        (SELECT pr.id FROM pm_records pr WHERE pr.equipment_id = e.id ORDER BY pr.submitted_at DESC LIMIT 1) as last_pm_id,
        (SELECT COUNT(*) FROM pm_task_results ptr JOIN pm_records pr ON ptr.pm_record_id = pr.id WHERE pr.equipment_id = e.id AND ptr.flagged = 1) as flagged_items_count,
        (SELECT COUNT(*) FROM alerts a JOIN pm_records pr ON a.pm_record_id = pr.id WHERE pr.equipment_id = e.id) as alerts_count,
        (SELECT comment_text FROM pm_comments pc JOIN pm_records pr ON pc.pm_record_id = pr.id WHERE pr.equipment_id = e.id ORDER BY pc.created_at DESC LIMIT 1) as last_comment
      FROM equipment e
      JOIN templates t ON e.template_id = t.id
      WHERE e.is_active = 1
    `

    const bindValues: any[] = []

    if (status) {
      sql += ` AND (SELECT pr.overall_status FROM pm_records pr WHERE pr.equipment_id = e.id ORDER BY pr.submitted_at DESC LIMIT 1) = ?`
      bindValues.push(status)
    }

    if (dateFrom) {
      sql += ` AND (SELECT pr.submitted_at FROM pm_records pr WHERE pr.equipment_id = e.id ORDER BY pr.submitted_at DESC LIMIT 1) >= ?`
      bindValues.push(dateFrom)
    }

    if (dateTo) {
      sql += ` AND (SELECT pr.submitted_at FROM pm_records pr WHERE pr.equipment_id = e.id ORDER BY pr.submitted_at DESC LIMIT 1) <= ?`
      bindValues.push(dateTo + ' 23:59:59')
    }

    if (equipmentId) {
      sql += ' AND e.id = ?'
      bindValues.push(equipmentId)
    }

    sql += ' ORDER BY e.equipment_name ASC'

    const result = await c.env.DB.prepare(sql).bind(...bindValues).all()

    const data = (result.results || []).map((r: any) => ({
      equipmentId: r.equipment_id,
      equipmentName: r.equipment_name,
      equipmentNameAr: r.equipment_name_ar,
      model: r.model,
      make: r.make,
      serialNumber: r.serial_number,
      templateName: r.template_name,
      lastPMDate: r.last_pm_date,
      overallStatus: r.last_pm_status || 'pending',
      flaggedItemsCount: r.flagged_items_count || 0,
      issuesCount: r.alerts_count || 0,
      alertsCount: r.alerts_count || 0,
      lastComment: r.last_comment,
      lastPMId: r.last_pm_id,
    }))

    return c.json({ data })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch summary' }, 500)
  }
})

summary.get('/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId')

    const record = await c.env.DB.prepare(
      `SELECT pr.*, u.full_name as submitted_by_name, f.name as frequency_name,
              e.equipment_name, e.equipment_name_ar, e.model, e.make, e.serial_number,
              t.name as template_name
       FROM pm_records pr
       JOIN users u ON pr.submitted_by = u.id
       JOIN frequencies f ON pr.frequency_id = f.id
       JOIN equipment e ON pr.equipment_id = e.id
       JOIN templates t ON e.template_id = t.id
       WHERE pr.id = ?`
    ).bind(recordId).first() as any

    if (!record) {
      return c.json({ error: 'PM record not found' }, 404)
    }

    const taskResults = await c.env.DB.prepare(
      `SELECT ptr.*, tt.task_description, tt.task_description_ar, tt.task_type, tt.reading_unit, tt.item_number
       FROM pm_task_results ptr
       JOIN template_tasks tt ON ptr.template_task_id = tt.id
       WHERE ptr.pm_record_id = ?
       ORDER BY tt.sort_order ASC`
    ).bind(recordId).all()

    const comments = await c.env.DB.prepare(
      'SELECT * FROM pm_comments WHERE pm_record_id = ? ORDER BY created_at ASC'
    ).bind(recordId).all()

    const alerts = await c.env.DB.prepare(
      'SELECT * FROM alerts WHERE pm_record_id = ? ORDER BY created_at DESC'
    ).bind(recordId).all()

    const aiRecommendations: string[] = []
    for (const task of (taskResults.results || []) as any[]) {
      if (task.ai_evaluation) {
        try {
          const evalData = JSON.parse(task.ai_evaluation)
          if (evalData.severity !== 'ok') {
            aiRecommendations.push(`Task "${task.task_description}": ${evalData.reason}`)
          }
        } catch { }
      }
    }

    return c.json({
      data: {
        record,
        taskResults: taskResults.results,
        comments: comments.results,
        alerts: alerts.results,
        aiRecommendations,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch record detail' }, 500)
  }
})

export default summary
