import cors from 'cors'
import express from 'express'
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectPlatform, getPlatformName } from './platforms.js'
import { AUDIO_FORMATS, buildAudioOptions, buildDownloadOptions, formatDuration, pickThumbnail } from './formats.js'
import { analyzeVideo, downloadMedia, resolveTools } from './ytdlp.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8787
const DOWNLOAD_DIR = path.join(__dirname, 'tmp-downloads')
const FILE_TTL_MS = 30 * 60 * 1000

mkdirSync(DOWNLOAD_DIR, { recursive: true })

const jobs = new Map()
let tools = await resolveTools()
let activeJobId = null

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '32kb' }))

app.get('/api/status', async (_req, res) => {
  tools = await resolveTools()
  res.json({
    ok: tools.hasYtDlp,
    hasYtDlp: tools.hasYtDlp,
    hasFfmpeg: tools.hasFfmpeg,
    platforms: ['youtube', 'facebook', 'tiktok', 'x'],
    cookiesConfigured: Boolean(process.env.YTDLP_COOKIES && existsSync(process.env.YTDLP_COOKIES)),
  })
})

app.post('/api/analyze', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const detected = detectPlatform(url)

  if (!detected.ok) {
    res.status(400).json({ ok: false, code: detected.code, error: detected.message })
    return
  }

  if (!tools.hasYtDlp) {
    tools = await resolveTools()
  }

  if (!tools.hasYtDlp) {
    res.status(503).json({
      ok: false,
      code: 'missing_ytdlp',
      error:
        'Falta yt-dlp en el servidor. Instálalo con "pip install -U yt-dlp" o deja que npm descargue el binario de youtube-dl-exec.',
    })
    return
  }

  try {
    const info = await analyzeVideo(tools, detected.url)
    const options = buildDownloadOptions(info, {
      hasFfmpeg: tools.hasFfmpeg,
      platform: detected.platform,
    })
    const audioOptions = buildAudioOptions(info, { hasFfmpeg: tools.hasFfmpeg })

    if (!options.length && !audioOptions.length) {
      res.status(422).json({
        ok: false,
        code: 'no_formats',
        error: tools.hasFfmpeg
          ? 'Encontré el video, pero no hay formatos descargables compatibles.'
          : 'El video solo está en pistas separadas y hace falta FFmpeg para unirlas. Reinstala las dependencias del proyecto.',
        platform: detected.platform,
      })
      return
    }

    res.json({
      ok: true,
      video: {
        id: info.id ?? randomUUID(),
        url: detected.url,
        title: info.title || 'Video sin título',
        duration: formatDuration(info.duration),
        durationSeconds: Number.isFinite(info.duration) ? info.duration : null,
        thumbnail: pickThumbnail(info),
        platform: detected.platform,
        platformName: getPlatformName(detected.platform),
        extractor: info.extractor || detected.platform,
        watermarkOptionAvailable:
          detected.platform === 'tiktok' && options.some((item) => item.watermarkFree),
      },
      options,
      audioOptions,
      warnings: [
        !tools.hasFfmpeg
          ? 'FFmpeg no está disponible: solo se ofrecen formatos que ya incluyen audio y video juntos.'
          : null,
      ].filter(Boolean),
    })
  } catch (error) {
    res.status(422).json({
      ok: false,
      code: error.code || 'analyze_failed',
      error: error.message || 'No pude analizar el video.',
    })
  }
})

