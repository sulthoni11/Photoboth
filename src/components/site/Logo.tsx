import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('inline-flex items-baseline gap-1.5 leading-none', className)}
      aria-label="SnapVibe Studio — beranda"
    >
      <span className="font-script text-[25px] leading-none text-foreground">SnapVibe</span>
      <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        studio
      </span>
    </Link>
  )
}
