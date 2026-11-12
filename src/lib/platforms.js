export const PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    hint: 'youtube.com o youtu.be',
    example: 'https://www.youtube.com/watch?v=…',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    hint: 'facebook.com o fb.watch',
    example: 'https://www.facebook.com/watch?v=…',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    hint: 'tiktok.com',
    example: 'https://www.tiktok.com/@usuario/video/…',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    hint: 'x.com o twitter.com',
    example: 'https://x.com/usuario/status/…',
  },
]

const HOSTS = {
  youtube: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
  facebook: ['facebook.com', 'fb.watch', 'fb.com'],
  tiktok: ['tiktok.com'],
  x: ['x.com', 'twitter.com', 'vxtwitter.com'],
}

export function detectPlatform(rawUrl) {
  const value = rawUrl.trim()
  if (!value) return { status: 'empty' }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return { status: 'invalid', message: 'Pega un enlace completo, por ejemplo https://…' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { status: 'invalid', message: 'El enlace debe empezar por http:// o https://.' }
  }

  const host = parsed.hostname.toLowerCase()
  const platform = Object.entries(HOSTS).find(([, hosts]) =>
    hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)),
  )

  if (!platform) {
    return {
      status: 'unsupported',
      message: 'No reconocí una plataforma compatible. Usa YouTube, Facebook, TikTok o X.',
    }
  }

  return { status: 'ready', platform: platform[0] }
}

export function platformName(id) {
  return PLATFORMS.find((item) => item.id === id)?.name ?? id
}
