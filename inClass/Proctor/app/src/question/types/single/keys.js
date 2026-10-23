// 1–9 shortcut for single: key n picks option n.
/** Key `n` (1-based) picks option n. */
export function singleKey(question, _response, n) {
  const option = question.config.options[n - 1]
  return option ? { optionId: option.id } : undefined
}
