// The answer-key editor for each question type (SCREENS §A4b). Each takes { draft, onChange, errors }.
import { MatchingEditor } from './MatchingEditor.jsx'
import { MultiEditor } from './MultiEditor.jsx'
import { NumericEditor } from './NumericEditor.jsx'
import { OrderingEditor } from './OrderingEditor.jsx'
import { ShortTextEditor } from './ShortTextEditor.jsx'
import { SingleEditor } from './SingleEditor.jsx'
import { TrueFalseEditor } from './TrueFalseEditor.jsx'

export const TYPE_EDITORS = Object.freeze({
  single: SingleEditor,
  multi: MultiEditor,
  true_false: TrueFalseEditor,
  short_text: ShortTextEditor,
  numeric: NumericEditor,
  ordering: OrderingEditor,
  matching: MatchingEditor,
})
