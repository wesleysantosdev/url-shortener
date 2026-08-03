import { ShortenerForm } from '../components/ShortenerForm'
import { FloatingCircles } from './FloatingCircles'
import styles from './ShortenerView.module.css'

export function ShortenerView() {
  return (
    <section className={styles.hero} aria-labelledby="shortener-title">
      <FloatingCircles />

      <div className={styles.intro}>
        <p className={styles.eyebrow}>Compact links, clear moves</p>
        <h1 id="shortener-title" className={styles.title}>
          Make long links <span>easier to carry.</span>
        </h1>
        <p className={styles.description}>
          Paste one long URL. Get a compact link that is ready to copy and share.
        </p>
      </div>

      <div className={styles.workspace}>
        <p className={styles.routeLabel} aria-hidden="true">
          <span>Long URL</span>
          <span>→</span>
          <span>Short link</span>
        </p>
        <ShortenerForm />
      </div>
    </section>
  )
}
