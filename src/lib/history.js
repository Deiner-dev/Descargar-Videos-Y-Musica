const KEY = 'clipora.history.v1'

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveHistory(items) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40)))
}

export function addHistoryItem(items, entry) {
  const next = [entry, ...items.filter((item) => item.id !== entry.id)]
  saveHistory(next)
  return next
}

export function clearHistory() {
  localStorage.removeItem(KEY)
  return []
}
