import { saveAs } from "file-saver";

import { jobsAPI } from "../api/index";

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const normalizeCreatedJob = (createdJob) => ({
  id: createdJob.job_id,
  status: createdJob.status || "PENDING",
  progress: Number(createdJob.progress || 0),
  download_ready: false,
});

const getDownloadFileName = (response, projectName) => {
  const disposition = response.headers?.["content-disposition"] || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const standardMatch = disposition.match(/filename="?([^";]+)"?/i);
  const encodedName = utf8Match?.[1] || standardMatch?.[1];

  if (encodedName) {
    try {
      return decodeURIComponent(encodedName);
    } catch {
      return encodedName;
    }
  }

  const safeProjectName = String(projectName || "Projet").replace(
    /[\\/:*?"<>|]/g,
    "_"
  );
  return `KPI_Projet_${safeProjectName}.xlsx`;
};

export const startProjectKpiPreparation = async ({
  projectId,
  onProgress,
}) => {
  const createdJob = normalizeCreatedJob(
    await jobsAPI.createProjectKPI(projectId)
  );
  onProgress?.(createdJob);
  return createdJob;
};

export const waitForProjectKpiPreparation = async ({
  jobId,
  onProgress,
  pollInterval = 1500,
  maxWaitMilliseconds = 30 * 60 * 1000,
}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMilliseconds) {
    await wait(pollInterval);
    const job = await jobsAPI.detail(jobId);

    onProgress?.(job);

    if (job.status === "FAILURE") {
      throw new Error(
        job.error_message || "La generation du KPI projet a echoue."
      );
    }

    if (job.status === "SUCCESS" && job.download_ready) {
      return job;
    }
  }

  throw new Error(
    "La generation du KPI projet depasse le delai maximal de 30 minutes."
  );
};

export const prepareProjectKpiInBackground = async ({
  projectId,
  onProgress,
  pollInterval,
  maxWaitMilliseconds,
}) => {
  const createdJob = await startProjectKpiPreparation({
    projectId,
    onProgress,
  });
  return waitForProjectKpiPreparation({
    jobId: createdJob.id,
    onProgress,
    pollInterval,
    maxWaitMilliseconds,
  });
};

const downloadProjectKpiJob = async (jobId, projectName) => {
  const response = await jobsAPI.download(jobId);
  saveAs(response.data, getDownloadFileName(response, projectName));
};

export const exportProjectKpiInBackground = async ({
  projectId,
  projectName,
  preparedJob,
  onProgress,
  pollInterval = 1500,
  maxWaitMilliseconds = 30 * 60 * 1000,
}) => {
  let job = preparedJob;

  if (!job?.id || job.status === "FAILURE") {
    job = await startProjectKpiPreparation({ projectId, onProgress });
  }

  if (job.status !== "SUCCESS" || !job.download_ready) {
    job = await waitForProjectKpiPreparation({
      jobId: job.id,
      onProgress,
      pollInterval,
      maxWaitMilliseconds,
    });
  }

  await downloadProjectKpiJob(job.id, projectName);
  return job;
};
