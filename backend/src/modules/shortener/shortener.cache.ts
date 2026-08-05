import { redis } from '../../config/redis'
import { runtimeConfig } from '../../config/runtime'

const CACHE_KEY_PREFIX = 'url-cache:v2:'
const MISSING_SHORT_CODE = '__SHORT_URL_NOT_FOUND__'

function cacheKey(shortCode: string): string {
  return `${CACHE_KEY_PREFIX}${shortCode}`
}

async function store(
  shortCode: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis.set(cacheKey(shortCode), value, 'EX', ttlSeconds)
  } catch (error: unknown) {
    console.error({
      message: 'Redis cache write failed; continuing without cache',
      error,
    })
  }
}

const shortenerCache = {
  async findOriginalUrl(
    shortCode: string,
  ): Promise<string | null | undefined> {
    try {
      const cachedValue = await redis.get(cacheKey(shortCode))

      if (cachedValue === MISSING_SHORT_CODE) {
        return null
      }

      return cachedValue ?? undefined
    } catch (error: unknown) {
      console.error({
        message: 'Redis cache read failed; falling back to PostgreSQL',
        error,
      })
      return undefined
    }
  },

  async storeOriginalUrl(
    shortCode: string,
    originalUrl: string,
  ): Promise<void> {
    await store(
      shortCode,
      originalUrl,
      runtimeConfig.urlCacheTtlSeconds,
    )
  },

  async storeMissingShortCode(shortCode: string): Promise<void> {
    await store(
      shortCode,
      MISSING_SHORT_CODE,
      runtimeConfig.negativeCacheTtlSeconds,
    )
  },

  async invalidate(shortCodes: string[]): Promise<void> {
    if (shortCodes.length === 0) {
      return
    }

    try {
      await redis.del(...shortCodes.map(cacheKey))
    } catch (error: unknown) {
      console.error({
        message: 'Redis cache invalidation failed; lifecycle continued',
        error,
      })
    }
  },
}

export default shortenerCache
