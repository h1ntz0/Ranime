import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import { Poster } from '../Poster'
import { Button } from '../ui/Button'
import { SearchBar } from '../SearchBar'

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/season', label: 'Season' },
  { to: '/top', label: 'Top Anime' },
  { to: '/genres', label: 'Genres' },
  { to: '/airing', label: 'Airing' },
]

function linkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'relative rounded-sm px-2.5 py-1.5 text-sm transition-colors',
    isActive
      ? 'bg-surface-raised/60 font-medium text-ink after:absolute after:inset-x-2.5 after:-bottom-[3px] after:h-[2px] after:rounded-full after:bg-accent'
      : 'text-ink-2 hover:bg-surface-raised/50 hover:text-ink',
  )
}

export function Header() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const links = user ? [...NAV, { to: '/library', label: 'Library' }] : NAV

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-lg font-bold tracking-tight text-ink transition-colors hover:text-accent-strong" aria-label="Ranime home">
            Ranime
          </Link>
          <span className="hidden rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-3 sm:inline">
            Local
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/' || item.to === '/explore'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <SearchBar />
          {user ? (
            <>
              <NavLink to="/statistics" className={linkClass}>
                Stats
              </NavLink>
              <div className="relative ml-1">
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
                    className="absolute right-0 top-full mt-2 w-48 rounded-sm border border-line bg-surface-raised py-1 shadow-xl"
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
            <>
              <Link to="/login" className="rounded-sm px-3 py-1.5 text-sm text-ink-2 transition-colors hover:text-ink">
                Login
              </Link>
              <Link to="/register" className="rounded-sm bg-ink px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-white">
                Register
              </Link>
            </>
          )}
        </div>

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line px-4 py-3 lg:hidden">
          <SearchBar autoFocus onClose={() => setSearchOpen(false)} className="[&_input]:h-11" />
        </div>
      )}

      {open && (
        <nav className="border-t border-line px-4 py-3 lg:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-0.5">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/watchlist" className={linkClass} onClick={() => setOpen(false)}>
                  Watchlist
                </NavLink>
                <NavLink to="/statistics" className={linkClass} onClick={() => setOpen(false)}>
                  Statistics
                </NavLink>
                <NavLink to="/my-ratings" className={linkClass} onClick={() => setOpen(false)}>
                  My Ratings
                </NavLink>
                <NavLink to="/my-reviews" className={linkClass} onClick={() => setOpen(false)}>
                  My Reviews
                </NavLink>
                <NavLink to={`/profile/${user.username}`} className={linkClass} onClick={() => setOpen(false)}>
                  Profile
                </NavLink>
                <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
                  Settings
                </NavLink>
                <Button
                  variant="danger"
                  className="w-full justify-start rounded-sm px-2.5 py-1.5"
                  onClick={() => {
                    setOpen(false)
                    void handleLogout()
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass} onClick={() => setOpen(false)}>
                  Login
                </NavLink>
                <NavLink to="/register" className={linkClass} onClick={() => setOpen(false)}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}