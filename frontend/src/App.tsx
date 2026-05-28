import { useState, useEffect } from 'react'
import { useProduct } from './hooks/useProduct'
import { login, reserve, checkout, register } from './api'

const PRODUCT_ID = 'a88661a6-cc4e-4649-a22a-8bf1865e0503'

function App() {
  const [isRegister, setIsRegister] = useState(false)
  const [token, setToken] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loginError, setLoginError] = useState<string>('')
  const { product, loading } = useProduct(PRODUCT_ID)
  const [reservation, setReservation] = useState<{id: string, expiresAt: string} | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [status, setStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!reservation) return
    const interval = setInterval(() => {
      const left = Math.max(0, new Date(reservation.expiresAt).getTime() - Date.now())
      setTimeLeft(left)
      if (left === 0) {
        setReservation(null)
        setStatus('Rezervasyon süresi doldu!')
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [reservation])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const data = await login(email, password)
      setToken(data.token)
      setLoginError('')
    } catch {
      setLoginError('Giriş başarısız')
    }
    setIsLoading(false)
  }

  const handleRegister = async () => {
    setIsLoading(true)
    try {
      await register(email, password)
      const data = await login(email, password)
      setToken(data.token)
      setLoginError('')
    } catch {
      setLoginError('Kayıt başarısız, email zaten kullanımda olabilir')
    }
    setIsLoading(false)
  }

  const handleReserve = async () => {
    setIsLoading(true)
    try {
      const res = await reserve(PRODUCT_ID, token)
      setReservation(res)
      setTimeLeft(5 * 60 * 1000)
      setStatus('Rezervasyon oluşturuldu!')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setStatus(error.response?.data?.error || 'Hata oluştu')
    }
    setIsLoading(false)
  }

  const handleCheckout = async () => {
    if (!reservation) return
    setIsLoading(true)
    try {
      await checkout(reservation.id, token)
      setReservation(null)
      setStatus('Satın alma tamamlandı! 🎉')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setStatus(error.response?.data?.error || 'Hata oluştu')
    }
    setIsLoading(false)
  }

  const formatTime = (ms: number) => {
    const min = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  if (!token) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>{isRegister ? 'Kayıt Ol' : 'Giris Yap'}</h1>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Sifre"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {loginError && <p style={styles.status}>{loginError}</p>}
          <button style={styles.button} onClick={isRegister ? handleRegister : handleLogin} disabled={isLoading}>
            {isLoading ? 'Yukleniyor...' : isRegister ? 'Kayıt Ol' : 'Giris Yap'}
          </button>
          <p
            style={{ color: '#94a3b8', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}
            onClick={() => { setIsRegister(!isRegister); setLoginError('') }}
          >
            {isRegister ? 'Zaten hesabin var mi? Giris yap' : 'Hesabin yok mu? Kayıt ol'}
          </p>
        </div>
      </div>
    )
  }

  if (loading) return <div style={styles.container}>Yukleniyor...</div>
  if (!product) return <div style={styles.container}>Urun bulunamadi</div>

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Limited Drop</h1>
        <h2 style={styles.productName}>{product.name}</h2>
        <p style={styles.stock}>
          Kalan stok: <strong style={{ color: product.stock === 0 ? 'red' : 'green' }}>{product.stock}</strong>
        </p>
        {reservation && (
          <div style={styles.timer}>
            <p>Rezervasyon suresi: <strong>{formatTime(timeLeft)}</strong></p>
          </div>
        )}
        {status && <p style={styles.status}>{status}</p>}
        {!reservation ? (
          <button
            style={{ ...styles.button, opacity: product.stock === 0 || isLoading ? 0.5 : 1 }}
            onClick={handleReserve}
            disabled={product.stock === 0 || isLoading}
          >
            {isLoading ? 'Yukleniyor...' : product.stock === 0 ? 'Stok Tukendi' : 'Rezerve Et'}
          </button>
        ) : (
          <button
            style={{ ...styles.button, backgroundColor: '#22c55e' }}
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? 'Yukleniyor...' : 'Satin Al'}
          </button>
        )}
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1rem' }}>
          {email} olarak giris yapildi
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    fontFamily: 'sans-serif'
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '2rem',
    borderRadius: '1rem',
    textAlign: 'center',
    minWidth: '320px',
    color: 'white',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  },
  title: { fontSize: '2rem', marginBottom: '0.5rem' },
  productName: { fontSize: '1.5rem', color: '#94a3b8' },
  stock: { fontSize: '1.2rem', margin: '1rem 0' },
  timer: {
    backgroundColor: '#334155',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    margin: '1rem 0'
  },
  status: { color: '#fbbf24', margin: '0.5rem 0' },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: 'white',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  button: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
    width: '100%'
  }
}

export default App
