import { Router, Response, NextFunction } from 'express'
import { prisma } from '../index'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const ReserveSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1).default(1)
})

const CheckoutSchema = z.object({
  reservationId: z.string()
})

router.post('/reserve', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity } = ReserveSchema.parse(req.body)
    const userId = req.userId!

    const existing = await prisma.reservation.findFirst({
      where: { userId, productId, status: 'pending' }
    })
    if (existing) {
      res.status(400).json({ error: 'You already have an active reservation for this product' })
      return
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const products = await tx.$queryRaw<any[]>`
        SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE
      `
      const product = products[0]
      if (!product) throw new Error('Product not found')
      if (product.stock < quantity) throw new Error('Insufficient stock')

      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
      })

      const reservation = await tx.reservation.create({
        data: {
          productId,
          userId,
          quantity,
          status: 'pending',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        }
      })

      await tx.inventoryLog.create({
        data: { productId, action: 'RESERVED', quantity }
      })

      return reservation
    })

    res.status(201).json(reservation)
  } catch (err) {
    next(err)
  }
})

router.post('/checkout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reservationId } = CheckoutSchema.parse(req.body)
    const userId = req.userId!

    const order = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId }
      })

      if (!reservation) throw new Error('Reservation not found')
      if (reservation.status !== 'pending') throw new Error('Reservation is invalid or expired')
      if (reservation.expiresAt < new Date()) throw new Error('Reservation has expired')
      if (reservation.userId !== userId) throw new Error('Unauthorized')

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'completed' }
      })

      const order = await tx.order.create({
        data: { reservationId, userId }
      })

      await tx.inventoryLog.create({
        data: {
          productId: reservation.productId,
          action: 'CHECKOUT_COMPLETED',
          quantity: reservation.quantity
        }
      })

      return order
    })

    res.status(201).json(order)
  } catch (err) {
    next(err)
  }
})

export default router
