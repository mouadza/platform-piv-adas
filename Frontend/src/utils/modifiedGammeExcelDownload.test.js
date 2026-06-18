import { beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAs } from 'file-saver'

import { gammesAPI } from '../api/index'
import { downloadModifiedGammeExcel } from './modifiedGammeExcelDownload'

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}))

vi.mock('../api/index', () => ({
  gammesAPI: {
    exportModifiedExcel: vi.fn(),
  },
}))

vi.mock('./kpiDownloads', () => ({
  getGammeDisplayName: vi.fn((gamme) => gamme.nom_gamme || 'Gamme Test'),
}))

describe('downloadModifiedGammeExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses filename from UTF-8 content disposition', async () => {
    const blob = new Blob(['excel'])
    gammesAPI.exportModifiedExcel.mockResolvedValue({
      blob,
      filename: "attachment; filename*=UTF-8''rapport%20final.xlsm",
    })

    await downloadModifiedGammeExcel({ id: 1, nom_gamme: 'Gamme A' })

    expect(saveAs).toHaveBeenCalledWith(blob, 'rapport final.xlsm')
  })

  it('falls back to a sanitized gamme name', async () => {
    const blob = new Blob(['excel'])
    gammesAPI.exportModifiedExcel.mockResolvedValue({
      blob,
      filename: '',
    })

    await downloadModifiedGammeExcel({ id: 2, nom_gamme: 'A/B C' })

    expect(saveAs).toHaveBeenCalledWith(blob, 'A_B_C_modifie.xlsm')
  })

  it('extracts backend JSON errors from blob responses', async () => {
    const error = new Error('download failed')
    error.data = new Blob([])
    error.data.text = vi.fn().mockResolvedValue(
      JSON.stringify({ detail: 'Tous les EV doivent etre valides.' })
    )
    gammesAPI.exportModifiedExcel.mockRejectedValue(error)

    await expect(
      downloadModifiedGammeExcel({ id: 3, nom_gamme: 'Gamme KO' })
    ).rejects.toThrow('Tous les EV doivent etre valides.')
  })
})
