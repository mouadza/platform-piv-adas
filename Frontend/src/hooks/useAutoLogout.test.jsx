import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNavigate } from 'react-router-dom'
import { clearAuthSession } from '../utils/authStorage'
import useAutoLogout from './useAutoLogout'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('../utils/authStorage', () => ({
  clearAuthSession: vi.fn(),
}))

const AutoLogoutHarness = () => {
  useAutoLogout()
  return null
}

describe('useAutoLogout', () => {
  let container
  let root
  let navigate

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    navigate = vi.fn()
    useNavigate.mockReturnValue(navigate)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<AutoLogoutHarness />)
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  it('clears authentication and redirects after inactivity', async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000)
    })

    expect(clearAuthSession).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/login', {
      state: { sessionExpired: true },
    })
  })

  it('resets inactivity time on user activity and cleans up on unmount', async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(19 * 60 * 1000)
      window.dispatchEvent(new MouseEvent('mousemove'))
      await vi.advanceTimersByTimeAsync(19 * 60 * 1000)
    })
    expect(clearAuthSession).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
    root = createRoot(container)
    await vi.runAllTimersAsync()

    expect(clearAuthSession).not.toHaveBeenCalled()
  })
})
