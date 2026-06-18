import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Search,
} from "lucide-react";

const COTATION_LABELS = {
  A_coter: "À coter",
  OK: "OK",
  NOK: "NOK",
  NOK_mineur: "NOK Mineur",
  Non_coté: "Non coté",
};

const ValidationReportView = ({
  gammeName,
  gammeId,
  globalStats,
  filteredReport,
  search,
  setSearch,
  filterCotation,
  setFilterCotation,
  onRefresh,
  getCotationBadgeClass,
  getEtatBadgeClass,
}) => {
  return (
    <>
      <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <span className="font-bold text-slate-700">
          {gammeName || `Gamme ${gammeId}`}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-4 py-2 rounded-full border text-xs font-bold ${getEtatBadgeClass(
              globalStats.gammeStatus
            )}`}
          >
            Gamme : {globalStats.gammeStatus}
          </span>

          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
          >
            Actualiser
          </button>
        </div>
      </div>

      <ValidationKpiGrid globalStats={globalStats} />

      <ValidationReportFilters
        search={search}
        setSearch={setSearch}
        filterCotation={filterCotation}
        setFilterCotation={setFilterCotation}
      />

      {filteredReport.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-slate-400 text-sm">
            Aucun résultat ne correspond aux filtres sélectionnés.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredReport.map((ev) => (
            <EVReportCard
              key={ev.evCode}
              ev={ev}
              getCotationBadgeClass={getCotationBadgeClass}
              getEtatBadgeClass={getEtatBadgeClass}
            />
          ))}
        </div>
      )}
    </>
  );
};

const ValidationKpiGrid = ({ globalStats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
    <KpiCard
      title="EV total"
      value={globalStats.totalEV}
      icon={<FileText size={18} />}
      color="slate"
    />

    <KpiCard
      title="EV completed"
      value={globalStats.completedEV}
      icon={<CheckCircle2 size={18} />}
      color="emerald"
    />

    <KpiCard
      title="EV in progress"
      value={globalStats.inProgressEV}
      icon={<Clock size={18} />}
      color="amber"
    />

    <KpiCard
      title="Steps completed"
      value={`${globalStats.completedSteps}/${globalStats.totalSteps}`}
      icon={<CheckCircle2 size={18} />}
      color="blue"
    />

    <KpiCard
      title="Steps à coter"
      value={globalStats.notChangedSteps}
      icon={<AlertTriangle size={18} />}
      color="red"
    />
  </div>
);

const ValidationReportFilters = ({
  search,
  setSearch,
  filterCotation,
  setFilterCotation,
}) => (
  <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col lg:flex-row gap-3">
    <div className="relative flex-1">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un step..."
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>

    <select
      value={filterCotation}
      onChange={(e) => setFilterCotation(e.target.value)}
      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-300"
    >
      <option value="ALL">Toutes les cotations</option>
      <option value="A_coter">À coter</option>
      <option value="OK">OK</option>
      <option value="NOK_mineur">NOK Mineur</option>
      <option value="NOK">NOK</option>
      <option value="Non_coté">Non coté</option>
    </select>
  </div>
);

const KpiCard = ({ title, value, icon, color }) => {
  const colors = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        colors[color] || colors.slate
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wide">{title}</p>

        <div>{icon}</div>
      </div>

      <p className="text-2xl font-black mt-2">{value}</p>
    </div>
  );
};

const EVReportCard = ({ ev, getCotationBadgeClass, getEtatBadgeClass }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800">{ev.evCode}</h2>

          <p className="text-xs text-slate-500 mt-1">
            {ev.counts.completed}/{ev.counts.total} step(s) completed
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1 rounded-full border text-xs font-bold ${getEtatBadgeClass(
              ev.evStatus
            )}`}
          >
            {ev.evStatus}
          </span>

          <span
            className={`px-3 py-1 rounded-full border text-xs font-bold ${getCotationBadgeClass(
              ev.evResult
            )}`}
          >
            Résultat : {ev.evResult}
          </span>
        </div>
      </div>

      <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap gap-2">
        <CountBadge label="OK" value={ev.counts.OK} color="emerald" />
        <CountBadge label="NOK" value={ev.counts.NOK} color="red" />
        <CountBadge label="NOK mineur" value={ev.counts.NOK_mineur} color="amber" />
        <CountBadge label="Non coté" value={ev.counts.Non_coté} color="slate" />
        <CountBadge label="À coter" value={ev.counts.A_coter} color="yellow" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="px-4 py-2 text-left">Step</th>
              <th className="px-4 py-2 text-left">Cotation</th>
              <th className="px-4 py-2 text-left">État</th>
              <th className="px-4 py-2 text-left">Commentaire</th>
              <th className="px-4 py-2 text-left">Observation</th>
            </tr>
          </thead>

          <tbody>
            {ev.steps.map((step) => (
              <tr
                key={step.stepCode}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-2 font-mono text-slate-700">
                  {step.stepCode}
                </td>

                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded border text-[10px] font-bold ${getCotationBadgeClass(
                      step.cotation
                    )}`}
                  >
                    {COTATION_LABELS[step.cotation] || step.cotation}
                  </span>
                </td>

                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded border text-[10px] font-bold ${getEtatBadgeClass(
                      step.etat
                    )}`}
                  >
                    {step.etat}
                  </span>
                </td>

                <td className="px-4 py-2 text-slate-600 max-w-[320px]">
                  {step.commentaire ? (
                    <span className="line-clamp-2">{step.commentaire}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                <td className="px-4 py-2 text-slate-500">
                  {step.isNotChanged
                    ? "Cotation non encore modifiée"
                    : "Cotation renseignée"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ev.notChangedSteps.length > 0 && (
        <div className="px-5 py-3 bg-yellow-50 border-t border-yellow-100">
          <p className="text-xs font-bold text-yellow-700 mb-2">
            Steps non encore cotés :
          </p>

          <div className="flex flex-wrap gap-2">
            {ev.notChangedSteps.map((step) => (
              <span
                key={step.stepCode}
                className="px-2 py-1 rounded-md bg-white border border-yellow-200 text-yellow-700 text-xs font-mono"
              >
                {step.stepCode}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CountBadge = ({ label, value, color }) => {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-bold ${
        colors[color] || colors.slate
      }`}
    >
      {label} : {value}
    </span>
  );
};

export default ValidationReportView;
