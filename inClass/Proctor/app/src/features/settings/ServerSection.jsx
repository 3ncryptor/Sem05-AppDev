import { CircleCheck, CircleX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/Button.jsx'
import { Input } from '../../components/Input.jsx'
import { ApiError, ipc } from '../../lib/api.js'
import { useAuth } from '../auth/useAuth.js'
import { Row, Section } from './Section.jsx'
import styles from './Settings.module.css'

/**
 * Address + Test. Test saves the address (server:set) then pings it (server:ping).
 * Changing to a different server signs you out in main, because a token only means something to its own server.
 */
export function ServerSection() {
  const [url, setUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const { markSignedOut } = useAuth()

  useEffect(() => {
    ipc.serverGet().then(({ url: current }) => {
      setUrl(current)
      setSavedUrl(current)
    })
  }, [])

  const onTest = async (event) => {
    event.preventDefault()
    setTesting(true)
    setError(null)
    setResult(null)
    try {
      const { url: saved } = await ipc.serverSet(url)
      // Main already dropped the old server's session; follow it to the sign-in screen.
      if (saved !== savedUrl) return markSignedOut()
      setUrl(saved)
      setResult(await ipc.serverPing())
    } catch (caught) {
      setError(caught instanceof ApiError ? (caught.fields?.url ?? caught.message) : 'Could not save that address.')
    } finally {
      setTesting(false)
    }
  }

  const changesServer = url.trim() !== savedUrl
  return (
    <Section title="Server">
      <Row label="Address">
        <form className={styles.inline} onSubmit={onTest} noValidate>
          <div className={styles.grow}>
            <Input
              label="Server address"
              hideLabel
              mono
              spellCheck={false}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              error={error}
              hint={changesServer ? 'Saving a different server signs you out.' : undefined}
            />
          </div>
          <Button type="submit" loading={testing}>
            {changesServer ? 'Save and test' : 'Test'}
          </Button>
          <span role="status" className={styles.status}>
            {result?.ok && (
              <span className={styles.ok}>
                <CircleCheck size={16} aria-hidden="true" /> Connected · {result.ms} ms
              </span>
            )}
            {result && !result.ok && (
              <span className={styles.bad}>
                <CircleX size={16} aria-hidden="true" /> No answer
              </span>
            )}
          </span>
        </form>
      </Row>
    </Section>
  )
}
