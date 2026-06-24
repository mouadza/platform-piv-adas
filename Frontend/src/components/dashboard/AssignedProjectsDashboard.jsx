import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { dashboardsAPI } from "../../api/index";
import { getTokenPayload } from "../../utils/roles";
import { getProjectKPIPreview } from "../../utils/kpiDownloads";
import {
  exportProjectKpiInBackground,
  prepareProjectKpiInBackground,
} from "../../utils/backgroundProjectKpiExport";
import DashboardLayout from "../DashboardLayout";
import {
  ProjectKpiModal,
  SyntheseModal,
} from "../listeGammes/ListeGammesContent";

const themeClasses = {
  blue: {
    spinner: "border-blue-600",
    accent: "text-blue-600",
    badge: "bg-blue-50 text-blue-600 border-blue-100",
    card: "border-slate-100 hover:shadow-md",
    cardTitle: "group-hover:text-blue-600",
    metric: "text-blue-600",
    footer: "text-blue-600",
  },
  amber: {
    spinner: "border-amber-500",
    accent: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    card: "border-slate-200 hover:shadow-md hover:border-amber-200",
    cardTitle: "group-hover:text-amber-700",
    metric: "text-amber-600",
    footer: "text-amber-700",
  },
};

const loaders = {
  ppl: dashboardsAPI.ppl,
  valideur: dashboardsAPI.valideur,
};

const LoadingState = ({ role, theme }) => (
  <DashboardLayout role={role}>
    <div className="flex justify-center items-center h-96">
      <div className="relative w-12 h-12">
        <div className="absolute w-12 h-12 rounded-full border-4 border-slate-200" />
        <div
          className={`absolute w-12 h-12 rounded-full border-4 ${theme.spinner} border-t-transparent animate-spin`}
        />
      </div>
    </div>
  </DashboardLayout>
);

const ProjectMetric = ({ label, value, highlighted, className = "" }) => (
  <div className={className}>
    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
      {label}
    </p>

    <p
      className={`text-sm mt-0.5 truncate ${
        highlighted ? "font-bold" : "font-semibold text-slate-700"
      }`}
    >
      {value ?? "-"}
    </p>
  </div>
);

const ProjectCard = ({
  projet,
  theme,
  destination,
  footerText,
  isDownloading,
  onDownloadProjectKPI,
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(destination(projet))}
      className={`group relative cursor-pointer bg-white rounded-2xl p-6 shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${theme.card}`}
    >
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3
            className={`font-bold text-slate-800 transition-colors line-clamp-2 ${theme.cardTitle}`}
          >
            {projet.nom_projet}
          </h3>

          <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shrink-0">
            ID: {projet.id}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-slate-50/70 rounded-xl p-3 text-center border border-slate-100/50">
          <ProjectMetric label="Arch" value={projet.architectures?.[0]} />
          <ProjectMetric
            label="Motor"
            value={projet.motorisations?.[0]}
            className="border-x border-slate-200/60"
          />
          <ProjectMetric
            label="Veh"
            value={projet.nombre_vehicules ?? 0}
            highlighted
            className={theme.metric}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => onDownloadProjectKPI(event, projet)}
        disabled={isDownloading}
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={14} />
        {isDownloading ? "Chargement..." : "KPI Projet"}
      </button>

      <div
        className={`mt-4 pt-3 border-t border-slate-50 flex justify-end items-center text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${theme.footer}`}
      >
        {footerText} <span className="ml-1">-&gt;</span>
      </div>
    </div>
  );
};

const AssignedProjectsDashboard = ({
  dashboardRole,
  layoutRole,
  title,
  subtitle,
  projectsTitle,
  emptyMessage,
  footerText,
  destination,
  themeName = "blue",
}) => {
  const theme = themeClasses[themeName] || themeClasses.blue;
  const [projets, setProjets] = useState([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingProjectKPI, setDownloadingProjectKPI] = useState({});
  const [exportingProjectKPI, setExportingProjectKPI] = useState({});
  const [projectExportJobs, setProjectExportJobs] = useState({});
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
    const decoded = getTokenPayload();
    setUsername(decoded?.username || "");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await loaders[dashboardRole]();
        setProjets(data.projets_assignes || []);
      } catch (err) {
        console.error(`Erreur chargement dashboard ${dashboardRole}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dashboardRole]);

  const handleDownloadProjectKPI = async (event, projet) => {
    event.stopPropagation();

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
    } catch (err) {
      console.error(err);
      setSyntheseModal({
        isOpen: true,
        type: "error",
        title: "Erreur KPI Projet",
        message: "Une erreur est survenue lors du chargement du KPI projet.",
      });
    } finally {
      setDownloadingProjectKPI((prev) => ({ ...prev, [projet.id]: false }));
    }
  };

  const handleExportProjectKPI = async (projet) => {
    try {
      setExportingProjectKPI((prev) => ({ ...prev, [projet.id]: true }));
      await exportProjectKpiInBackground({
        projectId: projet.id,
        projectName: projet.nom_projet,
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
      setExportingProjectKPI((prev) => ({ ...prev, [projet.id]: false }));
    }
  };

  if (loading) {
    return <LoadingState role={layoutRole} theme={theme} />;
  }

  return (
    <DashboardLayout role={layoutRole}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {title}{" "}
            <span className={`${theme.accent} font-black`}>
              {username || "Utilisateur"}
            </span>
          </h1>

          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[1400px] bg-white px-2 py-8 rounded-3xl shadow">
        <div className="px-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {projectsTitle}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${theme.badge}`}
              >
                {projets.length}
              </span>
            </h2>
          </div>

          {projets.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-500 font-medium">{emptyMessage}</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projets.map((projet) => (
                <ProjectCard
                  key={projet.id}
                  projet={projet}
                  theme={theme}
                  destination={destination}
                  footerText={footerText}
                  isDownloading={Boolean(downloadingProjectKPI[projet.id])}
                  onDownloadProjectKPI={handleDownloadProjectKPI}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProjectKpiModal
        modal={projectKpiModal}
        isExporting={Boolean(
          projectKpiModal.data?.projet?.id &&
            exportingProjectKPI[projectKpiModal.data.projet.id]
        )}
        onClose={() =>
          setProjectKpiModal({
            isOpen: false,
            data: null,
          })
        }
        onExport={handleExportProjectKPI}
        exportJob={
          projectKpiModal.data?.projet?.id
            ? projectExportJobs[projectKpiModal.data.projet.id]
            : null
        }
      />

      <SyntheseModal
        syntheseModal={syntheseModal}
        onClose={() =>
          setSyntheseModal({
            isOpen: false,
            type: "info",
            title: "",
            message: "",
          })
        }
      />
    </DashboardLayout>
  );
};

export default AssignedProjectsDashboard;
