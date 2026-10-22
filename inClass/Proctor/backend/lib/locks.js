'use strict';
// One promise chain per key (usually an attempt id). Work for the same attempt runs one at a time,
// so a heartbeat and an events request can't both read flagCount = 2 and both write 3.
// The store's per-file queue protects the file; this protects the read-modify-write around it.

const chains = new Map();

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function withLock(key, task) {
  const previous = chains.get(key) || Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  const tail = run.catch(() => undefined);
  chains.set(key, tail);
  // Forget the chain once it's idle so the map doesn't grow forever.
  tail.then(() => {
    if (chains.get(key) === tail) chains.delete(key);
  });
  return run;
}

module.exports = { withLock };
