import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { saveAs } from 'file-saver'
import { jobsAPI } from '../api/index'
import {
  exportProjectKpiInBackground,
  prepareProjectKpiInBackground,
  startProjectKpiPreparation,
  waitForProjectKpiPreparation,
} from './backgroundProjectKpiExport'

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}))

vi.mock('../api/index', () => ({
  jobsAPI: {
    createProjectKPI: vi.fn(),
    detail: vi.fn(),
    download: vi.fn(),
  },
}))

describe('background project KPI export', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('normalizes a newly created job and reports progress', async () => {
    jobsAPI.createProjectKPI.mockResolvedValue({
      job_id: 'job-1',
      status: '',
      progress: '25',
    })
    const onProgress = vi.fn()

    await expect(
      startProjectKpiPreparation({ projectId: 7, onProgress })
    ).resolves.toEqual({
      id: 'job-1',
      status: 'PENDING',
      progress: 25,
      download_ready: false,
    })
    expect(jobsAPI.createProjectKPI).toHaveBeenCalledWith(7)
    expect(onProgress).toHaveBeenCalledOnce()
  })

  it('polls until the generated file is ready', async () => {
    jobsAPI.detail
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'PROCESSING',
        progress: 50,
      })
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'SUCCESS',
        progress: 100,
        download_ready: true,
      })
    const onProgress = vi.fn()

    const resultPromise = waitForProjectKpiPreparation({
      jobId: 'job-1',
      onProgress,
      pollInterval: 10,
      maxWaitMilliseconds: 100,
    })
    await vi.runAllTimersAsync()

    await expect(resultPromise).resolves.toMatchObject({
      status: 'SUCCESS',
      download_ready: true,
    })
    expect(onProgress).toHaveBeenCalledTimes(2)
  })

  it('reports worker failure and polling timeout', async () => {
    jobsAPI.detail.mockResolvedValueOnce({
      status: 'FAILURE',
      error_message: 'Excel generation failed',
    })
    const failurePromise = waitForProjectKpiPreparation({
      jobId: 'failed-job',
      pollInterval: 10,
      maxWaitMilliseconds: 100,
    })
    const failureExpectation = expect(failurePromise).rejects.toThrow(
      'Excel generation failed'
    )
    await vi.runAllTimersAsync()
    await failureExpectation

    jobsAPI.detail.mockResolvedValue({ status: 'PROCESSING' })
    const timeoutPromise = waitForProjectKpiPreparation({
      jobId: 'slow-job',
      pollInterval: 10,
      maxWaitMilliseconds: 25,
    })
    const timeoutExpectation = expect(timeoutPromise).rejects.toThrow(
      'depasse le delai maximal'
    )
    await vi.runAllTimersAsync()
    await timeoutExpectation
  })

  it('prepares a job and delegates to the polling operation', async () => {
    jobsAPI.createProjectKPI.mockResolvedValue({
      job_id: 'job-2',
      status: 'PENDING',
    })
    jobsAPI.detail.mockResolvedValue({
      id: 'job-2',
      status: 'SUCCESS',
      download_ready: true,
    })

    const preparation = prepareProjectKpiInBackground({
      projectId: 8,
      pollInterval: 5,
      maxWaitMilliseconds: 50,
    })
    await vi.runAllTimersAsync()

    await expect(preparation).resolves.toMatchObject({ id: 'job-2' })
  })

  it('downloads an already prepared job using its UTF-8 filename', async () => {
    const blob = new Blob(['excel'])
    jobsAPI.download.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          "attachment; filename*=UTF-8''KPI%20Projet%20Alpha.xlsx",
      },
    })
    const preparedJob = {
      id: 'ready-job',
      status: 'SUCCESS',
      download_ready: true,
    }

    await expect(
      exportProjectKpiInBackground({
        projectId: 1,
        projectName: 'Alpha',
        preparedJob,
      })
    ).resolves.toBe(preparedJob)
    expect(saveAs).toHaveBeenCalledWith(blob, 'KPI Projet Alpha.xlsx')
    expect(jobsAPI.createProjectKPI).not.toHaveBeenCalled()
  })

  it('restarts failed jobs and falls back to a safe filename', async () => {
    jobsAPI.createProjectKPI.mockResolvedValue({
      job_id: 'replacement-job',
      status: 'SUCCESS',
      progress: 100,
    })
    jobsAPI.detail.mockResolvedValue({
      id: 'replacement-job',
      status: 'SUCCESS',
      download_ready: true,
    })
    jobsAPI.download.mockResolvedValue({
      data: new Blob(['excel']),
      headers: {},
    })

    const exportPromise = exportProjectKpiInBackground({
      projectId: 3,
      projectName: 'Projet:Beta/Test',
      preparedJob: { id: 'failed', status: 'FAILURE' },
      pollInterval: 5,
      maxWaitMilliseconds: 50,
    })
    await vi.runAllTimersAsync()
    await exportPromise

    expect(saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      'KPI_Projet_Projet_Beta_Test.xlsx'
    )
  })
})
