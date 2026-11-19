import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'error'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const stop = useCallback(() => {
    const stream = streamRef.current
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) video.srcObject = null
    setStatus((previous) => (previous === 'ready' ? 'idle' : previous))
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      setMessage('Browser ini tidak menyediakan akses kamera. Coba Chrome, Safari, atau Edge terbaru.')
      return
    }

    setStatus('requesting')
    setMessage(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      setStatus('ready')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied')
        setMessage('Izin kamera ditolak. Kamu bisa mengizinkannya lewat ikon kamera di address bar, atau pakai foto dari galeri.')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setStatus('unavailable')
        setMessage('Tidak ada kamera yang terdeteksi. Unggah foto dari galeri untuk tetap lanjut.')
      } else {
        setStatus('error')
        setMessage('Kamera gagal dimulai. Coba muat ulang halaman atau pakai foto dari galeri.')
      }
    }
  }, [])

  useEffect(() => stop, [stop])

  return { videoRef, status, message, start, stop }
}
