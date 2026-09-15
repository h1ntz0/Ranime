import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * React unmounts the whole tree when a render throws, which turns any single bad component into a
 * blank white page. This keeps the shell alive and gives the user a way back instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="text-sm text-ink-3">
          This page hit an unexpected error. Reloading usually clears it.
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null })
            window.location.reload()
          }}
          className="rounded-sm border border-line bg-surface-raised px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
        >
          Reload
        </button>
      </div>
    )
  }
}
