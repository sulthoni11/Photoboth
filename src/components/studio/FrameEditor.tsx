import { Download, Film, Loader2, Radio, RotateCcw, Share2, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StripCanvas } from '@/components/strip/StripCanvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FRAMES, getFrame, type FrameId } from '@/lib/canvas/frames'
import { ensureNewsAssets } from '@/lib/canvas/newspaper'
import type { GridMode } from '@/lib/canvas/layout'
import {
  canvasToBlob,
  downloadBlob,
  exportFilename,
  loadImages,
  renderStrip,
  waitForFonts,
} from '@/lib/canvas/render'
import { enhance } from '@/lib/enhance'
import { liveMimeType, liveVideoExtension, recordStripVideo } from '@/lib/live'
import { cn } from '@/lib/utils'
import { LivePreview } from './LivePreview'

type FrameEditorProps = {
  mode: GridMode
  shots: string[]
  frameId: FrameId
  base: string | null
  caption: string
  showDate: boolean
  onFrameChange: (frameId: FrameId) => void
  onBaseChange: (base: string | null) => void
  onCaptionChange: (caption: string) => void
  onShowDateChange: (showDate: boolean) => void
  onRetake: (index: number) => void
  onRestart: () => void
  onShotsChange: (shots: string[]) => void
  clips: (string | null)[]
}

const MAX_CAPTION = 25

