import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { logger } from './middleware/logger'
import { rateLimiter } from './middleware/rateLimiter'
import productRouter from './routes/product'
import reservationRouter from './routes/reservation'
import userRouter from './routes/user'
import { errorHandler } from './middleware/errorHandler'

export const prisma = new PrismaClient()
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(logger)
app.use(rateLimiter)

app.use('/products', productRouter)
app.use('/users', userRouter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

app.get('/metrics', async (req, res) => {
  const [products, reservations, orders] = await Promise.all([
    prisma.product.count(),
    prisma.reservation.count(),
    prisma.order.count()
  ])
  res.json({ products, reservations, orders, uptime: process.uptime(), timestamp: new Date() })
})

app.use('/', reservationRouter)

const publicPath = path.join(__dirname, '..', 'public')
app.use(express.static(publicPath))
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'))
})

app.use(errorHandler)

setInterval(async () => {
  const expired = await prisma.reservation.findMany({
    where: { status: 'pending', expiresAt: { lt: new Date() } }
  })
  for (const res of expired) {
    await prisma.$transaction([
      prisma.reservation.update({ where: { id: res.id }, data: { status: 'expired' } }),
      prisma.product.update({ where: { id: res.productId }, data: { stock: { increment: res.quantity } } }),
      prisma.inventoryLog.create({ data: { productId: res.productId, action: 'RESERVATION_EXPIRED', quantity: res.quantity } })
    ])
  }
  if (expired.length > 0) console.log(`${expired.length} reservations expired`)
}, 60 * 1000)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
