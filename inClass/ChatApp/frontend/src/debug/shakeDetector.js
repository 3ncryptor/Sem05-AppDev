/**
 * Pure shake detector fed with accelerometer samples (in g). A shake is
 * `hits` strong jolts within `windowMs`; after one fires, it stays quiet for
 * `cooldownMs` so a single shake never opens the Inspector twice.
 */

/**
 * @param {{ threshold: number, hits: number, windowMs: number, cooldownMs: number }} options
 * @returns {{ sample: (reading: { x: number, y: number, z: number }, now: number) => boolean }}
 */
export function createShakeDetector({ threshold, hits, windowMs, cooldownMs }) {
  let jolts = [];
  let quietUntil = 0;

  function sample({ x, y, z }, now) {
    if (now < quietUntil) return false;
    // Resting on a table reads about 1 g; only the extra force counts.
    const force = Math.abs(Math.sqrt(x * x + y * y + z * z) - 1);
    jolts = jolts.filter((time) => now - time <= windowMs);
    if (force < threshold) return false;

    jolts = [...jolts, now];
    if (jolts.length < hits) return false;
    jolts = [];
    quietUntil = now + cooldownMs;
    return true;
  }

  return { sample };
}
