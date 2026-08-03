import { z } from 'zod'

const localBackendOrigin = 'http://localhost:5000'

function httpOrigin(fallback: string) {
  return z
    .string()
    .default(fallback)
    .pipe(z.url())
    .refine((value) => {
      const protocol = new URL(value).protocol
      return protocol === 'http:' || protocol === 'https:'
    }, 'Expected an HTTP or HTTPS origin')
    .transform((value) => value.replace(/\/$/, ''))
}

const runtimeEnvironmentSchema = z.object({
  VITE_API_BASE_URL: httpOrigin(localBackendOrigin),
  VITE_PUBLIC_SHORT_URL_BASE: httpOrigin(localBackendOrigin),
})

export interface RuntimeConfig {
  apiBaseUrl: string
  publicShortUrlBase: string
}

export function parseRuntimeConfig(
  environment: Record<string, string | boolean | undefined>,
): RuntimeConfig {
  const parsedEnvironment = runtimeEnvironmentSchema.parse(environment)

  return {
    apiBaseUrl: parsedEnvironment.VITE_API_BASE_URL,
    publicShortUrlBase: parsedEnvironment.VITE_PUBLIC_SHORT_URL_BASE,
  }
}

export const runtimeConfig = parseRuntimeConfig(import.meta.env)
