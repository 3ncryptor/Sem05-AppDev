// One small module per question type (BUILD_PLAN §5.4). QuestionView picks the Answer component by `type`;
// `keyChoice` maps the 1–9 shortcut to a new response for the choice types.
import { MatchingAnswer } from './matching/Answer.jsx'
import { MultiAnswer } from './multi/Answer.jsx'
import { multiKey } from './multi/keys.js'
import { NumericAnswer } from './numeric/Answer.jsx'
import { OrderingAnswer } from './ordering/Answer.jsx'
import { ShortTextAnswer } from './shortText/Answer.jsx'
import { SingleAnswer } from './single/Answer.jsx'
import { singleKey } from './single/keys.js'
import { TrueFalseAnswer } from './trueFalse/Answer.jsx'
import { trueFalseKey } from './trueFalse/keys.js'

export const QUESTION_TYPES = Object.freeze({
  single: { Answer: SingleAnswer, keyChoice: singleKey },
  multi: { Answer: MultiAnswer, keyChoice: multiKey },
  true_false: { Answer: TrueFalseAnswer, keyChoice: trueFalseKey },
  short_text: { Answer: ShortTextAnswer, keyChoice: null },
  numeric: { Answer: NumericAnswer, keyChoice: null },
  ordering: { Answer: OrderingAnswer, keyChoice: null },
  matching: { Answer: MatchingAnswer, keyChoice: null },
})

/** A response counts as answered when it's present (Clear answer sends null). */
export const isAnswered = (response) => response !== null && response !== undefined
