import { z } from 'zod'
import { absoluteHttpUrlSchema } from './create-short-url'

const HISTORY_KEY = 'short-url-history:v2'
const MAX_HISTORY_LENGTH = 5

export const shortUrlHistoryEntrySchema = z.strictObject({
  shortUrl: absoluteHttpUrlSchema,
  originalUrl: absoluteHttpUrlSchema,
})

const historySchema = z.array(shortUrlHistoryEntrySchema)

export type ShortUrlHistoryEntry = z.infer<typeof shortUrlHistoryEntrySchema>

function availableSessionStorage(): Storage | undefined {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

export function loadShortUrlHistory(
  storage: Pick<Storage, 'getItem'> | undefined = availableSessionStorage(),
): ShortUrlHistoryEntry[] {
  if (!storage) {
    return []
  }

  try {
    const rawHistory = storage.getItem(HISTORY_KEY)

    if (!rawHistory) {
      return []
    }

    const parsedHistory = historySchema.safeParse(JSON.parse(rawHistory))
    return parsedHistory.success
      ? parsedHistory.data.slice(0, MAX_HISTORY_LENGTH)
      : []
  } catch {
    return []
  }
}

export function addShortUrlToHistory(
  history: ShortUrlHistoryEntry[],
  createdShortUrl: ShortUrlHistoryEntry,
): ShortUrlHistoryEntry[] {
  return [createdShortUrl, ...history].slice(0, MAX_HISTORY_LENGTH)
}

export function saveShortUrlHistory(
  history: ShortUrlHistoryEntry[],
  storage: Pick<Storage, 'setItem'> | undefined = availableSessionStorage(),
): void {
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // In-memory history remains available until the page reloads.
  }
}
