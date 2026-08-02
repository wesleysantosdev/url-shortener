import { z } from 'zod'

export const createShortUrlBodySchema = z.strictObject({
  url: z
    .url({ error: 'URL must be a valid absolute URL' })
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
  .regex(/^(?:[a-f0-9]{8}|[a-f0-9]{16})$/)
