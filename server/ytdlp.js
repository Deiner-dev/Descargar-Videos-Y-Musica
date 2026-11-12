import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const ANALYZE_TIMEOUT_MS = 75_000
const DOWNLOAD_TIMEOUT_MS = 12 * 60_000

async function tryResolveYoutubeDlExec() {
  try {
    const mod = await import('youtube-dl-exec')
    return mod.constants?.YOUTUBE_DL_PATH || null
  } catch {
    try {
      return require('youtube-dl-exec/src/constants.js')?.YOUTUBE_DL_PATH || null
    } catch {
      return null
    }
  }
}

function tryResolveFfmpeg() {
  try {
    return require('ffmpeg-static') || process.env.FFMPEG_PATH || null
  } catch {
    return process.env.FFMPEG_PATH || null
  }
}

export async function resolveTools() {
  const ffmpegPath = tryResolveFfmpeg()
  const hasFfmpeg = Boolean(
    ffmpegPath && existsSync(ffmpegPath) && (await canRun(ffmpegPath, ['-version'])),
  )

  const ytdlpCandidates = [
    process.env.YTDLP_PATH,
    await tryResolveYoutubeDlExec(),
  ].filter(Boolean)

  for (const candidate of ytdlpCandidates) {
    if (existsSync(candidate)) {
      const ok = await canRun(candidate, ['--version'])
      if (ok) {
        return {
          ytdlp: { command: candidate, prefix: [] },
          ffmpegPath: hasFfmpeg ? ffmpegPath : null,
          hasFfmpeg,
          hasYtDlp: true,
        }
      }
    }
  }

  const pythonOk = await canRun(process.env.PYTHON || 'python', ['-m', 'yt_dlp', '--version'])
  if (pythonOk) {
    return {
      ytdlp: { command: process.env.PYTHON || 'python', prefix: ['-m', 'yt_dlp'] },
      ffmpegPath: hasFfmpeg ? ffmpegPath : null,
      hasFfmpeg,
      hasYtDlp: true,
    }
  }

  return {
    ytdlp: null,
    ffmpegPath: hasFfmpeg ? ffmpegPath : null,
    hasFfmpeg,
    hasYtDlp: false,
  }
}

function canRun(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true })
    let settled = false
    const timer = setTimeout(() => {
      child.kill()
      finish(false)
    }, 8000)
    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    child.on('error', () => finish(false))
    child.on('close', (code) => finish(code === 0))
  })
}

function collectArgs(tools, extra) {
  const args = [
    ...tools.ytdlp.prefix,
    ...extra,
    '--no-playlist',
    '--no-warnings',
    '--newline',
    '--js-runtimes',
    'node',
  ]
  if (tools.ffmpegPath) {
    args.push('--ffmpeg-location', tools.ffmpegPath)
  }
  if (process.env.YTDLP_COOKIES && existsSync(process.env.YTDLP_COOKIES)) {
    args.push('--cookies', process.env.YTDLP_COOKIES)
  }
  return args
}

function runYtDlp(tools, extra, { timeoutMs, onStdout, onStderr, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (!tools.hasYtDlp) {
      reject(Object.assign(new Error('yt-dlp no está disponible.'), { code: 'missing_ytdlp' }))
      return
    }
    if (signal?.aborted) {
      reject(Object.assign(new Error('La operación fue cancelada.'), { code: 'cancelled' }))
      return
    }

    const args = collectArgs(tools, extra)
    const child = spawn(tools.ytdlp.command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    let settled = false

    const finishWithError = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(error)
    }
    const abort = () => {
      child.kill('SIGTERM')
      finishWithError(Object.assign(new Error('La operación fue cancelada.'), { code: 'cancelled' }))
    }
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      finishWithError(
        Object.assign(new Error('La operación tardó demasiado. Inténtalo de nuevo.'), {
          code: 'timeout',
        }),
      )
    }, timeoutMs)
    signal?.addEventListener('abort', abort, { once: true })

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      onStdout?.(text)
    })
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      onStderr?.(text)
    })
    child.on('error', (error) => {
      finishWithError(error)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      const details = `${stderr}\n${stdout}`.trim()
      reject(Object.assign(new Error(mapYtDlpError(details)), { details, code: 'ytdlp_failed' }))
    })
  })
}

