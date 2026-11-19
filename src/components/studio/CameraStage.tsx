import { Camera, FlipHorizontal, ImageUp, Loader2, Radio, Sparkles, RotateCcw, Square, TriangleAlert, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useCamera } from '@/hooks/useCamera'
import { capturePhoto, playShutter } from '@/lib/capture'
import { FILTERS, type FilterId } from '@/lib/filters'
import type { GridMode } from '@/lib/canvas/layout'
import { enhance, attachHoldToCompare } from '@/lib/enhance'
import { isLiveSupported, startLiveRecorder, type LiveRecorder } from '@/lib/live'
import { cn } from '@/lib/utils'
import { LivePreview } from './LivePreview'

export type TimerOption = 3 | 5 | 10

type CameraStageProps = {
  mode: GridMode
  timer: TimerOption
  filter: FilterId
  mirror: boolean
  shots: string[]
  onModeChange: (mode: GridMode) => void
  onTimerChange: (timer: TimerOption) => void
  onFilterChange: (filter: FilterId) => void
  onMirrorChange: (mirror: boolean) => void
  onShotsChange: (shots: string[]) => void
  clips: (string | null)[]
  onClipsChange: (clips: (string | null)[]) => void
  onUpload: (files: FileList) => void
  onComplete: () => void
}

const MODE_LABEL: Record<GridMode, string> = { 1: 'Polaroid', 3: 'Strip 3', 4: 'Life4Cuts' }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

type ShotState = {
  raw: string
  display: string // yang dikirim ke parent / frame editor / export
  enhanced: string | null
  enhancing: boolean
  enhanceMsg: string
}

