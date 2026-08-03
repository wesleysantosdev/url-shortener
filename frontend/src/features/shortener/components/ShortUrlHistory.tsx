import { CreatedShortUrl } from '../api/create-short-url'
import { ShortUrlResult } from './ShortUrlResult'
import styles from './ShortUrlHistory.module.css'

interface ShortUrlHistoryProps {
  shortUrls: CreatedShortUrl[]
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
        <span className={styles.count}>{shortUrls.length}/20</span>
      </div>
      <ol className={styles.list}>
        {shortUrls.map((shortUrl) => (
          <li className={styles.item} key={shortUrl.id}>
            <ShortUrlResult
              shortCode={shortUrl.shortCode}
              originalUrl={shortUrl.originalUrl}
              showStatus={false}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
