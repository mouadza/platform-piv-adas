import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import {
  CommentsModal,
  GammeKpiModal,
  ListeGammesProjects,
  ProjectKpiModal,
  SyntheseModal,
} from "../components/listeGammes/ListeGammesContent";
import { gammesAPI, projectsAPI } from "../api/index";
import {
  getProjectKPIPreview,
  getGammeDisplayName,
  getProjectDisplayName,
} from "../utils/kpiDownloads";
import {
  exportProjectKpiInBackground,
  prepareProjectKpiInBackground,
} from "../utils/backgroundProjectKpiExport";
import { downloadModifiedGammeExcel } from "../utils/modifiedGammeExcelDownload";
import {
  getAssignedProjectsForRole,
  getStoredActiveRole,
  normalizeRole,
} from "../utils/roles";
import { useGammeKpiDownload } from "../hooks/useGammeKpiDownload";
import { useGeneralCommentsModal } from "../hooks/useGeneralCommentsModal";

const ListeGammes = () => {
  const navigate = useNavigate();
  const activeRole = getStoredActiveRole("PPL");
  const userRole = activeRole.toLowerCase();
  const isAdmin = activeRole === "ADMIN";
  const isPPL = activeRole === "PPL";

  const [projets, setProjets] = useState([]);
  const [gammesByProjet, setGammesByProjet] = useState({});
  const [openedProjects, setOpenedProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingGammes, setLoadingGammes] = useState({});
  const [downloadingProjectKPI, setDownloadingProjectKPI] = useState({});
  const [exportingProjectKPI, setExportingProjectKPI] = useState({});
  const [projectExportJobs, setProjectExportJobs] = useState({});
  const [projectKpiModal, setProjectKpiModal] = useState({
    isOpen: false,
    data: null,
  });
  const [downloadingExcel, setDownloadingExcel] = useState({});
  const [savingDates, setSavingDates] = useState({});
  const [error, setError] = useState("");

  const { commentModal, openCommentsModal, closeCommentsModal } =
    useGeneralCommentsModal();
  const {
    downloadingKPI,
    exportingKPI,
    gammeKpiModal,
    syntheseModal,
    setSyntheseModal,
    handleDownloadKPI,
    handleExportGammeKPI,
    closeGammeKpiModal,
    closeSyntheseModal,
  } = useGammeKpiDownload();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError("");

        if (!isAdmin) {
          setProjets(getAssignedProjectsForRole(activeRole));
          return;
        }

        const data = await projectsAPI.list();
        setProjets(data || []);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des projets.");
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [activeRole, isAdmin]);

  const loadGammesForProject = async (projetId) => {
    try {
      setLoadingGammes((prev) => ({ ...prev, [projetId]: true }));

      const data = await gammesAPI.listByProjet(projetId);
      console.log("Les gammes:", data);
      setGammesByProjet((prev) => ({ ...prev, [projetId]: data || [] }));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement des gammes.");
    } finally {
      setLoadingGammes((prev) => ({ ...prev, [projetId]: false }));
    }
  };

  const toggleProject = async (projetId) => {
    const isOpen = openedProjects[projetId];

    setOpenedProjects((prev) => ({
      ...prev,
      [projetId]: !prev[projetId],
    }));

    if (!isOpen && !gammesByProjet[projetId]) {
      await loadGammesForProject(projetId);
    }
  };

  const getRoleBadge = (projet) => {
    const roles = projet.roles?.map(normalizeRole).filter(Boolean) || [];

    if (roles.length > 0) return roles.join(" / ");
    if (!isAdmin) return activeRole;

    return "";
  };

  const handleDownloadProjectKPI = async (projet) => {
    try {
      setDownloadingProjectKPI((prev) => ({ ...prev, [projet.id]: true }));
      setProjectExportJobs((prev) => ({
        ...prev,
        [projet.id]: {
          status: "CREATING",
          progress: 0,
          download_ready: false,
        },
      }));
      void prepareProjectKpiInBackground({
        projectId: projet.id,
        onProgress: (job) =>
          setProjectExportJobs((prev) => ({
            ...prev,
            [projet.id]: job,
          })),
      }).catch((preparationError) => {
        console.error(preparationError);
        setProjectExportJobs((prev) => ({
          ...prev,
          [projet.id]: {
            ...prev[projet.id],
            status: "FAILURE",
            error_message: preparationError.message,
          },
        }));
      });
      const result = await getProjectKPIPreview(projet);
      setProjectKpiModal({
        isOpen: true,
        data: result,
      });
      return true;
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        type: "error",
        title: "Erreur KPI Projet",
        message: "Une erreur est survenue lors du chargement du KPI projet.",
      });
      return false;
    } finally {
      setDownloadingProjectKPI((prev) => ({ ...prev, [projet.id]: false }));
    }
  };

  const handleExportProjectKPI = async (projet) => {
    try {
      setExportingProjectKPI((prev) => ({ ...prev, [projet.id]: true }));
      await exportProjectKpiInBackground({
        projectId: projet.id,
        projectName: getProjectDisplayName(projet),
        preparedJob: projectExportJobs[projet.id],
        onProgress: (job) =>
          setProjectExportJobs((prev) => ({
            ...prev,
            [projet.id]: job,
          })),
      });
      return true;
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        type: "error",
        title: "Erreur KPI Projet",
        message:
          err?.message ||
          "Une erreur est survenue lors de la generation du KPI projet.",
      });
      return false;
    } finally {
      setExportingProjectKPI((prev) => ({ ...prev, [projet.id]: false }));
    }
  };

  const closeProjectKpiModal = () => {
    setProjectKpiModal({
      isOpen: false,
      data: null,
    });
  };

  const handleUpdateGammeDates = async (gamme, dates) => {
    try {
      setSavingDates((prev) => ({ ...prev, [gamme.id]: true }));

      const updatedGamme = await gammesAPI.updateDates(gamme.id, {
        date_debut: dates.date_debut || null,
        date_fin: dates.date_fin || null,
      });

      setGammesByProjet((prev) => {
        const next = {};

        Object.entries(prev).forEach(([projetId, gammes]) => {
          next[projetId] = gammes.map((item) =>
            item.id === updatedGamme.id ? { ...item, ...updatedGamme } : item
          );
        });

        return next;
      });

      return updatedGamme;
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        message: "Impossible de modifier les dates de cette gamme.",
      });
      throw err;
    } finally {
      setSavingDates((prev) => ({ ...prev, [gamme.id]: false }));
    }
  };

  const handleDownloadModifiedExcel = async (gamme) => {
    try {
      setDownloadingExcel((prev) => ({ ...prev, [gamme.id]: true }));
      await downloadModifiedGammeExcel(gamme);
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        message:
          err?.message ||
          "Impossible de generer le fichier Excel modifie pour cette gamme.",
      });
    } finally {
      setDownloadingExcel((prev) => ({ ...prev, [gamme.id]: false }));
    }
  };

  return (
    <DashboardLayout role={userRole}>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Liste des gammes
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Consultez les gammes organisees par projet.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center gap-3 py-16">
            <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
            <span className="text-slate-500 font-medium">
              Chargement des projets...
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {!loading && projets.length === 0 && (
          <div className="border border-dashed border-slate-300 rounded-2xl py-16 flex flex-col items-center justify-center bg-slate-50">
            <span className="text-4xl mb-3">Dossier</span>
            <span className="text-slate-500 font-medium">
              Aucun projet trouve.
            </span>
          </div>
        )}

        {!loading && projets.length > 0 && (
          <ListeGammesProjects
            projets={projets}
            openedProjects={openedProjects}
            gammesByProjet={gammesByProjet}
            loadingGammes={loadingGammes}
            downloadingProjectKPI={downloadingProjectKPI}
            downloadingKPI={downloadingKPI}
            downloadingExcel={downloadingExcel}
            savingDates={savingDates}
            isPPL={isPPL}
            canEditDates={isAdmin}
            getProjectName={getProjectDisplayName}
            getGammeName={getGammeDisplayName}
            getRoleBadge={getRoleBadge}
            onToggleProject={toggleProject}
            onDownloadProjectKPI={handleDownloadProjectKPI}
            onDownloadKPI={handleDownloadKPI}
            onDownloadModifiedExcel={handleDownloadModifiedExcel}
            onUpdateGammeDates={handleUpdateGammeDates}
            onOpenComments={openCommentsModal}
            onNavigate={navigate}
          />
        )}

        <CommentsModal
          commentModal={commentModal}
          onClose={closeCommentsModal}
        />

        <GammeKpiModal
          modal={gammeKpiModal}
          isExporting={Boolean(
            gammeKpiModal.data?.gamme?.id &&
              exportingKPI[gammeKpiModal.data.gamme.id]
          )}
          onClose={closeGammeKpiModal}
          onExport={handleExportGammeKPI}
        />

        <ProjectKpiModal
          modal={projectKpiModal}
          isExporting={Boolean(
            projectKpiModal.data?.projet?.id &&
              exportingProjectKPI[projectKpiModal.data.projet.id]
          )}
          onClose={closeProjectKpiModal}
          onExport={handleExportProjectKPI}
          exportJob={
            projectKpiModal.data?.projet?.id
              ? projectExportJobs[projectKpiModal.data.projet.id]
              : null
          }
        />

        <SyntheseModal
          syntheseModal={syntheseModal}
          onClose={closeSyntheseModal}
        />
      </div>
    </DashboardLayout>
  );
};

export default ListeGammes;
