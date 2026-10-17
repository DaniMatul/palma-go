import 'dotenv/config'
import express from 'express'
import { dailyMenuRouter } from './routes/dailyMenu.js'
import { extrasRouter } from './routes/extras.js'
import { menuItemsRouter } from './routes/menuItems.js'
import { ordersRouter } from './routes/orders.js'

const app = express()
const port = process.env.PORT ?? 3000

app.use(express.json())
app.use((request, response, next) => {
  const origin = request.headers.origin
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ])
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  return next()
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/menu-items', menuItemsRouter)
app.use('/api/extras', extrasRouter)
app.use('/api/daily-menu', dailyMenuRouter)
app.use('/api/orders', ordersRouter)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
