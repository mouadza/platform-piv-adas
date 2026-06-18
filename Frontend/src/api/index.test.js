import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  api,
  auditAPI,
  commentsAPI,
  configAPI,
  dashboardsAPI,
  gammesAPI,
  generalCommentsAPI,
  measuredResultCommentsAPI,
  normalizeApiBaseUrl,
  projectsAPI,
  usersAPI,
  validationsAPI,
  vehiculesAPI,
} from './index'

describe('normalizeApiBaseUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('removes trailing slashes without using a regular expression', () => {
    expect(normalizeApiBaseUrl('http://127.0.0.1:8000///')).toBe(
      'http://127.0.0.1:8000'
    )
  })

  it('keeps URLs without trailing slashes unchanged', () => {
    expect(normalizeApiBaseUrl('https://example.com/api')).toBe(
      'https://example.com/api'
    )
  })

  it('trims surrounding spaces before normalizing', () => {
    expect(normalizeApiBaseUrl('  http://localhost:8000/  ')).toBe(
      'http://localhost:8000'
    )
  })

  it('wraps project and user endpoints', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: 'get-data' })
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: 'post-data' })
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: 'put-data' })
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: 'delete-data' })

    await expect(projectsAPI.list()).resolves.toBe('get-data')
    await expect(projectsAPI.create({ nom: 'P' })).resolves.toBe('post-data')
    await expect(projectsAPI.detail(4)).resolves.toBe('get-data')
    await expect(projectsAPI.update(4, { nom: 'P2' })).resolves.toBe('put-data')
    await expect(projectsAPI.delete(4)).resolves.toBe('delete-data')
    await expect(usersAPI.list()).resolves.toBe('get-data')
    await expect(usersAPI.create({ email: 'a@b.com' })).resolves.toBe('post-data')
    await expect(usersAPI.update(5, { username: 'u' })).resolves.toBe('put-data')
    await expect(usersAPI.delete(5)).resolves.toBe('delete-data')

    expect(get).toHaveBeenCalledWith('/admin_config/listprojet/', undefined)
    expect(post).toHaveBeenCalledWith(
      '/admin_config/createproject/',
      { nom: 'P' },
      undefined
    )
    expect(put).toHaveBeenCalledWith('/admin_config/modifprojet/4/', {
      nom: 'P2',
    })
    expect(del).toHaveBeenCalledWith('/admin_config/deleteprojet/4/', undefined)
  })

  it('wraps configuration CRUD endpoints with the common factory', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: ['items'] })
    vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 1 } })
    vi.spyOn(api, 'put').mockResolvedValue({ data: { id: 1, label: 'x' } })
    vi.spyOn(api, 'delete').mockResolvedValue({ data: { ok: true } })

    for (const resource of Object.values(configAPI)) {
      await expect(resource.list()).resolves.toEqual(['items'])
      await expect(resource.create({ label: 'x' })).resolves.toEqual({ id: 1 })
      await expect(resource.update(1, { label: 'x' })).resolves.toEqual({
        id: 1,
        label: 'x',
      })
      await expect(resource.delete(1)).resolves.toEqual({ ok: true })
    }
  })

  it('wraps gamme, comment, dashboard, audit and validation endpoints', async () => {
    const blob = new Blob(['xlsx'])
    vi.spyOn(api, 'get').mockResolvedValue({
      data: 'get-data',
      headers: { 'content-disposition': 'attachment; filename=a.xlsm' },
    })
    vi.spyOn(api, 'post').mockResolvedValue({ data: 'post-data' })
    vi.spyOn(api, 'patch').mockResolvedValue({ data: 'patch-data' })
    vi.spyOn(api, 'delete').mockResolvedValue({ data: 'delete-data' })

    await expect(gammesAPI.parse(1)).resolves.toBe('get-data')
    await expect(gammesAPI.create(1, new FormData())).resolves.toBe('post-data')
    await expect(gammesAPI.listByProjet(1)).resolves.toBe('get-data')
    await expect(gammesAPI.listByPro(1)).resolves.toBe('get-data')
    await expect(gammesAPI.detail(1)).resolves.toBe('get-data')
    await expect(gammesAPI.update(1, new FormData())).resolves.toBe('patch-data')
    await expect(gammesAPI.updateDates(1, {})).resolves.toBe('patch-data')
    await expect(gammesAPI.delete(1)).resolves.toBe('delete-data')
    await expect(gammesAPI.validationState(1)).resolves.toBe('get-data')
    await expect(gammesAPI.exportModifiedExcel(1)).resolves.toEqual({
      blob: 'get-data',
      filename: 'attachment; filename=a.xlsm',
    })

    await expect(commentsAPI.listEV({ evCode: 'EV', gammeId: 1 })).resolves.toBe(
      'get-data'
    )
    await expect(
      commentsAPI.createEV({ evCode: 'EV', commentaire: 'ok', gammeId: 1 })
    ).resolves.toBe('post-data')
    await expect(
      commentsAPI.updateEV(1, { commentaire: 'new', gammeId: 2 })
    ).resolves.toBe('patch-data')
    await expect(commentsAPI.deleteEV(1, { gammeId: 2 })).resolves.toBe(
      'delete-data'
    )

    await expect(generalCommentsAPI.list({ gammeId: 1, type: 'BESOINS' })).resolves.toBe(
      'get-data'
    )
    await expect(
      generalCommentsAPI.create({
        gammeId: 1,
        type: 'BESOINS',
        commentaire: 'comment',
      })
    ).resolves.toBe('post-data')
    await expect(generalCommentsAPI.update(1, { commentaire: 'x' })).resolves.toBe(
      'patch-data'
    )
    await expect(generalCommentsAPI.delete(1)).resolves.toBe('delete-data')

    await expect(
      measuredResultCommentsAPI.list({
        gammeId: 1,
        evCode: 'EV',
        stepCode: 'STEP',
      })
    ).resolves.toBe('get-data')
    await expect(
      measuredResultCommentsAPI.create({
        gammeId: 1,
        evCode: 'EV',
        stepCode: 'STEP',
        commentaire: 'ok',
      })
    ).resolves.toBe('post-data')
    await expect(
      measuredResultCommentsAPI.update({ commentId: 1, commentaire: 'new' })
    ).resolves.toBe('patch-data')
    await expect(measuredResultCommentsAPI.delete(1)).resolves.toBe('delete-data')

    await expect(dashboardsAPI.admin()).resolves.toBe('get-data')
    await expect(dashboardsAPI.ppl()).resolves.toBe('get-data')
    await expect(dashboardsAPI.valideur()).resolves.toBe('get-data')
    await expect(auditAPI.list({ limit: 10 })).resolves.toBe('get-data')
    await expect(vehiculesAPI.check({ vin: 'V' })).resolves.toEqual({
      data: 'get-data',
      headers: { 'content-disposition': 'attachment; filename=a.xlsm' },
    })

    await expect(
      validationsAPI.createStepValidation({
        gammeId: 1,
        evCode: 'EV',
        stepCode: 'STEP',
        cotation: 'OK',
        commentaire: '',
      })
    ).resolves.toBe('post-data')
    await expect(validationsAPI.getStepHistory('STEP/1')).resolves.toBe('get-data')
    await expect(validationsAPI.getLatestGammeStepValidations(1)).resolves.toBe(
      'get-data'
    )
    await expect(validationsAPI.getGammeResults(1)).resolves.toBe('get-data')

    vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: blob,
      headers: {},
    })
    await expect(gammesAPI.exportModifiedExcel(2)).resolves.toEqual({
      blob,
      filename: '',
    })
  })
})
