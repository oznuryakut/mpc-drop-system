import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Concurrency Simulation', () => {
  let productId: string
  const userIds: string[] = []

  beforeAll(async () => {
    const product = await prisma.product.create({
      data: { name: 'Concurrency Test Product', stock: 5 }
    })
    productId = product.id

    for (let i = 0; i < 10; i++) {
      const user = await prisma.user.create({
        data: { email: `concurrent-${Date.now()}-${i}@test.com`, password: 'hashed' }
      })
      userIds.push(user.id)
    }
  })

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { productId } })
    await prisma.inventoryLog.deleteMany({ where: { productId } })
    await prisma.product.delete({ where: { id: productId } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  })

  test('should not oversell when 10 users try to reserve stock of 5', async () => {
    const reserveAttempts = userIds.map((userId) =>
      prisma.$transaction(async (tx) => {
        const products = await tx.$queryRaw<{ id: string; stock: number }[]>`
          SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE
        `
        const product = products[0]
        if (!product || product.stock < 1) throw new Error('Insufficient stock')

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
      }).catch(() => null)
    )

    const results = await Promise.all(reserveAttempts)
    const successful = results.filter((r) => r !== null)

    expect(successful.length).toBe(5)

    const product = await prisma.product.findUnique({ where: { id: productId } })
    expect(product?.stock).toBe(0)
  })
})
