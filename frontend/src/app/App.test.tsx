import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the accessible page shell in English', () => {
    render(<App />)

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /make long links easier to carry/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /long url/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shorten' })).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/wesleysantosdev/',
    )
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/wesleysantosdev',
    )
    expect(
      screen.getByRole('contentinfo').getElementsByTagName('a')[0],
    ).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/wesleysantosdev/',
    )
  })
})
