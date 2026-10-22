// S2 Can't reach the server (SCREENS S2). Also used from S1's "Change" link to edit the address.
import { CircleAlert, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { Input } from '../../components/Input.jsx'
import { ApiError, ipc } from '../../lib/api.js'
import { CenteredLayout } from './CenteredLayout.jsx'
import { useAuth } from './useAuth.js'
import styles from './ServerPage.module.css'

export function ServerPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const from = location.state?.from && location.state.from !== '/server' ? location.state.from : '/'
  const isChanging = Boolean(location.state?.change)

  const [savedUrl, setSavedUrl] = useState('')
  const [url, setUrl] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    ipc.serverGet().then(({ url: current }) => {
      setSavedUrl(current)
      setUrl(current)
    })
  }, [])

  /** Pings the saved server; on success re-checks the session and returns to the screen that failed. */
  const pingAndReturn = async (target) => {
    const ping = await ipc.serverPing()
    if (!ping.ok) {
      setStatus(`Still no answer from ${target}.`)
      return
    }
    await refresh()
    navigate(from, { replace: true })
  }

  const onRetry = async () => {
    setBusy('retry')
    setStatus(null)
    await pingAndReturn(savedUrl).finally(() => setBusy(null))
  }

  const onSave = async (event) => {
    event.preventDefault()
    setBusy('save')
    setStatus(null)
    setFieldError(null)
    try {
      const { url: saved } = await ipc.serverSet(url)
      setSavedUrl(saved)
      setUrl(saved)
      await pingAndReturn(saved)
    } catch (error) {
      setFieldError(error instanceof ApiError ? (error.fields?.url ?? error.message) : 'Could not save that address.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <CenteredLayout>
      <form className={styles.card} onSubmit={onSave} noValidate aria-labelledby="server-title">
        <div className={styles.heading}>
          {!isChanging && <WifiOff size={20} aria-hidden="true" className={styles.icon} />}
          <h1 id="server-title" className={styles.title}>
            {isChanging ? 'Exam server' : "Can't reach the exam server"}
          </h1>
        </div>
        {!isChanging && (
          <>
            <p>
              Athena tried <span className="mono">{savedUrl || '…'}</span> and got no answer.
            </p>
            <ul className={styles.checks}>
              <li>
                Is the backend running?
                <code className={styles.code}>cd backend &amp;&amp; npm start</code>
              </li>
              <li>Are you on the same network?</li>
            </ul>
          </>
        )}
        <Input
          label="Server address"
          mono
          spellCheck={false}
          autoFocus={isChanging}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          error={fieldError}
          hint="http:// or https:// and a host, like http://127.0.0.1:3000"
        />
        {status && (
          <p className={styles.status} role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {status}
          </p>
        )}
        <div className={styles.actions}>
          {isChanging ? (
            <Button onClick={() => navigate(from)}>Cancel</Button>
          ) : (
            <Button onClick={onRetry} loading={busy === 'retry'} disabled={busy === 'save'}>
              Retry
            </Button>
          )}
          <Button type="submit" variant="primary" loading={busy === 'save'} disabled={busy === 'retry'}>
            Save and retry
          </Button>
        </div>
      </form>
    </CenteredLayout>
  )
}
