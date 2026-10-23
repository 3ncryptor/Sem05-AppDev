// Command-line flags, read once. Shared so any module can ask (e.g. system.js and --fake-media).

/** Reads `--name=value` or a bare `--name` from argv. */
export function flag(name) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg === `--${name}` || arg.startsWith(prefix))
  if (!match) return null
  return match === `--${name}` ? true : match.slice(prefix.length)
}

export const isSelftest = flag('selftest') === true
export const isSpike = flag('spike') === true
/** Dev only (main.js refuses it when packaged): Chromium's fake camera, no permission prompts. */
export const wantsFakeMedia = flag('fake-media') === true
