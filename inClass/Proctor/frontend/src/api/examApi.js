import { API_BASE_URL } from './config'

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.message || `Request failed with status ${response.status}`)
  }

  return body
}

/**
 * @param {{ userId: string, name: string }} params
 * @returns {Promise<{ message: string, sessionId: string }>}
 */
export function startExam({ userId, name }) {
  return request('/exam/start', {
    method: 'POST',
    body: JSON.stringify({ userId, name }),
  })
}

/**
 * @returns {Promise<Array<{ id: number, question: string, options: string[] }>>}
 */
export function getQuestions() {
  return request('/exam/mcq')
}

/**
 * @param {{ sessionId: string, questionId: number, selectedAnswer: number }} params
 */
export function submitAnswer({ sessionId, questionId, selectedAnswer }) {
  return request('/exam/answer', {
    method: 'POST',
    body: JSON.stringify({ sessionId, questionId, selectedAnswer }),
  })
}

/**
 * @param {string} sessionId
 */
export function getSession(sessionId) {
  return request(`/exam/session/${sessionId}`)
}

/**
 * @param {{ sessionId: string }} params
 */
export function submitExam({ sessionId }) {
  return request('/exam/submit', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

/**
 * @param {{ sessionId: string, type: string, message?: string, meta?: object }} params
 */
export function logProctorEvent({ sessionId, type, message, meta }) {
  return request('/exam/proctor-log', {
    method: 'POST',
    body: JSON.stringify({ sessionId, type, message, meta }),
  })
}
