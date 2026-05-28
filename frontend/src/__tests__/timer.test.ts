describe('Timer Logic', () => {
  test('should calculate time left correctly', () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const left = Math.max(0, new Date(expiresAt).getTime() - Date.now())
    expect(left).toBeGreaterThan(0)
    expect(left).toBeLessThanOrEqual(5 * 60 * 1000)
  })

  test('should return 0 for expired reservation', () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString()
    const left = Math.max(0, new Date(expiresAt).getTime() - Date.now())
    expect(left).toBe(0)
  })

  test('should format time correctly', () => {
    const formatTime = (ms: number) => {
      const min = Math.floor(ms / 60000)
      const sec = Math.floor((ms % 60000) / 1000)
      return `${min}:${sec.toString().padStart(2, '0')}`
    }
    expect(formatTime(5 * 60 * 1000)).toBe('5:00')
    expect(formatTime(90000)).toBe('1:30')
    expect(formatTime(0)).toBe('0:00')
  })
})

describe('API Error Handling', () => {
  test('should handle network error gracefully', () => {
    const handleError = (err: unknown): string => {
      const error = err as { response?: { data?: { error?: string } } }
      return error.response?.data?.error || 'An error occurred'
    }
    expect(handleError({})).toBe('An error occurred')
    expect(handleError({ response: { data: { error: 'Insufficient stock' } } })).toBe('Insufficient stock')
  })

  test('should handle missing response data', () => {
    const handleError = (err: unknown): string => {
      const error = err as { response?: { data?: { error?: string } } }
      return error.response?.data?.error || 'An error occurred'
    }
    expect(handleError({ response: {} })).toBe('An error occurred')
    expect(handleError({ response: { data: {} } })).toBe('An error occurred')
  })
})
