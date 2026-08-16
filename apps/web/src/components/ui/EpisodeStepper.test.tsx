import { fireEvent, render, screen } from '@testing-library/react'
import { EpisodeStepper } from './EpisodeStepper'

describe('EpisodeStepper', () => {
  it('steps +/- and clamps to [0, max]', () => {
    const onCommit = vi.fn()
    render(<EpisodeStepper value={4} max={24} onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Increase episode' }))
    expect(onCommit).toHaveBeenLastCalledWith(5)

    fireEvent.click(screen.getByRole('button', { name: 'Decrease episode' }))
    expect(onCommit).toHaveBeenLastCalledWith(3)
  })

  it('disables minus at 0 and plus at max', () => {
    const onCommit = vi.fn()
    const { rerender } = render(<EpisodeStepper value={0} max={24} onCommit={onCommit} />)
    expect(screen.getByRole('button', { name: 'Decrease episode' })).toBeDisabled()

    rerender(<EpisodeStepper value={24} max={24} onCommit={onCommit} />)
    expect(screen.getByRole('button', { name: 'Increase episode' })).toBeDisabled()
  })

  it('commits typed edits on blur, clamped to max', () => {
    const onCommit = vi.fn()
    render(<EpisodeStepper value={4} max={24} onCommit={onCommit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit current episode' }))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith(24)
  })
})
