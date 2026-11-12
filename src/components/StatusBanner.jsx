const COPY = {
  idle: {
    title: 'Esperando un enlace',
    text: 'Pega la URL de un video de YouTube, Facebook, TikTok o X para comenzar.',
  },
  analyzing: {
    title: 'Analizando el video',
    text: 'Estoy identificando la plataforma y las calidades realmente disponibles.',
  },
  ready: {
    title: 'Contenido listo para descargar',
    text: 'Elige calidad y formato. Solo verás opciones que el servidor pudo confirmar.',
  },
  downloading: {
    title: 'Descargando',
    text: 'El archivo se está procesando en el servidor. No cierres esta pestaña.',
  },
  completed: {
    title: 'Descarga completada',
    text: 'El archivo se envió a tu carpeta de descargas del navegador.',
  },
  error: {
    title: 'Error al procesar el enlace',
    text: 'Revisa el mensaje y prueba de nuevo con otro enlace o más tarde.',
  },
}

export function StatusBanner({ status, message, progress }) {
  const copy = COPY[status] || COPY.idle
  const percent = Number.isFinite(progress?.percent) ? progress.percent : null

  return (
    <section className={`status-banner is-${status}`} aria-live="polite">
      <div>
        <p className="eyebrow">{copy.title}</p>
        <p>{message || progress?.message || copy.text}</p>
      </div>
      {status === 'downloading' && (
        <div className="progress-wrap">
          <div className="progress-bar" role="progressbar" aria-valuenow={percent ?? 0} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${percent ?? 12}%` }} />
          </div>
          <small>{percent != null ? `${percent}%` : 'Calculando…'}</small>
        </div>
      )}
    </section>
  )
}
