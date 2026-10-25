// The webcam half of the exam screenshots: keeps the camera stream from C3 running and, each time main takes
// a screenshot (`exam:capture-now`), saves one webcam frame next to it through evidence:save.
// Lives in ExamProvider, so it keeps running on the exam room and the review page alike.
import { useEffect } from 'react'
import { ipc } from '../../lib/api.js'
import { getStream, snap, startCamera } from '../../proctoring/webcam.js'

/** @param {{ attemptId: string | undefined, isRunning: boolean }} options */
export function useWebcamPhotos({ attemptId, isRunning }) {
  useEffect(() => {
    if (!isRunning || !attemptId) return undefined
    const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true })
    const attach = () => {
      const stream = getStream()
      if (stream && video.srcObject !== stream) {
        video.srcObject = stream
        video.play().catch(() => null)
      }
    }
    // After a window reload the stream from C3 is gone; start it again (the permission is already granted).
    startCamera().then(attach).catch(() => null)

    const off = window.athena.exam.on('exam:capture-now', async (shot) => {
      if (shot?.attemptId !== attemptId) return
      try {
        attach()
        const bytes = await snap(video)
        await ipc.evidenceSave({ attemptId, kind: 'camera', reason: 'interval', bytes })
      } catch {
        // No camera picture this time: the screenshot is saved anyway, and the next timer tick tries again.
      }
    })

    return () => {
      off()
      video.srcObject = null
    }
  }, [attemptId, isRunning])
}
