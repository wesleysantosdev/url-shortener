import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the accessible page shell in English', () => {
    render(<App />)

    const navigation = screen.getByRole('navigation')

    expect(navigation).toBeInTheDocument()
    expect(within(navigation).getByText('shrten')).toBeInTheDocument()
    expect(navigation.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('shrten-logo-icon.png'),
    )
    expect(
      screen.getByRole('heading', { name: /make long links easier to carry/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Paste your long URL and get a short link, ready to copy and share',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Compact links, clear moves'),
    ).not.toBeInTheDocument()
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
