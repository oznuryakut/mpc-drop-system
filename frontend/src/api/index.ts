import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || ''
})

export const register = async (email: string, password: string) => {
  const res = await api.post('/users/register', { email, password })
  return res.data
}

export const login = async (email: string, password: string) => {
  const res = await api.post('/users/login', { email, password })
  return res.data
}

export const getProduct = async (id: string) => {
  const res = await api.get(`/products/${id}`)
  return res.data
}

export const reserve = async (productId: string, token: string) => {
  const res = await api.post(
    '/reserve',
    { productId, quantity: 1 },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

export const checkout = async (reservationId: string, token: string) => {
  const res = await api.post(
    '/checkout',
    { reservationId },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}
