import styles from './FloatingCircles.module.css'

export function FloatingCircles() {
  return (
    <div className={styles.circleField} aria-hidden="true">
      <span className={`${styles.circle} ${styles.circleOne}`} />
      <span className={`${styles.circle} ${styles.circleTwo}`} />
      <span className={`${styles.circle} ${styles.circleThree}`} />
      <span className={`${styles.circle} ${styles.circleFour}`} />
      <span className={`${styles.circle} ${styles.circleFive}`} />
    </div>
  )
}
