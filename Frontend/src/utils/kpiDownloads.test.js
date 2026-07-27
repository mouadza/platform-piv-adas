import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gammesAPI, validationsAPI } from '../api/index'
import { listGlobalGeneralComments } from './globalGammeComments'
import { buildProjectKPI } from './projectKPI'
import { generateProjectKPIExcel } from './projectKPIExcel'
import { generateSyntheseGammeExcel } from './syntheseGammeExcel'
import {
  downloadGammeKPI,
  downloadProjectKPI,
  getGammeDisplayName,
  getGammeKPIPreview,
  getProjectDisplayName,
  getProjectKPIPreview,
} from './kpiDownloads'

vi.mock('../api/index', () => ({
  gammesAPI: {
    listByProjet: vi.fn(),
    parse: vi.fn(),
    validationState: vi.fn(),
    detail: vi.fn(),
  },
  validationsAPI: {
    getLatestGammeStepValidations: vi.fn(),
    getGammeResults: vi.fn(),
  },
}))

vi.mock('./projectKPI', () => ({
  buildProjectKPI: vi.fn(),
}))

vi.mock('./projectKPIExcel', () => ({
  generateProjectKPIExcel: vi.fn(),
}))

vi.mock('./syntheseGammeExcel', () => ({
  generateSyntheseGammeExcel: vi.fn(),
}))

vi.mock('./globalGammeComments', () => ({
  listGlobalGeneralComments: vi.fn(),
}))

const cotationField = 'Cotation (R\u00e9sultats)'

const parsedData = {
  blocs: [
    {
      ev_row: [{ value: 'EV-OK' }],
      rows: [
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-OK' },
            { field: cotationField, type: 'select' },
            { field: 'Commentaire R\u00e9sultats', value: 'Fallback comment' },
          ],
        },
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-NON-COTE' },
            { field: cotationField, type: 'select' },
          ],
        },
      ],
    },
    {
      ev_row: [{ value: 'EV-NOK' }],
      rows: [
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-NOK' },
            { field: cotationField, type: 'select' },
          ],
        },
      ],
    },
    {
      ev_row: [{ value: 'EV-MINOR' }],
      rows: [
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-MINOR' },
            { field: cotationField, type: 'select' },
          ],
        },
      ],
    },
    {
      ev_row: [],
      rows: [
        {
          cells: [
            { field: cotationField, type: 'select' },
          ],
        },
        {
          cells: [{ field: 'Ignored', type: 'text' }],
        },
      ],
    },
  ],
}

const validations = [
  {
    ev_code: 'EV-OK',
    step_code: 'STEP-OK',
    cotation: 'OK',
    commentaire: 'Validated',
    user_name: 'Alice',
    created_at: '2026-01-01',
  },
  {
    ev_code: 'EV-OK',
    step_code: 'STEP-NON-COTE',
    cotation: 'Non_cot\u00e9',
    validated_by_name: 'Bob',
    date: '2026-01-02',
  },
  {
    ev_code: 'EV-NOK',
    step_code: 'STEP-NOK',
    cotation: 'NOK',
    updated_at: '2026-01-03',
  },
  {
    ev_code: 'EV-MINOR',
    step_code: 'STEP-MINOR',
    cotation: 'NOK Mineur',
  },
]