export function FrameEditor({
  mode,
  shots,
  frameId,
  base,
  caption,
  showDate,
  onFrameChange,
  onBaseChange,
  onCaptionChange,
  onShowDateChange,
  onRetake,
  onRestart,
  onShotsChange,
  clips,
}: FrameEditorProps) {
  const [exporting, setExporting] = useState<'png' | 'jpeg' | 'share' | 'live' | null>(null)
  const [previewLive, setPreviewLive] = useState<number | null>(null)
  const [enhancingIndex, setEnhancingIndex] = useState<number | null>(null)
  const [enhancedIdx, setEnhancedIdx] = useState<number[]>([])
  const originalsRef = useRef<Map<number, string>>(new Map())
  const enhancedRef = useRef<Map<number, string>>(new Map())
  const [compareIndex, setCompareIndex] = useState<number | null>(null)
  const [comparePos, setComparePos] = useState(50)
  const frame = getFrame(frameId)
  const effectiveBase = base ?? frame.defaultBase
  const isEditorial = Boolean(frame.editorial)
  const stripFrames = FRAMES.filter((item) => !item.editorial)
  const cityFrames = FRAMES.filter((item) => item.editorial)

  const anyEnhanced = enhancedIdx.length > 0
  const rawShots = shots.map((shot, index) => originalsRef.current.get(index) ?? shot)

  // Buang riwayat enhance kalau foto di slot itu diganti (retake/upload baru).
  useEffect(() => {
    let stale: number[] = []
    shots.forEach((shot, index) => {
      const original = originalsRef.current.get(index)
      const hd = enhancedRef.current.get(index)
      if (original && hd && shot !== original && shot !== hd) stale.push(index)
    })
    if (!stale.length) return
    stale.forEach((index) => {
      originalsRef.current.delete(index)
      enhancedRef.current.delete(index)
    })
    setEnhancedIdx((prev) => prev.filter((index) => !stale.includes(index)))
    setCompareIndex((prev) => (prev !== null && stale.includes(prev) ? null : prev))
  }, [shots])

  function renderFrameCard(item: (typeof FRAMES)[number]) {
    const selected = item.id === frameId
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onFrameChange(item.id)}
        aria-pressed={selected}
        className={cn(
          'rounded-xl border p-1.5 text-left transition-all',
          selected
            ? 'border-primary/50 bg-accent/60 shadow-xs'
            : 'bg-card hover:border-foreground/20 hover:bg-secondary/60',
        )}
      >
        <div className="overflow-hidden rounded-lg">
          <StripCanvas
            mode={1}
            frameId={item.id}
            photos={[shots[0] ?? '/demo/01.jpg']}
            scale={0.22}
            caption=""
            showDate={false}
            label={`Frame ${item.name}`}
          />
        </div>
        <p className="mt-1.5 truncate text-[11px] font-medium">{item.shortName ?? item.name.split(' ')[0]}</p>
      </button>
    )
  }

  async function buildBlob(format: 'png' | 'jpeg') {
    await Promise.all([waitForFonts(), ensureNewsAssets(frameId)])
    const images = await loadImages(shots)
    const canvas = document.createElement('canvas')
    renderStrip(canvas, {
      mode,
      frameId,
      base: effectiveBase,
      caption,
      showDate,
      photos: images,
      scale: 2, // 600 → 1200 px
    })
    return canvasToBlob(canvas, format)
  }

  async function handleDownload(format: 'png' | 'jpeg') {
    setExporting(format)
    try {
      const blob = await buildBlob(format)
      downloadBlob(blob, exportFilename(frameId, format))
      toast.success(format === 'png' ? 'PNG tersimpan' : 'JPG tersimpan')
    } catch {
      toast.error('Ekspor gagal. Coba lagi, atau kurangi jumlah pose.')
    } finally {
      setExporting(null)
    }
  }

  const runningRef = useRef(false)

  async function runEnhance(indices: number[]) {
    if (runningRef.current) return
    runningRef.current = true
    let working = shots
    const done: number[] = []
    try {
      for (const index of indices) {
        const source = originalsRef.current.get(index) ?? working[index]
        if (!source) continue
        setEnhancingIndex(index)
        try {
          const result = await enhance(source, { label: 'Enhancing clarity & reducing noise…' })
          if (!originalsRef.current.has(index)) originalsRef.current.set(index, source)
          enhancedRef.current.set(index, result.dataUrl)
          working = working.map((shot, i) => (i === index ? result.dataUrl : shot))
          done.push(index)
          onShotsChange(working)
          setEnhancedIdx((prev) => (prev.includes(index) ? prev : [...prev, index]))
        } catch {
          toast.error(`Gagal menyempurnakan foto ${index + 1}.`)
        }
      }
      if (done.length) {
        toast.success(done.length > 1 ? `${done.length} foto dipertajam` : `Foto ${done[0] + 1} dipertajam`)
      }
    } finally {
      setEnhancingIndex(null)
      runningRef.current = false
    }
  }

  function isUsingEnhanced(index: number) {
    return enhancedRef.current.get(index) === shots[index]
  }

  function applyChoice(index: number, choice: 'original' | 'enhanced') {
    const next = choice === 'enhanced' ? enhancedRef.current.get(index) : originalsRef.current.get(index)
    if (!next || next === shots[index]) return
    onShotsChange(shots.map((shot, i) => (i === index ? next : shot)))
    toast.success(
      choice === 'enhanced' ? `Foto ${index + 1}: pakai hasil jernih` : `Foto ${index + 1}: pakai foto asli`,
    )
  }

  const hasClips = clips.some(Boolean)

  async function handleDownloadLive() {
    if (!hasClips) {
      toast.info('Belum ada klip live di sesi ini. Nyalakan Live Photo, lalu ambil ulang pose.')
      return
    }
    setExporting('live')
    try {
      const blob = await recordStripVideo({
        mode,
        frameId,
        base: effectiveBase,
        caption,
        showDate,
        photos: shots,
        clips,
        durationMs: 4000,
      })
      downloadBlob(blob, `snapvibe-${frameId}-live.${liveVideoExtension(liveMimeType())}`)
      toast.success('Video live tersimpan')
    } catch {
      toast.error('Gagal membuat video live. Coba lagi setelah semua pose terisi.')
    } finally {
      setExporting(null)
    }
  }

  async function handleShare() {
    setExporting('share')
    try {
      const blob = await buildBlob('png')
      const file = new File([blob], exportFilename(frameId, 'png'), { type: 'image/png' })
      const data: ShareData = { files: [file], title: 'SnapVibe Studio', text: 'Hasil sesi SnapVibe' }
      if (navigator.canShare?.(data)) {
        await navigator.share(data)
      } else {
        downloadBlob(blob, exportFilename(frameId, 'png'))
        toast.success('Web Share tidak tersedia — file diunduh')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('Gagal membagikan. Coba unduh PNG.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10">
      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[16px] border bg-surface-soft p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[336px] rounded-xl border bg-card p-2 shadow-card">
            <StripCanvas
              mode={mode}
              frameId={frameId}
              base={effectiveBase}
              caption={caption}
              showDate={showDate}
              photos={shots}
              scale={1}
              label="Pratinjau strip hasil sesi"
            />

          </div>

          {compareIndex !== null && shots[compareIndex] && (
            <div className="mt-4 rounded-[16px] border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold">
                  Sebelum & sesudah · Foto {compareIndex + 1}
                </p>
                <button
                  type="button"
                  onClick={() => setCompareIndex(null)}
                  aria-label="Tutup perbandingan"
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>

              <div className="relative mt-2 overflow-hidden rounded-lg bg-secondary select-none">
                <img
                  src={rawShots[compareIndex]}
                  alt={`Foto ${compareIndex + 1} sebelum disempurnakan`}
                  className="block w-full"
                  draggable={false}
                />
                {enhancedRef.current.get(compareIndex) && (
                  <div
                    className="absolute inset-0"
                    style={{ clipPath: `inset(0 0 0 ${comparePos}%)` }}
                  >
                    <img
                      src={enhancedRef.current.get(compareIndex)}
                      alt={`Foto ${compareIndex + 1} sesudah disempurnakan`}
                      className="block size-full object-cover"
                      draggable={false}
                    />
                  </div>
                )}

                <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Sebelum
                </span>
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Sesudah
                </span>

                {enhancedRef.current.get(compareIndex) && (
                  <>
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                      style={{ left: `calc(${comparePos}% - 1px)` }}
                      aria-hidden
                    >
                      <span className="absolute top-1/2 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black shadow">
                        ↔
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={comparePos}
                      onChange={(event) => setComparePos(Number(event.target.value))}
                      aria-label="Geser untuk membandingkan sebelum dan sesudah"
                      className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                    />
                  </>
                )}
              </div>

              {clips[compareIndex] && (
                <Button
                  variant="secondary"
                  className="mt-2 h-9 w-full rounded-lg"
                  onClick={() => setPreviewLive(compareIndex)}
                >
                  <Radio className="size-3.5 text-[#ff5f7a]" aria-hidden />
                  Putar live photo
                </Button>
              )}

              {shots.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shots.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCompareIndex(index)}
                      aria-label={`Bandingkan foto ${index + 1}`}
                      aria-pressed={index === compareIndex}
                      className={cn(
                        'size-6 rounded-full border text-[10.5px] font-semibold tabular-nums transition-colors',
                        index === compareIndex
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3">
                {!enhancedRef.current.get(compareIndex) ? (
                  <>
                    <p className="text-[11.5px] text-muted-foreground">
                      Belum disempurnakan. Foto asli yang dipakai saat unduh.
                    </p>
                    <Button
                      className="mt-2 h-10 w-full rounded-lg"
                      onClick={() => void runEnhance([compareIndex])}
                      disabled={enhancingIndex !== null}
                    >
                      {enhancingIndex === compareIndex ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="size-4" aria-hidden />
                      )}
                      Sempurnakan foto ini
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-[11.5px] text-muted-foreground">Pilih versi yang dipakai di strip & unduhan:</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        variant={isUsingEnhanced(compareIndex) ? 'outline' : 'secondary'}
                        className={cn(
                          'h-10 rounded-lg',
                          !isUsingEnhanced(compareIndex) && 'border-foreground/30 font-semibold',
                        )}
                        aria-pressed={!isUsingEnhanced(compareIndex)}
                        onClick={() => applyChoice(compareIndex, 'original')}
                      >
                        Pakai asli
                      </Button>
                      <Button
                        variant={isUsingEnhanced(compareIndex) ? 'default' : 'outline'}
                        className="h-10 rounded-lg"
                        aria-pressed={isUsingEnhanced(compareIndex)}
                        onClick={() => applyChoice(compareIndex, 'enhanced')}
                      >
                        Pakai hasil HD
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[11.5px] text-muted-foreground">
            <p>1200 px · {mode} pose</p>
            <p>{frame.name}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Ulangi pose tertentu
            </p>
            <button
              type="button"
              onClick={onRestart}
              className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              Ulang semua
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {shots.map((shot, index) => {
              const isEnhanced = enhancedIdx.includes(index)
              const isBusy = enhancingIndex === index
              return (
                <div key={`${index}-${shot.slice(-24)}`} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setComparePos(50)
                      setCompareIndex(index)
                    }}
                    aria-label={`Bandingkan sebelum & sesudah foto ${index + 1}`}
                    className="relative block rounded-lg"
                  >
                    <img
                      src={shot}
                      alt={`Pose ${index + 1}`}
                      className="size-16 rounded-lg border object-cover"
                    />
                    {clips[index] && (
                      <span className="absolute right-0.5 bottom-0.5 flex items-center gap-0.5 rounded bg-black/65 px-1 py-0.5 text-[8px] font-bold tracking-wide text-white">
                        <Radio className="size-2 text-[#ff5f7a]" aria-hidden />
                        LIVE
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRetake(index)}
                    aria-label={`Ulangi pose ${index + 1}`}
                    className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground"
                  >
                    <RotateCcw className="size-3" aria-hidden />
                  </button>
                  {isBusy ? (
                    <div className="absolute -left-1 -top-1 flex size-7 items-center justify-center rounded-full bg-amber-500/95 text-white shadow-xs">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    </div>
                  ) : isEnhanced ? (
                    <button
                      type="button"
                      onClick={() => {
                        setComparePos(50)
                        setCompareIndex(index)
                      }}
                      aria-label={`Bandingkan foto pose ${index + 1}`}
                      title="Sebelum & sesudah"
                      className="absolute -left-1 -top-1 flex size-7 items-center justify-center rounded-full border border-emerald-600/40 bg-background text-emerald-600 shadow-xs transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    >
                      <Sparkles className="size-3.5" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void runEnhance([index])}
                      disabled={enhancingIndex !== null}
                      aria-label={`Sempurnakan foto pose ${index + 1}`}
                      title="Sempurnakan foto"
                      className="absolute -left-1 -top-1 flex size-7 items-center justify-center rounded-full bg-amber-500/95 text-white shadow-xs transition-colors hover:bg-amber-400 disabled:opacity-70"
                    >
                      <Sparkles className="size-3.5" aria-hidden />
                    </button>
                  )}
                  {isUsingEnhanced(index) && (
                    <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-emerald-600/90 px-1 text-[8px] font-semibold text-white">
                      HD
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <section aria-labelledby="frame-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="frame-heading" className="text-[15px] font-semibold">
              Frame
            </h2>
            <p className="text-[11.5px] text-muted-foreground">Klik untuk ganti, langsung terlihat</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-2.5">
            {stripFrames.map(renderFrameCard)}
          </div>

          <div className="mt-5 flex items-baseline justify-between">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Edisi koran kota
            </p>
            <p className="text-[11px] text-muted-foreground">6 edisi</p>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
            Layout surat kabar dengan lambang kota, foto arsip berlisensi, dan artikel yang ditulis ulang per kota.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-2.5">
            {cityFrames.map(renderFrameCard)}
          </div>
        </section>

        <section aria-labelledby="color-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="color-heading" className="text-[15px] font-semibold">
              {isEditorial ? 'Warna kertas' : 'Warna dasar'}
            </h2>
            <button
              type="button"
              onClick={() => onBaseChange(null)}
              className="text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {frame.swatches.map((color) => {
              const selected = effectiveBase.toLowerCase() === color.toLowerCase()
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onBaseChange(color)}
                  aria-label={`Warna ${color}`}
                  aria-pressed={selected}
                  className={cn(
                    'size-9 rounded-full ring-1 ring-black/10 ring-inset transition-transform dark:ring-white/20',
                    selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                  style={{ backgroundColor: color }}
                />
              )
            })}
          </div>
        </section>

        <section aria-labelledby="text-heading" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="text-heading" className="text-[15px] font-semibold">
              {isEditorial ? 'Caption foto' : 'Teks bawah'}
            </h2>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">
              {caption.length}/{MAX_CAPTION}
            </span>
          </div>
          <Input
            value={caption}
            maxLength={MAX_CAPTION}
            placeholder={isEditorial ? 'misal: Braga, 1979' : 'misal: sweet day'}
            onChange={(event) => {
              const clean = event.target.value.replace(/[\\u0000-\\u001f\\u007f]/g, '')
              onCaptionChange(clean.slice(0, MAX_CAPTION))
            }}
            className="h-10 rounded-lg"
            aria-label="Teks kustom pada frame"
          />
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium">Tanggal otomatis</p>
              <p className="text-[11.5px] text-muted-foreground">
                {isEditorial ? 'Tanggal edisi di bar atas' : 'YYYY.MM.DD di bawah teks'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showDate}
              aria-label="Tampilkan tanggal"
              onClick={() => onShowDateChange(!showDate)}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
                showDate ? 'border-primary bg-primary' : 'bg-secondary',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform',
                  showDate ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
                aria-hidden
              />
            </button>
          </div>
        </section>

        <section aria-labelledby="enhance-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="enhance-heading" className="text-[15px] font-semibold">
              Sempurnakan foto
            </h2>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">
              {enhancedIdx.length}/{shots.length}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Perjelas foto yang blur atau berbintik (noise) langsung di perangkat. Hasil ini yang dipakai saat unduh.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-11 flex-1 rounded-lg"
              onClick={() =>
                void runEnhance(
                  shots.map((_, index) => index).filter((index) => !enhancedIdx.includes(index)),
                )
              }
              disabled={enhancingIndex !== null || enhancedIdx.length >= shots.length || shots.length === 0}
            >
              {enhancingIndex !== null ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {enhancedIdx.length >= shots.length ? 'Semua sudah tajam' : 'Sempurnakan semua'}
            </Button>
          </div>
          {anyEnhanced && (
            <Button
              variant="outline"
              className="mt-2 h-10 w-full rounded-lg"
              onClick={() => {
                setComparePos(50)
                setCompareIndex(enhancedIdx[0] ?? 0)
              }}
            >
              <Sparkles className="size-4" aria-hidden />
              Lihat sebelum & sesudah
            </Button>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            Klik foto kecil untuk membandingkan, lalu pilih versi asli atau hasil HD.
          </p>
        </section>

        <section aria-labelledby="export-heading">
          <h2 id="export-heading" className="text-[15px] font-semibold">
            Simpan
          </h2>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              className="h-11 flex-1 rounded-lg"
              onClick={() => void handleDownload('png')}
              disabled={exporting !== null}
            >
              {exporting === 'png' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Unduh PNG
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-lg"
              onClick={() => void handleDownload('jpeg')}
              disabled={exporting !== null}
            >
              {exporting === 'jpeg' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Unduh JPG
            </Button>
            <Button
              variant="secondary"
              className="h-11 rounded-lg"
              onClick={() => void handleShare()}
              disabled={exporting !== null}
            >
              {exporting === 'share' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Share2 className="size-4" aria-hidden />
              )}
              Bagikan
            </Button>
          </div>
          <Button
            variant="outline"
            className="mt-2 h-11 w-full rounded-lg"
            onClick={() => void handleDownloadLive()}
            disabled={exporting !== null}
            title={hasClips ? undefined : 'Nyalakan Live Photo saat mengambil pose untuk memakai fitur ini'}
          >
            {exporting === 'live' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Film className="size-4" aria-hidden />
            )}
            Unduh Live (video strip)
          </Button>
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            Tanpa watermark. Semua proses di perangkatmu.
            {hasClips ? ' Video live: 4 detik, tiap pose bergerak.' : ''}
          </p>
        </section>
      </div>

      {previewLive !== null && shots[previewLive] && (
        <LivePreview
          photo={shots[previewLive]}
          clip={clips[previewLive] ?? null}
          label={`Live photo · Foto ${previewLive + 1}`}
          onClose={() => setPreviewLive(null)}
        />
      )}
    </div>
  )
}
