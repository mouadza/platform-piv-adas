import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ACCESS_TOKEN } from '../constants'
import {
  getAccessRoles,
  getAssignedProjectsForRole,
  getStoredActiveRole,
  getTokenPayload,
  hasAnyRole,
  normalizeRole,
  setActiveRole,
} from './roles'

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn((token) => JSON.parse(token)),
}))

const setTokenPayload = (payload) => {
  sessionStorage.setItem(ACCESS_TOKEN, JSON.stringify(payload))
}

describe('roles utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('normalizes known role aliases', () => {
    expect(normalizeRole('visitor')).toBe('VISITEUR')
    expect(normalizeRole('administrateur')).toBe('ADMIN')
    expect(normalizeRole('ppl')).toBe('PPL')
    expect(normalizeRole('valideur')).toBe('VALIDEUR')
    expect(normalizeRole()).toBe('VISITEUR')
  })

  it('extracts superuser as admin', () => {
    setTokenPayload({ is_superuser: true, username: 'Admin' })

    expect(getTokenPayload().username).toBe('Admin')
    expect(getAccessRoles()).toEqual(['ADMIN'])
    expect(hasAnyRole(['ADMIN'])).toBe(true)
  })

  it('deduplicates roles from token fields and affectations', () => {
    setTokenPayload({
      roles: ['PPL'],
      role: 'ppl',
      access_level: 'VALIDEUR',
      affectations: [{ role: 'VISITEUR' }],
    })

    expect(getAccessRoles()).toEqual(['PPL', 'VALIDEUR', 'VISITEUR'])
  })

  it('stores and reads the selected active role', () => {
    setTokenPayload({ roles: ['PPL', 'VALIDEUR'] })

    expect(setActiveRole('valideur')).toBe('VALIDEUR')
    expect(getStoredActiveRole('PPL')).toBe('VALIDEUR')
  })

  it('builds assigned projects for the selected role without duplicates', () => {
    setTokenPayload({
      affectations: [
        {
          projet_id: 10,
          projet_nom: 'Projet A',
          role: 'PPL',
        },
        {
          projet_id: 10,
          projet_nom: 'Projet A',
          role: 'PPL',
        },
        {
          projet_id: 11,
          projet_nom: 'Projet B',
          role: 'VALIDEUR',
        },
      ],
    })

    expect(getAssignedProjectsForRole('PPL')).toEqual([
      {
        id: 10,
        nom_projet: 'Projet A',
        roles: ['PPL'],
      },
    ])
    expect(getAssignedProjectsForRole('ADMIN')).toEqual([])
  })
})
