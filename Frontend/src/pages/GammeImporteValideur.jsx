import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Car,
  ClipboardList,
  Download,
  FolderKanban,
  Package,
  Route,
  Settings,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import {
  CommentsModal,
  GammeKpiModal,
  SyntheseModal,
} from "../components/listeGammes/ListeGammesContent";
import { gammesAPI } from "../api/index";
import { useGammeKpiDownload } from "../hooks/useGammeKpiDownload";
import { useGeneralCommentsModal } from "../hooks/useGeneralCommentsModal";

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getGammeName = (gamme) => gamme?.nom_gamme || `ID: ${gamme?.id}`;

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
    <div className="mt-0.5 text-slate-400">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-700 truncate">
        {value || "-"}
      </p>
    </div>
  </div>
);

const GammeActionButton = ({ children, className, ...props }) => (
  <button
    type="button"
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${className}`}
    {...props}
  >
    {children}
  </button>
);

const GammeImporteValideur = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gammes, setGammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { commentModal, openCommentsModal, closeCommentsModal } =
    useGeneralCommentsModal();
  const {
    downloadingKPI,
    exportingKPI,
    gammeKpiModal,
    syntheseModal,
    handleDownloadKPI,
    handleExportGammeKPI,
    closeGammeKpiModal,
    closeSyntheseModal,
  } = useGammeKpiDownload();

  useEffect(() => {
    const fetchGammes = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await gammesAPI.listByPro(id);
        setGammes(data || []);
      } catch (err) {
        console.error(err);
        setError("Erreur lors du chargement des gammes.");
      } finally {
        setLoading(false);
      }
    };

    fetchGammes();
  }, [id]);

  const openGammeComments = (gamme, type, title) => {
    openCommentsModal({
      gammeId: gamme.id,
      gammeName: gamme.nom_gamme,
      type,
      title,
    });
  };

  return (
    <DashboardLayout role="valideur">
      <div className="space-y-5">
        <div className="flex justify-between items-center mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Retour
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Gammes a valider
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Selectionnez une gamme et consultez les informations avant
              validation
            </p>
          </div>

          <div />
        </div>

        {loading && (
          <div className="flex justify-center items-center gap-3 py-10">
            <div className="h-16 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
            <span className="text-slate-500 font-medium">Chargement...</span>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center mb-6 font-semibold">
            {error}
          </div>
        )}

        {!loading && gammes.length === 0 && (
          <div className="border border-dashed border-slate-300 rounded-lg py-16 flex flex-col items-center justify-center bg-slate-50">
            <span className="text-4xl mb-3">Dossier</span>
            <span className="text-slate-500 font-medium">
              Aucune gamme creee pour ce projet
            </span>
          </div>
        )}

        {!loading && gammes.length > 0 && (
          <div className="space-y-6">
            {gammes.map((gamme) => (
              <div
                key={gamme.id}
                className="rounded-lg border border-slate-200 shadow-sm hover:shadow-md bg-white transition-all overflow-hidden"
              >
                <div className="p-6 flex justify-between items-start gap-5">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-lg font-bold text-[#243782] cursor-pointer hover:underline truncate"
                        onClick={() => navigate(`/visualiser/${gamme.id}`)}
                      >
                        {getGammeName(gamme)}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                        <FolderKanban size={14} />
                        <span>Projet : {gamme.projet_nom || "-"}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <Calendar size={14} />
                        <span>
                          Importee le{" "}
                          {formatDate(gamme.date_import || gamme.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap justify-end">
                    <GammeActionButton
                      onClick={() => navigate(`/validation/${gamme.id}`)}
                      className="bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Commencer la validation
                    </GammeActionButton>

                    <GammeActionButton
                      onClick={() =>
                        openGammeComments(
                          gamme,
                          "BESOINS",
                          "Commentaires besoins techniques"
                        )
                      }
                      className="bg-[#243782]/15 text-[#243782] hover:bg-[#243782]/20"
                    >
                      Besoins techniques
                    </GammeActionButton>

                    <GammeActionButton
                      onClick={() =>
                        openGammeComments(gamme, "PISTES", "Commentaires pistes")
                      }
                      className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    >
                      Les pistes
                    </GammeActionButton>

                    <GammeActionButton
                      onClick={() => handleDownloadKPI(gamme)}
                      disabled={downloadingKPI[gamme.id]}
                      className="bg-[#243782]/15 text-[#243782] hover:bg-[#243782]/20 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      {downloadingKPI[gamme.id] ? "Chargement..." : "KPI"}
                    </GammeActionButton>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <InfoItem
                      icon={<ClipboardList size={15} />}
                      label="Type procedure"
                      value={
                        gamme.type_procedure_nom ||
                        gamme.type_procedure_name ||
                        gamme.type_procedure
                      }
                    />
                    <InfoItem
                      icon={<Settings size={15} />}
                      label="Fonction gamme"
                      value={
                        gamme.fonction_gamme_nom ||
                        gamme.fonction_gamme_name ||
                        gamme.fonction_gamme
                      }
                    />
                    <InfoItem
                      icon={<Car size={15} />}
                      label="Vehicule"
                      value={
                        gamme.vehicule_nom ||
                        gamme.vehicule_name ||
                        gamme.vehicule
                      }
                    />
                    <InfoItem
                      icon={<Route size={15} />}
                      label="Pistes"
                      value={gamme.pistes}
                    />
                    <InfoItem
                      icon={<Package size={15} />}
                      label="Boitiers"
                      value={gamme.boitiers}
                    />
                    <InfoItem
                      icon={<Calendar size={15} />}
                      label="Date debut"
                      value={formatDate(gamme.date_debut)}
                    />
                    <InfoItem
                      icon={<Calendar size={15} />}
                      label="Date fin"
                      value={formatDate(gamme.date_fin)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
        <SyntheseModal
          syntheseModal={syntheseModal}
          onClose={closeSyntheseModal}
        />
      </div>
    </DashboardLayout>
  );
};

export default GammeImporteValideur;



