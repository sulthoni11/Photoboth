/**
 * AI Magic Enhancer — pemrosesan gambar sisi klien (murni Canvas 2D).
 *
 * API:
 *  - enhance(dataUrl|Blob)                         → EnhanceResult
 *  - enhanceBlob(blob, opts?)                      → EnhanceResult
 *  - attachHoldToCompare({ srcEl, enhancedEl })    → () => void   (teardown)
 *  - makeComparison({ before, after, width? })     → canvases untuk slider kustom
 *
 * Alur (meniru "photo enhancer" ala PicWish, tanpa model neural):
 *  1. Estimasi noise dari variansi area datar.
 *  2. Denoise edge-preserving: bilateral separable pada luma (ringan) dan pada
 *     chroma (lebih kuat) → bintik warna hilang, tepi tetap tegas.
 *  3. Pemulihan detail: unsharp dua radius (mid + coarse) dengan halos
 *     suppression, plus tambahan deblur kalau foto memang lembut/blur.
 *  4. Mask area datar (kulit, langit) → micro-sharpen dikurangi supaya hasilnya
 *     halus, bukan kasar/berbintik.
 *  5. Tone & warna: white balance gray-world, auto-level lembut, kurva filmic
 *     (shadow lift + highlight rolloff), vibrance yang menjaga warna kulit.
 *
 * Batasan:
 *  - Input murni data URL atau Blob lokal → tanpa CORS/backend, tanpa watermark.
 *  - Jika canvas/2D context gagal, pipeline mengembalikan input apa adanya.
 *  - Ukuran internal dibatasi supaya memori tetap wajar di ponsel.
 */

const MAX_SIDE = 1600

export type EnhanceResult = {
  dataUrl: string
  label: string
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

/** Box blur 1-pass separable (edge clamp), dipakai sebagai approximation Gaussian. */
function boxBlurPlane(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
  passes = 1,
): Float32Array {
  if (radius < 1 || w < 2 || h < 2) return src.slice()
  const n = w * h
  const win = radius * 2 + 1
  let cur = src.slice()
  const tmp = new Float32Array(n)

  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        sum += cur[row + Math.min(w - 1, Math.max(0, k))]
      }
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / win
        const addX = Math.min(w - 1, x + radius + 1)
        const subX = Math.max(0, x - radius)
        sum += cur[row + addX] - cur[row + subX]
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x]
      }
      for (let y = 0; y < h; y++) {
        cur[y * w + x] = sum / win
        const addY = Math.min(h - 1, y + radius + 1)
        const subY = Math.max(0, y - radius)
        sum += tmp[addY * w + x] - tmp[subY * w + x]
      }
    }
  }
  return cur
}

/** Bilateral filter separable (guide = plane lain). Menjaga tepi, meredam noise. */
function bilateralPlane(
  src: Float32Array,
  guide: Float32Array,
  w: number,
  h: number,
  radius: number,
  sigmaRange: number,
): Float32Array {
  if (radius < 1 || w < 2 || h < 2) return src.slice()
  const n = w * h
  const rangeLut = new Float32Array(256)
  const invRange = 1 / (2 * sigmaRange * sigmaRange)
  for (let d = 0; d < 256; d++) rangeLut[d] = Math.exp(-(d * d) * invRange)

  const spatial = new Float32Array(radius * 2 + 1)
  const invSpatial = 1 / (2 * radius * radius)
  for (let k = -radius; k <= radius; k++) {
    spatial[k + radius] = Math.exp(-(k * k) * invSpatial)
  }

  const tmp = new Float32Array(n)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      const i = row + x
      const g0 = guide[i]
      let sum = 0
      let wsum = 0
      const kMin = Math.max(-radius, -x)
      const kMax = Math.min(radius, w - 1 - x)
      for (let k = kMin; k <= kMax; k++) {
        const j = i + k
        const d = Math.abs(guide[j] - g0) | 0
        const wgt = rangeLut[d > 255 ? 255 : d] * spatial[k + radius]
        sum += src[j] * wgt
        wsum += wgt
      }
      tmp[i] = wsum > 0 ? sum / wsum : src[i]
    }
  }

  const out = new Float32Array(n)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      const i = row + x
      const g0 = guide[i]
      let sum = 0
      let wsum = 0
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k
        if (yy < 0 || yy >= h) continue
        const j = yy * w + x
        const d = Math.abs(guide[j] - g0) | 0
        const wgt = rangeLut[d > 255 ? 255 : d] * spatial[k + radius]
        sum += tmp[j] * wgt
        wsum += wgt
      }
      out[i] = wsum > 0 ? sum / wsum : src[i]
    }
  }
  return out
}

