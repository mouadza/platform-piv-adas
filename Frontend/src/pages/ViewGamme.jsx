import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL, gammesAPI, projectsAPI } from "../api/index";
import { 
  FaArrowLeft, 
  FaDownload, 
  FaEye, 
  FaFileExcel, 
  FaFileArchive,
  FaCogs,
  FaCar,
  FaClock,
  FaBoxOpen,
  FaRoute
} from "react-icons/fa";

const BASE_URL = `${API_BASE_URL}/admin_config`;

/* ── Helpers ── */
const getFileExtension = (path) =>
  path?.split(".").pop().toUpperCase() || "FILE";

const getFileName = (path) => path?.split("/").pop() || "";

const FILE_STYLES = {
  XLSX: { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: FaFileExcel },
  XLS:  { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: FaFileExcel },
  ZIP:  { bg: "bg-amber-500",   light: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   icon: FaFileArchive },
};

const getStyle = (path) =>
  FILE_STYLES[getFileExtension(path)] ?? {
    bg: "bg-slate-500",
    light: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    icon: FaFileArchive
  };

const getStatusBadge = (status) => {
  switch (status) {
    case "CONFIG":
      return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Configurée</span>;
    case "NOT_CONFIG":
      return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>Non configurée</span>;
    case "CANCEL":
      return <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>Annulée</span>;
    default:
      return <span className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">{status || "Inconnu"}</span>;
  }
};

/* ── Composants ── */
const FileCard = ({ path, label, onView }) => {
  if (!path) {
    return (
      <div className="flex items-center gap-4 p-5 border border-dashed border-slate-300 bg-slate-50 rounded-2xl text-sm italic text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center">
          <FaFileArchive className="text-slate-400" size={18} />
        </div>
        Aucun fichier — {label}
      </div>
    );
  }

  const ext   = getFileExtension(path);
  const name  = getFileName(path);
  const style = getStyle(path);
  const url   = `${BASE_URL}${path}`;
  const isZip = ext === "ZIP";
  const Icon  = style.icon;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border ${style.border} ${style.light} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-4 min-w-0">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center shadow-inner`}>
          <Icon className="text-white" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm truncate ${style.text}`}>{name}</p>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{label} • {ext}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {!isZip && onView && (
          <button
            onClick={onView}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <FaEye size={14} /> Voir
          </button>
        )}
        <a
          href={url}
          download
          className={`flex items-center gap-2 ${style.bg} hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm`}
        >
          <FaDownload size={12} /> Télécharger
        </a>
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100/80 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="text-slate-400" size={16} />}
      <span className="text-sm text-slate-500 font-medium">{label}</span>
    </div>
    <span className="text-sm font-bold text-slate-800 text-right">{value || "—"}</span>
  </div>
);

/* ── Main Component ── */
const ViewGamme = () => {
  const { id, projetId } = useParams();
  const navigate = useNavigate();
  const [projet, setProjet]   = useState(null);
  const [gamme, setGamme]     = useState(null);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem("role");

  useEffect(() => {
    const fetchProjet = async () => {
      try {
        const data = await projectsAPI.detail(projetId);
        setProjet(data);
      } catch (e) {
        console.error("Erreur chargement projet", e);
      }
    };
    fetchProjet();
  }, [projetId]);

  useEffect(() => {
    const fetchGamme = async () => {
      try {
        const data = await gammesAPI.detail(id);
        setGamme(data);
      } catch (e) {
        console.error("Erreur chargement gamme", e);
      } finally {
        setLoading(false);
      }
    };
    fetchGamme();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex h-64 items-center justify-center text-slate-400 italic">
          <div className="animate-pulse flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             Chargement de la gamme...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!gamme) return null;

  return (
    <DashboardLayout role={userRole}>

      <button
          onClick={() => navigate(-1)}
          className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-2"
        >
          <FaArrowLeft size={12} /> Retour
        </button>

      <div className="mx-auto px-4 sm:px-8 md:px-16 lg:px-24 py-6">

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 md:p-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                  {gamme.nom}
                </h1>
                {getStatusBadge(gamme.status)}
              </div>
              {projet && (
                <p className="text-slate-500 font-medium flex items-center gap-2">
                  Projet : <span className="text-blue-600 font-bold">{projet.nom_projet}</span>
                </p>
              )}
            </div>
            {projet && (
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-5 py-2 rounded-xl text-sm font-bold flex-shrink-0 shadow-sm">
                ID Projet: {projet.id}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-800 text-center mb-8 relative">
            <span className="bg-white px-4 relative z-10">Détails de la configuration</span>
            <div className="absolute top-1/2 left-0 w-full h-px bg-slate-100 -z-0"></div>
          </h2>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-800 text-center">
                Informations générales
              </h3>
              <div className="space-y-1">
                <InfoRow icon={FaCogs} label="Config (S/H)"  value={gamme.nom} />
                <InfoRow icon={FaCar} label="Véhicule" value={gamme.vehicule?.cmq || "Non assigné"} />
                <InfoRow icon={FaFileArchive} label="Procédure"     value={gamme.type_procedure} />
                <InfoRow icon={FaCogs} label="Fonction"      value={gamme.fonction} />
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
              <h3 className="font-bold text-lg mb-4 text-slate-800 text-center">
                Besoin Technique
              </h3>
              <div className="space-y-1">
                <InfoRow icon={FaRoute} label="Pistes"          value={gamme.pistes} />
                <InfoRow icon={FaBoxOpen} label="Boîtiers"        value={gamme.boitiers} />
                <InfoRow icon={FaClock} label="Nombre de jours" value={gamme.nombre_jours ? `${gamme.nombre_jours} jours` : "—"} />
              </div>
            </div>
          </div>

          {/* Files */}
          <div>
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <FaFileArchive className="text-slate-400" /> Fichiers attachés
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FileCard
                path={gamme.fichier_gamme}
                label="Fichier Gamme Principal"
                onView={() => navigate(`/projets/${projetId}/gammes/${id}/fichier`)}
              />
              <FileCard
                path={gamme.fichier_associe}
                label="Fichier Associé (Optionnel)"
              />
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default ViewGamme;
