import { z } from 'zod'

export const createShortUrlBodySchema = z.strictObject({
  url: z
    .url({ error: 'URL must be a valid absolute URL' })
    .max(2_048, { error: 'URL must contain at most 2048 characters' })
    .refine(
      (value) => {
        const protocol = new URL(value).protocol
        return protocol === 'http:' || protocol === 'https:'
      },
      { error: 'URL must use HTTP or HTTPS' },
    ),
})

export type CreateShortUrlBody = z.infer<typeof createShortUrlBodySchema>

export const shortCodeSchema = z
  .string()
  .regex(/^[0-9A-Za-z]{4,6}$/)