app.post('/api/download', async (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : ''
  const mode = req.body?.mode
  const formatId = typeof req.body?.formatId === 'string' ? req.body.formatId : ''
  const requestedExt = typeof req.body?.ext === 'string' ? req.body.ext : ''
  const title = typeof req.body?.title === 'string' ? req.body.title : 'video'
  const detected = detectPlatform(url)

  if (!detected.ok) {
    res.status(400).json({ ok: false, error: detected.message })
    return
  }
  if (!['video', 'audio'].includes(mode)) {
    res.status(400).json({ ok: false, error: 'Selecciona video o audio para descargar.' })
    return
  }
  if (mode === 'video' && (!formatId || !/^[\w.-]+(?:\+(?:[\w.-]+|bestaudio))?$/.test(formatId))) {
    res.status(400).json({ ok: false, error: 'Selecciona una calidad de video válida.' })
    return
  }
  if (mode === 'video' && !['mp4', 'webm', 'mkv', 'mov'].includes(requestedExt)) {
    res.status(400).json({ ok: false, error: 'El formato de video seleccionado no es válido.' })
    return
  }
  const audioFormat = AUDIO_FORMATS.find((format) => format.id === req.body?.audioFormat)
  const audioQuality = req.body?.audioQuality
  if (
    mode === 'audio' &&
    (!tools.hasFfmpeg ||
      !audioFormat ||
      (audioFormat.bitrates.length
        ? !audioFormat.bitrates.includes(audioQuality)
        : audioQuality !== null))
  ) {
    res.status(400).json({
      ok: false,
      error: tools.hasFfmpeg
        ? 'El formato o la calidad de audio seleccionados no son válidos.'
        : 'FFmpeg no está disponible para convertir el audio.',
    })
    return
  }
  if (activeJobId) {
    res.status(409).json({
      ok: false,
      error: 'Ya hay una descarga en curso. Espera a que termine para iniciar otra.',
    })
    return
  }

  const jobId = randomUUID()
  const safeTitle = sanitizeFilename(title)
  const outputTemplate = path.join(DOWNLOAD_DIR, `${jobId}.%(ext)s`)
  const controller = new AbortController()
  jobs.set(jobId, { status: 'starting', controller, createdAt: Date.now() })
  activeJobId = jobId

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  send('progress', { percent: 1, message: 'Preparando la descarga…' })

  try {
    await downloadMedia(tools, {
      url: detected.url,
      mode,
      formatId,
      audioFormat: audioFormat?.id,
      audioQuality: audioQuality ?? null,
      outputTemplate,
      mergeFormat: mode === 'video' && formatId.includes('+') ? requestedExt : null,
      signal: controller.signal,
      onProgress: (progress) => {
        jobs.set(jobId, { status: progress.phase || 'downloading', controller, createdAt: Date.now() })
        send('progress', progress)
      },
    })

    let filePath = findJobFile(jobId)
    if (!filePath) {
      throw new Error('La descarga terminó, pero no encontré el archivo generado.')
    }
    if (mode === 'audio' && audioFormat.id === 'aac' && path.extname(filePath) !== '.aac') {
      const aacPath = path.join(DOWNLOAD_DIR, `${jobId}.aac`)
      renameSync(filePath, aacPath)
      filePath = aacPath
    }

    const filename = `${safeTitle}.${path.extname(filePath).slice(1)}`
    jobs.set(jobId, {
      status: 'ready',
      filePath,
      filename,
      createdAt: Date.now(),
    })
    send('done', { jobId, filename, downloadPath: `/api/file/${jobId}` })
  } catch (error) {
    removeJobFiles(jobId)
    jobs.delete(jobId)
    if (!controller.signal.aborted && !res.destroyed) {
      send('error', { error: error.message || 'La descarga falló.' })
    }
  } finally {
    if (activeJobId === jobId) activeJobId = null
    if (controller.signal.aborted) jobs.delete(jobId)
    if (!res.destroyed) res.end()
  }
})

app.get('/api/file/:id', (req, res) => {
  const job = jobs.get(req.params.id)
  if (!job?.filePath || !existsSync(job.filePath)) {
    res.status(404).json({ ok: false, error: 'El archivo ya no está disponible. Vuelve a descargarlo.' })
    return
  }

  res.download(job.filePath, job.filename, (error) => {
    if (error) {
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: 'No pude enviar el archivo.' })
      }
      return
    }
    try {
      unlinkSync(job.filePath)
    } catch {
      /* ignore */
    }
    jobs.delete(req.params.id)
  })
})

app.use((error, _req, res, _next) => {
  res.status(500).json({ ok: false, error: error.message || 'Error interno del servidor.' })
})

cleanupOldFiles()
setInterval(cleanupOldFiles, 10 * 60 * 1000)

app.listen(PORT, () => {
  createWriteStream(path.join(DOWNLOAD_DIR, '.keep')).end()
  console.log(`Clipora API en http://localhost:${PORT}`)
  console.log(`yt-dlp: ${tools.hasYtDlp ? 'disponible' : 'NO encontrado'}`)
  console.log(`FFmpeg: ${tools.hasFfmpeg ? 'disponible' : 'NO encontrado'}`)
})

function sanitizeFilename(value) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || 'video'
}

function findJobFile(jobId) {
  const match = readdirSync(DOWNLOAD_DIR).find((name) => {
    if (!name.startsWith(`${jobId}.`) || name.endsWith('.part') || name.endsWith('.ytdl')) return false
    const filePath = path.join(DOWNLOAD_DIR, name)
    try {
      return statSync(filePath).isFile() && statSync(filePath).size > 0
    } catch {
      return false
    }
  })
  return match ? path.join(DOWNLOAD_DIR, match) : null
}

function removeJobFiles(jobId) {
  for (const name of readdirSync(DOWNLOAD_DIR)) {
    if (!name.startsWith(`${jobId}.`)) continue
    try {
      unlinkSync(path.join(DOWNLOAD_DIR, name))
    } catch {
      /* ignore */
    }
  }
}

function cleanupOldFiles() {
  const now = Date.now()
  for (const name of readdirSync(DOWNLOAD_DIR)) {
    if (name.startsWith('.')) continue
    const filePath = path.join(DOWNLOAD_DIR, name)
    try {
      const age = now - statSync(filePath).mtimeMs
      if (age > FILE_TTL_MS) {
        unlinkSync(filePath)
        for (const [jobId, job] of jobs) {
          if (job.filePath === filePath) jobs.delete(jobId)
        }
      }
    } catch {
      /* ignore */
    }
  }
}
