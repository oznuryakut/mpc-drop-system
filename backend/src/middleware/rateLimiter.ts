import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Çok fazla istek, lütfen bekleyin.' }
})

export const reserveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: 'Çok fazla rezervasyon denemesi.' }
})