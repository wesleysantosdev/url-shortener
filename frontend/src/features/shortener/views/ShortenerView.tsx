import { ShortenerForm } from '../components/ShortenerForm'
import { FloatingCircles } from './FloatingCircles'
import styles from './ShortenerView.module.css'

export function ShortenerView() {
  return (
    <section className={styles.hero} aria-labelledby="shortener-title">
      <FloatingCircles />

      <div className={styles.intro}>
        <h1 id="shortener-title" className={styles.title}>
          Make long links <span>easier to carry.</span>
        </h1>
        <p className={styles.description}>
          Paste your long URL and get a short link, ready to copy and share
        </p>
      </div>

      <div className={styles.workspace}>
        <p className={styles.routeLabel} aria-hidden="true">
          <span>Long URL</span>
          <span className={styles.routeArrow}>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M2 8h12m-4-4 4 4-4 4" />
            </svg>
          </span>
          <span>Short link</span>
        </p>
        <ShortenerForm />
      </div>
    </section>
  )
}
