import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import {
  BsChevronDown,
  BsChevronRight,
  BsFileEarmarkSpreadsheetFill,
  BsFolderFill,
  BsCheckCircleFill,
} from "react-icons/bs";
import { Download } from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { gammesAPI } from "../api/index";
import {
  downloadGammeKPI,
  getGammeKPIPreview,
  getProjectKPIPreview,
} from "../utils/kpiDownloads";
import {
  exportProjectKpiInBackground,
  prepareProjectKpiInBackground,
} from "../utils/backgroundProjectKpiExport";
import { getAccessToken } from "../utils/authStorage";
import { normalizeRole } from "../utils/roles";
import {
  GammeKpiModal,
  ProjectKpiModal,
} from "../components/listeGammes/ListeGammesContent";

const EspaceUser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const autoOpenedProjectRef = useRef("");

  const userRole = "visiteur";

  const [projets, setProjets] = useState([]);
  const [gammesByProjet, setGammesByProjet] = useState({});
  const [openedProjects, setOpenedProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingGammes, setLoadingGammes] = useState({});
  const [downloadingProjectKPI, setDownloadingProjectKPI] = useState({});
  const [exportingProjectKPI, setExportingProjectKPI] = useState({});
  const [projectExportJobs, setProjectExportJobs] = useState({});
  const [downloadingKPI, setDownloadingKPI] = useState({});
  const [exportingKPI, setExportingKPI] = useState({});
  const [error, setError] = useState("");
  const [gammeKpiModal, setGammeKpiModal] = useState({
    isOpen: false,
    data: null,
  });
  const [projectKpiModal, setProjectKpiModal] = useState({
    isOpen: false,
    data: null,
  });

  const [syntheseModal, setSyntheseModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  useEffect(() => {
    loadAffectedProjects();
  }, []);

  const loadAffectedProjects = () => {
    try {
      setLoading(true);
      setError("");

      const token = getAccessToken();

      if (!token) {
        setError("Session introuvable. Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }

      const decoded = jwtDecode(token);

      const affectations = (decoded.affectations || []).filter(
        (aff) => normalizeRole(aff.role) === "VISITEUR"
      );

      if (affectations.length === 0) {
        setProjets([]);
        setLoading(false);
        return;
      }

      // Dédupliquer les projets si l'utilisateur a plusieurs rôles sur le même projet
      const uniqueProjectsMap = new Map();

      affectations.forEach((aff) => {
        if (!aff.projet_id) return;

        if (!uniqueProjectsMap.has(aff.projet_id)) {
          uniqueProjectsMap.set(aff.projet_id, {
            id: aff.projet_id,
            nom_projet: aff.projet_nom || `Projet ${aff.projet_id}`,
            roles: [aff.role],
          });
        } else {
          const existing = uniqueProjectsMap.get(aff.projet_id);

          if (!existing.roles.includes(aff.role)) {
            existing.roles.push(aff.role);
          }
        }
      });

      setProjets(Array.from(uniqueProjectsMap.values()));
    } catch (err) {
      console.error("Erreur de décodage du jeton :", err);
      setError("Impossible de charger vos projets affectés.");
    } finally {
      setLoading(false);
    }
  };

  const loadGammesForProject = async (projetId) => {
    try {
      setLoadingGammes((prev) => ({
        ...prev,
        [projetId]: true,
      }));

      const data = await gammesAPI.listByProjet(projetId);

      setGammesByProjet((prev) => ({
        ...prev,
        [projetId]: data,
      }));
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des gammes.");
    } finally {
      setLoadingGammes((prev) => ({
        ...prev,
        [projetId]: false,
      }));
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

  useEffect(() => {
    if (loading || projets.length === 0) return;

    const params = new URLSearchParams(location.search);
    const targetProjectId =
      params.get("project") || localStorage.getItem("selected_project_id");

    if (!targetProjectId || autoOpenedProjectRef.current === targetProjectId) {
      return;
    }

    const targetProject = projets.find(
      (projet) => String(projet.id) === String(targetProjectId)
    );

    if (!targetProject) return;

    autoOpenedProjectRef.current = String(targetProjectId);
    setOpenedProjects((prev) => ({
      ...prev,
      [targetProject.id]: true,
    }));

    if (!gammesByProjet[targetProject.id]) {
      loadGammesForProject(targetProject.id);
    }
  }, [loading, projets, location.search]);


  const handleDownloadProjectKPI = async (projet) => {
    try {
      setDownloadingProjectKPI((prev) => ({
        ...prev,
        [projet.id]: true,
      }));

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
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        type: "error",
        title: "Erreur KPI Projet",
        message: "Une erreur est survenue lors du chargement du KPI projet.",
      });
    } finally {
      setDownloadingProjectKPI((prev) => ({
        ...prev,
        [projet.id]: false,
      }));
    }
  };

  const handleExportProjectKPI = async (projet) => {
    try {
      setExportingProjectKPI((prev) => ({
        ...prev,
        [projet.id]: true,
      }));
      await exportProjectKpiInBackground({
        projectId: projet.id,
        projectName: getProjectName(projet),
        preparedJob: projectExportJobs[projet.id],
        onProgress: (job) =>
          setProjectExportJobs((prev) => ({
            ...prev,
            [projet.id]: job,
          })),
      });
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
    } finally {
      setExportingProjectKPI((prev) => ({
        ...prev,
        [projet.id]: false,
      }));
    }
  };

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
        message: "Une erreur est survenue lors du chargement des KPI gamme.",
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
        message: "Une erreur est survenue lors de la generation du KPI gamme.",
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

  const closeProjectKpiModal = () => {
    setProjectKpiModal({
      isOpen: false,
      data: null,
    });
  };

  const getProjectName = (projet) => {
    return projet.nom_projet || projet.nom || `Projet ${projet.id}`;
  };

  const getGammeName = (gamme) => {
    return (
      gamme.nom_gamme ||
      `Gamme ${gamme.id}`
    );
  };

  const getRolesLabel = (roles = []) => {
    if (!roles.length) return "Utilisateur";

    return roles.join(" / ");
  };

  const formatGammeDate = (value) => {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("fr-FR");
  };

  const totalGammesLoaded = useMemo(() => {
    return Object.values(gammesByProjet).reduce(
      (acc, gammes) => acc + gammes.length,
      0
    );
  }, [gammesByProjet]);

  return (
    <DashboardLayout role={userRole}>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Mon espace
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Consultez uniquement les projets qui vous sont affectés.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#243782]/15 text-[#243782] text-xs font-bold">
              {projets.length} projet(s) affecté(s)
            </span>

            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {totalGammesLoaded} gamme(s) chargée(s)
            </span>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center items-center gap-3 py-16">
            <div className="h-16 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />

            <span className="text-slate-500 font-medium">
              Chargement de vos projets...
            </span>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* EMPTY */}
        {!loading && projets.length === 0 && (
          <div className="border border-dashed border-slate-300 rounded-lg py-16 flex flex-col items-center justify-center bg-slate-50">
            <span className="text-4xl mb-3">ðŸ“</span>

            <span className="text-slate-600 font-bold">
              Aucun projet affecté
            </span>

            <span className="text-slate-400 text-sm mt-2">
              Veuillez contacter votre administrateur pour obtenir une affectation.
            </span>
          </div>
        )}

        {/* PROJECTS */}
        {!loading && projets.length > 0 && (
          <div className="space-y-5">
            {projets.map((projet) => {
              const isOpen = openedProjects[projet.id];
              const gammes = gammesByProjet[projet.id] || [];
              const isLoadingGammes = loadingGammes[projet.id];

              return (
                <div
                  key={projet.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* PROJECT HEADER */}
                  <button
                    type="button"
                    onClick={() => toggleProject(projet.id)}
                    className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#243782]/15 text-[#243782] flex items-center justify-center">
                        <BsFolderFill size={20} />
                      </div>

                      <div className="text-left">
                        <h2 className="text-lg font-bold text-slate-800">
                          {getProjectName(projet)}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs text-slate-400">
                            ID Projet : {projet.id}
                          </p>

                          <span className="px-2 py-0.5 rounded-full bg-[#243782]/10 text-[#243782] text-[10px] font-bold">
                            {getRolesLabel(projet.roles)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                        {gammesByProjet[projet.id]
                          ? `${gammes.length} gamme(s)`
                          : "Cliquer pour charger"}
                      </span>

                      {isOpen ? (
                        <BsChevronDown className="text-slate-500" />
                      ) : (
                        <BsChevronRight className="text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* GAMMES LIST */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                      <div className="mb-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDownloadProjectKPI(projet)}
                          disabled={downloadingProjectKPI[projet.id]}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#243782]/15 px-3 py-2 text-xs font-bold text-[#243782] hover:bg-[#243782]/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download size={14} />
                          {downloadingProjectKPI[projet.id]
                            ? "Chargement..."
                            : "KPI Projet"}
                        </button>
                      </div>

                      {isLoadingGammes && (
                        <div className="flex items-center justify-center gap-3 py-8">
                          <div className="h-12 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />

                          <span className="text-sm text-slate-500">
                            Chargement des gammes...
                          </span>
                        </div>
                      )}

                      {!isLoadingGammes && gammes.length === 0 && (
                        <div className="py-8 text-center text-sm text-slate-400">
                          Aucune gamme créée pour ce projet.
                        </div>
                      )}

                      {!isLoadingGammes && gammes.length > 0 && (
                        <div className="space-y-3">
                          {gammes.map((gamme) => (
                            <div
                              key={gamme.id}
                              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                            >
                              {/* LEFT */}
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                                  <BsFileEarmarkSpreadsheetFill size={18} />
                                </div>

                                <div className="min-w-0">
                                  <h3
                                    onClick={() =>
                                      navigate(`/visualiser/${gamme.id}`)
                                    }
                                    className="font-bold text-[#243782] hover:underline cursor-pointer truncate"
                                  >
                                    {getGammeName(gamme)}
                                  </h3>

                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                    <span>
                                      Type :{" "}
                                      <b>
                                        {gamme.type_procedure ||
                                          gamme.type_procedure_nom ||
                                          "—"}
                                      </b>
                                    </span>

                                    <span>
                                      Fonction :{" "}
                                      <b>
                                        {gamme.fonction ||
                                          gamme.fonction_gamme_nom ||
                                          "—"}
                                      </b>
                                    </span>

                                    <span>
                                      Véhicule :{" "}
                                      <b>
                                        {gamme.vehicule?.cmq ||
                                          gamme.vehicule_nom ||
                                          "—"}
                                      </b>
                                    </span>

                                    <span>
                                      Jours :{" "}
                                      <b>{gamme.nombre_jours || "—"}</b>
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                                    <span>
                                      Pistes : {gamme.pistes || "—"}
                                    </span>

                                    <span>
                                      Boîtiers : {gamme.boitiers || "—"}
                                    </span>

                                    <span>
                                      Début : {formatGammeDate(gamme.date_debut)}
                                    </span>

                                    <span>
                                      Fin : {formatGammeDate(gamme.date_fin)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* ACTIONS */}
                              <div className="flex items-center gap-2 flex-wrap justify-end">

                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(`/validation/${gamme.id}`)
                                  }
                                  className="px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold flex items-center gap-1"
                                >
                                  <BsCheckCircleFill />
                                  Validation
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadKPI(gamme)}
                                  disabled={downloadingKPI[gamme.id]}
                                  className="px-3 py-2 rounded-lg bg-[#243782]/15 text-[#243782] hover:bg-[#243782]/20 text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <Download size={14} />
                                  {downloadingKPI[gamme.id]
                                    ? "Chargement..."
                                    : "KPI"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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

        {/* SYNTHESE MODAL */}
        {syntheseModal.isOpen && (
          <div className="modal-backdrop">
            <div className="modal-sheet sm:max-w-md">
              <div
                className={`px-6 py-5 border-b border-slate-100 ${
                  syntheseModal.type === "success"
                    ? "bg-emerald-50"
                    : syntheseModal.type === "warning"
                    ? "bg-amber-50"
                    : "bg-red-50"
                }`}
              >
                <h3
                  className={`text-sm font-bold ${
                    syntheseModal.type === "success"
                      ? "text-emerald-700"
                      : syntheseModal.type === "warning"
                      ? "text-amber-700"
                      : "text-red-700"
                  }`}
                >
                  <span>{syntheseModal.title || "Information KPI"}</span>
                  <span className="hidden">
                  Synthèse indisponible
                  </span>
                </h3>
              </div>

              <div className="px-6 py-5">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {syntheseModal.message}
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setSyntheseModal({
                      isOpen: false,
                      type: "info",
                      title: "",
                      message: "",
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900"
                >
                  Compris
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EspaceUser;



