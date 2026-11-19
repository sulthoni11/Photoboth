import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeProvider } from '@/lib/theme'
import Landing from '@/pages/Landing'

const Studio = lazy(() => import('@/pages/Studio'))

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}

function StudioFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-[13px] text-muted-foreground">Menyiapkan studio…</p>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[12px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">404</p>
      <h1 className="text-2xl font-extrabold">Halaman ini tidak ada.</h1>
      <p className="max-w-sm text-[13.5px] text-muted-foreground">
        Mungkin tautannya salah, atau sesi foto sudah selesai dan tab-nya ditutup.
      </p>
      <Button asChild className="mt-2 rounded-lg">
        <Link to="/">Kembali ke beranda</Link>
      </Button>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/studio"
          element={
            <Suspense fallback={<StudioFallback />}>
              <Studio />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ThemeProvider>
  )
}
