import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Reservation Logic', () => {
  let productId: string
  let userId: string

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `test-${Date.now()}@test.com`, password: 'hashed' }
    })
    userId = user.id

    const product = await prisma.product.create({
      data: { name: 'Test Product', stock: 10 }
    })
    productId = product.id
  })

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { productId } })
    await prisma.inventoryLog.deleteMany({ where: { productId } })
    await prisma.product.delete({ where: { id: productId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  test('should create reservation and decrement stock', async () => {
    const reservation = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: 1 } }
      })
      return tx.reservation.create({
        data: {
          productId,
          userId,
          quantity: 1,
          status: 'pending',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        }
      })
    })

    expect(reservation.status).toBe('pending')
    expect(reservation.productId).toBe(productId)

    const product = await prisma.product.findUnique({ where: { id: productId } })
    expect(product?.stock).toBe(9)
  })

  test('should expire reservation and restore stock', async () => {
    const reservation = await prisma.reservation.create({
      data: {
        productId,
        userId,
        quantity: 1,
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000)
      }
    })

    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'expired' }
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { increment: 1 } }
      })
    ])

    const updated = await prisma.reservation.findUnique({ where: { id: reservation.id } })
    expect(updated?.status).toBe('expired')
  })

  test('should not allow negative stock', async () => {
    const product = await prisma.product.create({
      data: { name: 'Zero Stock Product', stock: 0 }
    })

    await expect(
      prisma.$transaction(async (tx) => {
        const p = await tx.product.findUnique({ where: { id: product.id } })
        if (!p || p.stock < 1) throw new Error('Insufficient stock')
        return tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: 1 } }
        })
      })
    ).rejects.toThrow('Insufficient stock')

    await prisma.product.delete({ where: { id: product.id } })
  })
})
