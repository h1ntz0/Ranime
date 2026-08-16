import { fireEvent, render, screen } from '@testing-library/react'
import { EpisodeInput } from './EpisodeInput'

describe('EpisodeInput', () => {
  it('only commits on blur and clamps to [0, max]', () => {
    const onCommit = vi.fn()
    render(<EpisodeInput value={5} max={24} onCommit={onCommit} />)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '13' } })
    expect(onCommit).not.toHaveBeenCalled()

    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith(13)

    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith(24)
  })
})
