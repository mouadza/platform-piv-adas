import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  FolderOpen,
  Map,
  MessageSquareText,
  RotateCcw,
  Save,
  SearchX,
  Sparkles,
  X,
} from "lucide-react";

import CommentairesSection from "../CommentairesSection";

const actionButtonBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold shadow-sm ring-1 ring-inset transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:px-4";

const actionButtonStyles = {
  primary:
    "bg-[#243782] text-white ring-[#243782]/20 hover:bg-[#00133B] hover:ring-[#243782]/30",
  secondary:
    "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:text-slate-950 hover:ring-slate-300",
  success:
    "bg-emerald-600 text-white ring-emerald-500/20 hover:bg-emerald-700 hover:ring-emerald-400",
  info: "bg-[#243782]/10 text-[#243782] ring-[#243782]/15 hover:bg-[#243782]/15 hover:ring-[#243782]/25",
  warning:
    "bg-amber-50 text-amber-800 ring-amber-100 hover:bg-amber-100 hover:ring-amber-200",
};

const ActionButton = ({
  children,
  icon: Icon,
  tone = "secondary",
  className = "",
  ...props
}) => (
  <button
    type="button"
    className={`${actionButtonBase} ${
      actionButtonStyles[tone] || actionButtonStyles.secondary
    } ${className}`}
    {...props}
  >
    {Icon && <Icon size={16} aria-hidden="true" />}
    <span>{children}</span>
  </button>
);

const SkeletonBlock = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
  />
);

export const ProjectListSkeleton = () => (
  <div className="space-y-4">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-4 w-2/3 max-w-sm" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
          <SkeletonBlock className="hidden h-8 w-28 sm:block" />
        </div>
      </div>
    ))}
  </div>
);

const GammeRowsSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <SkeletonBlock className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-3">
              <SkeletonBlock className="h-4 w-64 max-w-full" />
              <SkeletonBlock className="h-3 w-full max-w-xl" />
              <SkeletonBlock className="h-3 w-2/3 max-w-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <SkeletonBlock className="h-10 w-full sm:w-24" />
            <SkeletonBlock className="h-10 w-full sm:w-32" />
            <SkeletonBlock className="h-10 w-full sm:w-28" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const EmptyProjectsIllustration = () => (
  <div className="relative flex h-24 w-24 items-center justify-center">
    <div className="absolute inset-0 rounded-full bg-[#243782]/10" />
    <div className="absolute left-4 top-5 h-14 w-16 rounded-lg border border-[#243782]/25 bg-white shadow-sm" />
    <FolderOpen className="relative text-[#243782]" size={42} strokeWidth={1.7} />
    <Sparkles className="absolute right-3 top-3 text-amber-400" size={18} />
  </div>
);

const EmptyGammesState = () => (
  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
      <SearchX className="text-slate-400" size={34} strokeWidth={1.7} />
    </div>
    <p className="text-sm font-bold text-slate-700">
      Aucune gamme creee pour ce projet.
    </p>
    <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
      Les gammes importees ou creees apparaitront ici avec leurs exports,
      dates et actions de validation.
    </p>
  </div>
);

const getGammeStatus = (gamme = {}) =>
  gamme.cotation_status ||
  gamme.status_cotation ||
  gamme.resultat_validation ||
  gamme.resultat ||
  "A_coter";

const statusPillStyles = {
  OK: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  NOK: "bg-red-100 text-red-800 ring-red-200",
  NOK_mineur: "bg-orange-100 text-orange-800 ring-orange-200",
  Non_cote: "bg-gray-100 text-gray-700 ring-gray-200",
  "Non_cot\u00c3\u0192\u00c2\u00a9": "bg-gray-100 text-gray-700 ring-gray-200",
  A_coter: "bg-slate-950 text-white ring-slate-950",
  A_traiter: "bg-slate-950 text-white ring-slate-950",
  IN_PROGRESS: "bg-slate-950 text-white ring-slate-950",
};

