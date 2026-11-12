const PLATFORM_RULES = [
  {
    id: 'youtube',
    name: 'YouTube',
    hosts: [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'youtu.be',
      'www.youtu.be',
      'music.youtube.com',
      'youtube-nocookie.com',
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    hosts: [
      'facebook.com',
      'www.facebook.com',
      'm.facebook.com',
      'fb.watch',
      'www.fb.watch',
      'web.facebook.com',
      'fb.com',
      'www.fb.com',
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    hosts: [
      'tiktok.com',
      'www.tiktok.com',
      'm.tiktok.com',
      'vm.tiktok.com',
      'vt.tiktok.com',
    ],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'vxtwitter.com'],
  },
]

export const SUPPORTED_PLATFORM_IDS = PLATFORM_RULES.map((item) => item.id)

export function detectPlatform(rawUrl) {
  let parsed

  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { ok: false, code: 'invalid_url', message: 'El texto pegado no es una URL válida.' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      ok: false,
      code: 'invalid_protocol',
      message: 'Usa un enlace que empiece por http:// o https://.',
    }
  }

  const host = parsed.hostname.toLowerCase()
  const platform = PLATFORM_RULES.find((item) =>
    item.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)),
  )

  if (!platform) {
    return {
      ok: false,
      code: 'unsupported_platform',
      message:
        'No pude identificar una plataforma compatible. Pega un enlace de YouTube, Facebook, TikTok o X.',
    }
  }

  return { ok: true, platform: platform.id, name: platform.name, url: parsed.toString() }
}

export function getPlatformName(id) {
  return PLATFORM_RULES.find((item) => item.id === id)?.name ?? id
}
