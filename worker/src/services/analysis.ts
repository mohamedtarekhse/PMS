const NEGATIVE_KEYWORDS = [
  'not ok', 'nok', 'problem', 'issue', 'leak', 'leaking', 'noise', 'noisy',
  'hot', 'overheat', 'overheating', 'burn', 'burning', 'smoke', 'vibration',
  'excessive', 'warning', 'alarm', 'fault', 'failure', 'broken', 'crack',
  'corrosion', 'rust', 'damage', 'abnormal', 'unusual', 'replace', 'repair',
  'bad', 'poor', 'badly', 'low', 'high', 'trip', 'tripped', 'error',
  'not working', 'not running', 'not operating', 'disconnected', 'loose',
  'worn', 'wear', 'misalignment', 'contamination', 'blockage', 'clog',
  'overload', 'overcurrent', 'short circuit', 'ground fault',
  'مشكلة', 'تسريب', 'عطل', 'خطأ', 'تلف', 'شرخ', 'صدأ', 'تآكل',
  'ارتفاع', 'انخفاض', 'سخونة', 'اهتزاز', 'دخان', 'حريق',
  'لا يعمل', 'لا يعمل بشكل صحيح', 'تحتاج صيانة', 'تحتاج إصلاح',
]

interface KeywordMatch {
  keyword: string
  index: number
}

interface AnalysisResult {
  severity: 'issues_found' | 'needs_review' | ''
  description: string
  foundKeywords: string[]
}

interface ReadingEvaluation {
  severity: 'ok' | 'warning' | 'critical'
  reason: string
}

interface PMAnalysisResult {
  overallStatus: 'ok' | 'issues_found' | 'needs_review'
  flaggedTasks: Array<{ taskId: number; reason: string; severity: string }>
  recommendations: string[]
}

export function analyzeComments(text: string): AnalysisResult {
  if (!text || text.trim().length === 0) {
    return { severity: '', description: '', foundKeywords: [] }
  }

  const lower = text.toLowerCase()
  const matches: KeywordMatch[] = []

  for (const kw of NEGATIVE_KEYWORDS) {
    let idx = lower.indexOf(kw)
    while (idx !== -1) {
      matches.push({ keyword: kw, index: idx })
      idx = lower.indexOf(kw, idx + 1)
    }
  }

  const foundKeywords = [...new Set(matches.map(m => m.keyword))]

  if (foundKeywords.length === 0) {
    return { severity: '', description: 'No issues detected in comments', foundKeywords: [] }
  }

  const severity: 'issues_found' | 'needs_review' =
    foundKeywords.length >= 2 || ['leak', 'smoke', 'fire', 'overheat', 'trip', 'broken', 'failure', 'short circuit', 'حريق'].some(k => foundKeywords.includes(k))
      ? 'issues_found'
      : 'needs_review'

  return {
    severity,
    description: `Found negative keywords: ${foundKeywords.join(', ')}`,
    foundKeywords,
  }
}

const EQUIPMENT_RANGES: Record<string, {
  patterns: RegExp[]
  ranges: Record<string, { min?: number; max?: number; unit: string; warningThreshold?: number }>
}> = {
  'air compressor': {
    patterns: [/air compressor/i, /compressor/i, /air comp/i],
    ranges: {
      pressure: { min: 100, max: 175, unit: 'psig', warningThreshold: 0.1 },
      temperature: { min: 160, max: 220, unit: '°F', warningThreshold: 0.1 },
      'capacity': { min: 1400, max: 1650, unit: 'cfm', warningThreshold: 0.05 },
    },
  },
  'centrifugal pump': {
    patterns: [/centrifugal pump/i, /pump/i, /centrifugal/i, /centrif/i],
    ranges: {
      'bearing temperature': { max: 180, unit: '°F', warningThreshold: 0.1 },
      'bearing temp': { max: 180, unit: '°F', warningThreshold: 0.1 },
      pressure: { max: 275, unit: 'psi', warningThreshold: 0.1 },
    },
  },
}

