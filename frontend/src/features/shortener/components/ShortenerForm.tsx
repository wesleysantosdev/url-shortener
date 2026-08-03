import { FormEvent, useState } from 'react'
import {
  CreatedShortUrl,
  ShortenerApiError,
  createShortUrl,
} from '../api/create-short-url'
import { shortenerFormSchema } from '../schemas/shortener-form-schema'
import { ShortUrlResult } from './ShortUrlResult'
import styles from './ShortenerForm.module.css'

type SubmissionState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; shortUrl: CreatedShortUrl }
  | { status: 'error'; message: string }

const initialSubmissionState: SubmissionState = { status: 'idle' }

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof ShortenerApiError)) {
    return 'Could not shorten this URL. Try again.'
  }

  if (error.code === 'SHORT_URL_ALREADY_EXISTS') {
    return 'This URL has already been shortened. Try a different URL.'
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
      setSubmission({ status: 'success', shortUrl })
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
        <ShortUrlResult shortCode={submission.shortUrl.shortCode} />
      ) : null}
    </form>
  )
}
