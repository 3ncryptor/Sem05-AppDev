import { createContext, useContext } from 'react'

/**
 * State carried through the four pre-test steps (C3–C6). Nothing reaches the server until Begin:
 * consent and the system-check summary go with attempts.start, the photo with evidence:save.
 * @typedef {{
 *   exam: object, devMode: boolean,
 *   check: { passed: boolean, summary: object, faceSkipped: boolean } | null, setCheck: (check: object) => void,
 *   consent: object | null, setConsent: (consent: object) => void,
 *   photo: { bytes: ArrayBuffer, url: string } | null, setPhoto: (photo: object | null) => void,
 * }} PretestValue
 */
export const PretestContext = createContext(/** @type {PretestValue | null} */ (null))

export function usePretest() {
  const value = useContext(PretestContext)
  if (!value) throw new Error('usePretest must be used inside the pre-test layout')
  return value
}

export const STEPS = ['Setup', 'Rules', 'Photo', 'Begin']
export const STEP_PATHS = ['check', 'rules', 'photo', 'begin']
