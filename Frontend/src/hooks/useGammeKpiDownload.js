import { useState } from "react";

import { downloadGammeKPI, getGammeKPIPreview } from "../utils/kpiDownloads";

const emptySyntheseModal = {
  isOpen: false,
  type: "info",
  title: "",
  message: "",
};

export const useGammeKpiDownload = () => {
  const [downloadingKPI, setDownloadingKPI] = useState({});
  const [exportingKPI, setExportingKPI] = useState({});
  const [gammeKpiModal, setGammeKpiModal] = useState({
    isOpen: false,
    data: null,
  });
  const [syntheseModal, setSyntheseModal] = useState(emptySyntheseModal);

  const handleDownloadKPI = async (gamme) => {
    try {
      setDownloadingKPI((prev) => ({
        ...prev,
        [gamme.id]: true,
      }));

      const result = await getGammeKPIPreview(gamme);

      if (!result.ok) {
        setSyntheseModal({
          isOpen: true,
          type: "warning",
          title: "Rapport KPI indisponible",
          message: result.message,
        });
        return;
      }

      setGammeKpiModal({
        isOpen: true,
        data: result,
      });
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        type: "error",
        title: "Erreur KPI",
        message:
          "Une erreur est survenue lors du chargement des KPI de la gamme.",
      });
    } finally {
      setDownloadingKPI((prev) => ({
        ...prev,
        [gamme.id]: false,
      }));
    }
  };

  const handleExportGammeKPI = async (gamme) => {
    try {
      setExportingKPI((prev) => ({
        ...prev,
        [gamme.id]: true,
      }));

      const result = await downloadGammeKPI(gamme);

      if (!result.ok) {
        setSyntheseModal({
          isOpen: true,
          type: "warning",
          title: "Rapport KPI indisponible",
          message: result.message,
        });
        return;
      }

    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        type: "error",
        title: "Erreur export KPI",
        message:
          "Une erreur est survenue lors de la generation du rapport KPI.",
      });
    } finally {
      setExportingKPI((prev) => ({
        ...prev,
        [gamme.id]: false,
      }));
    }
  };

  const closeGammeKpiModal = () => {
    setGammeKpiModal({
      isOpen: false,
      data: null,
    });
  };

  const closeSyntheseModal = () => {
    setSyntheseModal(emptySyntheseModal);
  };

  return {
    downloadingKPI,
    exportingKPI,
    gammeKpiModal,
    syntheseModal,
    setSyntheseModal,
    handleDownloadKPI,
    handleExportGammeKPI,
    closeGammeKpiModal,
    closeSyntheseModal,
  };
};
