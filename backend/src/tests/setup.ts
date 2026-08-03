import { afterEach, vi } from 'vitest'

process.env.CORS_ALLOWED_ORIGIN ??= 'http://localhost:5173'
process.env.RATE_LIMIT_IP_HASH_SECRET ??= 'test-rate-limit-secret-with-32-chars'

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
