import { useState } from 'react'
import { runtimeConfig } from '../../../shared/config/runtime-config'
import styles from './ShortUrlResult.module.css'

interface ShortUrlResultProps {
  shortCode: string
  publicShortUrlBase?: string
}

type CopyState = 'idle' | 'copied' | 'error'

export function ShortUrlResult({
  shortCode,
  publicShortUrlBase = runtimeConfig.publicShortUrlBase,
}: ShortUrlResultProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const normalizedBaseUrl = publicShortUrlBase.replace(/\/$/, '')
  const publicShortUrl = `${normalizedBaseUrl}/${encodeURIComponent(shortCode)}`

  async function copyShortUrl() {
    try {
      await navigator.clipboard.writeText(publicShortUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <section className={styles.result} aria-labelledby="short-url-result-title">
      <p className={styles.status} id="short-url-result-title" role="status">
        Short link ready.
      </p>
      <a
        className={styles.shortUrl}
        href={publicShortUrl}
        target="_blank"
        rel="noreferrer"
      >
        {publicShortUrl}
      </a>
      <div className={styles.actions}>
        <a
          className={styles.openLink}
          href={publicShortUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open link
        </a>
        <button
          className={styles.copyButton}
          type="button"
          onClick={copyShortUrl}
        >
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      {copyState === 'error' ? (
        <p className={styles.copyError} role="alert">
          Copy failed. Select the link and copy it manually.
        </p>
      ) : null}
    </section>
  )
}
