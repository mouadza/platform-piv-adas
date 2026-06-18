import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { downloadGammeKPI, downloadProjectKPI } from "../utils/kpiDownloads";
import { getAccessToken } from "../utils/authStorage";
import { normalizeRole } from "../utils/roles";

const EspaceUser = () => {
  const navigate = useNavigate();

  const userRole = "visiteur";

  const [projets, setProjets] = useState([]);
  const [gammesByProjet, setGammesByProjet] = useState({});
  const [openedProjects, setOpenedProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingGammes, setLoadingGammes] = useState({});
  const [downloadingProjectKPI, setDownloadingProjectKPI] = useState({});
  const [downloadingKPI, setDownloadingKPI] = useState({});
  const [error, setError] = useState("");

  const [syntheseModal, setSyntheseModal] = useState({
    isOpen: false,
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
      console.error("Erreur décodage token :", err);
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


  const handleDownloadProjectKPI = async (projet) => {
    try {
      setDownloadingProjectKPI((prev) => ({
        ...prev,
        [projet.id]: true,
      }));

      await downloadProjectKPI(projet);
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        message: "Une erreur est survenue lors de la generation du KPI projet.",
      });
    } finally {
      setDownloadingProjectKPI((prev) => ({
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
        message: "Une erreur est survenue lors de la generation du KPI gamme.",
      });
    } finally {
      setDownloadingKPI((prev) => ({
        ...prev,
        [gamme.id]: false,
      }));
    }
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
      <div className="p-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Mon espace
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Consultez uniquement les projets qui vous sont affectés.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
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
            <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />

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
          <div className="border border-dashed border-slate-300 rounded-2xl py-16 flex flex-col items-center justify-center bg-slate-50">
            <span className="text-4xl mb-3">📁</span>

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
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* PROJECT HEADER */}
                  <button
                    type="button"
                    onClick={() => toggleProject(projet.id)}
                    className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
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

                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download size={14} />
                          {downloadingProjectKPI[projet.id]
                            ? "Generation..."
                            : "KPI Projet"}
                        </button>
                      </div>

                      {isLoadingGammes && (
                        <div className="flex items-center justify-center gap-3 py-8">
                          <div className="animate-spin h-7 w-7 border-b-2 border-blue-600 rounded-full" />

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
                                    className="font-bold text-blue-700 hover:underline cursor-pointer truncate"
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
                                  className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  <Download size={14} />
                                  {downloadingKPI[gamme.id]
                                    ? "Generation..."
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

        {/* SYNTHESE MODAL */}
        {syntheseModal.isOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-red-50">
                <h3 className="text-sm font-bold text-red-700">
                  Synthèse indisponible
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
