import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../utils/helpers'
import { parsePagination } from '../utils/helpers'
import { requireAuth, getUser } from '../middleware/auth'
import { analyzePM } from '../services/analysis'
import { processAlerts } from '../services/notifications'
import { updateDueDates } from '../services/scheduler'

const pm = new Hono<{ Bindings: Env }>()

pm.use('/*', requireAuth)

pm.get('/tasks/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')

    const eq = await c.env.DB.prepare(
      'SELECT id, template_id, equipment_name FROM equipment WHERE id = ? AND is_active = 1'
    ).bind(equipmentId).first() as any

    if (!eq) {
      return c.json({ error: 'Equipment not found' }, 404)
    }

    const tasks = await c.env.DB.prepare(
      `SELECT * FROM template_tasks WHERE template_id = ? ORDER BY sort_order ASC`
    ).bind(eq.template_id).all()

    const lastPM = await c.env.DB.prepare(
      'SELECT id FROM pm_records WHERE equipment_id = ? ORDER BY submitted_at DESC LIMIT 1'
    ).bind(equipmentId).first() as any

    let lastResults: any[] = []
    if (lastPM) {
      lastResults = (await c.env.DB.prepare(
        `SELECT ptr.*, tt.task_description, tt.task_description_ar, tt.task_type, tt.reading_unit
         FROM pm_task_results ptr
         JOIN template_tasks tt ON ptr.template_task_id = tt.id
         WHERE ptr.pm_record_id = ?
      `).bind(lastPM.id).all()).results || []
    }

    const tasksWithLastValues = (tasks.results || []).map((task: any) => {
      const last = lastResults.find((r: any) => r.template_task_id === task.id)
      return {
        ...task,
        lastValue: last ? { status: last.status, notes: last.notes, flagged: last.flagged, aiEvaluation: last.ai_evaluation } : null,
      }
    })

    return c.json({
      data: {
        equipmentId: eq.id,
        equipmentName: eq.equipment_name,
        templateId: eq.template_id,
        tasks: tasksWithLastValues,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch tasks' }, 500)
  }
})

const taskSchema = z.object({
  templateTaskId: z.number().int().positive(),
  status: z.string(),
  notes: z.string().optional(),
})

const submitSchema = z.object({
  equipmentId: z.number().int().positive(),
  frequencyId: z.number().int().positive(),
  completedBy: z.string().optional(),
  acceptedBy: z.string().optional(),
  equipmentHours: z.string().optional(),
  tasks: z.array(taskSchema).min(1),
  comments: z.string().optional(),
})

