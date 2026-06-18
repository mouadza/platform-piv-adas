import { describe, expect, it } from 'vitest'

import { buildProjectKPI } from './projectKPI'

const cotationField = 'Cotation (R\u00c3\u00a9sultats)'

const buildParsedData = () => ({
  blocs: [
    {
      ev_row: [{ value: 'EV-1' }],
      rows: [
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-1' },
            { field: cotationField, type: 'select' },
          ],
        },
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-2' },
            { field: cotationField, type: 'select' },
          ],
        },
      ],
    },
    {
      ev_row: [{ value: 'EV-2' }],
      rows: [
        {
          cells: [
            { field: 'Nom (Steps)', value: 'STEP-3' },
            { field: cotationField, type: 'select' },
          ],
        },
      ],
    },
  ],
})

describe('buildProjectKPI', () => {
  it('builds project KPI summaries from parsed gammes and validations', () => {
    const kpi = buildProjectKPI({
      gammes: [
        {
          id: 1,
          nom_gamme: 'Gamme Batterie',
          nombre_jours: 3,
        },
      ],
      allParsedData: {
        1: buildParsedData(),
      },
      allValidations: {
        1: [
          {
            ev_code: 'EV-1',
            step_code: 'STEP-1',
            cotation: 'OK',
            created_at: '2026-06-10T09:00:00Z',
          },
          {
            ev_code: 'EV-1',
            step_code: 'STEP-2',
            cotation: 'NOK_mineur',
            created_at: '2026-06-11T09:00:00Z',
          },
        ],
      },
    })

    expect(kpi).toHaveLength(1)
    expect(kpi[0]).toMatchObject({
      gammeId: 1,
      name: 'Gamme Batterie',
      totalSteps: 3,
      validatedSteps: 2,
      okSteps: 1,
      minorSteps: 1,
      aCoterSteps: 1,
      completionPercent: 66.7,
      status: 'En cours',
      durationDays: 2,
    })
    expect(kpi[0].evStats).toEqual([
      expect.objectContaining({
        evCode: 'EV-1',
        total: 2,
        validated: 2,
      }),
      expect.objectContaining({
        evCode: 'EV-2',
        total: 1,
        validated: 0,
      }),
    ])
  })

  it('marks a gamme without validations as not started', () => {
    const kpi = buildProjectKPI({
      gammes: [{ id: 2, nom: 'Gamme Vide' }],
      allParsedData: { 2: buildParsedData() },
      allValidations: { 2: [] },
    })

    expect(kpi[0]).toMatchObject({
      progress: 0,
      durationDays: 0,
      startDate: null,
      endDate: null,
    })
    expect(kpi[0].status).toContain('Non')
  })

  it('uses explicit gamme dates when they are provided', () => {
    const kpi = buildProjectKPI({
      gammes: [
        {
          id: 3,
          nom: 'Gamme Dates',
          date_debut: '2026-06-01',
          date_fin: '2026-06-05',
        },
      ],
      allParsedData: { 3: buildParsedData() },
      allValidations: {
        3: [
          {
            ev_code: 'EV-1',
            step_code: 'STEP-1',
            cotation: 'OK',
            created_at: '2026-06-03T09:00:00Z',
          },
        ],
      },
    })

    expect(kpi[0].durationDays).toBe(5)
    expect(kpi[0].startDate.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(kpi[0].endDate.toISOString().slice(0, 10)).toBe('2026-06-05')
  })
})
