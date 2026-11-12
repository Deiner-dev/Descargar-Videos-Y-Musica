const VIDEO_EXTS = new Set(['mp4', 'webm', 'mkv', 'mov'])

export const AUDIO_FORMATS = [
  { id: 'mp3', label: 'MP3', bitrates: [128, 192, 256, 320], defaultBitrate: 192 },
  { id: 'm4a', label: 'M4A', bitrates: [128, 192, 256, 320], defaultBitrate: 192 },
  { id: 'wav', label: 'WAV', bitrates: [], defaultBitrate: null },
  { id: 'flac', label: 'FLAC', bitrates: [], defaultBitrate: null },
  { id: 'opus', label: 'OPUS', bitrates: [64, 96, 128, 160, 192, 256, 320], defaultBitrate: 128 },
  { id: 'aac', label: 'AAC', bitrates: [128, 192, 256, 320], defaultBitrate: 192 },
]

function hasVideo(format) {
  return Boolean(format.vcodec && format.vcodec !== 'none' && format.height)
}

function hasAudio(format) {
  return Boolean(format.acodec && format.acodec !== 'none')
}

function looksWatermarked(format) {
  const haystack = `${format.format_id ?? ''} ${format.format_note ?? ''} ${format.format ?? ''}`.toLowerCase()
  return haystack.includes('watermark')
}

function resolutionLabel(height) {
  return Number.isFinite(height) && height > 0 ? `${height}p` : 'Desconocida'
}

function mergedVideoFormat(format, formats) {
  const compatibleAudioExt = format.ext === 'webm' ? 'webm' : ['mp4', 'mov'].includes(format.ext) ? 'm4a' : null
  const audioFormats = formats.filter((item) => hasAudio(item) && !hasVideo(item))
  const compatibleAudio = audioFormats
    .filter((item) => item.ext === compatibleAudioExt)
    .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0]

  if (compatibleAudio) {
    return { formatId: `${format.format_id}+${compatibleAudio.format_id}`, ext: format.ext }
  }
  return { formatId: `${format.format_id}+bestaudio`, ext: 'mkv' }
}

export function buildDownloadOptions(info, { hasFfmpeg, platform }) {
  const formats = Array.isArray(info.formats) ? info.formats : []
  const options = []

  for (const format of formats) {
    if (!hasVideo(format)) continue
    if (!VIDEO_EXTS.has(format.ext)) continue
    if (format.protocol === 'mhtml' || format.ext === 'mhtml') continue

    const progressive = hasAudio(format)
    if (!progressive && !hasFfmpeg) continue

    const watermarkFree = platform === 'tiktok' ? !looksWatermarked(format) : null
    const merged = progressive ? null : mergedVideoFormat(format, formats)
    const requestedExt = progressive ? format.ext : merged.ext
    const selector = progressive ? String(format.format_id) : merged.formatId

    options.push({
      id: `${selector}|${requestedExt}|${format.height}|${watermarkFree ? 'nw' : 'w'}`,
      formatId: selector,
      ext: requestedExt,
      height: format.height,
      resolution: resolutionLabel(format.height),
      fps: format.fps ?? null,
      filesize: format.filesize || format.filesize_approx || null,
      progressive,
      watermarkFree,
      note: format.format_note || format.quality_note || null,
    })
  }

  const unique = new Map()
  for (const option of options) {
    const key = `${option.height}-${option.ext}-${option.watermarkFree ? 'nw' : 'std'}-${option.progressive ? 'p' : 'm'}`
    const current = unique.get(key)
    if (!current || (option.filesize || 0) > (current.filesize || 0)) {
      unique.set(key, option)
    }
  }

  const ranked = [...unique.values()].sort((a, b) => {
    if (a.watermarkFree !== b.watermarkFree) return a.watermarkFree ? -1 : 1
    if (b.height !== a.height) return b.height - a.height
    if (a.ext === 'mp4' && b.ext !== 'mp4') return -1
    if (b.ext === 'mp4' && a.ext !== 'mp4') return 1
    return 0
  })

  const preferred = ranked.filter((item) => item.ext === 'mp4')
  return [...preferred, ...ranked.filter((item) => item.ext !== 'mp4')]
}

export function buildAudioOptions(info, { hasFfmpeg }) {
  if (!hasFfmpeg) return []
  const formats = Array.isArray(info.formats) ? info.formats : []
  if (!formats.some(hasAudio)) return []

  return AUDIO_FORMATS.map((format) => ({
    id: `audio-${format.id}`,
    kind: 'audio',
    audioFormat: format.id,
    ext: format.id,
    label: format.label,
    bitrates: format.bitrates,
    defaultBitrate: format.defaultBitrate,
  }))
}

export function pickThumbnail(info) {
  if (info.thumbnail) return info.thumbnail
  const thumbs = Array.isArray(info.thumbnails) ? [...info.thumbnails] : []
  thumbs.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return thumbs[0]?.url ?? null
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return null
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}
