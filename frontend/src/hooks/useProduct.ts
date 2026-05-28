import { useState, useEffect } from 'react'
import { getProduct } from '../api'

export const useProduct = (productId: string) => {
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(productId)
        setProduct(data)
        setLoading(false)
      } catch (err) {
        setLoading(false)
      }
    }

    fetchProduct()
    const interval = setInterval(fetchProduct, 5000)
    return () => clearInterval(interval)
  }, [productId])

  return { product, loading }
}