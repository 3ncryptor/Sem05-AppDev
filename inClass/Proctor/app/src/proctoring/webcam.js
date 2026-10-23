// One camera stream for the whole exam (BUILD_PLAN §16): started in C3, reused in C5 and C7, stopped on C14.
// The student grants the camera once. `snap()` turns the current frame into JPEG bytes for evidence:save.

const SNAP_WIDTH = 1280
const JPEG_QUALITY = 0.7

/** @type {MediaStream | null} */
let stream = null
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener(isLive())
}

export const getStream = () => stream
export const isLive = () => Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live'))

/** Calls `fn(live)` whenever the camera starts or stops. Returns an unsubscribe function. */
export function onCameraChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Starts the camera (or reuses the running stream). Throws the getUserMedia error on failure. */
export async function startCamera() {
  if (isLive()) return stream
  stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
  for (const track of stream.getVideoTracks()) track.addEventListener('ended', notify)
  notify()
  return stream
}

export function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  notify()
}

/**
 * Draws the current frame at up to 1280 px wide and returns JPEG bytes.
 * @param {HTMLVideoElement} video a <video> showing the stream
 * @returns {Promise<ArrayBuffer>}
 */
export async function snap(video) {
  if (!video.videoWidth) throw new Error('The camera has no picture yet')
  const scale = Math.min(1, SNAP_WIDTH / video.videoWidth)
  const canvas = Object.assign(document.createElement('canvas'), {
    width: Math.round(video.videoWidth * scale),
    height: Math.round(video.videoHeight * scale),
  })
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Could not encode the photo')
  return blob.arrayBuffer()
}

/** Plain-language reason for a getUserMedia failure: 'permission' or 'busy'. */
export const cameraErrorKind = (error) => (error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'permission' : 'busy')
