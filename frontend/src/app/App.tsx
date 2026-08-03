import { ShortenerView } from '../features/shortener/views/ShortenerView'
import { SocialLink } from './SocialLink'
import styles from './App.module.css'

const linkedInUrl = 'https://www.linkedin.com/in/wesleysantosdev/'

export function App() {
  return (
    <div className={styles.pageShell}>
      <header className={styles.header}>
        <nav className={styles.navigation} aria-label="Primary">
          <span className={styles.brand}>Wesley Santos</span>
          <div className={styles.socialLinks}>
            <SocialLink
              network="LinkedIn"
              href={linkedInUrl}
            />
            <SocialLink
              network="GitHub"
              href="https://github.com/wesleysantosdev"
            />
          </div>
        </nav>
      </header>

      <main className={styles.main}>
        <ShortenerView />
      </main>

      <footer className={styles.footer}>
        <span>Built by </span>
        <a href={linkedInUrl} target="_blank" rel="noreferrer">
          Wesley Santos
        </a>
        <span className={styles.footerArrow} aria-hidden="true">
          ↗
        </span>
      </footer>
    </div>
  )
}
