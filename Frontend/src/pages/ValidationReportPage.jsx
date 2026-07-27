import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import ValidationReportView from "../components/validationReport/ValidationReportView";
import { gammesAPI, validationsAPI } from "../api/index";

const COMMENT_FIELDS = [
  "Commentaire Résultats",
  "Commentaires Résultats",
  "Commentaire (Résultats)",
  "Commentaires (Résultats)",
];

const ValidationReportPage = () => {
  const { gammeId } = useParams();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("role") || "user";

  const [blocs, setBlocs] = useState([]);
  const [gammeName, setGammeName] = useState("");
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCotation, setFilterCotation] = useState("ALL");

  const getEVCodeFromBloc = (bloc) => {
    if (!bloc?.ev_row || bloc.ev_row.length === 0) return null;
    const firstValue = bloc.ev_row.find((cell) => cell.value)?.value;
    return firstValue || null;
  };

  const getStepCodeFromRow = (row) => {
    const stepCodeCell = row.cells?.find(
      (cell) => cell.field === "Nom (Steps)"
    );
    return stepCodeCell?.value || null;
  };

  const hasCotationSelect = (row) =>
    row.cells?.some(
      (cell) => cell.field === "Cotation (Résultats)" && cell.type === "select"
    );

  const getRowCotation = (row) => {
    const cotationCell = row.cells?.find(
      (cell) => cell.field === "Cotation (Résultats)"
    );
    return cotationCell?.value || "A_coter";
  };

  const isFinalCotation = (cotation) =>
    ["OK", "NOK", "NOK_mineur", "Non_coté"].includes(cotation);

  const computeEVResult = (cotations) => {
    if (!cotations.length) return "IN_PROGRESS";
    if (cotations.some((cotation) => !cotation || cotation === "A_coter")) {
      return "IN_PROGRESS";
    }
    if (cotations.includes("NOK")) return "NOK";
    if (cotations.includes("NOK_mineur")) return "NOK_mineur";
    if (cotations.every((cotation) => ["OK", "Non_coté"].includes(cotation))) {
      return "OK";
    }
    return "IN_PROGRESS";
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError("");

      const [parseData, gammeDetail] = await Promise.all([
        gammesAPI.parse(gammeId),
        gammesAPI.detail(gammeId),
      ]);

      setGammeName(gammeDetail?.nom_gamme || `Gamme ${gammeId}`);

      const latestValidations =
        await validationsAPI.getLatestGammeStepValidations(gammeId);
      const latestMap = new Map();

      latestValidations.forEach((item) => {
        latestMap.set(`${item.ev_code}__${item.step_code}`, item);
      });

      const updatedBlocs = parseData.blocs.map((bloc) => {
        const evCode = getEVCodeFromBloc(bloc);

        return {
          ...bloc,
          rows: bloc.rows.map((row) => {
            const stepCode = getStepCodeFromRow(row);
            if (!stepCode) return row;

            const latest = latestMap.get(`${evCode}__${stepCode}`);
            if (!latest) return row;

            return {
              ...row,
              cells: row.cells.map((cell) => {
                if (cell.field === "Cotation (Résultats)") {
                  return {
                    ...cell,
                    value: latest.cotation,
                    commentaire: latest.commentaire || "",
                  };
                }

                if (COMMENT_FIELDS.includes(cell.field)) {
                  return { ...cell, value: latest.commentaire || "" };
                }

                return cell;
              }),
            };
          }),
        };
      });

      setBlocs(updatedBlocs);
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement du rapport de validation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [gammeId]);

  const getCotationBadgeClass = (cotation) => {
    switch (cotation) {
      case "OK":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "NOK":
        return "bg-red-100 text-red-700 border-red-300";
      case "NOK_mineur":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "Non_coté":
        return "bg-slate-100 text-slate-600 border-slate-300";
      case "IN_PROGRESS":
      case "A_coter":
      default:
        return "bg-slate-950 text-white border-slate-950";
    }
  };

  const getEtatBadgeClass = (etat) => {
    switch (etat) {
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "IN_PROGRESS":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  const report = useMemo(
    () =>
      blocs.map((bloc) => {
        const evCode = getEVCodeFromBloc(bloc) || "EV inconnu";
        const validableRows = bloc.rows.filter((row) => hasCotationSelect(row));

        const steps = validableRows.map((row) => {
          const stepCode = getStepCodeFromRow(row) || "-";
          const cotation = getRowCotation(row);
          const etat = isFinalCotation(cotation) ? "COMPLETED" : "IN_PROGRESS";
          const commentaire =
            row.cells?.find((cell) => COMMENT_FIELDS.includes(cell.field))
              ?.value || "";

          return {
            stepCode,
            cotation,
            etat,
            commentaire,
            isNotChanged: !cotation || cotation === "A_coter",
          };
        });

        const counts = {
          total: steps.length,
          OK: steps.filter((step) => step.cotation === "OK").length,
          NOK: steps.filter((step) => step.cotation === "NOK").length,
          NOK_mineur: steps.filter((step) => step.cotation === "NOK_mineur")
            .length,
          Non_cote: steps.filter((step) =>
            String(step.cotation || "").startsWith("Non_cot")
          ).length,
          A_coter: steps.filter((step) => step.cotation === "A_coter").length,
          completed: steps.filter((step) => step.etat === "COMPLETED").length,
          inProgress: steps.filter((step) => step.etat === "IN_PROGRESS").length,
        };

        return {
          evCode,
          steps,
          counts,
          evResult: computeEVResult(steps.map((step) => step.cotation)),
          evStatus:
            steps.length > 0 && counts.inProgress === 0
              ? "COMPLETED"
              : "IN_PROGRESS",
          notChangedSteps: steps.filter((step) => step.isNotChanged),
        };
      }),
    [blocs]
  );

  const filteredReport = useMemo(
    () =>
      report
        .map((ev) => ({
          ...ev,
          steps: ev.steps.filter((step) => {
            const matchSearch =
              !search.trim() ||
              step.stepCode.toLowerCase().includes(search.toLowerCase());
            const matchCotation =
              filterCotation === "ALL" || step.cotation === filterCotation;
            return matchSearch && matchCotation;
          }),
        }))
        .filter((ev) => ev.steps.length > 0),
    [report, search, filterCotation]
  );

  const globalStats = useMemo(() => {
    const totalEV = report.length;
    const completedEV = report.filter((ev) => ev.evStatus === "COMPLETED").length;
    const inProgressEV = report.filter(
      (ev) => ev.evStatus === "IN_PROGRESS"
    ).length;
    const totalSteps = report.reduce((acc, ev) => acc + ev.counts.total, 0);
    const completedSteps = report.reduce(
      (acc, ev) => acc + ev.counts.completed,
      0
    );
    const notChangedSteps = report.reduce(
      (acc, ev) => acc + ev.counts.A_coter,
      0
    );

    return {
      totalEV,
      completedEV,
      inProgressEV,
      totalSteps,
      completedSteps,
      notChangedSteps,
      gammeStatus:
        totalEV > 0 && completedEV === totalEV ? "COMPLETED" : "IN_PROGRESS",
    };
  }, [report]);

  return (
    <DashboardLayout role={userRole}>
      <div className="space-y-5">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft size={16} />
          Retour
        </button>

        <section className="app-panel text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Validation
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Rapport temps reel de validation
          </h1>
        </section>

        {loading && (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
            <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <ValidationReportView
            gammeName={gammeName}
            gammeId={gammeId}
            globalStats={globalStats}
            filteredReport={filteredReport}
            search={search}
            setSearch={setSearch}
            filterCotation={filterCotation}
            setFilterCotation={setFilterCotation}
            onRefresh={loadReportData}
            getCotationBadgeClass={getCotationBadgeClass}
            getEtatBadgeClass={getEtatBadgeClass}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ValidationReportPage;
