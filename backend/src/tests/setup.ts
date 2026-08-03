import { afterEach, vi } from 'vitest'

process.env.CORS_ALLOWED_ORIGIN ??= 'http://localhost:5173'

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
