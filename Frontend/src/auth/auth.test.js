import { beforeEach, describe, expect, it, vi } from 'vitest'

import { jwtDecode } from 'jwt-decode'
import { getAccessToken } from '../utils/authStorage'
import { getAuthInfo } from './auth'

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}))

vi.mock('../utils/authStorage', () => ({
  getAccessToken: vi.fn(),
}))

describe('getAuthInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no access token exists', () => {
    getAccessToken.mockReturnValue(null)

    expect(getAuthInfo()).toBeNull()
    expect(jwtDecode).not.toHaveBeenCalled()
  })

  it('maps the authentication claims and roles', () => {
    getAccessToken.mockReturnValue('access-token')
    jwtDecode.mockReturnValue({
      username: 'Admin',
      is_superuser: true,
      roles: ['PPL', 'VALIDEUR'],
      exp: 123456,
    })

    expect(getAuthInfo()).toEqual({
      token: 'access-token',
      username: 'Admin',
      isAdmin: true,
      isPPL: true,
      isValideur: true,
      exp: 123456,
    })
  })

  it('uses false role defaults and rejects malformed tokens', () => {
    getAccessToken.mockReturnValue('access-token')
    jwtDecode.mockReturnValueOnce({ username: 'Visitor' })

    expect(getAuthInfo()).toMatchObject({
      isAdmin: false,
      isPPL: false,
      isValideur: false,
    })

    jwtDecode.mockImplementationOnce(() => {
      throw new Error('Invalid JWT')
    })
    expect(getAuthInfo()).toBeNull()
  })
})
