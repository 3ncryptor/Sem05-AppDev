import { useState } from 'react'
import { RadioGroup } from '../../components/Radio.jsx'
import { useToast } from '../../components/toastContext.js'
import { ipc } from '../../lib/api.js'
import { setThemeAttribute } from '../../lib/theme.js'
import { Row, Section } from './Section.jsx'

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match macOS' },
]

/** theme:set → main sets nativeTheme.themeSource and saves it; theme:changed then updates every window. */
export function AppearanceSection({ initialMode }) {
  const [choice, setChoice] = useState(null)
  const toast = useToast()
  const mode = choice ?? initialMode ?? 'system'

  const onChange = async (next) => {
    setChoice(next)
    try {
      const { dark } = await ipc.themeSet(next)
      setThemeAttribute(dark)
    } catch {
      toast("Couldn't change the theme.", { tone: 'critical' })
    }
  }

  return (
    <Section title="Appearance">
      <Row label="Theme">
        <RadioGroup legend="Theme" hideLegend name="theme" inline value={mode} onChange={onChange} options={OPTIONS} />
      </Row>
    </Section>
  )
}
