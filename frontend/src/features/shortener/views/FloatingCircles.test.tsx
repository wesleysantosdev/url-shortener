import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FloatingCircles } from './FloatingCircles'

describe('FloatingCircles', () => {
  it('renders five decorative circles outside the accessibility tree', () => {
    const { container } = render(<FloatingCircles />)
    const circleField = container.firstElementChild

    expect(circleField).toHaveAttribute('aria-hidden', 'true')
    expect(circleField?.children).toHaveLength(5)
    expect(circleField).not.toHaveTextContent(/\S/)
  })
})
