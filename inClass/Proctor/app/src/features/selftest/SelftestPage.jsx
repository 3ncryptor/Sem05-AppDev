// Phase 0 spike page (#/selftest). `--selftest` reads the result headlessly; `--spike` opens this page so a
// person can also try the real camera: it triggers the macOS camera prompt and shows a live face count.
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button.jsx'
import { Card } from '../../components/Card.jsx'
import { loadFaceDetector, readFaces } from '../../proctoring/face.js'
import styles from './SelftestPage.module.css'

const SAMPLE_INTERVAL_MS = 1000

export function SelftestPage() {
  const [result, setResult] = useState(null)
  const [camera, setCamera] = useState({ state: 'off', reading: null, error: null })
  const videoRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    Promise.resolve(window.__athenaSelftest).then((value) => !cancelled && setResult(value ?? null))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (camera.state !== 'on') return undefined
    const id = setInterval(() => {
      const reading = videoRef.current ? readFaces(videoRef.current) : null
      if (reading) setCamera((current) => ({ ...current, reading }))
    }, SAMPLE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [camera.state])

  useEffect(() => {
    const video = videoRef.current
    return () => video?.srcObject?.getTracks().forEach((track) => track.stop())
  }, [])

  const startCamera = async () => {
    setCamera({ state: 'starting', reading: null, error: null })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640 }, audio: false })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      await loadFaceDetector()
      setCamera({ state: 'on', reading: null, error: null })
    } catch (error) {
      setCamera({ state: 'off', reading: null, error: error.message })
    }
  }

  return (
    <div className={styles.page}>
      <div className={`drag-region ${styles.titlebar}`} />
      <Card className={styles.card}>
        <h1 className={styles.title}>Packaging spike</h1>
        <p className={styles.soft}>MediaPipe loaded over app:// from inside the app bundle.</p>
        <pre className={styles.result}>{result ? JSON.stringify(result, null, 2) : 'Running…'}</pre>
        <video ref={videoRef} className={styles.video} muted playsInline aria-label="Camera preview" />
        <p role="status" className={styles.count}>
          {camera.reading ? `${camera.reading.faces} face${camera.reading.faces === 1 ? '' : 's'}` : camera.error ?? ''}
        </p>
        <Button variant="primary" onClick={startCamera} loading={camera.state === 'starting'} disabled={camera.state === 'on'}>
          Try the camera
        </Button>
      </Card>
    </div>
  )
}