/** Perkiraan level noise (RMS) dari area yang relatif datar. */
function estimateNoise(y: Float32Array, w: number, h: number): number {
  const detail = boxBlurPlane(y, w, h, 1, 1)
  let sum = 0
  let count = 0
  for (let i = 0; i < y.length; i++) {
    const high = Math.abs(y[i] - detail[i])
    if (high < 12) {
      sum += high * high
      count++
    }
  }
  if (!count) return 1.5
  return Math.sqrt(sum / count)
}

/** Tone curve LUT: shadow lift halus + S contrast + highlight rolloff. */
function makeToneLut(): Float32Array {
  const lut = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    // Angkat bayangan tipis, jangan sampai hitam jadi abu-abu.
    const lifted = x + 0.055 * (1 - x) * (1 - x) * (1 - x) * x * 3
    const s =
      lifted < 0.5
        ? 0.5 * Math.pow(lifted * 2, 1.07)
        : 1 - 0.5 * Math.pow((1 - lifted) * 2, 1.07)
    // Rolloff highlight supaya wajah tidak "pecah" putih.
    const t = lifted * 0.62 + s * 0.38
    const rolled = t > 0.86 ? 0.86 + (t - 0.86) * 0.78 : t
    lut[i] = clamp01(rolled) * 255
  }
  return lut
}

function softClip(v: number): number {
  if (v <= 232) return v
  return 232 + 23 * (1 - Math.exp(-(v - 232) / 23))
}

function percentile(hist: Uint32Array, total: number, ratio: number): number {
  const target = total * ratio
  let acc = 0
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= target) return i
  }
  return 255
}

