import React, { useEffect, useState } from "react";
import {
  BsCheckCircleFill,
  BsChevronDown,
  BsChevronRight,
  BsFileEarmarkSpreadsheetFill,
  BsFolderFill,
} from "react-icons/bs";
import { CalendarDays, Download, RotateCcw, Save, X } from "lucide-react";

import CommentairesSection from "../CommentairesSection";

export const ListeGammesProjects = ({
  projets,
  openedProjects,
  gammesByProjet,
  loadingGammes,
  downloadingProjectKPI,
  downloadingKPI,
  downloadingExcel,
  savingDates,
  isPPL,
  canEditDates,
  getProjectName,
  getGammeName,
  getRoleBadge,
  onToggleProject,
  onDownloadProjectKPI,
  onDownloadKPI,
  onDownloadModifiedExcel,
  onUpdateGammeDates,
  onOpenComments,
  onNavigate,
}) => (
  <div className="space-y-5">
    {projets.map((projet) => (
      <ProjectCard
        key={projet.id}
        projet={projet}
        isOpen={openedProjects[projet.id]}
        gammes={gammesByProjet[projet.id] || []}
        isLoadingGammes={loadingGammes[projet.id]}
        downloadingProjectKPI={downloadingProjectKPI}
        downloadingKPI={downloadingKPI}
        downloadingExcel={downloadingExcel}
        savingDates={savingDates}
        isPPL={isPPL}
        canEditDates={canEditDates}
        getProjectName={getProjectName}
        getGammeName={getGammeName}
        getRoleBadge={getRoleBadge}
        onToggleProject={onToggleProject}
        onDownloadProjectKPI={onDownloadProjectKPI}
        onDownloadKPI={onDownloadKPI}
        onDownloadModifiedExcel={onDownloadModifiedExcel}
        onUpdateGammeDates={onUpdateGammeDates}
        onOpenComments={onOpenComments}
        onNavigate={onNavigate}
        gammesLoaded={Boolean(gammesByProjet[projet.id])}
      />
    ))}
  </div>
);

