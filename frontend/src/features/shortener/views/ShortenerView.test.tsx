import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShortenerView } from './ShortenerView'
import styles from './ShortenerView.module.css'

describe('ShortenerView', () => {
  it('renders the route arrow with vertically symmetrical SVG geometry', () => {
    const { container } = render(<ShortenerView />)
    const routeArrow = container.querySelector(`.${styles.routeArrow} svg`)

    expect(routeArrow).toHaveAttribute('viewBox', '0 0 16 16')
    expect(routeArrow?.querySelector('path')).toHaveAttribute(
      'd',
      'M2 8h12m-4-4 4 4-4 4',
    )
  })
})
