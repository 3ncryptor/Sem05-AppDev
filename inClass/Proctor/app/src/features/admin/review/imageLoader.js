// Loads saved exam images through IPC a few at a time, caches the data URLs, and only starts
// once a thumbnail scrolls near the viewport.
import { useEffect, useState } from 'react'
import { ipc } from '../../../lib/api.js'

const MAX_PARALLEL = 3
const CACHE_LIMIT = 120
const NEAR_VIEWPORT = '200px'

const cache = new Map()
const waiting = []
let active = 0

function pump() {
  while (active < MAX_PARALLEL && waiting.length > 0) {
    const job = waiting.shift()
    active += 1
    job().finally(() => {
      active -= 1
      pump()
    })
  }
}

function schedule(task) {
  return new Promise((resolve, reject) => {
    waiting.push(() => task().then(resolve, reject))
    pump()
  })
}

function remember(key, promise) {
  cache.set(key, promise)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
  promise.catch(() => cache.delete(key))
  return promise
}

/** Capture records name files "<kind>/<name>.jpg"; the IPC wants the bare name. */
export const bareFileName = (file) => String(file ?? '').split('/').pop()

/** @returns {Promise<string>} a data:image/jpeg URL */
export function loadAdminImage(attemptId, kind, file) {
  const key = `${attemptId}|${kind}|${file}`
  return cache.get(key) ?? remember(key, schedule(() => ipc.adminImage(attemptId, kind, file)))
}

/** { src, error, loading } for one image; does nothing until `enabled`. */
export function useAdminImage(attemptId, kind, file, enabled = true) {
  const key = attemptId && file ? `${attemptId}|${kind}|${file}` : null
  const [result, setResult] = useState({ key: null, src: null, error: null })

  useEffect(() => {
    if (!enabled || !key) return undefined
    let cancelled = false
    loadAdminImage(attemptId, kind, file)
      .then((src) => !cancelled && setResult({ key, src, error: null }))
      .catch((error) => !cancelled && setResult({ key, src: null, error }))
    return () => {
      cancelled = true
    }
  }, [enabled, key, attemptId, kind, file])

  const current = result.key === key ? result : { src: null, error: null }
  return { src: current.src, error: current.error, loading: Boolean(enabled && key) && result.key !== key }
}

/** [ref callback, seen]: seen turns true once the element comes near the viewport, and stays true. */
export function useSeen() {
  const [node, setNode] = useState(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (!node || seen) return undefined
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setSeen(true)
    }, { rootMargin: NEAR_VIEWPORT })
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, seen])
  return [setNode, seen]
}
