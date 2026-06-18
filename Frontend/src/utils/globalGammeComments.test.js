import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gammesAPI, generalCommentsAPI, projectsAPI } from '../api/index'
import {
  getGlobalGammeIdsByName,
  listGlobalGeneralComments,
} from './globalGammeComments'

vi.mock('../api/index', () => ({
  projectsAPI: {
    list: vi.fn(),
  },
  gammesAPI: {
    listByProjet: vi.fn(),
  },
  generalCommentsAPI: {
    list: vi.fn(),
  },
}))

describe('globalGammeComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only the current gamme id when the name is empty', async () => {
    await expect(
      getGlobalGammeIdsByName({ gammeId: 7, gammeName: '' })
    ).resolves.toEqual([7])
  })

  it('finds gammes with the same normalized name across projects', async () => {
    projectsAPI.list.mockResolvedValue([{ id: 1 }, { id: 2 }])
    gammesAPI.listByProjet
      .mockResolvedValueOnce([
        { id: 10, nom_gamme: 'Gamme A' },
        { id: 11, nom_gamme: 'Other' },
      ])
      .mockResolvedValueOnce([{ id: 12, nom_gamme: ' gamme a ' }])

    await expect(
      getGlobalGammeIdsByName({ gammeId: 10, gammeName: 'GAMME A' })
    ).resolves.toEqual([10, 12])
  })

  it('falls back to the current gamme when project loading fails', async () => {
    projectsAPI.list.mockRejectedValue(new Error('network'))

    await expect(
      getGlobalGammeIdsByName({ gammeId: 5, gammeName: 'Gamme X' })
    ).resolves.toEqual([5])
  })

  it('loads comments from related gammes and removes duplicates', async () => {
    projectsAPI.list.mockResolvedValue([{ id: 1 }])
    gammesAPI.listByProjet.mockResolvedValue([
      { id: 21, nom_gamme: 'Gamme Shared' },
      { id: 22, nom_gamme: 'Gamme Shared' },
    ])
    generalCommentsAPI.list
      .mockResolvedValueOnce([{ id: 1, texte: 'A' }])
      .mockResolvedValueOnce([{ id: 1, texte: 'A duplicated' }])

    const comments = await listGlobalGeneralComments({
      gammeId: 21,
      gammeName: 'Gamme Shared',
      type: 'BESOINS',
    })

    expect(comments).toEqual([
      {
        id: 1,
        texte: 'A duplicated',
        source_gamme_id: 22,
      },
    ])
  })
})