describe('KPI downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects readable project and gamme names', () => {
    expect(getProjectDisplayName({ nom_projet: 'Projet A', id: 1 })).toBe(
      'Projet A'
    )
    expect(getProjectDisplayName({ nom: 'Projet B', id: 2 })).toBe('Projet B')
    expect(getProjectDisplayName({ id: 3 })).toBe('Projet 3')

    expect(getGammeDisplayName({ nom_gamme: 'Gamme A', id: 1 })).toBe(
      'Gamme A'
    )
    expect(getGammeDisplayName({ original_filename: 'gamme.xlsx' })).toBe(
      'gamme.xlsx'
    )
    expect(getGammeDisplayName({ id: 4 })).toBe('Gamme 4')
  })

  it('returns an unavailable preview when validation has not started', async () => {
    gammesAPI.validationState.mockResolvedValue({ started: false })

    await expect(getGammeKPIPreview({ id: 4 })).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("n'a pas encore commence"),
    })
    expect(gammesAPI.detail).not.toHaveBeenCalled()
  })

  it('builds a detailed gamme preview with step and EV summaries', async () => {
    gammesAPI.validationState.mockResolvedValue({ started: true })
    gammesAPI.detail.mockResolvedValue({ id: 4, nom_gamme: 'Gamme KPI' })
    gammesAPI.parse.mockResolvedValue(parsedData)
    validationsAPI.getLatestGammeStepValidations.mockResolvedValue(validations)

    const preview = await getGammeKPIPreview({ id: 4 })

    expect(preview.ok).toBe(true)
    expect(preview.gammeTitle).toBe('Gamme KPI')
    expect(preview.summary).toMatchObject({
      total: 5,
      validated: 4,
      ok: 1,
      nok: 1,
      minor: 1,
      nonCote: 1,
      aCoter: 1,
      completionPercent: 80,
    })
    expect(preview.evResultSummary).toMatchObject({
      total: 4,
      OK: 1,
      NOK: 1,
      NOK_mineur: 1,
      IN_PROGRESS: 1,
    })
    expect(preview.reportData[0].steps[0]).toMatchObject({
      commentaire: 'Validated',
      userName: 'Alice',
    })
  })

  it('builds a project preview and aggregates cotations and EV results', async () => {
    gammesAPI.listByProjet.mockResolvedValue([
      { id: 1, nom_gamme: 'G1' },
      { id: 2, nom_gamme: 'G2' },
    ])
    gammesAPI.parse.mockResolvedValue(parsedData)
    validationsAPI.getLatestGammeStepValidations.mockResolvedValue(validations)
    buildProjectKPI.mockReturnValue([
      {
        totalSteps: 4,
        okSteps: 1,
        nokSteps: 1,
        minorSteps: 1,
        nonCoteSteps: 1,
        aCoterSteps: 0,
        evStats: [
          { total: 2, aCoter: 0, nok: 0, minor: 0 },
          { total: 1, aCoter: 0, nok: 1, minor: 0 },
        ],
      },
      {
        totalSteps: 2,
        okSteps: 0,
        nokSteps: 0,
        minorSteps: 1,
        nonCoteSteps: 0,
        aCoterSteps: 1,
        evStats: [
          { total: 1, aCoter: 0, nok: 0, minor: 1 },
          { total: 1, aCoter: 1, nok: 0, minor: 0 },
          { total: 0, aCoter: 0, nok: 0, minor: 0 },
        ],
      },
    ])

    const preview = await getProjectKPIPreview({
      id: 8,
      nom_projet: 'Projet KPI',
    })

    expect(preview.summary).toMatchObject({
      total: 6,
      ok: 1,
      nok: 1,
      minor: 2,
      nonCote: 1,
      aCoter: 1,
    })
    expect(preview.evResultSummary).toMatchObject({
      total: 5,
      OK: 1,
      NOK: 1,
      NOK_mineur: 1,
      IN_PROGRESS: 2,
    })
    expect(gammesAPI.parse).toHaveBeenCalledTimes(2)
  })

  it('exports project KPI data', async () => {
    gammesAPI.listByProjet.mockResolvedValue([])
    buildProjectKPI.mockReturnValue([])
    generateProjectKPIExcel.mockResolvedValue({
      fileName: 'KPI_Projet.xlsx',
    })

    await expect(downloadProjectKPI(10)).resolves.toMatchObject({
      ok: true,
      fileName: 'KPI_Projet.xlsx',
    })
    expect(generateProjectKPIExcel).toHaveBeenCalledWith({
      projectName: 'Projet 10',
      kpiData: [],
    })
  })

  it('exports a complete gamme synthesis with general comments', async () => {
    gammesAPI.validationState.mockResolvedValue({ started: true })
    gammesAPI.detail.mockResolvedValue({
      id: 4,
      nom_gamme: 'Gamme KPI',
      projet_nom: 'Projet A',
      type_procedure_nom: 'Procedure',
      fonction_gamme_nom: 'Fonction',
      vehicule: { vin: 'VIN-1' },
      boitiers: 'B1',
      pistes: 'P1',
      nombre_jours: 2,
      date_debut: '2026-01-01',
      date_fin: '2026-01-02',
      original_filename: 'gamme.xlsx',
      original_associe_filename: 'associe.xlsx',
    })
    gammesAPI.parse.mockResolvedValue(parsedData)
    validationsAPI.getGammeResults.mockResolvedValue([{ ev_code: 'EV-OK' }])
    validationsAPI.getLatestGammeStepValidations.mockResolvedValue(validations)
    listGlobalGeneralComments
      .mockResolvedValueOnce([{ commentaire: 'Besoin' }])
      .mockResolvedValueOnce([{ commentaire: 'Piste' }])
    generateSyntheseGammeExcel.mockResolvedValue({
      fileName: 'Synthese.xlsx',
    })

    await expect(downloadGammeKPI({ id: 4 })).resolves.toMatchObject({
      ok: true,
      fileName: 'Synthese.xlsx',
    })
    expect(listGlobalGeneralComments).toHaveBeenCalledTimes(2)
    expect(generateSyntheseGammeExcel).toHaveBeenCalledWith(
      expect.objectContaining({
        gammeId: 4,
        gammeTitle: 'Gamme KPI',
        besoinsComments: [{ commentaire: 'Besoin' }],
        pistesComments: [{ commentaire: 'Piste' }],
        reportData: expect.any(Array),
      })
    )
  })

  it('does not export a gamme before validation starts', async () => {
    gammesAPI.validationState.mockResolvedValue({ started: false })

    await expect(downloadGammeKPI({ id: 5 })).resolves.toMatchObject({
      ok: false,
    })
    expect(generateSyntheseGammeExcel).not.toHaveBeenCalled()
  })
})
