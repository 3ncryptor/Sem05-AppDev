// Average brightness of a video frame, 0–255. Drawn at 32×24 because a tiny frame is plenty for an average
// and costs almost nothing. Used for the low-light hint (BUILD_PLAN §5.5).

const SAMPLE_WIDTH = 32
const SAMPLE_HEIGHT = 24

/** @type {CanvasRenderingContext2D | null} */
let context = null

/** @param {HTMLVideoElement} video @returns {number} */
export function averageBrightness(video) {
  if (!context) {
    const canvas = Object.assign(document.createElement('canvas'), { width: SAMPLE_WIDTH, height: SAMPLE_HEIGHT })
    context = canvas.getContext('2d', { willReadFrequently: true })
  }
  context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
  const pixels = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data
  let sum = 0
  for (let i = 0; i < pixels.length; i += 4) {
    // Rec. 601 luma: how bright each pixel looks to a person.
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
  }
  return sum / (pixels.length / 4)
}