const statusLabels = {
  OK: "OK",
  NOK: "NOK",
  NOK_mineur: "NOK Mineur",
  Non_cote: "Non cote",
  "Non_cot\u00c3\u0192\u00c2\u00a9": "Non cote",
  A_coter: "A coter",
  A_traiter: "A coter",
  IN_PROGRESS: "A coter",
};

const GammeStatusPill = ({ gamme }) => {
  const status = getGammeStatus(gamme);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${
        statusPillStyles[status] || statusPillStyles.A_coter
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
};

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
  <div className="space-y-4 sm:space-y-5">
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
  <div className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-xl motion-safe:hover:shadow-slate-200/70">
    <button
      type="button"
      onClick={() => onToggleProject(projet.id)}
      className="flex w-full flex-col gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"
    >
      <div className="flex min-w-0 items-start gap-4 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#243782]/10 text-[#243782] ring-1 ring-[#243782]/15 transition-transform duration-300 group-hover:scale-105">
          <FolderOpen size={21} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
            {getProjectName(projet)}
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-400">
            ID Projet : {projet.id}
          </p>

          {getRoleBadge?.(projet) && (
            <span className="mt-2 inline-flex rounded-full bg-[#243782]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#243782]">
              {getRoleBadge(projet)}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
          {gammesLoaded ? `${gammes.length} gamme(s)` : "Afficher les gammes"}
        </span>

        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-transform duration-300 group-hover:border-[#243782]/25 group-hover:text-[#243782]">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
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
  <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6 sm:py-5">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Gammes du projet
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">
          Planification, validation, commentaires et exports.
        </p>
      </div>
      <ActionButton
        onClick={() => onDownloadProjectKPI(projet)}
        disabled={downloadingProjectKPI?.[projet.id]}
        icon={Download}
        tone="primary"
        className="w-full sm:w-auto"
      >
        {downloadingProjectKPI?.[projet.id] ? "Preparation..." : "KPI Projet"}
      </ActionButton>
    </div>

    {isLoadingGammes && <GammeRowsSkeleton />}

    {!isLoadingGammes && gammes.length === 0 && (
      <EmptyGammesState />
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
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
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
    <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="flex min-w-[132px] flex-1 flex-col gap-1 text-[11px] font-semibold text-slate-500 sm:flex-none">
        Debut
        <input
          type="date"
          value={draft.date_debut}
          onChange={(event) => handleChange("date_debut", event.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-[#243782]/15"
        />
      </label>

      <label className="flex min-w-[132px] flex-1 flex-col gap-1 text-[11px] font-semibold text-slate-500 sm:flex-none">
        Fin
        <input
          type="date"
          value={draft.date_fin}
          onChange={(event) => handleChange("date_fin", event.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-[#243782]/15"
        />
      </label>

      {isDirty && (
        <>
          <ActionButton
            onClick={handleSave}
            disabled={hasInvalidRange || isSavingDates}
            title="Enregistrer les dates"
            icon={Save}
            tone="primary"
            className="min-h-9 px-3 py-2"
          >
            Sauver
          </ActionButton>

          <ActionButton
            onClick={handleReset}
            disabled={isSavingDates}
            title="Annuler"
            icon={RotateCcw}
            tone="secondary"
            className="min-h-9 px-3 py-2"
          >
            Reset
          </ActionButton>
        </>
      )}

      {isSavingDates && (
        <span className="pb-2 text-[11px] font-semibold text-[#243782]">
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
  <div className="group/row flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#243782]/25 motion-safe:hover:shadow-lg sm:p-5 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition-transform duration-300 group-hover/row:scale-105">
        <FileSpreadsheet size={18} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            onClick={() => onNavigate(`/visualiser/${gamme.id}`)}
            className="inline-flex max-w-full cursor-pointer items-center gap-2 truncate text-sm font-bold text-[#243782] transition-colors hover:text-[#00133B] sm:text-base"
          >
            <Eye size={15} className="shrink-0" />
            {getGammeName(gamme)}
          </h3>
          <GammeStatusPill gamme={gamme} />
        </div>

        <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
          <span>
            Type :{" "}
            <b>{gamme.type_procedure || gamme.type_procedure_nom || "-"}</b>
          </span>

          <span>
            Fonction :{" "}
            <b>{gamme.fonction || gamme.fonction_gamme_nom || "-"}</b>
          </span>

          <span>
            Vehicule : <b>{gamme.vehicule?.cmq || gamme.vehicule_nom || "-"}</b>
          </span>

          <span>
            Jours : <b>{gamme.nombre_jours || "-"}</b>
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
          <span>Pistes : {gamme.pistes || "-"}</span>

          <span>Boitiers : {gamme.boitiers || "-"}</span>
        </div>

        <GammeDatesEditor
          gamme={gamme}
          canEditDates={canEditDates}
          isSavingDates={isSavingDates}
          onUpdateGammeDates={onUpdateGammeDates}
        />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
      <ActionButton
        onClick={() => onDownloadKPI(gamme)}
        disabled={isDownloadingKPI}
        icon={Download}
        tone="primary"
      >
        {isDownloadingKPI ? "Preparation..." : "KPI"}
      </ActionButton>

      <ActionButton
        onClick={() => onDownloadModifiedExcel(gamme)}
        disabled={isDownloadingExcel}
        icon={FileDown}
        tone="secondary"
      >
        {isDownloadingExcel ? "Generation..." : "Excel modifie"}
      </ActionButton>

      <ActionButton
        onClick={() => onNavigate(`/validation/${gamme.id}`)}
        icon={CheckCircle2}
        tone="success"
      >
        Validation
      </ActionButton>

      {!isPPL && (
        <>
          <ActionButton
            onClick={() =>
              onOpenComments({
                gammeId: gamme.id,
                gammeName: gamme.nom_gamme,
                type: "BESOINS",
                title: "Commentaires besoins techniques",
              })
            }
            icon={MessageSquareText}
            tone="info"
          >
            Besoins techniques
          </ActionButton>

          <ActionButton
            onClick={() =>
              onOpenComments({
                gammeId: gamme.id,
                gammeName: gamme.nom_gamme,
                type: "PISTES",
                title: "Commentaires pistes",
              })
            }
            icon={Map}
            tone="warning"
          >
            Les pistes
          </ActionButton>
        </>
      )}
    </div>
  </div>
);

export const CommentsModal = ({ commentModal, onClose }) => {
  if (!commentModal.isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet relative sm:max-w-2xl">
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

const formatKpiPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const getAdvancementPercent = (summary = {}) => {
  const total = Number(summary.total || 0);
  const validated =
    summary.validated ?? total - Number(summary.aCoter || 0);

  if (!total) return 0;

  return Number(((Number(validated || 0) / total) * 100).toFixed(1));
};

const kpiRowStyles = {
  ok: "bg-emerald-100 text-emerald-800",
  nok: "bg-red-100 text-red-700",
  minor: "bg-orange-100 text-amber-800",
  progress: "bg-[#243782]/15 text-blue-800",
  neutral: "bg-slate-200 text-slate-700",
  pending: "bg-slate-950 text-white",
};

const KpiSummaryTable = ({ title, rows, firstColumnLabel, total }) => (
  <div className="overflow-hidden border border-slate-300 bg-white">
    <div className="bg-[#5b9bd5] px-3 py-1.5 text-center text-sm font-bold text-white">
      {title}
    </div>
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="bg-[#333333] text-white">
          <th className="border border-slate-300 px-3 py-1.5 text-center font-bold">
            {firstColumnLabel ||
              (title === "Resultat EV" ? "Resultat EV" : "Cotation")}
          </th>
          <th className="border border-slate-300 px-3 py-1.5 text-center font-bold">
            Nombre
          </th>
          <th className="border border-slate-300 px-3 py-1.5 text-center font-bold">
            Pourcentage
          </th>
          <th className="border border-slate-300 px-3 py-1.5 text-center font-bold">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.label}>
            <td
              className={`border border-slate-300 px-3 py-1 text-center font-bold ${
                kpiRowStyles[row.tone]
              }`}
            >
              {row.label}
            </td>
            <td className="border border-slate-300 px-3 py-1 text-right">
              {row.count}
            </td>
            <td className="border border-slate-300 px-3 py-1">
              {formatKpiPercent(row.percent)}
            </td>
            {index === 0 && (
              <td
                rowSpan={rows.length}
                className="border border-slate-300 px-3 py-1 text-center align-middle text-lg font-semibold text-slate-900"
              >
                {total ?? 0}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const buildEvResultRows = (evResultSummary = {}) => [
  {
    label: "OK",
    count: evResultSummary.OK || 0,
    percent: evResultSummary.okPercent,
    tone: "ok",
  },
  {
    label: "NOK",
    count: evResultSummary.NOK || 0,
    percent: evResultSummary.nokPercent,
    tone: "nok",
  },
  {
    label: "NOK Mineur",
    count: evResultSummary.NOK_mineur || 0,
    percent: evResultSummary.minorPercent,
    tone: "minor",
  },
  {
    label: "En cours",
    count: evResultSummary.IN_PROGRESS || 0,
    percent: evResultSummary.inProgressPercent,
    tone: "progress",
  },
];

const buildCotationRows = (summary = {}) => [
  {
    label: "OK",
    count: summary.ok || 0,
    percent: summary.okPercent,
    tone: "ok",
  },
  {
    label: "NOK",
    count: summary.nok || 0,
    percent: summary.nokPercent,
    tone: "nok",
  },
  {
    label: "NOK Mineur",
    count: summary.minor || 0,
    percent: summary.minorPercent,
    tone: "minor",
  },
  {
    label: "Non cote",
    count: summary.nonCote || 0,
    percent: summary.nonCotePercent,
    tone: "neutral",
  },
  {
    label: "A coter",
    count: summary.aCoter || 0,
    percent: summary.aCoterPercent,
    tone: "pending",
  },
];

const KpiProgressBar = ({ summary = {} }) => {
  const total = Number(summary.total || 0);
  const validated = summary.validated ?? total - Number(summary.aCoter || 0);
  const percent = getAdvancementPercent(summary);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-700">
          Avancement global
        </span>
        <span className="text-sm font-extrabold text-[#243782]">
          {formatKpiPercent(percent)}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#243782] transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      <div className="mt-2 text-right text-xs font-semibold text-slate-500">
        {validated} validees / {total} total
      </div>
    </div>
  );
};

export const GammeKpiModal = ({ modal, isExporting, onClose, onExport }) => {
  if (!modal.isOpen || !modal.data) return null;

  const { data } = modal;
  const summary = data.summary || {};
  const evResultSummary = data.evResultSummary || {};
  const gamme = data.gamme;
  const evResultRows = buildEvResultRows(evResultSummary);
  const cotationRows = buildCotationRows(summary);

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet flex flex-col bg-slate-50 sm:max-w-4xl">
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#243782]">
              KPI de la gamme
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-800 truncate">
              {data.gammeTitle}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Consultation avant export Excel
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <KpiProgressBar summary={summary} />
            <KpiSummaryTable
              title="Resultat EV"
              rows={evResultRows}
              total={evResultSummary.total}
            />
            <KpiSummaryTable
              title="Cotation"
              rows={cotationRows}
              total={summary.total}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <ActionButton
            onClick={onClose}
            icon={X}
            tone="secondary"
          >
            Fermer
          </ActionButton>
          <ActionButton
            onClick={() => onExport(gamme)}
            disabled={isExporting}
            icon={Download}
            tone="primary"
          >
            {isExporting ? "Export..." : "Exporter Excel"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

const ProjectExportProgress = ({ job }) => {
  if (!job) return null;

  const progress = Math.min(100, Math.max(0, Number(job.progress || 0)));
  const labels = {
    CREATING: "Demarrage de la preparation",
    PENDING: "Preparation en attente",
    STARTED: "Preparation Excel en cours",
    SUCCESS: "Fichier Excel pret",
    FAILURE: "Echec de la preparation",
  };
  const isFailure = job.status === "FAILURE";
  const isSuccess = job.status === "SUCCESS";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span
          className={`text-sm font-bold ${
            isFailure
              ? "text-red-700"
              : isSuccess
              ? "text-emerald-700"
              : "text-slate-700"
          }`}
        >
          {labels[job.status] || "Preparation de l'export"}
        </span>
        <span className="text-sm font-extrabold text-[#243782]">
          {progress}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFailure
              ? "bg-red-600"
              : isSuccess
              ? "bg-emerald-600"
              : "bg-[#243782]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ProjectKpiModal = ({
  modal,
  isExporting,
  exportJob,
  onClose,
  onExport,
}) => {
  if (!modal.isOpen || !modal.data) return null;

  const { data } = modal;
  const project = data.projet;
  const evResultRows = buildEvResultRows(data.evResultSummary);
  const cotationRows = buildCotationRows(data.summary);
  const isCreating = exportJob?.status === "CREATING";
  const isReady =
    exportJob?.status === "SUCCESS" && exportJob?.download_ready;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet flex flex-col bg-slate-50 sm:max-w-4xl">
        <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#243782]">
              KPI du projet
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-800 truncate">
              {data.projectName}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Consultation avant export Excel
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <ProjectExportProgress job={exportJob} />
            <KpiProgressBar summary={data.summary} />
            <KpiSummaryTable
              title={`Resultat EV global du projet - ${data.projectName}`}
              rows={evResultRows}
              firstColumnLabel="Resultat EV"
              total={data.evResultSummary?.total}
            />
            <KpiSummaryTable
              title={`Cotations globales du projet - ${data.projectName}`}
              rows={cotationRows}
              firstColumnLabel="Cotation"
              total={data.summary?.total}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <ActionButton
            onClick={onClose}
            icon={X}
            tone="secondary"
          >
            Fermer
          </ActionButton>
          <ActionButton
            onClick={() => onExport(project)}
            disabled={isExporting || isCreating}
            icon={Download}
            tone="primary"
          >
            {isExporting
              ? `Export ${Number(exportJob?.progress || 0)}%`
              : isCreating
              ? "Preparation..."
              : isReady
              ? "Telecharger Excel"
              : "Exporter Excel"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export const SyntheseModal = ({ syntheseModal, onClose }) => {
  if (!syntheseModal.isOpen) return null;

  const variants = {
    success: {
      header: "bg-emerald-50",
      title: "text-emerald-700",
      defaultTitle: "Export termine",
      button: "bg-emerald-700 hover:bg-emerald-800",
    },
    warning: {
      header: "bg-amber-50",
      title: "text-amber-700",
      defaultTitle: "Attention",
      button: "bg-amber-700 hover:bg-amber-800",
    },
    error: {
      header: "bg-red-50",
      title: "text-red-700",
      defaultTitle: "Erreur",
      button: "bg-slate-800 hover:bg-slate-900",
    },
    info: {
      header: "bg-slate-50",
      title: "text-slate-700",
      defaultTitle: "Information",
      button: "bg-slate-800 hover:bg-slate-900",
    },
  };
  const variant = variants[syntheseModal.type] || variants.info;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet sm:max-w-md">
        <div className={`px-6 py-5 border-b border-slate-100 ${variant.header}`}>
          <h3 className={`text-sm font-bold ${variant.title}`}>
            {syntheseModal.title || variant.defaultTitle}
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
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md ${variant.button}`}
          >
            <CheckCircle2 size={16} />
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};


