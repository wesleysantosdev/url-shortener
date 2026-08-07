import { ShortUrlHistoryEntry } from '../api/short-url-history'
import { ShortUrlResult } from './ShortUrlResult'
import styles from './ShortUrlHistory.module.css'

interface ShortUrlHistoryProps {
  shortUrls: ShortUrlHistoryEntry[]
}

export function ShortUrlHistory({ shortUrls }: ShortUrlHistoryProps) {
  if (shortUrls.length === 0) {
    return null
  }

  return (
    <section className={styles.history} aria-labelledby="session-links-title">
      <div className={styles.headingRow}>
        <h2 className={styles.heading} id="session-links-title">
          Session links
        </h2>
      </div>
      <p className={styles.sessionNotice}>
        <strong>Keep a copy of these links.</strong> This list clears when you
        close this tab, but the links stay active.
      </p>
      <ol className={styles.list}>
        {shortUrls.map((shortUrl) => (
          <li className={styles.item} key={shortUrl.shortUrl}>
            <ShortUrlResult
              shortUrl={shortUrl.shortUrl}
              originalUrl={shortUrl.originalUrl}
              showStatus={false}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
