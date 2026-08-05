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
    <section className={styles.history} aria-labelledby="session-routes-title">
      <div className={styles.headingRow}>
        <h2 className={styles.heading} id="session-routes-title">
          Session routes
        </h2>
      </div>
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