pm.post('/submit', zValidator('json', submitSchema), async (c) => {
  try {
    const body = c.req.valid('json')
    const currentUser = getUser(c)!

    const eq = await c.env.DB.prepare(
      'SELECT id, template_id, equipment_name FROM equipment WHERE id = ? AND is_active = 1'
    ).bind(body.equipmentId).first() as any

    if (!eq) {
      return c.json({ error: 'Equipment not found' }, 404)
    }

    const freq = await c.env.DB.prepare(
      'SELECT id FROM frequencies WHERE id = ? AND is_active = 1'
    ).bind(body.frequencyId).first()

    if (!freq) {
      return c.json({ error: 'Frequency not found' }, 404)
    }

    const templateTasks = await c.env.DB.prepare(
      'SELECT id, task_description, task_type, reading_unit FROM template_tasks WHERE template_id = ?'
    ).bind(eq.template_id).all()

    const templateTaskMap = new Map<number, any>()
    for (const row of ((templateTasks as any).results || [])) {
      templateTaskMap.set(row.id, row)
    }

    const taskDetails = body.tasks.map(t => {
      const tmpl = templateTaskMap.get(t.templateTaskId)
      return {
        templateTaskId: t.templateTaskId,
        status: t.status,
        notes: t.notes || '',
        taskDescription: tmpl?.task_description || '',
        taskType: tmpl?.task_type || 'status',
        readingUnit: tmpl?.reading_unit || '',
      }
    })

    const analysis = analyzePM(eq.equipment_name, taskDetails, body.comments || '')

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

    const pmResult = await c.env.DB.prepare(
      `INSERT INTO pm_records (equipment_id, frequency_id, submitted_by, completed_by, accepted_by, equipment_hours, overall_status, needs_coordinator_review, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.equipmentId, body.frequencyId, currentUser.id,
      body.completedBy || null, body.acceptedBy || null,
      body.equipmentHours || null,
      analysis.overallStatus,
      analysis.overallStatus !== 'ok' ? 1 : 0,
      now
    ).run()

    const pmRecordId = pmResult.meta.last_row_id as number

    const taskInsertStmt = c.env.DB.prepare(
      `INSERT INTO pm_task_results (pm_record_id, template_task_id, status, notes, flagged, ai_evaluation)
       VALUES (?, ?, ?, ?, ?, ?)`
    )

    for (let i = 0; i < body.tasks.length; i++) {
      const t = body.tasks[i]
      const tmpl = templateTaskMap.get(t.templateTaskId) as any
      const taskDetail = taskDetails[i]
      const isNumeric = tmpl?.task_type === 'numeric_reading' && !isNaN(Number(t.status))

      let flagged = 0
      let aiEval: string | null = null

      if (isNumeric) {
        const value = Number(t.status)
        const evaluation = analysis.flaggedTasks.find(ft => ft.taskId === t.templateTaskId)
        if (evaluation) {
          flagged = 1
          aiEval = JSON.stringify({ severity: evaluation.severity, reason: evaluation.reason })
        } else {
          aiEval = JSON.stringify({ severity: 'ok', reason: 'Within normal range' })
        }
      } else if (t.status.toUpperCase() !== 'OK' && t.status.toUpperCase() !== 'PASS' && t.status.trim() !== '') {
        flagged = 1
      }

      await taskInsertStmt.bind(
        pmRecordId, t.templateTaskId, t.status, t.notes || null, flagged, aiEval
      ).run()
    }

    if (body.comments && body.comments.trim().length > 0) {
      await c.env.DB.prepare(
        'INSERT INTO pm_comments (pm_record_id, comment_text) VALUES (?, ?)'
      ).bind(pmRecordId, body.comments).run()
    }

    await updateDueDates(c.env, body.equipmentId, body.frequencyId, now, body.equipmentHours ? parseInt(body.equipmentHours) : undefined)

    if (analysis.overallStatus !== 'ok') {
      const submittedByUser = await c.env.DB.prepare(
        'SELECT full_name FROM users WHERE id = ?'
      ).bind(currentUser.id).first() as any

      await processAlerts(
        c.env, pmRecordId, eq.equipment_name,
        submittedByUser?.full_name || currentUser.fullName,
        analysis,
        body.comments || ''
      )
    }

    return c.json({
      data: {
        id: pmRecordId,
        overallStatus: analysis.overallStatus,
        flaggedTasks: analysis.flaggedTasks,
        recommendations: analysis.recommendations,
      },
    }, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to submit PM record' }, 500)
  }
})

pm.get('/records/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { page, limit, offset } = parsePagination(c)

    const total = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM pm_records WHERE equipment_id = ?'
    ).bind(equipmentId).first() as any

    const records = await c.env.DB.prepare(
      `SELECT pr.*, u.full_name as submitted_by_name, f.name as frequency_name
       FROM pm_records pr
       JOIN users u ON pr.submitted_by = u.id
       JOIN frequencies f ON pr.frequency_id = f.id
       WHERE pr.equipment_id = ?
       ORDER BY pr.submitted_at DESC
       LIMIT ? OFFSET ?`
    ).bind(equipmentId, limit, offset).all()

    return c.json({
      data: records.results,
      pagination: { page, limit, total: total?.count || 0, totalPages: Math.ceil((total?.count || 0) / limit) },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch PM records' }, 500)
  }
})

pm.get('/record/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const record = await c.env.DB.prepare(
      `SELECT pr.*, u.full_name as submitted_by_name, f.name as frequency_name,
              e.equipment_name, e.equipment_name_ar
       FROM pm_records pr
       JOIN users u ON pr.submitted_by = u.id
       JOIN frequencies f ON pr.frequency_id = f.id
       JOIN equipment e ON pr.equipment_id = e.id
       WHERE pr.id = ?`
    ).bind(id).first() as any

    if (!record) {
      return c.json({ error: 'PM record not found' }, 404)
    }

    const taskResults = await c.env.DB.prepare(
      `SELECT ptr.*, tt.task_description, tt.task_description_ar, tt.task_type, tt.reading_unit, tt.item_number, tt.sort_order
       FROM pm_task_results ptr
       JOIN template_tasks tt ON ptr.template_task_id = tt.id
       WHERE ptr.pm_record_id = ?
       ORDER BY tt.sort_order ASC`
    ).bind(id).all()

    const comments = await c.env.DB.prepare(
      'SELECT * FROM pm_comments WHERE pm_record_id = ? ORDER BY created_at ASC'
    ).bind(id).all()

    return c.json({
      data: {
        ...record,
        taskResults: taskResults.results,
        comments: comments.results,
      },
    })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch PM record' }, 500)
  }
})

export default pm
