import { useEffect, useState } from 'react'
import {
  AudioLines,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMusicPlayer } from '@/hooks/useMusicPlayer'
import { MOODS, type Track } from '@/lib/music'
import { cn } from '@/lib/utils'

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function TrackArt({ track }: { track: Track }) {
  const [failed, setFailed] = useState(false)
  if (!track.artwork || failed) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Music2 className="size-4 text-muted-foreground" aria-hidden />
      </span>
    )
  }
  return (
    <img
      src={track.artwork}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-9 shrink-0 rounded-md object-cover"
    />
  )
}

export function MusicJukebox() {
  const player = useMusicPlayer()
  const [query, setQuery] = useState('')
  const { search, clearSearch } = player

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) {
      clearSearch()
      return
    }
    const timer = window.setTimeout(() => void search(text), 380)
    return () => window.clearTimeout(timer)
  }, [query, search, clearSearch])

  return (
    <Sheet onOpenChange={(open) => open && player.ensureLoaded()}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg px-2.5">
          {player.playing ? (
            <AudioLines className="size-3.5 text-primary" aria-hidden />
          ) : (
            <Music2 className="size-3.5" aria-hidden />
          )}
          <span className="hidden max-w-[110px] truncate text-[12px] sm:inline">
            {player.track?.title ?? 'Musik'}
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-[330px] flex-col gap-0 p-0 sm:w-[400px]">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-[16px]">Musik sesi</SheetTitle>
          <SheetDescription className="text-[12.5px] leading-relaxed">
            Cari lagu dari katalog Audius, atau pilih suasana dari Jamendo dan loop bawaan browser.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="search" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="px-5 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1 text-[12px]">
                Cari lagu
              </TabsTrigger>
              <TabsTrigger value="mood" className="flex-1 text-[12px]">
                Suasana
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="search" className="flex min-h-0 flex-1 flex-col px-5 pt-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari judul lagu atau artis…"
                aria-label="Cari lagu"
                className="h-9 pl-8 text-[12.5px]"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Hasil
              </p>
              {player.searching && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  mencari
                </span>
              )}
            </div>

            <div className="mt-1 -mr-2 min-h-0 flex-1 overflow-y-auto pr-2 pb-3">
              {player.searchError && (
                <p className="rounded-lg border bg-surface-soft px-3 py-2.5 text-[12px] text-muted-foreground">
                  {player.searchError}
                </p>
              )}

              {!player.searchError && player.results.length === 0 && !player.searching && (
                <p className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground">
                  Ketik minimal dua huruf. Hasil pencarian langsung bisa diputar sebagai musik sesi.
                </p>
              )}

              <ul className="space-y-1">
                {player.results.map((track) => {
                  const active = player.track?.id === track.id
                  return (
                    <li key={track.id}>
                      <button
                        type="button"
                        onClick={() => void player.playTrack(track)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                          active ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary',
                        )}
                      >
                        <span className="relative">
                          <TrackArt track={track} />
                          <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/45 opacity-0 transition-opacity hover:opacity-100">
                            <Play className="size-3.5 text-white" aria-hidden />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium">
                            {track.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {track.artist}
                            {track.duration ? ` · ${formatDuration(track.duration)}` : ''}
                          </span>
                        </span>
                        {active && player.playing ? (
                          <AudioLines className="size-4 shrink-0 text-primary" aria-hidden />
                        ) : (
                          <Play className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <p className="-mx-5 border-t px-5 pt-3 pb-4 text-[11px] leading-relaxed text-muted-foreground">
              Lagu berasal dari katalog Audius (unggahan kreator) dan diputar lewat server SnapVibe.
              Untuk ditempel ke video ekspor, gunakan musik yang lisensinya jelas.
            </p>
          </TabsContent>

          <TabsContent value="mood" className="flex min-h-0 flex-1 flex-col px-5 pt-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Mood
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MOODS.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => player.changeMood(mood.id)}
                  aria-pressed={player.mood === mood.id}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                    player.mood === mood.id
                      ? 'border-primary/40 bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {mood.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Daftar trek
              </p>
              {player.loading && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  memuat
                </span>
              )}
            </div>

            <div className="mt-2 -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              <ul className="space-y-1">
                {player.tracks.map((track, index) => {
                  const active = index === player.index
                  return (
                    <li key={track.id}>
                      <button
                        type="button"
                        onClick={() => player.select(index)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                          active ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary',
                        )}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-[10px] font-semibold">
                          {active && player.playing ? (
                            <AudioLines className="size-3.5 text-primary" aria-hidden />
                          ) : (
                            String(index + 1).padStart(2, '0')
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium">
                            {track.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {track.artist}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 mb-4 rounded-lg border bg-surface-soft px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {player.source === 'jamendo'
                    ? 'Streaming dari Jamendo. Judul dan artis ditampilkan sesuai lisensi Creative Commons.'
                    : player.source === 'audius'
                      ? 'Sedang memutar lagu pilihanmu dari katalog Audius.'
                      : 'Mode offline: trek dibuat dengan WebAudio, bebas royalti, tanpa file audio.'}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{player.track?.title ?? 'Pilih trek'}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {player.track?.artist ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                className="size-9 rounded-full"
                onClick={player.toggle}
                aria-label={player.playing ? 'Jeda musik' : 'Putar musik'}
              >
                {player.playing ? (
                  <Pause className="size-4" aria-hidden />
                ) : (
                  <Play className="size-4 translate-x-px" aria-hidden />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-9 rounded-full"
                onClick={player.next}
                aria-label="Trek berikutnya"
              >
                <SkipForward className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 rounded-full text-muted-foreground"
              onClick={player.toggleMute}
              aria-label={player.muted ? 'Aktifkan suara' : 'Bisukan musik'}
              aria-pressed={player.muted}
            >
              {player.muted ? (
                <VolumeX className="size-3.5" aria-hidden />
              ) : (
                <Volume2 className="size-3.5" aria-hidden />
              )}
            </Button>
            <Slider
              value={[Math.round(player.volume * 100)]}
              max={100}
              step={1}
              onValueChange={(value) => player.setVolume((value[0] ?? 60) / 100)}
              aria-label="Volume musik"
            />
            <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">
              {Math.round(player.volume * 100)}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
