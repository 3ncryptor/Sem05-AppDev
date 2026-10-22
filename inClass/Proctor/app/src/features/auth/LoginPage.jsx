// S1 Login (SCREENS S1). Sends auth:login; main keeps the token and returns only { user }.
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { Input } from '../../components/Input.jsx'
import { errorMessage, ipc } from '../../lib/api.js'
import { hostOf } from '../../lib/format.js'
import { useLocal } from '../../lib/useLocal.js'
import { BrandMark } from '../shell/BrandMark.jsx'
import { homeFor } from './authContext.js'
import { CenteredLayout } from './CenteredLayout.jsx'
import { useAuth } from './useAuth.js'
import styles from './LoginPage.module.css'

const loadContext = async () => {
  const [server, info] = await Promise.all([ipc.serverGet(), ipc.appInfo()])
  return { serverUrl: server.url, info }
}

/** Empty-field messages, checked before anything is sent. */
function validate(rollNo, password) {
  const fields = {}
  if (!rollNo.trim()) fields.rollNo = 'Enter your roll number.'
  if (!password) fields.password = 'Enter your password.'
  return fields
}

export function LoginPage() {
  const { status, user, reason, signIn } = useAuth()
  const navigate = useNavigate()
  const { data: context } = useLocal(loadContext)
  const [rollNo, setRollNo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(reason === 'expired' ? 'Please sign in again.' : null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'signedIn' && user) return <Navigate to={homeFor(user.role)} replace />

  const onSubmit = async (event) => {
    event.preventDefault()
    const fields = validate(rollNo, password)
    setFieldErrors(fields)
    if (Object.keys(fields).length > 0) return
    setSubmitting(true)
    setFormError(null)
    try {
      const signedIn = await signIn(rollNo.trim(), password)
      navigate(homeFor(signedIn.role), { replace: true })
    } catch (error) {
      setSubmitting(false)
      if (error.code === 'SERVER_UNREACHABLE') return navigate('/server', { state: { from: '/login' } })
      if (error.fields) setFieldErrors(error.fields)
      setFormError(errorMessage(error))
    }
  }

  const footer = context?.info && `v${context.info.version} · profile: ${context.info.profile}`
  const toggleLabel = showPassword ? 'Hide password' : 'Show password'

  return (
    <CenteredLayout footer={footer}>
      <form className={styles.card} onSubmit={onSubmit} noValidate aria-labelledby="login-title">
        <div className={styles.heading}>
          <BrandMark size="lg" />
          <p id="login-title" className={styles.subtitle}>
            Sign in to take or manage exams
          </p>
        </div>
        <div className={styles.fields}>
          <Input
            label="Roll number"
            name="rollNo"
            size="lg"
            mono
            autoFocus
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="characters"
            placeholder="23CS042"
            value={rollNo}
            maxLength={64}
            onChange={(event) => setRollNo(event.target.value)}
            error={fieldErrors.rollNo}
          />
          <Input
            label="Password"
            name="password"
            size="lg"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            maxLength={64}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            trailing={
              <button type="button" className={styles.reveal} onClick={() => setShowPassword((shown) => !shown)} aria-label={toggleLabel} aria-pressed={showPassword} title={toggleLabel}>
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            }
          />
        </div>
        {formError && (
          <p className={styles.error} role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {formError}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          Sign in
        </Button>
        <p className={styles.server}>
          Server: <span className="mono">{context ? hostOf(context.serverUrl) : '…'}</span> ·{' '}
          <Link to="/server" state={{ from: '/login', change: true }}>
            Change
          </Link>
        </p>
      </form>
    </CenteredLayout>
  )
}
