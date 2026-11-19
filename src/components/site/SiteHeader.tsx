import { ArrowRight, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { href: '/#frame', label: 'Frame' },
  { href: '/#cara-kerja', label: 'Cara kerja' },
  { href: '/#privasi', label: 'Privasi' },
  { href: '/#faq', label: 'FAQ' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border bg-background/90 shadow-xs backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-5">
            <Logo />

            <nav aria-label="Navigasi utama" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <Button asChild size="sm" className="hidden h-9 rounded-lg px-3.5 sm:inline-flex">
                <Link to="/studio">
                  Mulai sesi
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground lg:hidden"
                aria-expanded={open}
                aria-controls="menu-mobile"
                aria-label={open ? 'Tutup menu' : 'Buka menu'}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
              </Button>
            </div>
          </div>

          {open && (
            <div id="menu-mobile" className="border-t px-3 pt-2 pb-3 lg:hidden">
              <ul className="flex flex-col">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-[14px] font-medium hover:bg-secondary"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-2 h-10 w-full rounded-lg">
                <Link to="/studio">
                  Mulai sesi foto
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-muted-foreground">
                Semua foto diproses di perangkatmu. Tidak ada unggahan.
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
