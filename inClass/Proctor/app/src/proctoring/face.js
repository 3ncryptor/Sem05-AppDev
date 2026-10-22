// Face counting with MediaPipe BlazeFace (BUILD_PLAN §5.5), ported from RishiPariksha's face.ts.
// Frame in, number of faces out. It counts faces; it never recognises who someone is.
// The .wasm and model ship inside the app and load over app:// — nothing comes from the internet.
import { averageBrightness } from './brightness.js'

const MIN_DETECTION_CONFIDENCE = 0.6
const TOO_FAR_WIDTH_RATIO = 0.14
const LOW_LIGHT_THRESHOLD = 45

/** @typedef {{ faces: number, tooFar: boolean, lowLight: boolean }} FaceReading */

/** @type {import('@mediapipe/tasks-vision').FaceDetector | null} */
let detector = null
/** @type {Promise<typeof detector> | null} */
let loading = null
/** @type {string | null} */
let loadError = null
let lastTimestamp = 0

/** Resolves a path in public/ against the page, so it works under app://athena/ and http://localhost. */
const publicUrl = (relative) => new URL(relative, document.baseURI).href

/**
 * Loads the detector once. Resolves to null if it can't load; the caller then reports
 * `face_detection_unavailable` instead of flagging the student.
 */
export function loadFaceDetector() {
  if (detector) return Promise.resolve(detector)
  loading ??= (async () => {
    try {
      // Imported lazily so the 1 MB MediaPipe bundle only loads on screens that need it.
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const files = await FilesetResolver.forVisionTasks(publicUrl('mediapipe').replace(/\/$/, ''))
      detector = await FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: publicUrl('models/blaze_face_short_range.tflite'), delegate: 'CPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      })
      return detector
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error)
      loading = null
      return null
    }
  })()
  return loading
}

export const isFaceDetectorReady = () => detector !== null
export const faceDetectorError = () => loadError

/** MediaPipe's VIDEO mode needs strictly increasing timestamps. */
function nextTimestamp() {
  lastTimestamp = Math.max(performance.now(), lastTimestamp + 1)
  return lastTimestamp
}

/**
 * Counts faces in any image source (video, canvas). Null if the detector isn't loaded.
 * @param {HTMLVideoElement | HTMLCanvasElement} source
 */
export function countFaces(source) {
  if (!detector) return null
  return detector.detectForVideo(source, nextTimestamp()).detections
}

/**
 * Faces in the current camera frame, or null if the detector isn't ready or the video has no frame yet.
 * @param {HTMLVideoElement} video @returns {FaceReading | null}
 */
export function readFaces(video) {
  if (!detector || video.readyState < 2 || !video.videoWidth) return null
  const detections = countFaces(video)
  const widest = Math.max(0, ...detections.map((d) => d.boundingBox?.width ?? 0))
  return {
    faces: detections.length,
    tooFar: detections.length === 1 && widest < video.videoWidth * TOO_FAR_WIDTH_RATIO,
    lowLight: averageBrightness(video) < LOW_LIGHT_THRESHOLD,
  }
}
