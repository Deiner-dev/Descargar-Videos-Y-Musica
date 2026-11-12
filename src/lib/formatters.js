export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 10 || unit === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unit]}`
}

export function formatSpeed(bytesPerSecond) {
  const label = formatBytes(bytesPerSecond)
  return label ? `${label}/s` : null
}

export function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  if (minutes > 59) return `${Math.floor(minutes / 60)} h`
  if (minutes > 0) return `${minutes} min ${secs}s`
  return `${secs}s`
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}