async function enhanceCore(dataUrl: string, label: string): Promise<EnhanceResult> {
  const { img } = await loadImageFromInput(dataUrl).catch(() => ({ img: null }))
  if (!img) return { dataUrl, label }

  const w = Math.min(MAX_SIDE, img.naturalWidth)
  const h = Math.min(MAX_SIDE, img.naturalHeight)
  if (!w || !h) return { dataUrl, label }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dataUrl, label }

  try {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, w, h)
    let imageData = ctx.getImageData(0, 0, w, h)

    const n = w * h
    const y = new Float32Array(n)
    const cb = new Float32Array(n)
    const cr = new Float32Array(n)

    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const r = imageData.data[p]
      const g = imageData.data[p + 1]
      const b = imageData.data[p + 2]
      const luma = 0.299 * r + 0.587 * g + 0.114 * b
      y[i] = luma
      cb[i] = b - luma
      cr[i] = r - luma
    }

    // 1. Denoise: luma dua tahap (detail tetap di tepi), chroma lebih kuat
    //    supaya bintik warna hilang tanpa membuat foto jadi kabur.
    const noise = estimateNoise(y, w, h)
    const rangeY = 8 + Math.min(6, noise * 1.2)
    const yPass1 = bilateralPlane(y, y, w, h, 2, rangeY)
    const yClean = bilateralPlane(yPass1, yPass1, w, h, 2, rangeY * 0.55)
    const cbClean = bilateralPlane(cb, y, w, h, 2, 20)
    const crClean = bilateralPlane(cr, y, w, h, 2, 20)

    // 2. Detail recovery dengan pengaman halo.
    const mid = boxBlurPlane(yClean, w, h, 2, 2)
    const localMean = boxBlurPlane(yClean, w, h, 2, 1)
    const sq = new Float32Array(n)
    for (let i = 0; i < n; i++) sq[i] = yClean[i] * yClean[i]
    const localSq = boxBlurPlane(sq, w, h, 2, 1)

    // Peta struktur: area bertekstur kuat (mata, bulu mata, kain) vs area
    // halus (kulit, langit). Penajaman hanya diberikan ke struktur nyata,
    // sementara area halus dibuat lebih mulus (bukan dipaksa tajam).
    const stdMap = new Float32Array(n)
    let edgeEnergy = 0
    for (let i = 0; i < n; i++) {
      const variance = Math.max(0, localSq[i] - localMean[i] * localMean[i])
      stdMap[i] = Math.sqrt(variance)
      edgeEnergy += Math.abs(yClean[i] - mid[i])
    }
    edgeEnergy /= n
    const softness = clamp01((7 - edgeEnergy) / 7)

    // Haluskan hanya bintik halus di area benar-benar datar (pori/bercak),
    // dengan radius kecil supaya helai rambut dan bulu mata tidak ikut lumer.
    const ySmooth = bilateralPlane(yClean, yClean, w, h, 2, 12)
    const yBase = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      // Area sangat datar (kulit) → tambah kehalusan.
      const smoothness = clamp01((2.6 - stdMap[i]) / 2) * 0.6
      // Area berstruktur (rambut, bulu mata) → kembalikan sebagian tekstur asli
      // supaya helai tidak lumer; noise di sini tertutup oleh detailnya.
      const structure = clamp01((stdMap[i] - 4) / 8) * 0.7
      yBase[i] = yClean[i] + (ySmooth[i] - yClean[i]) * smoothness + (y[i] - yClean[i]) * structure
    }

    const baseMid = boxBlurPlane(yBase, w, h, 2, 2)
    const detail = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const base = yBase[i]
      const dm = base - baseMid[i]
      const edge = clamp01((stdMap[i] - 5) / 8)

      // Halo suppression: lompatan besar tidak ikut dinaikkan ekstrem.
      const halo = 1 / (1 + (dm / 26) * (dm / 26))
      // Struktur nyata dapat penajaman; area halus hampir tidak.
      const gain = 0.24 + 1.12 * edge
      const extraDeblur = edge * softness * 0.35

      detail[i] = base + dm * (gain + extraDeblur) * halo
    }

    // 3. Tone dan vibrance. White balance tidak disentuh: kamera sudah
    //    menyeimbangkan warna, dan memaksa gray-world justru memudarkan warna.
    // Auto-level memakai histogram luma hasil detail.
    const hist = new Uint32Array(256)
    for (let i = 0; i < n; i++) hist[clampByte(detail[i])]++
    const lo = percentile(hist, n, 0.004)
    const hi = percentile(hist, n, 0.996)
    const span = Math.max(1, hi - lo)
    // Hanya regangkan kalau fotonya memang pudar/kurang kontras. Foto yang
    // sudah normal dibiarkan apa adanya supaya tidak jadi terlalu terang.
    const rawScale = Math.min(1.12, Math.max(1, 225 / span))
    const scale = 1 + (rawScale - 1) * 0.9
    const offset = -lo * scale * 0.8

    const tone = makeToneLut()
    const data = imageData.data

    for (let i = 0, p = 0; i < n; i++, p += 4) {
      // Tone hanya diterapkan ke luminance. Kalau kurva dipakai per kanal,
      // warna kuat (mis. lampu neon biru) ikut pudar/menjadi kelabu.
      const l = tone[clampByte(detail[i] * scale + offset)]
      let r = l + crClean[i] * 1.03
      let b = l + cbClean[i] * 1.03
      let g = (l - 0.299 * r - 0.114 * b) / 0.587

      const maxc = Math.max(r, g, b)
      const minc = Math.min(r, g, b)
      const sat = maxc > 0 ? (maxc - minc) / maxc : 0
      // Vibrance: warna yang sudah pekat tidak ditambah lagi.
      let boost = 1 + 0.24 * (1 - sat) * (1 - sat)
      // Lindungi warna kulit (oranye kemerahan) supaya tidak jadi kemerahan.
      if (r > g && g > b && r - b > 12) boost = 1 + (boost - 1) * 0.6
      r = l + (r - l) * boost
      g = l + (g - l) * boost
      b = l + (b - l) * boost

      // Highlight rolloff supaya wajah/lampu tidak pecah putih setelah vibrance.
      data[p] = clampByte(softClip(r))
      data[p + 1] = clampByte(softClip(g))
      data[p + 2] = clampByte(softClip(b))
      data[p + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0)
    const outUrl = canvas.toDataURL('image/jpeg', 0.92)
    return { dataUrl: outUrl, label }
  } catch {
    try {
      return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), label }
    } catch {
      return { dataUrl, label }
    }
  }
}

