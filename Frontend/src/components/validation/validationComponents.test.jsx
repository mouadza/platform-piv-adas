import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ConfirmCotationModal from './ConfirmCotationModal'
import CotationSelect from './CotationSelect'
import StatusBadge from './StatusBadge'

describe('validation components', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('normalizes status labels and applies fallback styles', async () => {
    for (const [value, expected] of [
      ['IN_PROGRESS', 'IN PROGRESS'],
      ['COMPLETED', 'COMPLETED'],
      ['', 'IN PROGRESS'],
      ['CUSTOM', 'CUSTOM'],
    ]) {
      await act(async () => {
        root.render(<StatusBadge value={value} />)
      })
      expect(container.textContent).toBe(expected)
    }
    expect(container.querySelector('span').className).toContain('bg-slate-100')
  })

  it('renders cotation choices and forwards changes', async () => {
    const onPendingChange = vi.fn()
    await act(async () => {
      root.render(
        <CotationSelect
          cell={{ field: 'Cotation', value: 'OK' }}
          rowIndex={3}
          disabled={false}
          compact
          onPendingChange={onPendingChange}
        />
      )
    })

    const select = container.querySelector('select')
    expect(select.options.length).toBeGreaterThan(3)
    expect(select.value).toBe('OK')

    await act(async () => {
      select.value = 'NOK'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onPendingChange).toHaveBeenCalledWith(
      3,
      'Cotation',
      'NOK',
      'OK'
    )
  })

  it('does not render a closed confirmation modal', async () => {
    await act(async () => {
      root.render(
        <ConfirmCotationModal
          confirmModal={{ isOpen: false }}
          setConfirmModal={vi.fn()}
          onConfirm={vi.fn()}
        />
      )
    })

    expect(container.innerHTML).toBe('')
  })

  it('requires a comment for NOK and confirms a documented change', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onConfirm = vi.fn()
    const setConfirmModal = vi.fn()
    const modal = {
      isOpen: true,
      rowIndex: 1,
      field: 'Cotation',
      newValue: 'NOK',
      oldValue: 'OK',
      commentaire: '',
      stepCode: 'STEP-1',
      mode: 'cotation',
    }

    await act(async () => {
      root.render(
        <ConfirmCotationModal
          confirmModal={modal}
          setConfirmModal={setConfirmModal}
          onConfirm={onConfirm}
        />
      )
    })

    const buttons = [...container.querySelectorAll('button')]
    const confirmButton = buttons.find(
      (button) => button.textContent === 'Confirmer'
    )
    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(alertSpy).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()

    await act(async () => {
      root.render(
        <ConfirmCotationModal
          confirmModal={{ ...modal, commentaire: 'Incident observe' }}
          setConfirmModal={setConfirmModal}
          onConfirm={onConfirm}
        />
      )
    })
    await act(async () => {
      container
        .querySelectorAll('button')[1]
        .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onConfirm).toHaveBeenCalledWith('Incident observe')
    expect(setConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false })
    )
  })

  it('updates the comment and supports cancellation', async () => {
    const setConfirmModal = vi.fn()
    await act(async () => {
      root.render(
        <ConfirmCotationModal
          confirmModal={{
            isOpen: true,
            newValue: 'OK',
            oldValue: 'NOK',
            commentaire: '',
            stepCode: 'STEP-2',
          }}
          setConfirmModal={setConfirmModal}
          onConfirm={vi.fn()}
        />
      )
    })

    const textarea = container.querySelector('textarea')
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      ).set
      valueSetter.call(textarea, 'Optional comment')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(setConfirmModal).toHaveBeenCalledWith(expect.any(Function))

    const cancelButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Annuler'
    )
    await act(async () => {
      cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(setConfirmModal).toHaveBeenCalledWith(
      expect.objectContaining({ isOpen: false })
    )
  })
})
