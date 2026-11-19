import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/site/Logo'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { cn } from '@/lib/utils'
import { MusicJukebox } from './MusicJukebox'

const STEPS = ['Ambil foto', 'Susun frame', 'Unduh'] as const

export function StudioHeader({ current }: { current: number }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="size-9 text-muted-foreground">
            <Link to="/" aria-label="Kembali ke beranda">
              <ArrowLeft className="size-[18px]" />
            </Link>
          </Button>
          <Logo />
        </div>

        <ol className="hidden items-center gap-1 md:flex" aria-label="Tahapan sesi">
          {STEPS.map((step, index) => {
            const state = index < current ? 'done' : index === current ? 'active' : 'todo'
            return (
              <li key={step} className="flex items-center gap-1">
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium',
                    state === 'active' && 'bg-accent text-accent-foreground',
                    state === 'done' && 'text-muted-foreground',
                    state === 'todo' && 'text-muted-foreground/60',
                  )}
                  aria-current={state === 'active' ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-full text-[9px] font-bold',
                      state === 'active' ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                    )}
                  >
                    {index + 1}
                  </span>
                  {step}
                </span>
                {index < STEPS.length - 1 && (
                  <span className="h-px w-4 bg-border" aria-hidden />
                )}
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-1.5">
          <MusicJukebox />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
