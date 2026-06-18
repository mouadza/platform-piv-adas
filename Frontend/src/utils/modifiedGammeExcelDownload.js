import { saveAs } from "file-saver";

import { gammesAPI } from "../api/index";
import { getGammeDisplayName } from "./kpiDownloads";

const sanitizeFileName = (value) =>
  String(value || "gamme")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);

const getFilenameFromDisposition = (contentDisposition) => {
  if (!contentDisposition) return "";

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const fallbackMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  return fallbackMatch?.[1] || "";
};

export const downloadModifiedGammeExcel = async (gamme) => {
  let response;

  try {
    response = await gammesAPI.exportModifiedExcel(gamme.id);
  } catch (error) {
    if (error?.data instanceof Blob) {
      const text = await error.data.text();
      let parsed = null;

      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (parsed) {
        throw new Error(parsed.error || parsed.detail || error.message);
      }
    }

    throw error;
  }

  const { blob, filename } = response;
  const resolvedFilename =
    getFilenameFromDisposition(filename) ||
    `${sanitizeFileName(getGammeDisplayName(gamme))}_modifie.xlsm`;

  saveAs(blob, resolvedFilename);
};