export async function enhance(
  input: string | Blob,
  options?: { label?: string },
): Promise<EnhanceResult> {
  const label = options?.label ?? 'Enhancing photo…'
  const dataUrl =
    typeof input === 'string'
      ? input || null
      : input instanceof Blob && input.type.startsWith('image/')
        ? URL.createObjectURL(input)
        : null
  if (!dataUrl) return { dataUrl: '', label }
  return enhanceCore(dataUrl, label)
}

export async function enhanceDataUrl(
  input: string,
  options?: { label?: string },
): Promise<EnhanceResult> {
  return enhance(input, options)
}

export async function enhanceBlob(
  input: Blob,
  options?: { label?: string },
): Promise<EnhanceResult> {
  const dataUrl = URL.createObjectURL(input)
  try {
    return await enhance(dataUrl, options)
  } finally {
    URL.revokeObjectURL(dataUrl)
  }
}

// Before/after comparison via dua canvas (dipakai slider kustom di FrameEditor).
export async function makeComparison({
  before,
  after,
  width,
}: {
  before: string
  after: string
  width?: number
}): Promise<{ beforeCanvas: HTMLCanvasElement; afterCanvas: HTMLCanvasElement }> {
  const beforeCanvas = await toCanvas(before)
  const afterCanvas = await toCanvas(after)
  const w = width ?? beforeCanvas.width
  beforeCanvas.style.width = `${w}px`
  afterCanvas.style.width = `${w}px`
  return { beforeCanvas, afterCanvas }
}

async function toCanvas(src: string): Promise<HTMLCanvasElement> {
  const { img } = await loadImageFromInput(src).catch(() => ({ img: null }))
  if (!img) throw new Error('Gagal memuat gambar perbandingan.')
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const cctx = c.getContext('2d')
  if (!cctx) throw new Error('Canvas 2D tidak tersedia.')
  cctx.drawImage(img, 0, 0)
  return c
}

async function loadImageFromInput(src: string): Promise<{ img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ img })
    img.onerror = () => reject(new Error('Gagal memuat sumber gambar.'))
    img.src = src
  })
}

// Hold-to-compare untuk elemen gambar.
export function attachHoldToCompare({
  srcEl,
  enhancedEl,
  onRelease,
}: {
  srcEl: HTMLImageElement
  enhancedEl: HTMLImageElement
  onRelease?: () => void
}): () => void {
  let cleaning = false

  function showBefore() {
    if (cleaning) return
    srcEl.style.opacity = '1'
    enhancedEl.style.opacity = '0'
  }
  function showAfter() {
    if (cleaning) return
    srcEl.style.opacity = '0'
    enhancedEl.style.opacity = '1'
  }
  function up() {
    showBefore()
    onRelease?.()
  }

  srcEl.style.position = 'relative'
  srcEl.style.opacity = '1'
  enhancedEl.style.position = 'absolute'
  enhancedEl.style.inset = '0'
  enhancedEl.style.opacity = '0'
  enhancedEl.style.pointerEvents = 'none'
  enhancedEl.style.transition = 'opacity 120ms ease'

  function down(e: PointerEvent) {
    e.preventDefault()
    if (cleaning) return
    showAfter()
  }

  srcEl.addEventListener('pointerdown', down, { passive: false })
  srcEl.addEventListener('pointerup', up)
  srcEl.addEventListener('pointercancel', up)
  srcEl.addEventListener('pointerleave', up)
  enhancedEl.addEventListener('pointerdown', down, { passive: false })
  enhancedEl.addEventListener('pointerup', up)
  enhancedEl.addEventListener('pointercancel', up)
  enhancedEl.addEventListener('pointerleave', up)

  return () => {
    cleaning = true
    srcEl.removeEventListener('pointerdown', down as unknown as EventListener)
    srcEl.removeEventListener('pointerup', up)
    srcEl.removeEventListener('pointercancel', up)
    srcEl.removeEventListener('pointerleave', up)
    enhancedEl.removeEventListener('pointerdown', down as unknown as EventListener)
    enhancedEl.removeEventListener('pointerup', up)
    enhancedEl.removeEventListener('pointercancel', up)
    enhancedEl.removeEventListener('pointerleave', up)
  }
}
