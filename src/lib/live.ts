import { drawPhotoFrame } from './capture'
import { PHOTO_ASPECT, type GridMode } from './canvas/layout'
import { ensureNewsAssets } from './canvas/newspaper'
import { renderStrip, loadImages, waitForFonts } from './canvas/render'
import type { FrameId } from './canvas/frames'
import type { FilterId } from './filters'

/** Lebar rekaman live photo; cukup tajam untuk layar ponsel tanpa file besar. */
const LIVE_WIDTH = 540

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]

export function liveMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type
    } catch {
      /* lanjut ke kandidat berikutnya */
    }
  }
  return null
}

export function isLiveSupported() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    liveMimeType() !== null
  )
}

export type LiveRecorder = {
  /** Selesaikan rekaman dan kembalikan data URL (null kalau gagal/kosong). */
  stop: () => Promise<string | null>
  /** Batalkan rekaman tanpa menyimpan apa pun. */
  cancel: () => void
}

/**
 * Merekam potongan video pendek dari elemen <video> kamera, memakai crop,
 * filter, dan mirror yang sama dengan foto diam — jadi hasilnya benar-benar
 * cocok dengan pose yang tersimpan.
 */
export function startLiveRecorder(
  video: HTMLVideoElement,
  options: { mode: GridMode; filter: FilterId; mirror: boolean },
): LiveRecorder | null {
  const mime = liveMimeType()
  if (!mime) return null

  const width = LIVE_WIDTH
  const height = Math.round(width / PHOTO_ASPECT[options.mode])
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx || typeof canvas.captureStream !== 'function') return null

  let raf = 0
  const draw = () => {
    try {
      drawPhotoFrame(ctx, video, width, height, options.mode, options.filter, options.mirror)
    } catch {
      /* video belum siap: biarkan frame kosong */
    }
    raf = window.requestAnimationFrame(draw)
  }
  draw()

  let stream: MediaStream
  try {
    stream = canvas.captureStream(30)
  } catch {
    window.cancelAnimationFrame(raf)
    return null
  }

  const chunks: BlobPart[] = []
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_400_000 })
  } catch {
    window.cancelAnimationFrame(raf)
    stream.getTracks().forEach((track) => track.stop())
    return null
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const finished = new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: mime }) : null)
  })

  try {
    recorder.start(250)
  } catch {
    window.cancelAnimationFrame(raf)
    stream.getTracks().forEach((track) => track.stop())
    return null
  }

  const cleanup = () => {
    window.cancelAnimationFrame(raf)
    stream.getTracks().forEach((track) => track.stop())
  }

  return {
    stop: async () => {
      if (recorder.state !== 'inactive') recorder.stop()
      const blob = await finished
      cleanup()
      return blob ? blobToDataUrl(blob) : null
    },
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* sudah berhenti */
      }
      cleanup()
    },
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca rekaman'))
    reader.readAsDataURL(blob)
  })
}

async function makeVideo(src: string): Promise<HTMLVideoElement> {
  const video = document.createElement('video')
  video.src = src
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.preload = 'auto'
  await new Promise<void>((resolve, reject) => {
    const done = () => resolve()
    video.onloadeddata = done
    video.oncanplay = done
    video.onerror = () => reject(new Error('Klip live gagal dimuat'))
    // Safari kadang tidak memicu canplay sebelum metadata ada.
    if (video.readyState >= 2) done()
  })
  return video
}

export type StripVideoOptions = {
  mode: GridMode
  frameId: FrameId
  base?: string
  caption?: string
  showDate?: boolean
  photos: string[]
  clips: (string | null)[]
  durationMs?: number
}

/**
 * Ekspor strip sebagai video pendek: setiap slot yang punya klip live ikut
 * bergerak, slot lain tetap diam. Hasilnya MP4 (Safari/Chrome baru) atau WebM.
 */
export async function recordStripVideo(options: StripVideoOptions): Promise<Blob> {
  const mime = liveMimeType()
  if (!mime) throw new Error('Browser ini belum mendukung rekaman video.')

  await Promise.all([waitForFonts(), ensureNewsAssets(options.frameId)])
  const stills = await loadImages(options.photos)
  const clips = await Promise.all(
    options.photos.map(async (_, index) => {
      const src = options.clips[index]
      if (!src) return null
      try {
        return await makeVideo(src)
      } catch {
        return null
      }
    }),
  )

  const frameCanvas = document.createElement('canvas')
  const size = renderStrip(frameCanvas, {
    mode: options.mode,
    frameId: options.frameId,
    base: options.base,
    caption: options.caption,
    showDate: options.showDate,
    photos: stills,
    scale: 1.6,
  })

  const out = document.createElement('canvas')
  out.width = size.width
  out.height = size.height
  const outCtx = out.getContext('2d')
  if (!outCtx) throw new Error('Canvas 2D tidak tersedia.')

  const drawFrame = () => {
    renderStrip(frameCanvas, {
      mode: options.mode,
      frameId: options.frameId,
      base: options.base,
      caption: options.caption,
      showDate: options.showDate,
      photos: options.photos.map((_, index) => clips[index] ?? stills[index]),
      scale: 1.6,
    })
    outCtx.clearRect(0, 0, out.width, out.height)
    outCtx.drawImage(frameCanvas, 0, 0)
  }

  drawFrame()

  try {
    await Promise.all(clips.map((video) => (video ? video.play().catch(() => undefined) : undefined)))
  } catch {
    /* autoplay bisa ditolak: video tetap menampilkan frame pertama */
  }

  const stream = out.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const finished = new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: mime }) : null)
  })

  let raf = 0
  const loop = () => {
    drawFrame()
    raf = window.requestAnimationFrame(loop)
  }
  loop()

  recorder.start(250)
  await new Promise((resolve) => window.setTimeout(resolve, options.durationMs ?? 4000))
  window.cancelAnimationFrame(raf)
  raf = 0

  if (recorder.state !== 'inactive') recorder.stop()
  const blob = await finished

  stream.getTracks().forEach((track) => track.stop())
  clips.forEach((video) => {
    if (!video) return
    video.pause()
    video.removeAttribute('src')
    video.load()
  })

  if (!blob) throw new Error('Rekaman strip kosong.')
  return blob
}

export function liveVideoExtension(mime: string | null) {
  return mime?.includes('mp4') ? 'mp4' : 'webm'
}
