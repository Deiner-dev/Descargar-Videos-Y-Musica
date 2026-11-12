import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header.jsx'
import { HelpSection } from './components/HelpSection.jsx'
import { HistorySection } from './components/HistorySection.jsx'
import { IconClear, IconPaste } from './components/Icons.jsx'
import { PlatformGrid } from './components/PlatformGrid.jsx'
import { SettingsModal } from './components/SettingsModal.jsx'
import { StatusBanner } from './components/StatusBanner.jsx'
import { VideoPreview } from './components/VideoPreview.jsx'
import { analyzeVideo, downloadVideo, fetchStatus } from './lib/api.js'
import { formatBytes } from './lib/formatters.js'
import { addHistoryItem, clearHistory, loadHistory } from './lib/history.js'
import { detectPlatform, PLATFORMS } from './lib/platforms.js'
import { applyTheme, loadSettings, saveSettings } from './lib/settings.js'
import './App.css'

export default function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [server, setServer] = useState(null)
  const [video, setVideo] = useState(null)
  const [options, setOptions] = useState([])
  const [audioOptions, setAudioOptions] = useState([])
  const [downloadMode, setDownloadMode] = useState('video')
  const [selectedId, setSelectedId] = useState(null)
  const [selectedAudioFormat, setSelectedAudioFormat] = useState('')
  const [selectedAudioQuality, setSelectedAudioQuality] = useState(null)
  const [preferNoWatermark, setPreferNoWatermark] = useState(true)
  const [progress, setProgress] = useState(null)
  const downloadController = useRef(null)
  const [history, setHistory] = useState(() => loadHistory())
  const [settings, setSettings] = useState(() => loadSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pasteHint, setPasteHint] = useState('')

  const detection = useMemo(() => detectPlatform(url), [url])

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    const probe = async () => {
      try {
        const payload = await fetchStatus()
        if (!cancelled) setServer(payload)
      } catch (error) {
        attempts += 1
        if (attempts < 8) {
          setTimeout(probe, 700)
          return
        }
        if (!cancelled) {
          setServer({ ok: false, hasYtDlp: false, hasFfmpeg: false })
          setStatus('error')
          setMessage(error.message)
        }
      }
    }

    probe()
    return () => {
      cancelled = true
    }
  }, [])

  function updateSettings(next) {
    setSettings(next)
    saveSettings(next)
    applyTheme(next.theme)
  }

  async function handlePaste() {
    setPasteHint('')
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setPasteHint('El portapapeles está vacío.')
        return
      }
      setUrl(text.trim())
    } catch {
      setPasteHint('No pude leer el portapapeles. Usa Ctrl+V o Cmd+V en el campo.')
    }
  }

  function handleClear() {
    setUrl('')
    setVideo(null)
    setOptions([])
    setAudioOptions([])
    setSelectedId(null)
    setSelectedAudioFormat('')
    setSelectedAudioQuality(null)
    setProgress(null)
    setPasteHint('')
    setStatus('idle')
    setMessage('')
  }

  function handlePlatformSelect(platform) {
    setPasteHint(`Pega un enlace de ${platform.name}: ${platform.example}`)
    document.getElementById('video-url')?.focus()
  }

  async function handleAnalyze(event) {
    event.preventDefault()
    const detected = detectPlatform(url)

    if (detected.status === 'empty') {
      setStatus('error')
      setMessage('Pega un enlace antes de analizar.')
      return
    }
    if (detected.status !== 'ready') {
      setStatus('error')
      setMessage(detected.message)
      setVideo(null)
      return
    }

    setStatus('analyzing')
    setMessage('')
    setVideo(null)
    setOptions([])
    setAudioOptions([])
    setProgress(null)

    try {
      const payload = await analyzeVideo(url.trim())
      setVideo(payload.video)
      setOptions(payload.options)
      setAudioOptions(payload.audioOptions || [])
      setDownloadMode(payload.options.length ? 'video' : 'audio')
      const initial =
        payload.video.watermarkOptionAvailable && preferNoWatermark
          ? payload.options.find((item) => item.watermarkFree) || payload.options[0]
          : payload.options[0]
      setSelectedId(initial?.id ?? null)
      const initialAudio = payload.audioOptions?.[0]
      setSelectedAudioFormat(initialAudio?.audioFormat || '')
      setSelectedAudioQuality(initialAudio?.defaultBitrate ?? null)
      setStatus('ready')
      if (payload.warnings?.length) setMessage(payload.warnings.join(' '))
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  async function handleDownload(option, audioFormat, audioQuality) {
    if (!video || (downloadMode === 'video' && !option) || (downloadMode === 'audio' && !audioFormat)) return
    if (settings.confirmDownload) {
      const mediaLabel =
        downloadMode === 'audio'
          ? `${audioFormat.label}${audioQuality ? ` ${audioQuality} kbps` : ' sin pérdida'}`
          : `${option.resolution} ${option.ext.toUpperCase()}`
      const size = downloadMode === 'video' && option.filesize ? ` (${formatBytes(option.filesize)})` : ''
      const allowed = window.confirm(
        `Vas a descargar “${video.title}” en ${mediaLabel}${size}.\n\nSolo continúa si tienes autorización para guardar este contenido.`,
      )
      if (!allowed) return
    }

    const historyId = crypto.randomUUID()
    const controller = new AbortController()
    downloadController.current = controller
    setStatus('downloading')
    setProgress({ percent: 1 })
    setMessage('')

    try {
      const result = await downloadVideo({
        url: video.url,
        mode: downloadMode,
        formatId: option?.formatId,
        ext: option?.ext,
        audioFormat: audioFormat?.audioFormat,
        audioQuality,
        title: video.title,
        onProgress: setProgress,
        signal: controller.signal,
      })

      const link = document.createElement('a')
      link.href = result.downloadPath
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      link.remove()

      setStatus('completed')
      setProgress({ percent: 100 })
      setHistory(
        addHistoryItem(history, {
          id: historyId,
          title: video.title,
          platform: video.platform,
          platformName: video.platformName,
          thumbnail: video.thumbnail,
          date: new Date().toISOString(),
          status: 'completed',
        }),
      )
    } catch (error) {
      if (controller.signal.aborted) {
        setStatus('ready')
        setProgress(null)
        setMessage('Descarga cancelada.')
        return
      }
      setStatus('error')
      setMessage(error.message)
      setHistory(
        addHistoryItem(history, {
          id: historyId,
          title: video.title,
          platform: video.platform,
          platformName: video.platformName,
          thumbnail: video.thumbnail,
          date: new Date().toISOString(),
          status: 'error',
        }),
      )
    } finally {
      if (downloadController.current === controller) downloadController.current = null
    }
  }

  function handleCancelDownload() {
    downloadController.current?.abort()
  }

  const highlightedPlatform = detection.status === 'ready' ? detection.platform : null

  return (
    <div className="app-shell">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main>
        <section id="inicio" className="hero">
          <p className="eyebrow">Clipora</p>
          <h1>Descarga tus videos favoritos</h1>
          <p className="lede">
            Pega el enlace, analiza el video y descarga la calidad que realmente existe. Una sola herramienta para
            YouTube, Facebook, TikTok y X.
          </p>

          <form className="url-panel" onSubmit={handleAnalyze}>
            <label htmlFor="video-url">Enlace del video</label>
            <div className="url-row">
              <input
                id="video-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={handlePaste}>
                <IconPaste /> Pegar
              </button>
            </div>
            <div className="url-actions">
              <button type="submit" className="btn-primary" disabled={status === 'analyzing' || status === 'downloading'}>
                {status === 'analyzing' ? 'Analizando…' : 'Analizar video'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleClear}
                disabled={status === 'downloading' || (!url && !video)}
              >
                <IconClear /> Limpiar
              </button>
            </div>
            {pasteHint && <p className="hint">{pasteHint}</p>}
            {detection.status === 'ready' && (
              <p className="hint ok">Plataforma detectada: {PLATFORMS.find((item) => item.id === detection.platform)?.name}</p>
            )}
          </form>
        </section>

        <StatusBanner status={status} message={message} progress={progress} />

        {video && (status === 'ready' || status === 'downloading' || status === 'completed') && (
          <VideoPreview
            video={video}
            options={options}
            audioOptions={audioOptions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            downloadMode={downloadMode}
            onModeChange={setDownloadMode}
            selectedAudioFormat={selectedAudioFormat}
            onAudioFormatChange={(format) => {
              setSelectedAudioFormat(format.audioFormat)
              setSelectedAudioQuality(format.defaultBitrate)
            }}
            selectedAudioQuality={selectedAudioQuality}
            onAudioQualityChange={setSelectedAudioQuality}
            preferNoWatermark={preferNoWatermark}
            onToggleWatermark={setPreferNoWatermark}
            onDownload={handleDownload}
            onCancel={handleCancelDownload}
            downloading={status === 'downloading'}
            progress={progress}
          />
        )}

        <PlatformGrid activeId={highlightedPlatform} onSelect={handlePlatformSelect} />
        <HistorySection items={history} onClear={() => setHistory(clearHistory())} />
        <HelpSection server={server} />
      </main>

      <footer className="site-footer">
        <p>Clipora procesa el enlace en tu equipo. No uses la app para contenido que no tengas derecho a guardar.</p>
      </footer>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        server={server}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
