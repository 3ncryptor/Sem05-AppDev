export const toggle = (ids, id) => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id])

/** Order the ids the way the options are shown, so the response is stable. */
export const ordered = (question, ids) => question.config.options.map((o) => o.id).filter((id) => ids.includes(id))
