import type { Env } from '../utils/helpers'

interface Frequency {
  id: number
  name: string
  type: 'calendar' | 'hourly' | 'custom'
  interval_days: number | null
  interval_hours: number | null
}

export function calculateNextDueDate(
  frequency: Frequency,
  lastDate: string,
  lastHours?: number,
  currentHours?: number
): string {
  const last = new Date(lastDate)

  if (frequency.type === 'calendar' && frequency.interval_days) {
    const next = new Date(last)
    next.setDate(next.getDate() + frequency.interval_days)
    return next.toISOString().replace('T', ' ').slice(0, 19)
  }

  if (frequency.type === 'hourly' && frequency.interval_hours) {
    if (currentHours !== undefined && lastHours !== undefined) {
      const hoursUsed = currentHours - lastHours
      const ratio = hoursUsed / frequency.interval_hours
      if (ratio > 0) {
        const daysToAdd = Math.ceil(30 * ratio)
        const next = new Date(last)
        next.setDate(next.getDate() + Math.max(1, daysToAdd))
        return next.toISOString().replace('T', ' ').slice(0, 19)
      }
    }
    const next = new Date(last)
    next.setDate(next.getDate() + 30)
    return next.toISOString().replace('T', ' ').slice(0, 19)
  }

  if (frequency.type === 'custom') {
    if (frequency.interval_days && frequency.interval_days > 0) {
      const next = new Date(last)
      next.setDate(next.getDate() + frequency.interval_days)
      return next.toISOString().replace('T', ' ').slice(0, 19)
    }
    if (frequency.interval_hours && frequency.interval_hours > 0) {
      const next = new Date(last)
      next.setDate(next.getDate() + 30)
      return next.toISOString().replace('T', ' ').slice(0, 19)
    }
    const next = new Date(last)
    next.setDate(next.getDate() + 30)
    return next.toISOString().replace('T', ' ').slice(0, 19)
  }

  const next = new Date(last)
  next.setDate(next.getDate() + 30)
  return next.toISOString().replace('T', ' ').slice(0, 19)
}

export async function updateDueDates(
  env: Env,
  equipmentId: number,
  frequencyId: number,
  submittedAt: string,
  hoursReading?: number
): Promise<void> {
  const freq = await env.DB.prepare(
    'SELECT * FROM frequencies WHERE id = ?'
  ).bind(frequencyId).first() as Frequency | null

  if (!freq) return

  const schedule = await env.DB.prepare(
    'SELECT * FROM equipment_schedules WHERE equipment_id = ? AND frequency_id = ?'
  ).bind(equipmentId, frequencyId).first() as any | null

  if (!schedule) return

  const lastHours = schedule.last_hours_reading ?? undefined
  const nextDue = calculateNextDueDate(freq, submittedAt, lastHours, hoursReading)

  await env.DB.prepare(
    `UPDATE equipment_schedules
     SET last_pm_date = ?, last_hours_reading = ?, next_due_date = ?
     WHERE equipment_id = ? AND frequency_id = ?`
  ).bind(submittedAt, hoursReading || null, nextDue, equipmentId, frequencyId).run()
}

export async function calculateAllDueDates(env: Env): Promise<number> {
  const schedules = await env.DB.prepare(
    `SELECT es.*, f.type, f.interval_days, f.interval_hours
     FROM equipment_schedules es
     JOIN frequencies f ON es.frequency_id = f.id
     WHERE es.is_active = 1`
  ).all() as any

  let count = 0
  for (const sched of schedules.results) {
    if (!sched.last_pm_date) continue
    const nextDue = calculateNextDueDate(
      { id: sched.frequency_id, name: '', type: sched.type, interval_days: sched.interval_days, interval_hours: sched.interval_hours },
      sched.last_pm_date,
      sched.last_hours_reading ?? undefined
    )
    await env.DB.prepare(
      'UPDATE equipment_schedules SET next_due_date = ? WHERE id = ?'
    ).bind(nextDue, sched.id).run()
    count++
  }

  return count
}
