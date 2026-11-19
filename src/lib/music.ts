export type Mood = 'lofi' | 'pop' | 'chill' | 'happy'

export type Track = {
  id: string
  title: string
  artist: string
  mood?: Mood
  /** URL stream (Jamendo / proxy Audius). Kosong untuk trek hasil sintesis. */
  src?: string
  /** Preset synth untuk fallback offline. */
  preset?: SynthPresetId
  license?: string
  /** Durasi detik (katalog Audius). */
  duration?: number
  genre?: string
  /** URL cover yang sudah diproxy server. */
  artwork?: string
}

export type TracksResponse = {
  tracks: Track[]
  source: 'jamendo' | 'fallback'
  reason?: string
}

export const MOODS: Array<{ id: Mood; label: string; tags: string }> = [
  { id: 'lofi', label: 'Cute Lo-Fi', tags: 'lofi+chill' },
  { id: 'pop', label: 'Upbeat Pop', tags: 'pop+happy' },
  { id: 'chill', label: 'Acoustic Chill', tags: 'acoustic+chill' },
  { id: 'happy', label: 'Happy', tags: 'happy+upbeat' },
]

export type SynthPresetId = 'cute' | 'upbeat' | 'acoustic' | 'retro' | 'jazz'

export const GENERATED_TRACKS: Track[] = [
  { id: 'gen-cute', title: 'Cute Lo-Fi', artist: 'SnapVibe Studio', mood: 'lofi', preset: 'cute', license: 'Dibuat di browser' },
  { id: 'gen-upbeat', title: 'Upbeat Pop', artist: 'SnapVibe Studio', mood: 'pop', preset: 'upbeat', license: 'Dibuat di browser' },
  { id: 'gen-acoustic', title: 'Acoustic Chill', artist: 'SnapVibe Studio', mood: 'chill', preset: 'acoustic', license: 'Dibuat di browser' },
  { id: 'gen-retro', title: 'Retro Synth', artist: 'SnapVibe Studio', mood: 'happy', preset: 'retro', license: 'Dibuat di browser' },
  { id: 'gen-jazz', title: 'Jazz Cafe', artist: 'SnapVibe Studio', mood: 'chill', preset: 'jazz', license: 'Dibuat di browser' },
]

export async function fetchTracks(mood: Mood, signal?: AbortSignal): Promise<TracksResponse> {
  try {
    const res = await fetch(`/api/music?mood=${mood}`, { signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as TracksResponse
    if (!data.tracks?.length || data.source !== 'jamendo') throw new Error('kosong')
    return data
  } catch {
    return { tracks: GENERATED_TRACKS, source: 'fallback', reason: 'offline' }
  }
}

/**
 * Pencarian lagu bebas dari katalog Audius (lewat proxy server, tanpa API key
 * di browser). Server hanya mengembalikan trek yang benar-benar bisa diputar.
 */
export async function searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { tracks?: Track[] }
  return Array.isArray(data.tracks) ? data.tracks : []
}

/* --------------------------------------------------------------------------
   Synth fallback: 5 loop pendek yang dibuat dengan WebAudio, tanpa file audio.
   Dipakai kalau JAMENDO_CLIENT_ID belum diisi, rate limit tercapai, atau offline.
-------------------------------------------------------------------------- */

type Preset = {
  bpm: number
  /** Progresi akor sebagai deret MIDI. */
  chords: number[][]
  bass: number[]
  wave: OscillatorType
  arp: OscillatorType
  filter: number
  brightness: number
}

const PRESETS: Record<SynthPresetId, Preset> = {
  cute: {
    bpm: 92,
    chords: [
      [60, 64, 67, 72],
      [57, 60, 64, 69],
      [53, 57, 60, 65],
      [55, 59, 62, 67],
    ],
    bass: [48, 45, 41, 43],
    wave: 'triangle',
    arp: 'sine',
    filter: 2200,
    brightness: 0.5,
  },
  upbeat: {
    bpm: 118,
    chords: [
      [65, 69, 72, 77],
      [60, 64, 67, 72],
      [67, 71, 74, 79],
      [62, 65, 69, 74],
    ],
    bass: [41, 48, 43, 38],
    wave: 'square',
    arp: 'triangle',
    filter: 2600,
    brightness: 0.65,
  },
  acoustic: {
    bpm: 84,
    chords: [
      [55, 59, 62, 67],
      [50, 54, 57, 62],
      [52, 55, 59, 64],
      [48, 52, 55, 60],
    ],
    bass: [43, 38, 40, 36],
    wave: 'triangle',
    arp: 'sine',
    filter: 1800,
    brightness: 0.4,
  },
  retro: {
    bpm: 108,
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 65],
      [48, 52, 55, 60],
      [55, 59, 62, 67],
    ],
    bass: [45, 41, 36, 43],
    wave: 'sawtooth',
    arp: 'square',
    filter: 1300,
    brightness: 0.55,
  },
  jazz: {
    bpm: 98,
    chords: [
      [50, 53, 57, 60],
      [43, 47, 50, 53],
      [48, 52, 55, 59],
      [45, 49, 52, 55],
    ],
    bass: [38, 31, 36, 33],
    wave: 'sine',
    arp: 'triangle',
    filter: 2000,
    brightness: 0.45,
  },
}

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12)

