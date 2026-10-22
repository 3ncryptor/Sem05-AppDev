// Tiny main-process logger. One line per message, prefixed so it's easy to grep in the terminal.
// It never receives passwords, tokens or images; callers pass channel names, codes and ids only.

/** @param {string} scope */
export function createLogger(scope) {
  const prefix = `[athena:${scope}]`
  return {
    info: (...args) => console.info(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  }
}
