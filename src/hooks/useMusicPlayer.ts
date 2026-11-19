import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchTracks,
  GENERATED_TRACKS,
  searchTracks,
  SynthEngine,
  type Mood,
  type Track,
} from '@/lib/music'

type Source = 'jamendo' | 'fallback' | 'audius'

export function useMusicPlayer() {
  const [mood, setMood] = useState<Mood>('lofi')
  const [tracks, setTracks] = useState<Track[]>(GENERATED_TRACKS)
  const [source, setSource] = useState<Source>('fallback')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [volume, setVolumeState] = useState(0.6)
  const [muted, setMuted] = useState(false)
  const [results, setResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const synthRef = useRef<SynthEngine | null>(null)
  const loadedRef = useRef(false)
  const searchAbort = useRef<AbortController | null>(null)
  const track = tracks[index] ?? tracks[0]

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio()
    audioRef.current.preload = 'none'
  }
  if (!synthRef.current && typeof window !== 'undefined') {
    synthRef.current = new SynthEngine()
  }

  const stopAll = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
    synthRef.current?.stop()
    setPlaying(false)
  }, [])

  const load = useCallback(async (nextMood: Mood, signal?: AbortSignal) => {
    setLoading(true)
    try {
      const result = await fetchTracks(nextMood, signal)
      setTracks(result.tracks)
      setSource(result.source)
      setIndex(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Muat daftar trek hanya setelah pengguna berinteraksi dengan panel musik.
  const ensureLoaded = useCallback(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    void load(mood)
  }, [load, mood])

  const play = useCallback(async () => {
    const current = tracks[index]
    if (!current) return

    if (current.src) {
      const audio = audioRef.current
      if (!audio) return
      synthRef.current?.stop()
      audio.src = current.src
      audio.volume = volume
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
      return
    }

    if (current.preset) {
      audioRef.current?.pause()
      await synthRef.current?.start(current.preset, volume)
      setPlaying(true)
    }
  }, [index, tracks, volume])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    synthRef.current?.stop()
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    ensureLoaded()
    if (playing) pause()
    else void play()
  }, [ensureLoaded, pause, play, playing])

  const next = useCallback(() => {
    setIndex((i) => (tracks.length ? (i + 1) % tracks.length : 0))
  }, [tracks.length])

  const select = useCallback(
    (nextIndex: number) => {
      setIndex(nextIndex)
      if (playing) {
        const target = tracks[nextIndex]
        if (target?.src) {
          const audio = audioRef.current
          if (audio) {
            synthRef.current?.stop()
            audio.src = target.src
            audio.volume = volume
            void audio.play().catch(() => setPlaying(false))
          }
        } else if (target?.preset) {
          audioRef.current?.pause()
          void synthRef.current?.start(target.preset, volume)
        }
      }
    },
    [playing, tracks, volume],
  )

  const setVolume = useCallback((value: number) => {
    setVolumeState(value)
    const audio = audioRef.current
    if (audio) audio.volume = value
    synthRef.current?.setVolume(value)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((previous) => {
      const next = !previous
      const audio = audioRef.current
      if (audio) audio.muted = next
      return next
    })
  }, [])

  /** Putar satu trek dari hasil pencarian (Audius) tanpa mengubah mood. */
  const playTrack = useCallback(
    async (target: Track) => {
      if (!target.src) return
      loadedRef.current = true
      synthRef.current?.stop()
      setTracks([target])
      setIndex(0)
      setSource('audius')

      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      audio.src = target.src
      audio.volume = volume
      audio.muted = muted
      try {
        await audio.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    },
    [muted, volume],
  )

  const search = useCallback(async (query: string) => {
    searchAbort.current?.abort()
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      return
    }

    const controller = new AbortController()
    searchAbort.current = controller
    setSearching(true)
    setSearchError(null)
    try {
      const found = await searchTracks(q, controller.signal)
      if (controller.signal.aborted) return
      setResults(found)
      if (!found.length) setSearchError('Tidak ada lagu yang cocok.')
    } catch {
      if (controller.signal.aborted) return
      setResults([])
      setSearchError('Pencarian gagal. Periksa koneksi lalu coba lagi.')
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    searchAbort.current?.abort()
    setResults([])
    setSearchError(null)
    setSearching(false)
  }, [])

  const changeMood = useCallback(
    (nextMood: Mood) => {
      setMood(nextMood)
      stopAll()
      loadedRef.current = true
      void load(nextMood)
    },
    [load, stopAll],
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => setIndex((i) => (tracks.length ? (i + 1) % tracks.length : 0))
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [tracks.length])

  useEffect(() => () => stopAll(), [stopAll])

  return useMemo(
    () => ({
      mood,
      track,
      tracks,
      index,
      source,
      playing,
      loading,
      volume,
      muted,
      results,
      searching,
      searchError,
      toggle,
      play,
      pause,
      next,
      select,
      playTrack,
      search,
      clearSearch,
      setVolume,
      toggleMute,
      changeMood,
      ensureLoaded,
    }),
    [
      mood,
      track,
      tracks,
      index,
      source,
      playing,
      loading,
      volume,
      muted,
      results,
      searching,
      searchError,
      toggle,
      play,
      pause,
      next,
      select,
      playTrack,
      search,
      clearSearch,
      setVolume,
      toggleMute,
      changeMood,
      ensureLoaded,
    ],
  )
}
