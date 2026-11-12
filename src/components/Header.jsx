import { useState } from 'react'
import { IconClose, IconGear, IconMenu, LogoMark } from './Icons.jsx'

const LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#plataformas', label: 'Plataformas' },
  { href: '#historial', label: 'Historial' },
  { href: '#ayuda', label: 'Cómo funciona' },
]

export function Header({ onOpenSettings }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <a className="brand" href="#inicio">
        <LogoMark />
        <span>
          Clipora
          <small>Descargas en un solo lugar</small>
        </span>
      </a>

      <nav className={`nav ${open ? 'is-open' : ''}`} aria-label="Principal">
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Configuración">
          <IconGear />
        </button>
        <button
          type="button"
          className="icon-btn menu-btn"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>
    </header>
  )
}
