import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  downloadGammeKPI,
  getGammeKPIPreview,
} from '../utils/kpiDownloads'
import { useGammeKpiDownload } from './useGammeKpiDownload'

vi.mock('../utils/kpiDownloads', () => ({
  downloadGammeKPI: vi.fn(),
  getGammeKPIPreview: vi.fn(),
}))

let hookValue

const HookHarness = () => {
  hookValue = useGammeKpiDownload()
  return null
}

describe('useGammeKpiDownload', () => {
  let container
  let root

  beforeEach(async () => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<HookHarness />)
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('opens and closes the KPI preview modal', async () => {
    const gamme = { id: 4, nom_gamme: 'Gamme A' }
    getGammeKPIPreview.mockResolvedValue({
      ok: true,
      gammeTitle: 'Gamme A',
    })

    await act(async () => {
      await hookValue.handleDownloadKPI(gamme)
    })

    expect(hookValue.downloadingKPI[4]).toBe(false)
    expect(hookValue.gammeKpiModal).toEqual({
      isOpen: true,
      data: {
        ok: true,
        gammeTitle: 'Gamme A',
      },
    })

    await act(async () => {
      hookValue.closeGammeKpiModal()
    })
    expect(hookValue.gammeKpiModal).toEqual({
      isOpen: false,
      data: null,
    })
  })

  it('shows warnings when preview or export is unavailable', async () => {
    getGammeKPIPreview.mockResolvedValue({
      ok: false,
      message: 'Validation non demarree',
    })

    await act(async () => {
      await hookValue.handleDownloadKPI({ id: 5 })
    })
    expect(hookValue.syntheseModal).toMatchObject({
      isOpen: true,
      type: 'warning',
      title: 'Rapport KPI indisponible',
      message: 'Validation non demarree',
    })

    downloadGammeKPI.mockResolvedValue({
      ok: false,
      message: 'Export indisponible',
    })
    await act(async () => {
      await hookValue.handleExportGammeKPI({ id: 5 })
    })
    expect(hookValue.exportingKPI[5]).toBe(false)
    expect(hookValue.syntheseModal.message).toBe('Export indisponible')

    await act(async () => {
      hookValue.closeSyntheseModal()
    })
    expect(hookValue.syntheseModal.isOpen).toBe(false)
  })

  it('handles preview and export errors and successful exports', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getGammeKPIPreview.mockRejectedValueOnce(new Error('API unavailable'))

    await act(async () => {
      await hookValue.handleDownloadKPI({ id: 6 })
    })
    expect(hookValue.syntheseModal).toMatchObject({
      type: 'error',
      title: 'Erreur KPI',
    })

    downloadGammeKPI
      .mockRejectedValueOnce(new Error('Excel failure'))
      .mockResolvedValueOnce({ ok: true, fileName: 'Gamme.xlsx' })
    await act(async () => {
      await hookValue.handleExportGammeKPI({ id: 6 })
    })
    expect(hookValue.syntheseModal).toMatchObject({
      type: 'error',
      title: 'Erreur export KPI',
    })

    await act(async () => {
      await hookValue.handleExportGammeKPI({ id: 6 })
    })
    expect(hookValue.exportingKPI[6]).toBe(false)
    expect(downloadGammeKPI).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'API unavailable' })
    )
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Excel failure' })
    )
  })
})
