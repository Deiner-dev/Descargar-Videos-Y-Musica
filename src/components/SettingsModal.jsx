import { IconClose } from './Icons.jsx'

export function SettingsModal({ open, settings, server, onChange, onClose }) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="settings-title">Configuración</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        <label className="field">
          Tema
          <select
            value={settings.theme}
            onChange={(event) => onChange({ ...settings, theme: event.target.value })}
          >
            <option value="dark">Oscuro</option>
            <option value="light">Claro</option>
            <option value="system">Según el sistema</option>
          </select>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={settings.confirmDownload}
            onChange={(event) => onChange({ ...settings, confirmDownload: event.target.checked })}
          />
          Pedir confirmación antes de descargar
        </label>

        <div className="notice compact">
          <p>
            Estado del servidor: {server?.ok ? 'conectado' : 'sin conexión'}. yt-dlp:{' '}
            {server?.hasYtDlp ? 'sí' : 'no'}. FFmpeg: {server?.hasFfmpeg ? 'sí' : 'no'}.
          </p>
          <p>
            Para cuentas que exigen sesión (algunos videos de Facebook o X), puedes definir la variable de entorno
            YTDLP_COOKIES con un archivo de cookies en el servidor. No se guardan claves en el cliente.
          </p>
        </div>
      </div>
    </div>
  )
}