export function aiEvaluateReading(equipmentName: string, taskText: string, value: number, unit?: string): ReadingEvaluation {
  const eqName = equipmentName?.toLowerCase() || ''

  let matchedEquipment: string | null = null
  for (const [eqType, config] of Object.entries(EQUIPMENT_RANGES)) {
    if (config.patterns.some(p => p.test(eqName))) {
      matchedEquipment = eqType
      break
    }
  }

  if (!matchedEquipment) {
    return { severity: 'ok', reason: 'No specific thresholds defined for this equipment type' }
  }

  const taskLower = taskText?.toLowerCase() || ''
  const ranges = EQUIPMENT_RANGES[matchedEquipment].ranges

  for (const [paramName, range] of Object.entries(ranges)) {
    if (taskLower.includes(paramName.toLowerCase()) || taskLower.includes(paramName.split(' ')[0].toLowerCase())) {
      if (unit && range.unit && !unit.toLowerCase().includes(range.unit.toLowerCase().replace('°', ''))) {
        continue
      }

      if (range.min !== undefined && value < range.min) {
        const pct = ((range.min - value) / range.min) * 100
        const severity: 'warning' | 'critical' = pct > 15 ? 'critical' : 'warning'
        return {
          severity,
          reason: `${paramName} reading ${value}${unit ? ' ' + unit : ''} is below minimum ${range.min}${range.unit ? ' ' + range.unit : ''} (${pct.toFixed(1)}% low)`,
        }
      }

      if (range.max !== undefined && value > range.max) {
        const pct = ((value - range.max) / range.max) * 100
        const severity: 'warning' | 'critical' = pct > 15 ? 'critical' : 'warning'
        return {
          severity,
          reason: `${paramName} reading ${value}${unit ? ' ' + unit : ''} exceeds maximum ${range.max}${range.unit ? ' ' + range.unit : ''} (${pct.toFixed(1)}% high)`,
        }
      }

      if (range.warningThreshold && range.max !== undefined) {
        const warningLevel = range.max * (1 - range.warningThreshold)
        if (value > warningLevel) {
          const pct = ((value - warningLevel) / warningLevel) * 100
          return {
            severity: 'warning',
            reason: `${paramName} reading ${value}${unit ? ' ' + unit : ''} approaching maximum ${range.max}${range.unit ? ' ' + range.unit : ''} (within ${(range.warningThreshold * 100).toFixed(0)}% threshold)`,
          }
        }
      }

      if (range.warningThreshold && range.min !== undefined) {
        const warningLevel = range.min * (1 + range.warningThreshold)
        if (value < warningLevel) {
          return {
            severity: 'warning',
            reason: `${paramName} reading ${value}${unit ? ' ' + unit : ''} approaching minimum ${range.min}${range.unit ? ' ' + range.unit : ''}`,
          }
        }
      }

      return { severity: 'ok', reason: `${paramName} reading ${value}${unit ? ' ' + unit : ''} is within normal range` }
    }
  }

  return { severity: 'ok', reason: 'No matching parameter thresholds found for this task' }
}

export function analyzePM(
  equipmentName: string,
  tasks: Array<{ templateTaskId: number; taskDescription: string; status: string; notes?: string; taskType: string; readingUnit?: string }>,
  comments: string
): PMAnalysisResult {
  const flaggedTasks: Array<{ taskId: number; reason: string; severity: string }> = []
  const recommendations: string[] = []

  for (const task of tasks) {
    const isNumeric = task.taskType === 'numeric_reading' && !isNaN(Number(task.status))
    if (isNumeric) {
      const value = Number(task.status)
      const evaluation = aiEvaluateReading(equipmentName, task.taskDescription, value, task.readingUnit)
      if (evaluation.severity !== 'ok') {
        flaggedTasks.push({
          taskId: task.templateTaskId,
          reason: evaluation.reason,
          severity: evaluation.severity,
        })
      }
    } else if (task.status && task.status.toUpperCase() !== 'OK' && task.status.toUpperCase() !== 'PASS') {
      flaggedTasks.push({
        taskId: task.templateTaskId,
        reason: `Task status: ${task.status}${task.notes ? ' - ' + task.notes : ''}`,
        severity: task.status.toUpperCase() === 'NOK' || task.status.toUpperCase() === 'FAIL' ? 'critical' : 'warning',
      })
    }
  }

  for (const ft of flaggedTasks) {
    if (ft.severity === 'critical') {
      recommendations.push(`Immediate attention required for task flagged as critical: ${ft.reason}`)
    } else {
      recommendations.push(`Review task: ${ft.reason}`)
    }
  }

  const commentAnalysis = analyzeComments(comments)
  if (commentAnalysis.foundKeywords.length > 0) {
    recommendations.push(`Comment analysis: ${commentAnalysis.description}`)
  }

  let overallStatus: 'ok' | 'issues_found' | 'needs_review'

  const hasCritical = flaggedTasks.some(t => t.severity === 'critical')
  const hasWarning = flaggedTasks.some(t => t.severity === 'warning')
  const hasIssueComments = commentAnalysis.severity === 'issues_found'

  if (hasCritical || hasIssueComments) {
    overallStatus = 'issues_found'
  } else if (hasWarning || commentAnalysis.severity === 'needs_review') {
    overallStatus = 'needs_review'
  } else {
    overallStatus = 'ok'
  }

  return { overallStatus, flaggedTasks, recommendations }
}
