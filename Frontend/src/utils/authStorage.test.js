import { beforeEach, describe, expect, it } from 'vitest'

import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'
import {
  clearAuthSession,
  clearRoleSelection,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from './authStorage'

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('stores tokens in session storage and removes legacy local tokens', () => {
    localStorage.setItem(ACCESS_TOKEN, 'old-access')
    localStorage.setItem(REFRESH_TOKEN, 'old-refresh')

    saveAuthTokens({
      access: 'new-access',
      refresh: 'new-refresh',
    })

    expect(sessionStorage.getItem(ACCESS_TOKEN)).toBe('new-access')
    expect(sessionStorage.getItem(REFRESH_TOKEN)).toBe('new-refresh')
    expect(localStorage.getItem(ACCESS_TOKEN)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN)).toBeNull()
  })

  it('falls back to local storage for legacy tokens', () => {
    localStorage.setItem(ACCESS_TOKEN, 'legacy-access')
    localStorage.setItem(REFRESH_TOKEN, 'legacy-refresh')

    expect(getAccessToken()).toBe('legacy-access')
    expect(getRefreshToken()).toBe('legacy-refresh')
  })

  it('clears role selection without removing auth tokens', () => {
    sessionStorage.setItem(ACCESS_TOKEN, 'access')
    sessionStorage.setItem(REFRESH_TOKEN, 'refresh')
    sessionStorage.setItem('activeRole', 'ADMIN')
    localStorage.setItem('selected_project_id', '12')

    clearRoleSelection()

    expect(sessionStorage.getItem(ACCESS_TOKEN)).toBe('access')
    expect(sessionStorage.getItem(REFRESH_TOKEN)).toBe('refresh')
    expect(sessionStorage.getItem('activeRole')).toBeNull()
    expect(localStorage.getItem('selected_project_id')).toBeNull()
  })

  it('clears the whole authentication session', () => {
    sessionStorage.setItem(ACCESS_TOKEN, 'access')
    sessionStorage.setItem(REFRESH_TOKEN, 'refresh')
    sessionStorage.setItem('role', 'VALIDEUR')

    clearAuthSession()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(sessionStorage.getItem('role')).toBeNull()
  })
})
