const KEY = 'clipora.settings.v1'

const DEFAULTS = {
  theme: 'dark',
  confirmDownload: true,
}

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

export function applyTheme(theme) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme
  document.documentElement.dataset.theme = resolved
}
