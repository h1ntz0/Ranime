import { useState, type FormEvent } from 'react'
import { API_BASE, changePassword, updateProfile, uploadAvatar } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Poster } from '../components/Poster'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [uploading, setUploading] = useState(false)

  const me = user
  if (!me) return null

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setProfileError('')
    setSavingProfile(true)
    try {
      const updated = await updateProfile({ username: username.trim(), email: email.trim() })
      setUser(updated)
      toast('Profile updated')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingProfile(false)
    }
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast('Password changed')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed')
    } finally {
      setSavingPassword(false)
    }
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const { avatarUrl } = await uploadAvatar(file)
      if (!me) return
      setUser({ ...me, avatarUrl })
      toast('Avatar updated')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Avatar upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>

      <section aria-label="Profile" className="mt-6 rounded-sm border border-line bg-surface/40 p-5">
        <h2 className="text-sm font-semibold text-ink">Profile</h2>
        <div className="mt-4 flex items-center gap-3">
          <Poster src={me.avatarUrl} alt="" className="h-14 w-14 rounded-full" />
          <div>
            <label className="text-sm text-ink-2">Avatar</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(e) => onAvatarChange(e.target.files?.[0])}
              className="block text-sm text-ink-3 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-raised file:px-3 file:py-1.5 file:text-sm file:text-ink transition-colors hover:file:bg-surface-hover disabled:opacity-50"
              aria-label="Upload avatar image"
            />
            <p className="mt-1 text-xs text-ink-4">JPEG, PNG or WebP, up to 2 MB.</p>
          </div>
        </div>
        <form onSubmit={onProfileSubmit} className="mt-2" noValidate>
          <Field label="Username" htmlFor="set-username" className="mt-4">
            <Input
              id="set-username"
              type="text"
              required
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="set-email" className="mt-4">
            <Input
              id="set-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {profileError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {profileError}
            </p>
          ) : null}
          <Button type="submit" disabled={savingProfile} className="mt-4">
            {savingProfile ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </section>

      <section aria-label="Password" className="mt-6 rounded-sm border border-line bg-surface/40 p-5">
        <h2 className="text-sm font-semibold text-ink">Change password</h2>
        <form onSubmit={onPasswordSubmit} className="mt-2" noValidate>
          <Field label="Current password" htmlFor="set-current" className="mt-4">
            <Input
              id="set-current"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New password" htmlFor="set-new" className="mt-4">
            <Input
              id="set-new"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="set-confirm" className="mt-4">
            <Input
              id="set-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          {passwordError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {passwordError}
            </p>
          ) : null}
          <Button type="submit" disabled={savingPassword} className="mt-4">
            {savingPassword ? 'Changing…' : 'Change password'}
          </Button>
        </form>
      </section>

      <section aria-label="Data Backup" className="mt-6 rounded-sm border border-line bg-surface/40 p-5">
        <h2 className="text-sm font-semibold text-ink">Data Management & Backup</h2>
        <p className="mt-1 text-xs text-ink-3">
          Export your complete anime library and watch history or import from another backup.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/library?limit=500`, { credentials: 'include' })
                const data = await res.json()
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `ranime-backup-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
                toast('Library exported successfully!')
              } catch {
                toast('Export failed', 'error')
              }
            }}
          >
            📥 Export Library (JSON)
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/library?limit=500`, { credentials: 'include' })
                const json = await res.json()
                const items = json.data?.items ?? []
                const headers = ['id', 'title', 'status', 'currentEpisode', 'totalEpisodes', 'score']
                const csvRows = [headers.join(',')]
                for (const item of items) {
                  csvRows.push(
                    [
                      item.anime.id,
                      `"${(item.anime.title.romaji || '').replace(/"/g, '""')}"`,
                      item.status,
                      item.currentEpisode,
                      item.totalEpisodes ?? '',
                      item.anime.averageScore ?? '',
                    ].join(','),
                  )
                }
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `ranime-library-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
                toast('Library exported to CSV!')
              } catch {
                toast('CSV export failed', 'error')
              }
            }}
          >
            📊 Export Library (CSV)
          </Button>

          <label className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-surface-raised transition-colors">
            <span>📤 Import Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const parsed = JSON.parse(text)
                  const items = Array.isArray(parsed) ? parsed : parsed.data?.items ?? []
                  if (items.length === 0) {
                    toast('No items found in backup file', 'error')
                    return
                  }
                  toast(`Importing ${items.length} items...`)
                  let imported = 0
                  for (const it of items) {
                    const animeId = it.animeId || it.anime?.id || it.id
                    const status = it.status || 'PLANNING'
                    const currentEpisode = it.currentEpisode || 0
                    if (animeId) {
                      await fetch(`${API_BASE}/watchlist/${animeId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status, currentEpisode }),
                        credentials: 'include',
                      })
                      imported++
                    }
                  }
                  toast(`Successfully imported ${imported} anime into your library!`)
                } catch {
                  toast('Invalid JSON backup file', 'error')
                }
              }}
            />
          </label>
        </div>
      </section>
    </div>
  )
}