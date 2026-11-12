import { formatDate } from '../lib/formatters.js'
import { PLATFORM_ICONS } from './Icons.jsx'

const STATUS_LABEL = {
  completed: 'Completada',
  error: 'Error',
  downloading: 'En curso',
}

export function HistorySection({ items, onClear }) {
  return (
    <section id="historial" className="section">
      <div className="section-heading row">
        <div>
          <p className="eyebrow">Actividad real</p>
          <h2>Historial de descargas</h2>
          <p>Solo aparecen análisis y descargas que realmente intentaste en este navegador.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={onClear} disabled={!items.length}>
          Limpiar historial
        </button>
      </div>

      {!items.length ? (
        <div className="empty-history">Aún no hay descargas. El historial se llenará cuando completes o intentes una descarga real.</div>
      ) : (
        <ul className="history-list">
          {items.map((item) => {
            const Icon = PLATFORM_ICONS[item.platform]
            return (
              <li key={item.id}>
                {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <div className="thumb-fallback mini" />}
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {Icon && <Icon />} {item.platformName} · {formatDate(item.date)}
                  </span>
                </div>
                <em className={`pill is-${item.status}`}>{STATUS_LABEL[item.status] || item.status}</em>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
