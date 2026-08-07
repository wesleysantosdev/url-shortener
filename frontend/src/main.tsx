import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './app/globals.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing application root: expected an element with id "root"')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
