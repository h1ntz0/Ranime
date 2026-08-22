import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import { CommandPalette } from './CommandPalette'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-ink">
      <CommandPalette />
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:pb-8">
        <Outlet />
      </main>
      <footer className="border-t border-line py-6 pb-24 text-center text-xs text-ink-4 lg:pb-6">
        Ranime — data synced from AniList. Ratings and reviews are community-driven.
      </footer>
      <MobileBottomNav />
    </div>
  )
}