export class SynthEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: number | null = null
  private step = 0
  private nextTime = 0
  private preset: Preset | null = null
  private volume = 0.6

  get playing() {
    return this.timer !== null
  }

  async start(presetId: SynthPresetId, volume = this.volume) {
    this.stop()
    this.volume = volume

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!this.ctx) this.ctx = new Ctor()

    const ctx = this.ctx
    if (ctx.state === 'suspended') await ctx.resume()

    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.gain.linearRampToValueAtTime(this.volume * 0.55, ctx.currentTime + 0.6)
    this.master.connect(ctx.destination)

    this.preset = PRESETS[presetId]
    this.step = 0
    this.nextTime = ctx.currentTime + 0.08
    this.timer = window.setInterval(() => this.tick(), 40)
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    if (this.ctx && this.master) {
      const master = this.master
      master.gain.cancelScheduledValues(this.ctx.currentTime)
      master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12)
      window.setTimeout(() => master.disconnect(), 600)
      this.master = null
    }
  }

  setVolume(value: number) {
    this.volume = value
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(value * 0.55, this.ctx.currentTime, 0.08)
    }
  }

  private tick() {
    const ctx = this.ctx
    const preset = this.preset
    if (!ctx || !preset) return
    while (this.nextTime < ctx.currentTime + 0.25) {
      this.schedule(this.step, this.nextTime)
      this.nextTime += 60 / preset.bpm / 2
      this.step = (this.step + 1) % 16
    }
  }

  private schedule(step: number, time: number) {
    const preset = this.preset
    const master = this.master
    if (!preset || !master) return

    const chordIndex = Math.floor(step / 4) % preset.chords.length
    const chord = preset.chords[chordIndex]
    const eighth = 60 / preset.bpm / 2

    if (step % 4 === 0) {
      // pad akor satu bar
      const duration = eighth * 4
      chord.forEach((note, i) => {
        this.voice(midiToHz(note) * (i === 3 ? 2 : 1), time, duration, preset.wave, 0.05, preset.filter, 0.25)
      })
      // bass
      this.voice(midiToHz(preset.bass[chordIndex]), time, eighth * 3.6, 'sine', 0.18, 700, 0.01)
    }

    // arpeggio lembut
    const arpNote = chord[step % chord.length] + 12
    this.voice(midiToHz(arpNote), time, eighth * 0.9, preset.arp, 0.045, preset.filter * 1.2, 0.005)

    // hi-hat tipis di ketukan ganjil
    if (step % 2 === 1 && preset.brightness > 0.45) {
      this.noise(time, 0.035, 0.03)
    }
  }

  private voice(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    cutoff: number,
    attack: number,
  ) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.value = freq
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    filter.Q.value = 0.6

    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(gainValue, time + Math.max(0.005, attack))
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    osc.start(time)
    osc.stop(time + duration + 0.05)
  }

  private noise(time: number, duration: number, gainValue: number) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2
    }

    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    source.buffer = buffer
    filter.type = 'highpass'
    filter.frequency.value = 7000
    gain.gain.value = gainValue
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(time)
  }
}
