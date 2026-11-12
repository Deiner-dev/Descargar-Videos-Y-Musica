const ANALYZE_TIMEOUT_MS = 80_000

export async function fetchStatus() {
  const response = await fetch('/api/status')
  if (!response.ok) {
    throw new Error('No pude contactar el servidor de descargas. ¿Está en marcha npm run dev?')
  }
  return response.json()
}

export async function analyzeVideo(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })
    const payload = await response.json()
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'No pude analizar el video.')
    }
    return payload
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('El análisis tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.')
    }
    if (error instanceof TypeError) {
      throw new Error('No hay conexión con el servidor. Inicia la aplicación con npm run dev.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function downloadVideo({
  url,
  mode,
  formatId,
  ext,
  audioFormat,
  audioQuality,
  title,
  onProgress,
  signal,
}) {
  const response = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, mode, formatId, ext, audioFormat, audioQuality, title }),
    signal,
  })

  if (!response.ok || !response.body) {
    let message = 'No pude iniciar la descarga.'
    try {
      const payload = await response.json()
      message = payload.error || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null

  const processEvents = (text) => {
    const chunks = text.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const event = parseSse(chunk)
      if (!event) continue
      if (event.event === 'progress') onProgress?.(event.data)
      if (event.event === 'error') throw new Error(event.data.error || 'La descarga falló.')
      if (event.event === 'done') result = event.data
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    processEvents(buffer + (done ? '\n\n' : ''))
    if (done) break
  }

  if (!result) {
    throw new Error('La descarga se interrumpió antes de terminar.')
  }
  return result
}

function parseSse(chunk) {
  const lines = chunk.split('\n')
  let event = 'message'
  const dataLines = []
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (!dataLines.length) return null
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) }
  } catch {
    return null
  }
}
