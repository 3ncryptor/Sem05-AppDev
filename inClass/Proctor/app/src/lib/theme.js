// Keeps <html data-theme> in sync with main's nativeTheme (BUILD_PLAN §16 Styles).
// The first value comes from prefers-color-scheme, which Electron derives from nativeTheme.themeSource,
// so the first paint is already right. After that, main sends theme:changed.

/** @param {boolean} dark */
export function setThemeAttribute(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function applyInitialTheme() {
  setThemeAttribute(window.matchMedia('(prefers-color-scheme: dark)').matches)
  window.athena?.theme.onChange(({ dark }) => setThemeAttribute(dark))
}
