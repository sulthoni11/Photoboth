import { useEffect, useRef, useState } from 'react'
import { Radio, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type LivePreviewProps = {
  photo: string | null
  clip: string | null
  label: string
  onClose: () => void
}

export function LivePreview({ photo, clip, label, onClose }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, clip])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => setFailed(true))
  }, [clip])

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          <img
            src={photo}
            alt={label}
            className={cn('block w-full', clip && !failed ? 'invisible' : 'visible')}
            style={{ aspectRatio: '3 / 4', objectFit: 'cover' }}
          />
          {clip && !failed && (
            <video
              ref={videoRef}
              src={clip}
              muted
              loop
              playsInline
              autoPlay
              onError={() => setFailed(true)}
              aria-label={`${label} (live)`}
              className="absolute inset-0 size-full object-cover"
            />
          )}

          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Radio className="size-3 text-[#ff5f7a]" aria-hidden />
            LIVE
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau live"
            className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-[12.5px] font-medium text-white">{label}</p>
          <p className="text-[11px] text-white/60">
            {clip && !failed ? 'Klip live · diputar berulang' : 'Klip tidak bisa diputar di browser ini'}
          </p>
        </div>
      </div>
    </div>
  )
}
