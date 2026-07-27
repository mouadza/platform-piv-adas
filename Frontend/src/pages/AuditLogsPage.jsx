import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { auditAPI } from "../api";

const ACTION_LABELS = {
  GAMMES_IMPORTED: "Gammes importees",
  GAMME_CREATED: "Gamme creee",
  GAMME_UPDATED: "Gamme modifiee",
  GAMME_DELETED: "Gamme supprimee",
  GAMME_STATUS_UPDATED: "Statut gamme modifie",
  GAMMES_REORDERED: "Ordre gammes modifie",
  GAMME_EXPORTED: "Export Excel gamme",
  STEP_VALIDATION_CREATED: "Cotation validee",
  GLOBAL_EV_COMMENT_CREATED: "Commentaire EV ajoute",
  GLOBAL_EV_COMMENT_UPDATED: "Commentaire EV modifie",
  GLOBAL_EV_COMMENT_DELETED: "Commentaire EV supprime",
  GAMME_GENERAL_COMMENT_CREATED: "Commentaire gamme ajoute",
  GAMME_GENERAL_COMMENT_UPDATED: "Commentaire gamme modifie",
  GAMME_GENERAL_COMMENT_DELETED: "Commentaire gamme supprime",
  MEASURED_RESULT_COMMENT_CREATED: "Commentaire resultat ajoute",
  MEASURED_RESULT_COMMENT_UPDATED: "Commentaire resultat modifie",
  MEASURED_RESULT_COMMENT_DELETED: "Commentaire resultat supprime",
};

const ACTION_GROUPS = [
  { value: "", label: "Toutes les actions" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

const ENTITY_TYPES = [
  { value: "", label: "Toutes les entites" },
  { value: "user", label: "Utilisateurs" },
  { value: "project", label: "Projets" },
  { value: "gamme", label: "Gammes" },
  { value: "step_validation", label: "Cotations" },
  { value: "global_ev_comment", label: "Commentaires EV" },
  { value: "gamme_general_comment", label: "Commentaires gamme" },
  { value: "measured_result_comment", label: "Commentaires resultat" },
];

const getActionLabel = (action) => ACTION_LABELS[action] || action;

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const stringifyMetadata = (metadata = {}) => {
  const entries = Object.entries(metadata || {});
  if (!entries.length) return "-";

  return entries
    .slice(0, 4)
    .map(([key, value]) => {
      const safeValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${key}: ${safeValue}`;
    })
    .join(" | ");
};

const getProjectDisplay = (log) =>
  log.projet_nom ||
  (log.projet ? `Projet #${log.projet}` : null) ||
  (log.metadata?.projet_id ? `Projet #${log.metadata.projet_id}` : "-");

const getGammeDisplay = (log) =>
  log.gamme_nom ||
  log.metadata?.nom_gamme ||
  log.metadata?.gamme_nom ||
  "";

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [query, setQuery] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        limit: 200,
      };

      if (action) params.action = action;
      if (entityType) params.entity_type = entityType;

      const data = await auditAPI.list(params);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err?.message ||
          "Impossible de charger les traces d'audit. Verifiez la migration backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [action, entityType]);

  const filteredLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return logs;

    return logs.filter((log) => {
      const haystack = [
        log.action,
        getActionLabel(log.action),
        log.user_email,
        log.username,
        log.entity_type,
        log.entity_id,
        log.projet_nom,
        log.gamme_nom,
        log.projet,
        log.gamme,
        log.metadata?.projet_id,
        log.metadata?.gamme_id,
        log.ip_address,
        stringifyMetadata(log.metadata),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [logs, query]);

  const exportCsv = () => {
    const headers = [
      "Date",
      "Action",
      "Utilisateur",
      "Entite",
      "ID Entite",
      "Projet",
      "Gamme",
      "IP",
      "Details",
    ];

    const rows = filteredLogs.map((log) => [
      formatDate(log.created_at),
      getActionLabel(log.action),
      log.user_email || log.username || "-",
      log.entity_type || "-",
      log.entity_id || "-",
      getProjectDisplay(log),
      getGammeDisplay(log) || "-",
      log.ip_address || "-",
      stringifyMetadata(log.metadata),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-[#243782]/10 px-3 py-1 text-xs font-bold text-[#243782]">
              <ShieldCheck size={15} />
              Journal de securite
            </div>
            <h2 className="text-2xl font-extrabold text-slate-950">
              Audit logs
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Suivi des actions sensibles realisees dans l'application.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Actualiser
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#243782] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#00133B] disabled:opacity-60"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_220px]">
          <label className="relative block">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par utilisateur, action, gamme, IP..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-[#243782]/15"
            />
          </label>

          <label className="relative block">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-[#243782]/15"
            >
              {ACTION_GROUPS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-[#243782]/15"
          >
            {ENTITY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Activity size={17} className="text-[#243782]" />
              {filteredLogs.length} trace(s)
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-14 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock size={28} className="mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">
                Aucune trace trouvee
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Changez les filtres ou effectuez une action auditee.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#00133B] text-xs uppercase text-white">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      Action
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      Utilisateur
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      Objet
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      Projet / Gamme
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      IP
                    </th>
                    <th className="px-4 py-3 text-left font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-md bg-[#243782]/10 px-2 py-1 text-xs font-bold text-[#243782]">
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-700">
                          <UserRound size={15} className="text-slate-400" />
                          <span className="font-semibold">
                            {log.user_email || log.username || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {log.entity_type || "-"}
                        {log.entity_id ? (
                          <span className="ml-1 text-slate-400">
                            #{log.entity_id}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        <div className="font-semibold text-slate-700">
                          {getProjectDisplay(log)}
                        </div>
                        {getGammeDisplay(log) && (
                          <div className="text-xs text-slate-400">
                            {getGammeDisplay(log)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                        {log.ip_address || "-"}
                      </td>
                      <td className="max-w-[420px] px-4 py-3 text-xs text-slate-500">
                        <span className="line-clamp-2">
                          {stringifyMetadata(log.metadata)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogsPage;


