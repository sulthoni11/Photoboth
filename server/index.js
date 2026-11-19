/**
 * Server produksi + proxy musik. Tanpa dependency eksternal.
 *
 * - Menyajikan hasil `vite build` (folder dist/).
 * - /api/music mem-proxy Jamendo supaya JAMENDO_CLIENT_ID tidak pernah
 *   sampai ke browser. Rate limit 30 request/menit per IP.
 * - /api/music/search + /stream/:id + /art/:id mem-proxy Audius (katalog gratis,
 *   pencarian lagu bebas). Audio dan cover ikut diproxy supaya CSP tetap ketat.
 * - Semua response membawa header keamanan (CSP, Permissions-Policy, HSTS).
 *
 * Jalankan: `node server/index.js` (PORT default 8787)
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 8787)

// ------------------------------------------------------------------ env file
const envPath = join(ROOT, '.env')
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || ''

const MOOD_TAGS = {
  lofi: 'lofi+chill',
  pop: 'pop+happy',
  chill: 'acoustic+chill',
  happy: 'happy+upbeat',
}

// -------------------------------------------------------------- rate limiting
const WINDOW_MS = 60_000
const LIMIT = 30
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS)
    if (recent.length) hits.set(ip, recent)
    else hits.delete(ip)
  }
}, WINDOW_MS).unref()

// ------------------------------------------------------------------ caching
const cache = new Map()
const CACHE_TTL = 5 * 60_000

// ------------------------------------------------------------------- headers
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.jamendo.com",
    "media-src 'self' blob: https://*.jamendo.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

// ------------------------------------------------------------------- /api/music
function normalizeTracks(data) {
  const results = Array.isArray(data?.results) ? data.results : []
  return results
    .filter((t) => typeof t?.audio === 'string' && t.audio.startsWith('http'))
    .slice(0, 15)
    .map((t) => ({
      id: `jam-${t.id}`,
      title: String(t.name || 'Tanpa judul').slice(0, 80),
      artist: String(t.artist_name || 'Artis independen').slice(0, 80),
      mood: 'lofi',
      src: t.audio,
      license: t.license_ccurl || '',
    }))
}

async function handleMusic(req, res, url) {
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'

  if (rateLimited(ip)) {
    return json(res, 429, { tracks: [], source: 'fallback', reason: 'rate_limited' })
  }

  const mood = url.searchParams.get('mood') || 'lofi'
  const tags = MOOD_TAGS[mood] || MOOD_TAGS.lofi

  if (!CLIENT_ID) {
    return json(res, 503, { tracks: [], source: 'fallback', reason: 'missing_key' })
  }

  const cached = cache.get(mood)
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return json(res, 200, cached.payload)
  }

  const endpoint = new URL('https://api.jamendo.com/v3.0/tracks/')
  endpoint.searchParams.set('client_id', CLIENT_ID)
  endpoint.searchParams.set('format', 'json')
  endpoint.searchParams.set('limit', '15')
  endpoint.searchParams.set('tags', tags)
  endpoint.searchParams.set('audioformat', 'mp32')
  endpoint.searchParams.set('include', 'licenses')
  endpoint.searchParams.set('order', 'popularity_total')

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)
    const upstream = await fetch(endpoint, { signal: controller.signal })
    clearTimeout(timer)
    if (!upstream.ok) throw new Error(`jamendo ${upstream.status}`)

    const data = await upstream.json()
    const tracks = normalizeTracks(data).map((t) => ({ ...t, mood }))
    if (!tracks.length) throw new Error('empty')

    const payload = { tracks, source: 'jamendo' }
    cache.set(mood, { at: Date.now(), payload })
    return json(res, 200, payload)
  } catch {
    return json(res, 502, { tracks: [], source: 'fallback', reason: 'upstream_error' })
  }
}

// -------------------------------------------------------------------- audius
const AUDIUS_BASE = 'https://api.audius.co/v1'
/** trackId → url cover asli (hanya dari hasil pencarian kita sendiri). */
const TRACK_ART = new Map()
const SEARCH_CACHE = new Map()
const SEARCH_TTL = 10 * 60_000

function audiusTrack(t) {
  const artwork = t?.artwork?.['150x150'] || t?.artwork?.['480x480'] || ''
  if (artwork.startsWith('https://')) TRACK_ART.set(String(t.id), artwork)
  return {
    id: `aud-${t.id}`,
    title: String(t.title || 'Tanpa judul').slice(0, 120),
    artist: String(t.user?.name || 'Kreator Audius').slice(0, 80),
    duration: Number(t.duration) || 0,
    genre: String(t.genre || '').slice(0, 40),
    src: `/api/music/stream/${t.id}`,
    artwork: artwork ? `/api/music/art/${t.id}` : '',
    license: 'Audius',
  }
}

