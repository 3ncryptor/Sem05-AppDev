// C5 Step 3 · Identity photo. Needs exactly one face. Held in memory until C6 creates the attempt.
import { Camera, Check, CircleX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '../../components/Button.jsx'
import { isFaceDetectorReady, readFaces } from '../../proctoring/face.js'
import { isLive, snap, startCamera } from '../../proctoring/webcam.js'
import { CameraPreview } from './CameraPreview.jsx'
import { usePretest } from './pretestContext.js'
import styles from './Pretest.module.css'

const SAMPLE_MS = 500

function faceMessage(faces) {
  if (faces === 1) return { ok: true, text: 'One face in view' }
  if (faces === 0) return { ok: false, text: 'No face in view. Face the camera.' }
  if (faces > 1) return { ok: false, text: `${faces} faces in view. Only you should be in the picture.` }
  return { ok: false, text: 'Looking for your face…' }
}

export function PhotoPage() {
  const { consent, check, photo, setPhoto } = usePretest()
  const navigate = useNavigate()
  const video = useRef(null)
  const [cameraReady, setCameraReady] = useState(isLive())
  const [faces, setFaces] = useState(null)
  const [taken, setTaken] = useState(photo)
  const [error, setError] = useState(null)
  // Without the face model (or with a dev skip in C3) the photo can't be checked, so it's allowed as is.
  const unchecked = !isFaceDetectorReady() || check?.faceSkipped

  useEffect(() => {
    if (cameraReady) return
    startCamera()
      .then(() => setCameraReady(true))
      .catch(() => setError('The camera stopped. Go back to the system check.'))
  }, [cameraReady])

  useEffect(() => {
    if (!cameraReady || taken) return undefined
    const id = setInterval(() => {
      const reading = video.current ? readFaces(video.current) : null
      if (reading) setFaces(reading.faces)
    }, SAMPLE_MS)
    return () => clearInterval(id)
  }, [cameraReady, taken])

  if (!consent) return <Navigate to="../rules" replace />

  const status = faceMessage(faces)
  const canTake = cameraReady && (unchecked || faces === 1)

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
        <p className={`${styles.faceStatus} ${status.ok ? styles.okText : ''}`} role="status">
          {unchecked ? (check?.faceSkipped ? 'Face check skipped (dev only): take the photo facing the camera.' : 'Face check unavailable: take the photo facing the camera.') : (
            <>
              {status.ok ? <Check size={16} aria-hidden="true" /> : <CircleX size={16} aria-hidden="true" />} {status.text}
            </>
          )}
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