export function mapYtDlpError(details) {
  const text = details.toLowerCase()
  if (text.includes('ffmpeg') || text.includes('postprocessor')) {
    return 'FFmpeg no pudo completar la unión o conversión del archivo. Comprueba que FFmpeg esté disponible e inténtalo de nuevo.'
  }
  if (text.includes('private video') || text.includes('this video is private')) {
    return 'Este video es privado. Solo se puede procesar si tienes autorización y acceso.'
  }
  if (text.includes('sign in') || text.includes('login required') || text.includes('confirm you’re not a bot')) {
    return 'La plataforma pide inicio de sesión o verificación. Este video no se puede procesar de forma anónima.'
  }
  if (text.includes('age') && text.includes('restrict')) {
    return 'El video tiene restricción de edad y no se puede analizar sin credenciales.'
  }
  if (text.includes('geo') || text.includes('not available in your country')) {
    return 'El video no está disponible en tu región.'
  }
  if (text.includes('unsupported url') || text.includes('no video formats')) {
    return 'El enlace es compatible en apariencia, pero no encontré un video descargable.'
  }
  if (text.includes('video unavailable') || text.includes('does not exist')) {
    return 'El video no está disponible. Comprueba que el enlace siga activo.'
  }
  if (text.includes('http error 403') || text.includes('forbidden')) {
    return 'La plataforma bloqueó el acceso a este video. Puede requerir cookies de sesión o no permitir la descarga.'
  }
  if (text.includes('http error 429') || text.includes('too many requests')) {
    return 'La plataforma limitó las solicitudes. Espera unos minutos e inténtalo otra vez.'
  }
  return 'No pude procesar este enlace. Puede que el video esté protegido o que la plataforma haya cambiado su acceso.'
}

export function analyzeVideo(tools, url) {
  return runYtDlp(
    tools,
    [
      url,
      '--dump-single-json',
      '--skip-download',
      '--ignore-no-formats-error',
    ],
    { timeoutMs: ANALYZE_TIMEOUT_MS },
  ).then(({ stdout }) => {
    const jsonStart = stdout.indexOf('{')
    if (jsonStart < 0) {
      throw Object.assign(new Error('No recibí información del video.'), { code: 'empty_info' })
    }
    const info = JSON.parse(stdout.slice(jsonStart))
    if (info._type === 'playlist') {
      throw Object.assign(
        new Error('Este enlace apunta a una lista, no a un video concreto. Pega el enlace de un video individual.'),
        { code: 'playlist' },
      )
    }
    return info
  })
}

export function downloadMedia(tools, {
  url,
  mode,
  formatId,
  audioFormat,
  audioQuality,
  outputTemplate,
  mergeFormat,
  onProgress,
  signal,
}) {
  const extra = [url]
  if (mode === 'audio') {
    extra.push(
      '-f',
      'bestaudio/best',
      '--extract-audio',
      '--audio-format',
      audioFormat,
    )
    if (audioFormat === 'aac') {
      extra.push('--postprocessor-args', 'ExtractAudio+ffmpeg_o:-f adts')
    }
    if (audioQuality) extra.push('--audio-quality', `${audioQuality}K`)
  } else {
    extra.push('-f', formatId)
    if (mergeFormat) extra.push('--merge-output-format', mergeFormat)
  }
  extra.push(
    '-o',
    outputTemplate,
    '--progress',
    '--progress-template',
    'download:%(progress.downloaded_bytes)s/%(progress.total_bytes,progress.total_bytes_estimate)s/%(progress.eta)s/%(progress.speed)s',
  )

  return runYtDlp(
    tools,
    extra,
    {
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      onStdout: (text) => parseProgress(text, onProgress),
      onStderr: (text) => parseProgress(text, onProgress),
      signal,
    },
  )
}

function parseProgress(chunk, onProgress) {
  if (!onProgress) return
  const lines = chunk.split(/\r?\n/)
  for (const line of lines) {
    if (line.startsWith('download:')) {
      const parts = line.slice('download:'.length).split('/')
      const downloaded = Number(parts[0])
      const total = Number(parts[1])
      const eta = Number(parts[2])
      const speed = Number(parts[3])
      if (!Number.isFinite(downloaded)) continue
      const percent =
        Number.isFinite(total) && total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : null
      onProgress({
        phase: 'downloading',
        message: 'Descargando el contenido…',
        percent,
        downloaded,
        total: Number.isFinite(total) ? total : null,
        eta: Number.isFinite(eta) ? eta : null,
        speed: Number.isFinite(speed) ? speed : null,
      })
    } else if (line.includes('[Merger]') || line.includes('[VideoRemuxer]')) {
      onProgress({ phase: 'processing', message: 'Uniendo las pistas de audio y video…', percent: 99 })
    } else if (line.includes('[ExtractAudio]') || line.includes('[AudioExtracter]')) {
      onProgress({ phase: 'processing', message: 'Convirtiendo el audio…', percent: 99 })
    }
  }
}
