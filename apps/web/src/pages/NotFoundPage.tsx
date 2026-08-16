import { Link } from 'react-router-dom'
import { buttonClass } from '../components/ui/buttonStyles'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-4xl font-bold tracking-tight text-ink-4">404</p>
      <h1 className="text-lg font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-ink-3">The page you are looking for does not exist.</p>
      <Link to="/" className={buttonClass('primary')}>
        Back to home
      </Link>
    </div>
  )
}