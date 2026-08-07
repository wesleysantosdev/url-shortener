import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShortenerView } from './ShortenerView'
import styles from './ShortenerView.module.css'

describe('ShortenerView', () => {
  it('groups the full phrase that is periodically compressed', () => {
    const { container } = render(<ShortenerView />)

    expect(
      screen.getByRole('heading', {
        name: 'Make long links easier to carry',
      }),
    ).toBeInTheDocument()
    expect(container.querySelector(`.${styles.titleLine}`)).toHaveTextContent(
      /^easier to carry$/,
    )
  })

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
