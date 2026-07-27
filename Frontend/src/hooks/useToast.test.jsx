import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastContainer, useToast } from './useToast'

let toastApi

const ToastHarness = () => {
  toastApi = useToast()
  return (
    <ToastContainer
      toasts={toastApi.toasts}
      onRemove={toastApi.removeToast}
    />
  )
}

describe('useToast', () => {
  let container
  let root

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(101)
      .mockReturnValueOnce(102)
      .mockReturnValueOnce(103)
      .mockReturnValueOnce(104)
      .mockReturnValue(105)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<ToastHarness />)
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('adds each toast type and removes a toast manually', async () => {
    let customId
    await act(async () => {
      toastApi.success('Saved', 1000)
      toastApi.error('Failed')
      toastApi.warning('Check this', 2000)
      toastApi.info('Information', 3000)
      customId = toastApi.addToast('Custom', 'unknown', 0)
    })

    expect(customId).toBe(105)
    expect(toastApi.toasts).toHaveLength(5)
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(5)
    expect(container.textContent).toContain('Saved')
    expect(container.textContent).toContain('Failed')

    await act(async () => {
      container
        .querySelector('[aria-label="Close notification"]')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(toastApi.toasts).toHaveLength(4)
  })

  it('automatically closes timed notifications', async () => {
    await act(async () => {
      toastApi.addToast('Temporary', 'info', 500)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(toastApi.toasts).toEqual([])
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })
})
