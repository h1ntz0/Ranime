import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { Poster } from '../Poster'
import { Button } from '../ui/Button'
import { SearchBar } from '../SearchBar'

const MAIN_NAV = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/airing', label: 'Airing' },
  { to: '/season', label: 'Season' },
  { to: '/top', label: 'Top' },
  { to: '/genres', label: 'Genres' },
]

const TOOLS_NAV = [
  { to: '/roulette', label: 'Roulette', desc: 'Random anime discovery' },
  { to: '/compare', label: 'Compare', desc: 'Side-by-side anime comparison' },
  { to: '/tier-list', label: 'Tier List', desc: 'Custom ranking board' },
]

function linkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm transition-colors',
    isActive
      ? 'bg-surface-raised/60 font-medium text-ink after:absolute after:inset-x-2.5 after:-bottom-[3px] after:h-[2px] after:rounded-full after:bg-accent'
      : 'text-ink-2 hover:bg-surface-raised/50 hover:text-ink',
  )
}

export function Header() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const toolsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false)
    setToolsOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const isToolsActive = TOOLS_NAV.some((t) => location.pathname.startsWith(t.to))

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/"
            className="group flex items-center gap-2 text-lg font-bold tracking-tight text-ink transition-colors hover:text-accent-strong"
            aria-label="Ranime home"
          >
            <img
              src="/logo.jpg"
              alt="Ranime logo"
              className="h-7 w-7 rounded-md object-cover transition-transform duration-200 group-hover:scale-105 border border-line"
            />
            <span className="bg-gradient-to-r from-ink via-ink to-ink-2 bg-clip-text">Ranime</span>
          </Link>
          <span className="hidden rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent sm:inline">
            Rate
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              end={item.to === '/' || item.to === '/explore'}
            >
              {item.label}
            </NavLink>
          ))}

          {/* Tools Dropdown */}
          <div ref={toolsRef} className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              className={cn(
                'relative flex items-center gap-1 whitespace-nowrap rounded-sm px-2.5 py-1.5 text-sm transition-colors',
                isToolsActive || toolsOpen
                  ? 'bg-surface-raised/60 font-medium text-ink'
                  : 'text-ink-2 hover:bg-surface-raised/50 hover:text-ink',
              )}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
            >
              <span>Tools</span>
              <svg
                className={cn('h-3.5 w-3.5 transition-transform duration-200', toolsOpen && 'rotate-180')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {toolsOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-2 w-56 rounded-md border border-line bg-surface-raised p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              >
                {TOOLS_NAV.map((tool) => (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    role="menuitem"
                    onClick={() => setToolsOpen(false)}
                    className={cn(
                      'flex items-center rounded-sm px-3 py-2 text-sm transition-colors hover:bg-surface',
                      location.pathname.startsWith(tool.to) ? 'bg-surface font-medium text-accent-strong' : 'text-ink-2 hover:text-ink',
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium leading-none text-ink">{tool.label}</span>
                      <span className="mt-1 text-[11px] text-ink-3">{tool.desc}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {user && (
            <NavLink to="/library" className={linkClass}>
              Library
            </NavLink>
          )}
        </nav>

        {/* Search & Actions */}
        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <SearchBar />
          {user ? (
            <>
              <NavLink to="/statistics" className={linkClass}>
                Stats
              </NavLink>
              <div ref={userMenuRef} className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-raised/60"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <Poster src={user.avatarUrl} alt={user.username} className="h-7 w-7 rounded-full" />
                  <span className="text-sm text-ink-2">{user.username}</span>
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-48 rounded-md border border-line bg-surface-raised py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                  >
                    <Link
                      to={`/profile/${user.username}`}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/watchlist"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      Watchlist
                    </Link>
                    <Link
                      to="/my-ratings"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      My Ratings
                    </Link>
                    <Link
                      to="/my-reviews"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      My Reviews
                    </Link>
                    <Link
                      to="/settings"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                    >
                      Settings
                    </Link>
                    <div className="my-1 border-t border-line" />
                    <div role="menuitem">
                      <Button
                        variant="danger"
                        className="w-full justify-start rounded-none px-3 py-2"
                        onClick={() => {
                          setMenuOpen(false)
                          void handleLogout()
                        }}
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="whitespace-nowrap rounded-sm px-3 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="whitespace-nowrap rounded-sm bg-ink px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-white"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Buttons */}
        <div className="flex items-center gap-1.5 lg:hidden">
          {!searchOpen && (
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-surface-raised/60 hover:text-ink"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
              aria-expanded={searchOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-surface-raised/60 hover:text-ink"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Search Dropdown */}
      {searchOpen && (
        <div className="border-t border-line px-4 py-3 lg:hidden">
          <SearchBar autoFocus onClose={() => setSearchOpen(false)} className="[&_input]:h-11" />
        </div>
      )}

      {/* Mobile Full Menu Drawer */}
      {open && (
        <nav
          className="max-h-[80vh] overflow-y-auto border-t border-line bg-background/95 px-4 py-3 shadow-2xl backdrop-blur-xl lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-3.5">
            {/* User Account Summary Card (if logged in) */}
            {user ? (
              <div className="rounded-lg border border-line bg-surface/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/profile/${user.username}`}
                    onClick={() => setOpen(false)}
                    className="flex min-w-0 items-center gap-2.5 hover:opacity-80 transition-opacity"
                  >
                    <Poster src={user.avatarUrl} alt={user.username} className="h-9 w-9 rounded-full border border-line shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{user.username}</p>
                      <p className="text-[11px] text-ink-3 truncate">{user.email}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      to="/settings"
                      onClick={() => setOpen(false)}
                      className="rounded-md border border-line bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface-hover transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        void handleLogout()
                      }}
                      className="rounded-md px-2 py-1 text-[11px] font-medium text-danger hover:bg-danger/10 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {/* User 2x2 Fast Actions Grid */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 pt-2.5 border-t border-line/60">
                  <NavLink
                    to="/library"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-md bg-surface-raised/50 px-2.5 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                  >
                    Library
                  </NavLink>
                  <NavLink
                    to="/watchlist"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-md bg-surface-raised/50 px-2.5 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                  >
                    Watchlist
                  </NavLink>
                  <NavLink
                    to="/my-ratings"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-md bg-surface-raised/50 px-2.5 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                  >
                    My Ratings
                  </NavLink>
                  <NavLink
                    to="/my-reviews"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center rounded-md bg-surface-raised/50 px-2.5 py-2 text-xs font-medium text-ink hover:bg-surface-raised transition-colors"
                  >
                    My Reviews
                  </NavLink>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface/40 p-2.5">
                <NavLink
                  to="/login"
                  className="flex items-center justify-center rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-raised transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="flex items-center justify-center rounded-md bg-ink px-3 py-2 text-xs font-semibold text-background hover:bg-white transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Register
                </NavLink>
              </div>
            )}

            {/* Discover Grid (2 columns) */}
            <div>
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Discover</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {MAIN_NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between rounded-md border border-line/60 bg-surface/40 px-3 py-2 text-xs font-medium text-ink hover:bg-surface-raised hover:border-line transition-all active:scale-[0.98]"
                    onClick={() => setOpen(false)}
                    end={item.to === '/' || item.to === '/explore'}
                  >
                    <span>{item.label}</span>
                    <span className="text-ink-4 text-[10px]">→</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Tools & Games Grid (3 columns) */}
            <div>
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Tools & Games</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {TOOLS_NAV.map((tool) => (
                  <NavLink
                    key={tool.to}
                    to={tool.to}
                    className="flex flex-col items-center justify-center rounded-md border border-line/60 bg-surface/40 p-2.5 text-center text-xs font-medium text-ink hover:bg-surface-raised hover:border-line transition-all active:scale-[0.98]"
                    onClick={() => setOpen(false)}
                  >
                    <span className="text-xs font-semibold text-ink">{tool.label}</span>
                    <span className="text-[10px] text-ink-3 truncate w-full mt-0.5">{tool.desc.split(' ')[0]}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}