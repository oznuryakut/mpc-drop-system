import { Router } from 'express'
import { prisma } from '../index'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = req.query.search as string || ''
    const sortBy = req.query.sortBy as string || 'name'
    const order = req.query.order as string || 'asc'
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
        orderBy: { [sortBy]: order },
        skip,
        take: limit
      }),
      prisma.product.count({
        where: search ? { name: { contains: search, mode: 'insensitive' } } : {}
      })
    ])

    res.json({
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    })
    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }
    res.json(product)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, stock } = req.body
    const product = await prisma.product.create({
      data: { name, stock }
    })
    res.status(201).json(product)
  } catch (err) {
    next(err)
  }
})

export default router
