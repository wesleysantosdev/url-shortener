import { useId, useState } from 'react'
import styles from './ShortUrlResult.module.css'

interface ShortUrlResultProps {
  shortUrl: string
  originalUrl?: string
  showStatus?: boolean
}

type CopyState = 'idle' | 'copied' | 'error'

export function ShortUrlResult({
  shortUrl,
  originalUrl,
  showStatus = true,
}: ShortUrlResultProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const titleId = useId()

  async function copyShortUrl() {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <section className={styles.result} aria-labelledby={titleId}>
      <p
        className={styles.status}
        id={titleId}
        role={showStatus ? 'status' : undefined}
      >
        {showStatus ? 'Short link ready.' : 'Saved route'}
      </p>
      {originalUrl ? (
        <p className={styles.originalUrl} title={originalUrl}>
          {originalUrl}
        </p>
      ) : null}
      <a
        className={styles.shortUrl}
        href={shortUrl}
        target="_blank"
        rel="noreferrer"
      >
        {shortUrl}
      </a>
      <div className={styles.actions}>
        <a
          className={styles.openLink}
          href={shortUrl}
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
