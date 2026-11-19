import { PHOTO_ASPECT, type GridMode } from './canvas/layout'
import { filterCss, type FilterId } from './filters'

/** Lebar capture; cukup untuk ekspor 1200 px tanpa upscale. */
const CAPTURE_WIDTH = 1440

/**
 * Gambar satu frame kamera ke canvas dengan crop cover, filter, dan mirror yang
 * sama. Dipakai foto diam dan rekaman live photo supaya keduanya identik.
 */
export function drawPhotoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  mode: GridMode,
  filter: FilterId,
  mirror: boolean,
) {
  const videoWidth = video.videoWidth || 1280
  const videoHeight = video.videoHeight || 720

  const imageRatio = videoWidth / videoHeight
  const boxRatio = width / height
  let drawWidth: number
  let drawHeight: number
  if (imageRatio > boxRatio) {
    drawHeight = height
    drawWidth = drawHeight * imageRatio
  } else {
    drawWidth = width
    drawHeight = drawWidth / imageRatio
  }

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  if (mirror) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }
  const css = filterCss(filter)
  if (css !== 'none' && 'filter' in ctx) ctx.filter = css
  ctx.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
  ctx.restore()
  void mode
}

export function capturePhoto(
  video: HTMLVideoElement,
  mode: GridMode,
  filter: FilterId,
  mirror: boolean,
): string {
  const width = CAPTURE_WIDTH
  const height = Math.round(width / PHOTO_ASPECT[mode])

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D tidak tersedia di browser ini.')

  drawPhotoFrame(ctx, video, width, height, mode, filter, mirror)

  return canvas.toDataURL('image/jpeg', 0.92)
}

let audioCtx: AudioContext | null = null

/** Suara shutter singkat, disintesis — tanpa file audio. */
export function playShutter() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audioCtx) audioCtx = new Ctor()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()

    const time = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(1700, time)
    osc.frequency.exponentialRampToValueAtTime(210, time + 0.07)
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.16, time + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.11)

    const frames = Math.floor(ctx.sampleRate * 0.05)
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3
    }
    const noise = ctx.createBufferSource()
    const noiseGain = ctx.createGain()
    noise.buffer = buffer
    noiseGain.gain.value = 0.07
    noise.connect(noiseGain)
    noiseGain.connect(ctx.destination)
    noise.start(time)
  } catch {
    /* audio diblokir: abaikan, jangan ganggu alur foto */
  }
}
