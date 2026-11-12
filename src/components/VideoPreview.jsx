import { formatBytes, formatEta, formatSpeed } from '../lib/formatters.js'
import { PLATFORM_ICONS } from './Icons.jsx'

export function VideoPreview({
  video,
  options,
  audioOptions,
  selectedId,
  onSelect,
  downloadMode,
  onModeChange,
  selectedAudioFormat,
  onAudioFormatChange,
  selectedAudioQuality,
  onAudioQualityChange,
  preferNoWatermark,
  onToggleWatermark,
  onDownload,
  onCancel,
  downloading,
  progress,
}) {
  const Icon = PLATFORM_ICONS[video.platform]
  const visibleOptions = preferNoWatermark && video.watermarkOptionAvailable
    ? options.filter((item) => item.watermarkFree)
    : options
  const selected = visibleOptions.find((item) => item.id === selectedId) || visibleOptions[0]
  const selectedAudio = audioOptions.find((item) => item.audioFormat === selectedAudioFormat) || audioOptions[0]

  return (
    <section className="video-preview" aria-labelledby="video-ready-title">
      <div className="thumb-wrap">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt="" />
        ) : (
          <div className="thumb-fallback">Sin miniatura</div>
        )}
      </div>
      <div className="video-meta">
        <div className="video-kicker">
          <Icon />
          <span>{video.platformName}</span>
        </div>
        <h2 id="video-ready-title">{video.title}</h2>
        <dl>
          {video.duration && (
            <>
              <dt>Duración</dt>
              <dd>{video.duration}</dd>
            </>
          )}
          <dt>Origen</dt>
          <dd>{video.platformName}</dd>
          {downloadMode === 'video' && selected?.filesize && (
            <>
              <dt>Tamaño estimado</dt>
              <dd>{formatBytes(selected.filesize)}</dd>
            </>
          )}
        </dl>

        {video.platform === 'tiktok' && (
          <label className={`watermark-toggle ${video.watermarkOptionAvailable ? '' : 'is-disabled'}`}>
            <input
              type="checkbox"
              checked={preferNoWatermark && video.watermarkOptionAvailable}
              disabled={!video.watermarkOptionAvailable}
              onChange={(event) => onToggleWatermark(event.target.checked)}
            />
            Descargar sin marca de agua
            {!video.watermarkOptionAvailable && (
              <span>Esta publicación no ofrece una pista sin marca de agua.</span>
            )}
          </label>
        )}

        {audioOptions.length > 0 && (
          <fieldset>
            <legend>Tipo de descarga</legend>
            <div className="media-mode">
              <label>
                <input
                  type="radio"
                  name="download-mode"
                  checked={downloadMode === 'video'}
                  onChange={() => onModeChange('video')}
                />
                Video
              </label>
              <label>
                <input
                  type="radio"
                  name="download-mode"
                  checked={downloadMode === 'audio'}
                  onChange={() => onModeChange('audio')}
                />
                Solo audio
              </label>
            </div>
          </fieldset>
        )}

        {downloadMode === 'video' ? (
          <fieldset>
            <legend>Calidad y formato disponibles</legend>
            {visibleOptions.length ? (
              <div className="format-list">
                {visibleOptions.map((option) => (
                  <label key={option.id} className={selected?.id === option.id ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name="format"
                      value={option.id}
                      checked={selected?.id === option.id}
                      onChange={() => onSelect(option.id)}
                    />
                    <strong>
                      {option.resolution} · {option.ext.toUpperCase()}
                    </strong>
                    <em>
                      {[
                        option.filesize ? formatBytes(option.filesize) : null,
                        option.watermarkFree ? 'Sin marca de agua' : null,
                        option.progressive ? null : 'Se unirá audio y video',
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Tamaño no informado'}
                    </em>
                  </label>
                ))}
              </div>
            ) : (
              <p className="hint">No se encontraron pistas de video compatibles; puedes descargar solo el audio.</p>
            )}
          </fieldset>
        ) : (
          <fieldset className="audio-options">
            <legend>Formato y calidad de audio</legend>
            <label className="media-audio-select">
              Formato
              <select
                value={selectedAudio?.audioFormat || ''}
                onChange={(event) => {
                  const format = audioOptions.find((item) => item.audioFormat === event.target.value)
                  if (format) onAudioFormatChange(format)
                }}
              >
                {audioOptions.map((format) => (
                  <option key={format.id} value={format.audioFormat}>
                    {format.label}
                  </option>
                ))}
              </select>
            </label>
            {selectedAudio?.bitrates.length > 0 ? (
              <label className="media-audio-select">
                Bitrate
                <select
                  value={selectedAudioQuality ?? selectedAudio.defaultBitrate}
                  onChange={(event) => onAudioQualityChange(Number(event.target.value))}
                >
                  {selectedAudio.bitrates.map((bitrate) => (
                    <option key={bitrate} value={bitrate}>
                      {bitrate} kbps
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="hint">Formato sin pérdida; el bitrate lo determina el códec.</p>
            )}
          </fieldset>
        )}

        <div className="download-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onDownload(selected, selectedAudio, selectedAudioQuality)}
            disabled={
              downloading ||
              (downloadMode === 'video' && !selected) ||
              (downloadMode === 'audio' && !selectedAudio)
            }
          >
            {downloading ? 'Procesando…' : downloadMode === 'audio' ? 'Descargar audio' : 'Descargar video'}
          </button>
          {downloading && (
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Cancelar descarga
            </button>
          )}
        </div>
        {downloading && progress && (
          <p className="download-stats">
            {[formatSpeed(progress.speed), formatEta(progress.eta) ? `Restan ${formatEta(progress.eta)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
    </section>
  )
}