const ProjectCard = ({
  projet,
  isOpen,
  gammes,
  isLoadingGammes,
  downloadingProjectKPI,
  downloadingKPI,
  downloadingExcel,
  savingDates,
  isPPL,
  canEditDates,
  getProjectName,
  getGammeName,
  getRoleBadge,
  onToggleProject,
  onDownloadProjectKPI,
  onDownloadKPI,
  onDownloadModifiedExcel,
  onUpdateGammeDates,
  onOpenComments,
  onNavigate,
  gammesLoaded,
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <button
      type="button"
      onClick={() => onToggleProject(projet.id)}
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

          <p className="text-xs text-slate-400 mt-0.5">
            ID Projet : {projet.id}
          </p>

          {getRoleBadge?.(projet) && (
            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              {getRoleBadge(projet)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
          {gammesLoaded ? `${gammes.length} gamme(s)` : "Cliquer pour charger"}
        </span>

        {isOpen ? (
          <BsChevronDown className="text-slate-500" />
        ) : (
          <BsChevronRight className="text-slate-500" />
        )}
      </div>
    </button>

    {isOpen && (
      <GammesPanel
        projet={projet}
        gammes={gammes}
        isLoadingGammes={isLoadingGammes}
        downloadingProjectKPI={downloadingProjectKPI}
        downloadingKPI={downloadingKPI}
        downloadingExcel={downloadingExcel}
        savingDates={savingDates}
        isPPL={isPPL}
        canEditDates={canEditDates}
        getGammeName={getGammeName}
        onDownloadProjectKPI={onDownloadProjectKPI}
        onDownloadKPI={onDownloadKPI}
        onDownloadModifiedExcel={onDownloadModifiedExcel}
        onUpdateGammeDates={onUpdateGammeDates}
        onOpenComments={onOpenComments}
        onNavigate={onNavigate}
      />
    )}
  </div>
);

const GammesPanel = ({
  projet,
  gammes,
  isLoadingGammes,
  downloadingProjectKPI,
  downloadingKPI,
  downloadingExcel,
  savingDates,
  isPPL,
  canEditDates,
  getGammeName,
  onDownloadProjectKPI,
  onDownloadKPI,
  onDownloadModifiedExcel,
  onUpdateGammeDates,
  onOpenComments,
  onNavigate,
}) => (
  <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={() => onDownloadProjectKPI(projet)}
        disabled={downloadingProjectKPI?.[projet.id]}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={14} />
        {downloadingProjectKPI?.[projet.id] ? "Generation..." : "KPI Projet"}
      </button>
    </div>

    {isLoadingGammes && (
      <div className="flex items-center justify-center gap-3 py-8">
        <div className="animate-spin h-7 w-7 border-b-2 border-blue-600 rounded-full" />

        <span className="text-sm text-slate-500">Chargement des gammes...</span>
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
          <GammeRow
            key={gamme.id}
            gamme={gamme}
            isPPL={isPPL}
            canEditDates={canEditDates}
            isDownloadingKPI={Boolean(downloadingKPI[gamme.id])}
            isDownloadingExcel={Boolean(downloadingExcel?.[gamme.id])}
            isSavingDates={Boolean(savingDates?.[gamme.id])}
            getGammeName={getGammeName}
            onDownloadKPI={onDownloadKPI}
            onDownloadModifiedExcel={onDownloadModifiedExcel}
            onUpdateGammeDates={onUpdateGammeDates}
            onOpenComments={onOpenComments}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    )}
  </div>
);

const toInputDate = (value) => {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (value) => {
  const inputDate = toInputDate(value);

  if (!inputDate) return "-";

  return new Date(`${inputDate}T00:00:00`).toLocaleDateString("fr-FR");
};

const GammeDatesEditor = ({
  gamme,
  canEditDates,
  isSavingDates,
  onUpdateGammeDates,
}) => {
  const initialDateDebut = toInputDate(gamme.date_debut);
  const initialDateFin = toInputDate(gamme.date_fin);

  const [draft, setDraft] = useState({
    date_debut: initialDateDebut,
    date_fin: initialDateFin,
  });

  useEffect(() => {
    setDraft({
      date_debut: toInputDate(gamme.date_debut),
      date_fin: toInputDate(gamme.date_fin),
    });
  }, [gamme.date_debut, gamme.date_fin]);

  const isDirty =
    draft.date_debut !== initialDateDebut ||
    draft.date_fin !== initialDateFin;

  const hasInvalidRange =
    draft.date_debut && draft.date_fin && draft.date_fin < draft.date_debut;

  const handleChange = (field, value) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReset = () => {
    setDraft({
      date_debut: initialDateDebut,
      date_fin: initialDateFin,
    });
  };

  const handleSave = async () => {
    if (!isDirty || hasInvalidRange || isSavingDates) return;

    await onUpdateGammeDates(gamme, draft);
  };

  if (!canEditDates) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={13} />
          Debut : <b>{formatDateLabel(gamme.date_debut)}</b>
        </span>

        <span>
          Fin : <b>{formatDateLabel(gamme.date_fin)}</b>
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
        Debut
        <input
          type="date"
          value={draft.date_debut}
          onChange={(event) => handleChange("date_debut", event.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
        />
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
        Fin
        <input
          type="date"
          value={draft.date_fin}
          onChange={(event) => handleChange("date_fin", event.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400"
        />
      </label>

      {isDirty && (
        <>
          <button
            type="button"
            onClick={handleSave}
            disabled={hasInvalidRange || isSavingDates}
            title="Enregistrer les dates"
            className="inline-flex h-8 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSavingDates}
            title="Annuler"
            className="inline-flex h-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={14} />
          </button>
        </>
      )}

      {isSavingDates && (
        <span className="pb-2 text-[11px] font-semibold text-indigo-600">
          Enregistrement...
        </span>
      )}

      {hasInvalidRange && (
        <span className="basis-full text-[11px] font-semibold text-red-600">
          La date de fin doit etre apres la date de debut.
        </span>
      )}
    </div>
  );
};

const GammeRow = ({
  gamme,
  isPPL,
  canEditDates,
  isDownloadingKPI,
  isDownloadingExcel,
  isSavingDates,
  getGammeName,
  onDownloadKPI,
  onDownloadModifiedExcel,
  onUpdateGammeDates,
  onOpenComments,
  onNavigate,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-start gap-3 min-w-0">
      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
        <BsFileEarmarkSpreadsheetFill size={18} />
      </div>

      <div className="min-w-0">
        <h3
          onClick={() => onNavigate(`/visualiser/${gamme.id}`)}
          className="font-bold text-blue-700 hover:underline cursor-pointer truncate"
        >
          {getGammeName(gamme)}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
          <span>
            Type :{" "}
            <b>{gamme.type_procedure || gamme.type_procedure_nom || "—"}</b>
          </span>

          <span>
            Fonction :{" "}
            <b>{gamme.fonction || gamme.fonction_gamme_nom || "—"}</b>
          </span>

          <span>
            Véhicule : <b>{gamme.vehicule?.cmq || gamme.vehicule_nom || "—"}</b>
          </span>

          <span>
            Jours : <b>{gamme.nombre_jours || "—"}</b>
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
          <span>Pistes : {gamme.pistes || "—"}</span>

          <span>Boîtiers : {gamme.boitiers || "—"}</span>
        </div>

        <GammeDatesEditor
          gamme={gamme}
          canEditDates={canEditDates}
          isSavingDates={isSavingDates}
          onUpdateGammeDates={onUpdateGammeDates}
        />
      </div>
    </div>

    <div className="flex items-center gap-2 flex-wrap justify-end">
      <button
        type="button"
        onClick={() => onDownloadKPI(gamme)}
        disabled={isDownloadingKPI}
        className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        {isDownloadingKPI ? "Génération..." : "KPI"}
      </button>

      <button
        type="button"
        onClick={() => onDownloadModifiedExcel(gamme)}
        disabled={isDownloadingExcel}
        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Download size={16} />
        {isDownloadingExcel ? "Generation..." : "Excel modifie"}
      </button>

      <button
        type="button"
        onClick={() => onNavigate(`/validation/${gamme.id}`)}
        className="px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 text-xs font-bold flex items-center gap-1"
      >
        <BsCheckCircleFill />
        Validation
      </button>

      {!isPPL && (
        <>
          <button
            type="button"
            onClick={() =>
              onOpenComments({
                gammeId: gamme.id,
                gammeName: gamme.nom_gamme,
                type: "BESOINS",
                title: "Commentaires besoins techniques",
              })
            }
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors"
          >
            Besoins techniques
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenComments({
                gammeId: gamme.id,
                gammeName: gamme.nom_gamme,
                type: "PISTES",
                title: "Commentaires pistes",
              })
            }
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-semibold hover:bg-yellow-200 transition-colors"
          >
            Les pistes
          </button>
        </>
      )}
    </div>
  </div>
);

export const CommentsModal = ({ commentModal, onClose }) => {
  if (!commentModal.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl relative shadow-xl overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 text-slate-400 hover:text-slate-700 z-10"
          title="Fermer"
        >
          <X size={22} />
        </button>

        <div className="p-5">
          <CommentairesSection
            gammeId={commentModal.gammeId}
            gammeName={commentModal.gammeName}
            mode="general"
            type={commentModal.type}
            title={commentModal.title}
          />
        </div>
      </div>
    </div>
  );
};

export const SyntheseModal = ({ syntheseModal, onClose }) => {
  if (!syntheseModal.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-red-50">
          <h3 className="text-sm font-bold text-red-700">
            Rapport KPI indisponible
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
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};
