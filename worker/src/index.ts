import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth'
import frequenciesRoutes from './routes/frequencies'
import equipmentRoutes from './routes/equipment'
import pmRoutes from './routes/pm'
import summaryRoutes from './routes/summary'
import alertsRoutes from './routes/alerts'
import scheduleRoutes from './routes/schedule'

export type { Env } from './utils/helpers'
import type { Env } from './utils/helpers'

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

app.route('/api/auth', authRoutes)
app.route('/api/frequencies', frequenciesRoutes)
app.route('/api/equipment', equipmentRoutes)
app.route('/api/pm', pmRoutes)
app.route('/api/summary', summaryRoutes)
app.route('/api/alerts', alertsRoutes)
app.route('/api/schedule', scheduleRoutes)

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

export default app