async function handleSearch(req, res, url) {
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'

  if (rateLimited(ip)) {
    return json(res, 429, { tracks: [], error: 'rate_limited' })
  }

  const query = (url.searchParams.get('q') || '').trim().slice(0, 60)
  if (query.length < 2) return json(res, 200, { tracks: [] })

  const key = query.toLowerCase()
  const cached = SEARCH_CACHE.get(key)
  if (cached && Date.now() - cached.at < SEARCH_TTL) {
    return json(res, 200, cached.payload)
  }

  const endpoint = new URL(`${AUDIUS_BASE}/tracks/search`)
  endpoint.searchParams.set('query', query)
  endpoint.searchParams.set('limit', '24')

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)
    const upstream = await fetch(endpoint, { signal: controller.signal })
    clearTimeout(timer)
    if (!upstream.ok) throw new Error(`audius ${upstream.status}`)

    const data = await upstream.json()
    const rows = Array.isArray(data?.data) ? data.data : []
    const tracks = rows
      .filter((t) => t?.is_streamable && !t?.is_delete && Number(t?.duration) > 0)
      .map(audiusTrack)

    const payload = { tracks }
    SEARCH_CACHE.set(key, { at: Date.now(), payload })
    if (SEARCH_CACHE.size > 200) {
      const oldest = [...SEARCH_CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0]
      if (oldest) SEARCH_CACHE.delete(oldest[0])
    }
    return json(res, 200, payload)
  } catch {
    return json(res, 502, { tracks: [], error: 'upstream_error' })
  }
}

const TRACK_ID = /^[A-Za-z0-9]{2,20}$/

async function handleStream(req, res, id) {
  if (!TRACK_ID.test(id)) {
    res.writeHead(400, SECURITY_HEADERS)
    return res.end()
  }

  const controller = new AbortController()
  res.on('close', () => controller.abort())

  try {
    const upstream = await fetch(`${AUDIUS_BASE}/tracks/${id}/stream?app_name=SnapVibe`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: req.headers.range ? { Range: req.headers.range } : {},
    })
    if (!upstream.ok || !upstream.body) {
      res.writeHead(upstream.status === 404 ? 404 : 502, SECURITY_HEADERS)
      return res.end()
    }

    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    }
    const length = upstream.headers.get('content-length')
    const contentRange = upstream.headers.get('content-range')
    if (length) headers['Content-Length'] = length
    if (contentRange) headers['Content-Range'] = contentRange

    res.writeHead(upstream.status === 206 ? 206 : 200, headers)
    await pipeline(Readable.fromWeb(upstream.body), res)
  } catch {
    if (!res.headersSent) res.writeHead(502, SECURITY_HEADERS)
    res.end()
  }
}

async function handleArt(res, id) {
  if (!TRACK_ID.test(id)) {
    res.writeHead(400, SECURITY_HEADERS)
    return res.end()
  }

  let art = TRACK_ART.get(id)
  if (!art) {
    // Setelah server restart cache kosong: ambil ulang dari detail trek.
    try {
      const detail = await fetch(`${AUDIUS_BASE}/tracks/${id}`)
      const data = await detail.json()
      art = data?.data?.artwork?.['150x150'] || ''
      if (art.startsWith('https://')) TRACK_ART.set(id, art)
    } catch {
      art = ''
    }
  }

  if (!art) {
    res.writeHead(404, SECURITY_HEADERS)
    return res.end()
  }

  try {
    const upstream = await fetch(art, { redirect: 'follow' })
    if (!upstream.ok || !upstream.body) {
      res.writeHead(404, SECURITY_HEADERS)
      return res.end()
    }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    })
    await pipeline(Readable.fromWeb(upstream.body), res)
  } catch {
    if (!res.headersSent) res.writeHead(502, SECURITY_HEADERS)
    res.end()
  }
}

// --------------------------------------------------------------------- static
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'

  const candidate = normalize(join(DIST, pathname))
  if (!candidate.startsWith(DIST + sep) && candidate !== DIST) {
    res.writeHead(403, SECURITY_HEADERS)
    return res.end('Forbidden')
  }

  let filePath = candidate
  let info = await stat(filePath).catch(() => null)

  // SPA fallback untuk route seperti /studio
  if (!info || info.isDirectory()) {
    filePath = join(DIST, 'index.html')
    info = await stat(filePath).catch(() => null)
  }

  if (!info) {
    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(
      '<!doctype html><meta charset="utf-8"><title>Belum di-build</title><body style="font-family:system-ui;padding:40px"><h1>dist/ belum ada</h1><p>Jalankan <code>npm run build</code> dulu, lalu <code>npm start</code>.</p>',
    )
  }

  const ext = extname(filePath).toLowerCase()
  const immutable = pathname.startsWith('/assets/')
  const body = await readFile(filePath)
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    'Content-Length': body.length,
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

// ---------------------------------------------------------------------- start
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' })
    return res.end('Method Not Allowed')
  }

  try {
    if (url.pathname === '/api/music') return await handleMusic(req, res, url)
    if (url.pathname === '/api/music/search') return await handleSearch(req, res, url)
    if (url.pathname.startsWith('/api/music/stream/')) {
      return await handleStream(req, res, url.pathname.slice('/api/music/stream/'.length))
    }
    if (url.pathname.startsWith('/api/music/art/')) {
      return await handleArt(res, url.pathname.slice('/api/music/art/'.length))
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found' })
    return await serveStatic(req, res, url)
  } catch {
    return json(res, 500, { error: 'server_error' })
  }
})

server.listen(PORT, () => {
  console.log(`SnapVibe server → http://localhost:${PORT}`)
  console.log(CLIENT_ID ? 'Jamendo: aktif' : 'Jamendo: JAMENDO_CLIENT_ID kosong (fallback synth)')
})