function ShotCard({
  index,
  raw,
  display,
  enhanced,
  enhancing,
  enhanceMsg,
  hasClip,
  onEnhance,
  onRevert,
  onPreviewLive,
}: {
  index: number
  raw: string
  display: string
  enhanced: string | null
  enhancing: boolean
  enhanceMsg: string
  hasClip: boolean
  onEnhance: (index: number) => void
  onRevert: (index: number) => void
  onPreviewLive: (index: number) => void
}) {
  const beforeRef = useRef<HTMLImageElement | null>(null)
  const afterRef = useRef<HTMLImageElement | null>(null)
  const detachRef = useRef<undefined | (() => void)>(undefined)

  useEffect(() => {
    const before = beforeRef.current
    const after = afterRef.current
    if (!before || !after) return
    detachRef.current = attachHoldToCompare({ srcEl: before, enhancedEl: after })
    return () => {
      detachRef.current?.()
      detachRef.current = undefined
    }
  }, [display, enhanced])

  return (
    <div
      className="relative size-16 overflow-hidden rounded-lg border bg-secondary"
    >
      <img
        ref={beforeRef}
        src={raw}
        alt={`Pose ${index + 1}`}
        className="size-full object-cover"
        draggable={false}
      />
      <img
        ref={afterRef}
        src={enhanced ?? display}
        alt={`Pose ${index + 1} (enhanced)`}
        className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-100"
        draggable={false}
        aria-hidden
      />

      {enhancing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-[12px] font-medium text-white shadow-xs">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {enhanceMsg ?? 'Enhancing…'}
          </div>
        </div>
      )}

      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/55 px-1 text-[9px] font-semibold text-white">
        {index + 1}
      </span>

      {hasClip && (
        <button
          type="button"
          onClick={() => onPreviewLive(index)}
          aria-label={`Putar live photo pose ${index + 1}`}
          className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[8.5px] font-bold tracking-wide text-white transition-colors hover:bg-black/80"
        >
          <Radio className="size-2.5 text-[#ff5f7a]" aria-hidden />
          LIVE
        </button>
      )}

      {/* Tombol aksi selalu tampak di kanan atas kartu, ukuran lebih besar */}
      <div className="absolute top-1 right-1 flex gap-1">
        {enhancing ? (
          <div className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[12px] font-medium text-white shadow-xs pointer-events-none">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Jernihkan…
          </div>
        ) : enhanced ? (
          <button
            type="button"
            onClick={() => onRevert(index)}
            aria-label={`Kembalikan ke foto asli pose ${index + 1}`}
            className="flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        ) : (
          <button
            data-enhance-per-shot
            type="button"
            disabled={enhancing}
            onClick={() => onEnhance(index)}
            aria-label={`Jernihkan foto pose ${index + 1} (AI Enhance)`}
            className="flex size-9 items-center justify-center rounded-full bg-amber-500/95 text-white shadow-xs transition-colors hover:bg-amber-400"
          >
            <Sparkles className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

export function CameraStage({
  mode,
  timer,
  filter,
  mirror,
  shots,
  onModeChange,
  onTimerChange,
  onFilterChange,
  onMirrorChange,
  onShotsChange,
  clips,
  onClipsChange,
  onUpload,
  onComplete,
}: CameraStageProps) {
  const { videoRef, status, message, start, stop } = useCamera()
  const [capturing, setCapturing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [liveOn, setLiveOn] = useState(true)
  const [previewLive, setPreviewLive] = useState<number | null>(null)
  const liveSupported = useRef(isLiveSupported()).current
  const recorderRef = useRef<LiveRecorder | null>(null)
  const abortRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sediakan state lokal untuk filter enhance (agar layout preview
  // konsisten tanpa fragmen). Parent shots[] adalah sumber kebenaran
  // untuk urutan; kita sync masuk.
  const [internal, setInternal] = useState<ShotState[]>(() =>
    shots.map((raw): ShotState => ({ raw, display: raw, enhanced: null, enhancing: false, enhanceMsg: '' }))
  )
  const [globalEnhanceDisabled, setGlobalEnhanceDisabled] = useState(true)
  const [enhancedCount, setEnhancedCount] = useState(0)

  useEffect(() => {
    setInternal((prev) => {
      if (prev.length !== shots.length) {
        return shots.map((raw): ShotState => ({
          raw,
          display: raw,
          enhanced: null,
          enhancing: false,
          enhanceMsg: '',
        }))
      }
      // update raw bila parent berubah (mis. dari upload galeri)
      return prev.map((entry, i) => {
        if (shots[i] !== entry.raw) return { raw: shots[i], display: shots[i], enhanced: null, enhancing: false, enhanceMsg: '' }
        return entry
      })
    })
    setGlobalEnhanceDisabled(shots.length === 0)
  }, [shots])

  // Hitung kartu yang sudah di-enhance dari state terkini.
  useEffect(() => setEnhancedCount(internal.filter((e) => e.enhanced).length), [internal])

  useEffect(() => {
    return () => {
      abortRef.current = true
      recorderRef.current?.cancel()
      recorderRef.current = null
    }
  }, [])

  const busy = capturing
  // Nonaktifkan enhance secara global jika semua kartu belum punya foto.
  useEffect(() => setGlobalEnhanceDisabled(shots.length === 0), [shots.length])

  async function runSession() {
    const video = videoRef.current
    if (!video || status !== 'ready') return

    abortRef.current = false
    setCapturing(true)
    const results: string[] = [...shots]
    const clipsNow: (string | null)[] = [...clips]
    const canLive = liveOn && liveSupported

    for (let index = results.length; index < mode; index++) {
      let recorder: LiveRecorder | null = null

      for (let tick = timer; tick > 0; tick--) {
        if (abortRef.current) break
        // Mulai merekam dua detik terakhir hitung mundur supaya klip mencakup
        // persiapan pose sekaligus momen setelah foto diambil.
        if (canLive && !recorder && tick === Math.min(2, timer)) {
          recorder = startLiveRecorder(video, { mode, filter, mirror })
          recorderRef.current = recorder
        }
        setCountdown(tick)
        await sleep(1000)
      }
      setCountdown(null)
      if (abortRef.current) {
        recorder?.cancel()
        recorderRef.current = null
        break
      }

      const slot = results.length
      try {
        const data = capturePhoto(video, mode, filter, mirror)
        playShutter()
        setFlash(true)
        window.setTimeout(() => setFlash(false), 170)
        results.push(data)
        onShotsChange([...results])
      } catch {
        recorder?.cancel()
        recorderRef.current = null
        toast.error('Gagal mengambil foto. Coba nyalakan ulang kamera.')
        break
      }
      await sleep(700)

      if (recorder) {
        const clip = await recorder.stop()
        recorderRef.current = null
        if (clip) {
          clipsNow[slot] = clip
          onClipsChange([...clipsNow])
        }
      }
    }

    setCapturing(false)
    setCountdown(null)

    if (!abortRef.current && results.length >= mode) {
      stop()
      onComplete()
    }
  }

  function stopSession() {
    abortRef.current = true
    recorderRef.current?.cancel()
    recorderRef.current = null
    setCapturing(false)
    setCountdown(null)
  }

  const remaining = Math.max(0, mode - shots.length)

  const enhanceShot = useCallback(
    async (index: number) => {
      const entry = internal[index]
      if (!entry || entry.enhancing || entry.enhanced) return
      setInternal((all) =>
        all.map((e, i) =>
          i === index ? { ...e, enhancing: true, enhanceMsg: 'Enhancing clarity & reducing noise…' } : e,
        )
      )
      let result: Awaited<ReturnType<typeof enhance>>
      try {
        result = await enhance(entry.raw, { label: 'Enhancing clarity & reducing noise…' })
      } catch {
        toast.error('Enhance gagal. Coba lagi, atau langsung ke frame.')
        setInternal((all) =>
          all.map((e, i) =>
            i === index ? { ...e, enhancing: false, enhanceMsg: '' } : e,
          )
        )
        return
      }
      setInternal((all) =>
        all.map((e, i) => {
          if (i !== index) return e
          const ok = result?.dataUrl && result.dataUrl !== e.raw
          return {
            ...e,
            enhancing: false,
            enhanceMsg: '',
            enhanced: ok ? result.dataUrl : null,
            display: ok ? result.dataUrl : e.raw,
          }
        })
      )
      // Sinkronkan ke parent sehingga FrameEditor & export pakai yang enhanced.
      onShotsChange(internal.map((e) => e.display))
      toast.success('Foto jernihkan selesai. Pakai untuk frame & unduh.')
    },      // eslint-disable-next-line react-hooks/exhaustive-deps
    [internal, onShotsChange],
  )

  const revertShot = useCallback(
    (index: number) => {
      setInternal((all) =>
        all.map((e, i) => {
          if (i !== index || !e.enhanced) return e
          return { ...e, enhanced: null, display: e.raw }
        })
      )
      onShotsChange(internal.map((e) => e.display))
      toast.info('Kembali ke foto asli.')
    },      // eslint-disable-next-line react-hooks/exhaustive-deps
    [internal, onShotsChange],
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_318px] lg:items-start">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-[18px] border bg-[#0c0d12] shadow-card">
          <div className="relative aspect-[3/4] sm:aspect-[4/3]">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              aria-label="Pratinjau kamera"
              className={cn(
                'size-full object-cover transition-opacity duration-300',
                mirror && 'scale-x-[-1]',
                status === 'ready' ? 'opacity-100' : 'opacity-0',
              )}
            />

            {status !== 'ready' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                  {status === 'requesting' ? (
                    <Loader2 className="size-5 animate-spin text-white" aria-hidden />
                  ) : status === 'denied' || status === 'unavailable' || status === 'error' ? (
                    <TriangleAlert className="size-5 text-white/90" aria-hidden />
                  ) : (
                    <Camera className="size-5 text-white/90" aria-hidden />
                  )}
                </div>
                <p className="text-[14px] font-semibold text-white">
                  {status === 'requesting'
                    ? 'Menunggu izin kamera…'
                    : status === 'denied'
                      ? 'Izin kamera ditolak'
                      : status === 'unavailable'
                        ? 'Kamera tidak terdeteksi'
                        : status === 'error'
                          ? 'Kamera gagal dimulai'
                          : 'Kamera belum aktif'}
                </p>
                <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-white/60">
                  {message ??
                    'SnapVibe memakai kamera hanya selama sesi. Tidak ada foto yang dikirim ke server.'}
                </p>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <Button size="sm" className="h-9 rounded-lg px-4" onClick={() => void start()}>
                    {status === 'denied' || status === 'error' ? 'Coba lagi' : 'Nyalakan kamera'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 rounded-lg bg-white/10 px-4 text-white hover:bg-white/20"
                    onClick={() => fileRef.current?.click()}
                  >
                    Pakai foto galeri
                  </Button>
                </div>
              </div>
            )}

            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <span
                  key={countdown}
                  className="animate-count text-[clamp(84px,16vw,132px)] leading-none font-extrabold text-white tabular-nums drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
                >
                  {countdown}
                </span>
              </div>
            )}

            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 bg-white transition-opacity duration-150',
                flash ? 'opacity-90' : 'opacity-0',
              )}
            />

            {status === 'ready' && (
              <>
                <div className="pointer-events-none absolute inset-3 rounded-[12px] ring-1 ring-white/15" aria-hidden />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-[#5ee08a]" aria-hidden />
                  {capturing ? `Pose ${Math.min(shots.length + 1, mode)} dari ${mode}` : 'Kamera aktif'}
                </div>
                {mirror && (
                  <div className="absolute top-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                    Cermin
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = event.target.files
            if (files?.length) onUpload(files)
            event.target.value = ''
          }}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-muted-foreground">
            {shots.length === 0
              ? `${mode} pose · timer ${timer} detik`
              : `${shots.length} dari ${mode} pose tersimpan`}
          </p>

          {status === 'ready' ? (
            capturing ? (
              <Button variant="outline" className="h-10 rounded-lg px-4" onClick={stopSession}>
                <Square className="size-3.5" aria-hidden />
                Hentikan sesi
              </Button>
            ) : (
              <Button className="h-10 rounded-lg px-5" onClick={() => void runSession()}>
                <Camera className="size-4" aria-hidden />
                {shots.length ? `Lanjut ${remaining} pose` : `Mulai ambil ${mode} pose`}
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              className="h-10 rounded-lg px-4"
              onClick={() => fileRef.current?.click()}
            >
              <ImageUp className="size-4" aria-hidden />
              Gunakan foto dari galeri
            </Button>
          )}
        </div>

        {shots.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {internal.map((entry, index) => (
              <ShotCard
                key={`${index}-${entry.raw.slice(-24)}`}
                index={index}
                raw={entry.raw}
                display={entry.display}
                enhanced={entry.enhanced}
                enhancing={entry.enhancing}
                enhanceMsg={entry.enhanceMsg}
                hasClip={Boolean(clips[index])}
                onEnhance={enhanceShot}
                onRevert={revertShot}
                onPreviewLive={setPreviewLive}
              />
            ))}
            {Array.from({ length: Math.max(0, mode - shots.length) }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex size-16 items-center justify-center rounded-lg border border-dashed text-[10px] text-muted-foreground"
              >
                {shots.length + index + 1}
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-5 rounded-[16px] border bg-card p-4 shadow-xs lg:sticky lg:top-24">
        <div className="space-y-2">
          <Label>Jumlah pose</Label>
          <ToggleGroup
            type="single"
            value={String(mode)}
            onValueChange={(value) => value && onModeChange(Number(value) as GridMode)}
            className="grid grid-cols-3 gap-1.5"
            disabled={busy}
          >
            {([1, 3, 4] as GridMode[]).map((value) => (
              <ToggleGroupItem
                key={value}
                value={String(value)}
                className="h-9 rounded-lg border text-[12px] font-medium data-[state=on]:border-primary/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-[11.5px] text-muted-foreground">{MODE_LABEL[mode]} · slot foto disesuaikan otomatis</p>

        {/* Tombol enhance global agar selalu kelihatan dan mudah dicari */}
        <div className="mt-4 border-t border-border/60 pt-4">
          <div>
            <p className="text-[13px] font-semibold">AI Enhance</p>
            <p className="text-[11.5px] text-muted-foreground">
              {shots.length === 0
                ? 'Ambil foto dulu (atau upload dari galeri), lalu perbaiki burik/noise secara otomatis.'
                : enhancedCount === 0
                  ? `Ada ${shots.length} kartu foto. Klik tombol bintang di kartu untuk jernihkan. (atau klik sini untuk jernihkan semua sekaligus)`
                  : `Sudah ${enhancedCount} dari ${shots.length} kartu foto yang di-jernihkan.`}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || globalEnhanceDisabled || enhancedCount >= shots.length}
            onClick={() => {
              // Klik tombol enhance per-shot pertama yang masih belum di-enhance.
              const first = [...document.querySelectorAll('button[data-enhance-per-shot]')].find(
                (b) => !((b as HTMLButtonElement).disabled) && !(b as HTMLButtonElement).dataset?.enhanced,
              ) as HTMLButtonElement | null
              if (first) first.click()
            }}
            aria-label={enhancedCount >= shots.length ? 'Semua foto sudah di-jernihkan' : 'Jernihkan semua foto (AI Enhance)'}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors',
              busy || !shots.length || enhancedCount >= shots.length
                ? 'border-input bg-secondary/70 text-muted-foreground'
                : 'border-primary/50 bg-primary/10 text-accent-foreground',
            )}
          >
            <Wand2 className="size-4" aria-hidden />
            {shots.length === 0 ? 'Ambil foto dulu' : enhancedCount >= shots.length ? 'Sudah semua' : 'Jernihkan semua'}
          </button>
        </div>
        </div>

        <div className="space-y-2">
          <Label>Timer</Label>
          <ToggleGroup
            type="single"
            value={String(timer)}
            onValueChange={(value) => value && onTimerChange(Number(value) as TimerOption)}
            className="grid grid-cols-3 gap-1.5"
            disabled={busy}
          >
            {[3, 5, 10].map((value) => (
              <ToggleGroupItem
                key={value}
                value={String(value)}
                className="h-9 rounded-lg border text-[12px] font-medium data-[state=on]:border-primary/40 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              >
                {value}s
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <Label>Filter</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                aria-pressed={filter === item.id}
                disabled={busy}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] font-medium transition-colors disabled:opacity-60',
                  filter === item.id
                    ? 'border-primary/40 bg-accent text-accent-foreground'
                    : 'hover:bg-secondary',
                )}
              >
                <span
                  className="size-5 shrink-0 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
                  style={{ background: item.swatch }}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-[13px] font-semibold">Mirror</p>
            <p className="text-[11.5px] text-muted-foreground">Balik kamera depan agar natural</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mirror}
            aria-label="Aktifkan mirror kamera"
            onClick={() => onMirrorChange(!mirror)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
              mirror ? 'border-primary bg-primary' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform',
                mirror ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
              aria-hidden
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-[13px] font-semibold">Live Photo</p>
            <p className="text-[11.5px] text-muted-foreground">
              {liveSupported
                ? 'Rekam klip ±3 detik tiap pose, bisa diputar ulang.'
                : 'Browser ini belum mendukung rekaman klip.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={liveOn && liveSupported}
            aria-label="Aktifkan live photo"
            disabled={!liveSupported || busy}
            onClick={() => setLiveOn((value) => !value)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50',
              liveOn && liveSupported ? 'border-primary bg-primary' : 'bg-secondary',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform',
                liveOn && liveSupported ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
              aria-hidden
            />
          </button>
        </div>

        <p className="flex items-start gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <FlipHorizontal className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Kamera dimatikan otomatis begitu semua pose terisi.
        </p>
      </aside>

      {previewLive !== null && internal[previewLive] && (
        <LivePreview
          photo={internal[previewLive].display}
          clip={clips[previewLive] ?? null}
          label={`Live photo · Pose ${previewLive + 1}`}
          onClose={() => setPreviewLive(null)}
        />
      )}
    </div>
  )
}
