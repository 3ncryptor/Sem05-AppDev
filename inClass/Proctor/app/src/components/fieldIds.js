/** aria-describedby for a control inside Field: the error wins over the hint. */
export const describedBy = (id, { hint, error }) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)
