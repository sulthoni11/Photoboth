import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CameraStage, type TimerOption } from '@/components/studio/CameraStage'
import { FrameEditor } from '@/components/studio/FrameEditor'
import { StudioHeader } from '@/components/studio/StudioHeader'
import { Toaster } from '@/components/ui/sonner'
import { FRAMES, getFrame, type FrameId } from '@/lib/canvas/frames'
import type { GridMode } from '@/lib/canvas/layout'
import type { FilterId } from '@/lib/filters'

type Stage = 'camera' | 'editor'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

function isFrameId(value: string | null): value is FrameId {
  return FRAMES.some((frame) => frame.id === value)
}

export default function Studio() {
  const [params] = useSearchParams()
  const frameParam = params.get('frame')

  const [stage, setStage] = useState<Stage>('camera')
  const [mode, setMode] = useState<GridMode>(4)
  const [shots, setShots] = useState<string[]>([])
  const [clips, setClips] = useState<(string | null)[]>([])
  const [frameId, setFrameId] = useState<FrameId>(isFrameId(frameParam) ? frameParam : 'classic')
  const [base, setBase] = useState<string | null>(null)
  const [caption, setCaption] = useState('snapvibe')
  const [showDate, setShowDate] = useState(true)
  const [timer, setTimer] = useState<TimerOption>(3)
  const [filter, setFilter] = useState<FilterId>('original')
  const [mirror, setMirror] = useState(true)

  useEffect(() => {
    if (isFrameId(frameParam)) setFrameId(frameParam)
  }, [frameParam])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stage])

  function handleModeChange(next: GridMode) {
    setMode(next)
    setShots([])
    setClips([])
    setStage('camera')
  }

  function handleFrameChange(next: FrameId) {
    setFrameId(next)
    setBase(null)
  }

  async function handleUpload(files: FileList) {
    const selected = Array.from(files).slice(0, mode)
    try {
      const urls = await Promise.all(selected.map(readAsDataUrl))
      setShots(urls)
      setClips([])
      if (urls.length >= mode) {
        setStage('editor')
      } else {
        toast.info(`Baru ${urls.length} dari ${mode} foto. Kamu bisa lanjut dengan kamera.`)
      }
    } catch {
      toast.error('Gagal membaca gambar. Coba file JPG atau PNG.')
    }
  }

  function handleRetake(index: number) {
    setShots((previous) => previous.slice(0, index))
    setClips((previous) => previous.slice(0, index))
    setStage('camera')
    toast.info(`Pose ${index + 1} dihapus. Ambil ulang dari kamera.`)
  }

  function handleRestart() {
    setShots([])
    setClips([])
    setStage('camera')
  }

  const frameName = getFrame(frameId).name

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <StudioHeader current={stage === 'camera' ? 0 : 1} />

      <main className="container-page flex-1 py-6 pb-20 sm:py-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-[22px] font-extrabold sm:text-[26px]">
            {stage === 'camera' ? 'Sesi foto' : 'Susun strip'}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {stage === 'camera'
              ? 'Pilih jumlah pose dan timer, lalu mulai. Semua foto tetap di perangkat ini.'
              : `${frameName} · pratinjau berubah langsung saat kamu memilih.`}
          </p>
        </div>

        {stage === 'camera' ? (
          <CameraStage
            mode={mode}
            timer={timer}
            filter={filter}
            mirror={mirror}
            shots={shots}
            onModeChange={handleModeChange}
            onTimerChange={setTimer}
            onFilterChange={setFilter}
            onMirrorChange={setMirror}
            onShotsChange={setShots}
            clips={clips}
            onClipsChange={setClips}
            onUpload={(files) => void handleUpload(files)}
            onComplete={() => setStage('editor')}
          />
        ) : (
          <FrameEditor
            mode={mode}
            shots={shots}
            frameId={frameId}
            base={base}
            caption={caption}
            showDate={showDate}
            onFrameChange={handleFrameChange}
            onBaseChange={setBase}
            onCaptionChange={setCaption}
            onShowDateChange={setShowDate}
            onRetake={handleRetake}
            onRestart={handleRestart}
            onShotsChange={setShots}
            clips={clips}
          />
        )}
      </main>

      <Toaster position="top-center" closeButton />
    </div>
  )
}
