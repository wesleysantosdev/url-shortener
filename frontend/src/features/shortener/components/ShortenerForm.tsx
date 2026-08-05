import { FormEvent, useState } from 'react'
import {
  ShortenerApiError,
  createShortUrl,
} from '../api/create-short-url'
import { shortenerFormSchema } from '../schemas/shortener-form-schema'
import {
  addShortUrlToHistory,
  loadShortUrlHistory,
  saveShortUrlHistory,
  ShortUrlHistoryEntry,
} from '../api/short-url-history'
import { ShortUrlHistory } from './ShortUrlHistory'
import styles from './ShortenerForm.module.css'

type SubmissionState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; message: string }

const initialSubmissionState: SubmissionState = { status: 'idle' }

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof ShortenerApiError)) {
    return 'Could not shorten this URL. Try again.'
  }

  if (error.code === 'CREATION_RATE_LIMIT_EXCEEDED') {
    const seconds = error.retryAfterSeconds

    if (seconds && seconds >= 60) {
      const minutes = Math.ceil(seconds / 60)
      return `Too many links created. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
    }

    return `Too many links created. Try again in ${seconds ?? 1} seconds.`
  }

  if (error.code === 'RATE_LIMIT_UNAVAILABLE') {
    return 'Link creation is temporarily unavailable while abuse protection recovers. Try again shortly.'
  }

  if (error.code === 'VALIDATION_ERROR') {
    return 'The server rejected this URL. Check it and try again.'
  }

  return error.message
}

export function ShortenerForm() {
  const [originalUrl, setOriginalUrl] = useState('')
  const [validationMessage, setValidationMessage] = useState<string>()
  const [submission, setSubmission] =
    useState<SubmissionState>(initialSubmissionState)
  const [shortUrlHistory, setShortUrlHistory] = useState<ShortUrlHistoryEntry[]>(
    loadShortUrlHistory,
  )
  const isPending = submission.status === 'pending'

  function changeOriginalUrl(nextOriginalUrl: string) {
    setOriginalUrl(nextOriginalUrl)
    setValidationMessage(undefined)

    if (!isPending) {
      setSubmission(initialSubmissionState)
    }
  }

  async function submitShortUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isPending) {
      return
    }

    const parsedForm = shortenerFormSchema.safeParse({ url: originalUrl })

    if (!parsedForm.success) {
      setSubmission(initialSubmissionState)
      setValidationMessage(parsedForm.error.issues[0]?.message)
      return
    }

    setValidationMessage(undefined)
    setSubmission({ status: 'pending' })

    try {
      const shortUrl = await createShortUrl(parsedForm.data.url)
      const historyEntry = { shortUrl, originalUrl: parsedForm.data.url }
      setShortUrlHistory((currentHistory) => {
        const nextHistory = addShortUrlToHistory(currentHistory, historyEntry)
        saveShortUrlHistory(nextHistory)
        return nextHistory
      })
      setSubmission({ status: 'success' })
    } catch (error: unknown) {
      setSubmission({ status: 'error', message: requestErrorMessage(error) })
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={submitShortUrl}
      noValidate
      aria-busy={isPending}
    >
      <label className={styles.label} htmlFor="original-url">
        Long URL
      </label>
      <div className={styles.controlRow}>
        <input
          className={styles.input}
          id="original-url"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://example.com/a-very-long-link"
          value={originalUrl}
          disabled={isPending}
          aria-invalid={validationMessage ? true : undefined}
          aria-describedby={validationMessage ? 'url-validation-error' : undefined}
          onChange={(event) => changeOriginalUrl(event.target.value)}
        />
        <button
          className={styles.submitButton}
          type="submit"
          disabled={isPending}
        >
          {isPending ? 'Shortening…' : 'Shorten'}
        </button>
      </div>
      {validationMessage ? (
        <p
          className={`${styles.message} ${styles.errorMessage}`}
          id="url-validation-error"
          role="alert"
        >
          {validationMessage}
        </p>
      ) : null}
      {submission.status === 'error' ? (
        <p className={`${styles.message} ${styles.errorMessage}`} role="alert">
          {submission.message}
        </p>
      ) : null}
      {submission.status === 'success' ? (
        <p className={`${styles.message} ${styles.successMessage}`} role="status">
          Short link ready.
        </p>
      ) : null}
      <ShortUrlHistory shortUrls={shortUrlHistory} />
    </form>
  )
}
