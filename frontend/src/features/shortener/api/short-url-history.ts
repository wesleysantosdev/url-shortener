import { z } from 'zod'
import {
  CreatedShortUrl,
  createdShortUrlSchema,
} from './create-short-url'

const HISTORY_KEY = 'short-url-history:v1'
const MAX_HISTORY_LENGTH = 20
const historySchema = z.array(createdShortUrlSchema)

function availableSessionStorage(): Storage | undefined {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

export function loadShortUrlHistory(
  storage: Pick<Storage, 'getItem'> | undefined = availableSessionStorage(),
): CreatedShortUrl[] {
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
  history: CreatedShortUrl[],
  createdShortUrl: CreatedShortUrl,
): CreatedShortUrl[] {
  return [createdShortUrl, ...history].slice(0, MAX_HISTORY_LENGTH)
}

export function saveShortUrlHistory(
  history: CreatedShortUrl[],
  storage: Pick<Storage, 'setItem'> | undefined = availableSessionStorage(),
): void {
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // In-memory history remains available until the page reloads.
  }
}
