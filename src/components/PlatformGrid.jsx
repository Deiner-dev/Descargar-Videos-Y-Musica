import { PLATFORMS } from '../lib/platforms.js'
import { PLATFORM_ICONS } from './Icons.jsx'

export function PlatformGrid({ activeId, onSelect }) {
  return (
    <section id="plataformas" className="section">
      <div className="section-heading">
        <p className="eyebrow">Compatible con</p>
        <h2>Una interfaz para cuatro plataformas</h2>
        <p>Al pegar el enlace, Clipora identifica la red de forma automática. Si no puede, te lo dirá con claridad.</p>
      </div>
      <div className="platform-grid">
        {PLATFORMS.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id]
          const active = activeId === platform.id
          return (
            <button
              key={platform.id}
              type="button"
              className={`platform-card ${active ? 'is-active' : ''}`}
              onClick={() => onSelect(platform)}
            >
              <Icon />
              <strong>{platform.name}</strong>
              <span>{platform.hint}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
