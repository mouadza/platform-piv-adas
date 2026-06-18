import { useState } from "react";

import { downloadGammeKPI } from "../utils/kpiDownloads";

const emptySyntheseModal = {
  isOpen: false,
  message: "",
};

export const useGammeKpiDownload = () => {
  const [downloadingKPI, setDownloadingKPI] = useState({});
  const [syntheseModal, setSyntheseModal] = useState(emptySyntheseModal);

  const handleDownloadKPI = async (gamme) => {
    try {
      setDownloadingKPI((prev) => ({
        ...prev,
        [gamme.id]: true,
      }));

      const result = await downloadGammeKPI(gamme);

      if (!result.ok) {
        setSyntheseModal({
          isOpen: true,
          message: result.message,
        });
      }
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        message:
          "Une erreur est survenue lors de la generation du rapport KPI.",
      });
    } finally {
      setDownloadingKPI((prev) => ({
        ...prev,
        [gamme.id]: false,
      }));
    }
  };

  const closeSyntheseModal = () => {
    setSyntheseModal(emptySyntheseModal);
  };

  return {
    downloadingKPI,
    syntheseModal,
    setSyntheseModal,
    handleDownloadKPI,
    closeSyntheseModal,
  };
};
