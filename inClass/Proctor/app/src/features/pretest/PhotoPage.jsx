// C5 Step 3 · Identity photo. Held in memory until C6 creates the attempt.
import { Camera } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { isLive, snap, startCamera } from '../../proctoring/webcam.js'
import { CameraPreview } from './CameraPreview.jsx'
import { usePretest } from './pretestContext.js'
import styles from './Pretest.module.css'

export function PhotoPage() {
  const { consent, photo, setPhoto } = usePretest()
  const navigate = useNavigate()
  const video = useRef(null)
  const [cameraReady, setCameraReady] = useState(isLive())
  const [taken, setTaken] = useState(photo)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cameraReady) return
    startCamera()
      .then(() => setCameraReady(true))
      .catch(() => setError('The camera stopped. Go back to the system check.'))
  }, [cameraReady])

  if (!consent) return <Navigate to="../rules" replace />

  const canTake = cameraReady

  const onTake = async () => {
    try {
      const bytes = await snap(video.current)
      setTaken({ bytes, url: URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' })) })
    } catch (caught) {
      setError(caught.message)
    }
  }
  const onRetake = () => {
    if (taken && taken !== photo) URL.revokeObjectURL(taken.url)
    setTaken(null)
  }
  const onUse = () => {
    setPhoto(taken)
    navigate('../begin')
  }

  return (
    <article className={styles.card} aria-labelledby="photo-title">
      <h1 id="photo-title" className={styles.title}>
        Take your identity photo
      </h1>
      <p className={styles.soft}>Your examiner compares it with photos taken during the exam.</p>
      <div className={styles.photoFrame}>
        <CameraPreview videoRef={video} ready={cameraReady} frozenUrl={taken?.url ?? null} />
      </div>
      {!taken && (
        <p className={styles.faceStatus} role="status">
          Face the camera, alone, then take the photo.
        </p>
      )}
      {error && (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button onClick={() => navigate('../rules')}>‹ Back</Button>
        {taken ? (
          <span className={styles.footerRight}>
            <Button onClick={onRetake}>Retake</Button>
            <Button variant="primary" onClick={onUse}>
              Use this photo →
            </Button>
          </span>
        ) : (
          <Button variant="primary" icon={Camera} onClick={onTake} disabled={!canTake}>
            Take photo
          </Button>
        )}
      </div>
    </article>
  )
}
