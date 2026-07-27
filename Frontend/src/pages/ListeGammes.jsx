import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Home, ListChecks } from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import {
  CommentsModal,
  EmptyProjectsIllustration,
  GammeKpiModal,
  ListeGammesProjects,
  ProjectListSkeleton,
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
      <div className="space-y-6 pb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <nav
                className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"
                aria-label="Fil d'Ariane"
              >
                <span className="inline-flex items-center gap-1">
                  <Home size={13} />
                  Tableau de bord
                </span>
                <ChevronRight size={13} />
                <span className="inline-flex items-center gap-1 text-[#243782]">
                  <ListChecks size={13} />
                  Gammes par projet
                </span>
              </nav>

              <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Suivi des gammes par projet
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Consultez les gammes de chaque projet, planifiez les dates et
                accedez aux validations et aux exports KPI.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Projets
                </p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {loading ? "--" : projets.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Projets affiches
                </p>
                <p className="mt-1 text-xl font-extrabold text-[#243782]">
                  {Object.values(openedProjects).filter(Boolean).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading && <ProjectListSkeleton />}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {!loading && projets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <EmptyProjectsIllustration />
            <span className="mt-5 text-base font-bold text-slate-800">
              Aucun projet trouve.
            </span>
            <span className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Les projets disponibles pour votre role seront affiches ici avec
              leurs gammes et exports associes.
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

