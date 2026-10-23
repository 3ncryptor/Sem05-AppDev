// C3a fix cards: what went wrong, how to fix it, and the actions that help (SCREENS C3a table).
import { CircleX, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { ipc } from '../../lib/api.js'
import styles from './Pretest.module.css'

/** Copy and actions per failure kind. `actions` names map to buttons below. */
const CARDS = {
  server: { title: "Can't reach the exam server", body: ['Check that the backend is running and that you are on the same network.'], actions: ['retry', 'changeServer'] },
  cameraPermission: {
    title: 'Athena can’t use your camera',
    steps: ['Click Open System Settings', 'Turn on Athena under Privacy & Security → Camera', 'Come back and click Run again'],
    actions: ['openCamera', 'retry'],
  },
  cameraBusy: { title: 'The camera isn’t working', body: ['Another app may be using it (Zoom, FaceTime). Close it.'], actions: ['retry'] },
  noFace: { title: 'We can’t see your face', body: ['Sit facing the camera, in good light, alone.'], actions: ['retry'] },
  manyFaces: { title: 'More than one face in view', body: ['Sit facing the camera, in good light, alone.'], actions: ['retry'] },
  dark: { title: 'It’s a little dark', body: ['Add some light in front of you.'], actions: ['retry'], warn: true },
  screen: {
    title: 'Screen Recording is off for Athena',
    body: ['macOS needs your permission for Athena to capture the screen.'],
    steps: ['Click Open System Settings', 'Turn on Athena under Screen & System Audio Recording', 'Click Quit and reopen (macOS asks for this)'],
    note: 'Your exam hasn’t started. Nothing is lost.',
    actions: ['openScreen', 'relaunch'],
  },
  displays: {
    title: 'Two displays connected',
    body: ['This exam allows one display.'],
    bullets: ['Unplug the extra monitor, or', 'Mirror your displays in System Settings → Displays'],
    actions: ['retry'],
  },
  faceUnavailable: { title: 'Face check unavailable', body: ['The exam will run without it.'], actions: [], warn: true },
  generic: { title: 'This check didn’t finish', body: ['Try it again.'], actions: ['retry'] },
}

/**
 * @param {{ kind: string, warn?: boolean, displays?: number, onRetry: () => void, onSkip?: () => void }} props
 *   onSkip: dev builds only, lets a scripted run continue past a check the test machine can't pass.
 */
export function FixCard({ kind, warn = false, displays, onRetry, onSkip }) {
  const navigate = useNavigate()
  const card = CARDS[kind] ?? CARDS.generic
  const isWarning = warn || card.warn
  const Icon = isWarning ? TriangleAlert : CircleX
  const title = kind === 'displays' && displays > 2 ? `${displays} displays connected` : card.title
  const buttons = {
    retry: <Button key="retry" onClick={onRetry}>{kind === 'server' ? 'Retry' : 'Run again'}</Button>,
    changeServer: <Button key="change" variant="ghost" onClick={() => navigate('/server', { state: { from: window.location.hash.slice(1), change: true } })}>Change server</Button>,
    openCamera: <Button key="cam" onClick={() => ipc.openPrivacy('camera')}>Open System Settings</Button>,
    openScreen: <Button key="screen" onClick={() => ipc.openPrivacy('screen')}>Open System Settings</Button>,
    relaunch: <Button key="relaunch" variant="primary" onClick={() => ipc.relaunch()}>Quit and reopen</Button>,
  }
  return (
    <div className={`${styles.fixCard} ${isWarning ? styles.fixWarn : ''}`} role={isWarning ? undefined : 'alert'}>
      <p className={styles.fixTitle}>
        <Icon size={16} aria-hidden="true" /> {title}
      </p>
      {card.body?.map((line) => <p key={line}>{line}</p>)}
      {card.steps && (
        <ol className={styles.fixSteps}>
          {card.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      )}
      {card.bullets && (
        <ul className={styles.fixSteps}>
          {card.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
      {card.note && <p className={styles.fixNote}>{card.note}</p>}
      {(card.actions.length > 0 || onSkip) && (
        <div className={styles.fixActions}>
          {card.actions.map((action) => buttons[action])}
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip (dev only)
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
