import type { Env } from '../utils/helpers'

interface AlertData {
  id: number
  pm_record_id: number
  alert_type: string
  severity: string
  title: string
  title_ar?: string
  message: string
  message_ar?: string
  is_read: number
  assigned_to?: number
  created_at: string
}

interface AnalysisResult {
  overallStatus: string
  flaggedTasks: Array<{ taskId: number; reason: string; severity: string }>
  recommendations: string[]
}

export async function createAlert(
  env: Env,
  pmRecordId: number,
  type: 'issue' | 'needs_review' | 'comment_flagged' | 'overdue_pm' | 'info',
  severity: 'low' | 'medium' | 'high' | 'critical',
  title: string,
  titleAr: string,
  message: string,
  messageAr: string,
  assignedTo?: number
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO alerts (pm_record_id, alert_type, severity, title, title_ar, message, message_ar, assigned_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(pmRecordId, type, severity, title, titleAr || null, message, messageAr || null, assignedTo || null).run()

  return result.meta.last_row_id as number
}

export async function sendEmailAlert(env: Env, alert: AlertData, equipmentName: string, submittedByName: string, appUrl: string): Promise<void> {
  const subject = `[PM Alert] ${alert.title}`

  const link = `${appUrl}/pm/records/${alert.pm_record_id}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="border-bottom: 3px solid ${alert.severity === 'critical' ? '#dc3545' : alert.severity === 'high' ? '#fd7e14' : '#ffc107'}; padding-bottom: 12px; margin-bottom: 16px;">
      <h2 style="margin: 0; color: #333;">PM Alert: ${alert.title}</h2>
    </div>
    <p><strong>Equipment:</strong> ${equipmentName}</p>
    <p><strong>Submitted by:</strong> ${submittedByName}</p>
    <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
    <p><strong>Type:</strong> ${alert.alert_type.replace('_', ' ').toUpperCase()}</p>
    <div style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 12px 0;">
      <p style="margin: 0;">${alert.message}</p>
    </div>
    <a href="${link}" style="display: inline-block; background: #0d6efd; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 4px; margin-top: 12px;">
      View PM Record
    </a>
    <p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
      This is an automated alert from the Preventive Maintenance System. Please review and take necessary action.
    </p>
  </div>
</body>
</html>`

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PM System <notifications@rig8.com>',
        to: env.MANAGER_EMAIL,
        subject,
        html,
      }),
    })

    const status = resp.ok ? 'sent' : 'failed'

    await env.DB.prepare(
      `INSERT INTO email_log (alert_id, recipient, subject, status) VALUES (?, ?, ?, ?)`
    ).bind(alert.id, env.MANAGER_EMAIL, subject, status).run()
  } catch {
    await env.DB.prepare(
      `INSERT INTO email_log (alert_id, recipient, subject, status) VALUES (?, ?, ?, 'failed')`
    ).bind(alert.id, env.MANAGER_EMAIL, subject).run()
  }
}

export async function processAlerts(
  env: Env,
  pmRecordId: number,
  equipmentName: string,
  submittedByName: string,
  analysis: AnalysisResult,
  comments: string
): Promise<void> {
  if (analysis.overallStatus === 'ok') return

  const title = analysis.overallStatus === 'issues_found'
    ? 'Issues Found During PM'
    : 'PM Needs Review'

  const titleAr = analysis.overallStatus === 'issues_found'
    ? 'تم العثور على مشاكل أثناء الصيانة'
    : 'الصيانة بحاجة إلى مراجعة'

  const flaggedSummary = analysis.flaggedTasks.map(t => `- ${t.reason}`).join('\n')
  const recSummary = analysis.recommendations.map(r => `- ${r}`).join('\n')

  const message = `PM record #${pmRecordId} for ${equipmentName} submitted by ${submittedByName}.\n\nFlagged items:\n${flaggedSummary}\n\nRecommendations:\n${recSummary}`
  const messageAr = `سجل الصيانة #${pmRecordId} للمعدة ${equipmentName} تم تقديمه بواسطة ${submittedByName}.`

  const alertType = analysis.overallStatus === 'issues_found' ? 'issue' : 'needs_review'
  const severity: 'high' | 'medium' = analysis.overallStatus === 'issues_found' ? 'high' : 'medium'

  const alertId = await createAlert(env, pmRecordId, alertType, severity, title, titleAr, message, messageAr)

  const alertData: AlertData = {
    id: alertId,
    pm_record_id: pmRecordId,
    alert_type: alertType,
    severity,
    title,
    title_ar: titleAr,
    message,
    message_ar: messageAr,
    is_read: 0,
    created_at: new Date().toISOString(),
  }

  await sendEmailAlert(env, alertData, equipmentName, submittedByName, env.APP_URL)
}
