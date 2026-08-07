import { z } from 'zod'

const absoluteUrlSchema = z.url({
  error: 'Enter a valid absolute URL.',
})

export const shortenerFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, { error: 'Enter a URL to shorten.' })
    .max(2_048, { error: 'Use a URL with at most 2048 characters.' })
    .pipe(absoluteUrlSchema)
    .refine((value) => {
      if (!URL.canParse(value)) {
        return true
      }

      const protocol = new URL(value).protocol
      return protocol === 'http:' || protocol === 'https:'
    }, 'Use a URL that starts with http:// or https://.'),
})
