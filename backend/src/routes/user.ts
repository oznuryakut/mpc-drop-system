import { Router } from 'express'
import { prisma } from '../index'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()

// POST /users/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed }
    })
    res.status(201).json({ id: user.id, email: user.email })
  } catch (err) {
    next(err)
  }
})

// POST /users/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      res.status(401).json({ error: 'Kullanıcı bulunamadı' })
      return
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ error: 'Hatalı şifre' })
      return
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    res.json({ token, userId: user.id })
  } catch (err) {
    next(err)
  }
})

export default router