import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import BlocNavigation from "../components/BlocNavigation";
import DashboardLayout from "../components/DashboardLayout";
import BlocCardList from "../components/BlocCardList";
import CommentairesSection from "../components/CommentairesSection";
import { gammesAPI, validationsAPI } from "../api/index";
import { downloadModifiedGammeExcel } from "../utils/modifiedGammeExcelDownload";

const ValidationPage = () => {
  const { gammeId } = useParams();
  const navigate = useNavigate();
  const [gammeName, setGammeName] = useState("");
  const [gamme, setGamme] = useState(null);
  const [blocs, setBlocs] = useState([]);
  const [currentBlocIndex, setCurrentBlocIndex] = useState(0);
  const [colonnes, setColonnes] = useState([]);
  const [gammeValidee] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const userRole = localStorage.getItem("role");
  const canEditValidation = ["admin", "valideur"].includes(userRole);
  const isReadOnly = !canEditValidation || gammeValidee;

  const COMMENT_FIELDS = [
    "Commentaire Résultats",
    "Commentaires Résultats",
    "Commentaire (Résultats)",
    "Commentaires (Résultats)",
  ];
  const loadResults = async () => {
    try {
      const gammeDetail = await gammesAPI.detail(gammeId);

      setGammeName(
        gammeDetail?.nom_gamme ||
            `Gamme ${gammeId}`
        );
      setGamme(gammeDetail);
    } catch (error) {
      console.error("Erreur chargement résultats EV:", error);
    }
  };

const ETAT_FIELDS = ["ETAT", "Etat", "État"];

const isEtatField = (field) => ETAT_FIELDS.includes(field);

const isCotationField = (field) => String(field || "").startsWith("Cotation");

const isFinalCotation = (value) => {
  return ["OK", "NOK", "NOK_mineur", "Non_coté"].includes(value);
};

const hasCotationSelect = (row) => {
  return row.cells?.some(
    (cell) =>
      isCotationField(cell.field) &&
      cell.type === "select"
  );
};

const getRowCotation = (row) => {
  const cotationCell = row.cells?.find(
    (cell) => isCotationField(cell.field) && cell.type === "select"
  );

  return cotationCell?.value;
};

const computeEVResultFromRows = (rows = []) => {
  const cotations = rows
    .filter((row) => hasCotationSelect(row))
    .map((row) => normalizeCotation(getRowCotation(row)));

  if (
    cotations.length === 0 ||
    cotations.some((cotation) => !isFinalCotation(cotation))
  ) {
    return "IN_PROGRESS";
  }

  if (cotations.includes("NOK")) return "NOK";
  if (cotations.includes("NOK_mineur")) return "NOK_mineur";

  return "OK";
};

const updateBlocEtats = (bloc) => {
  if (!bloc) return bloc;

  const validableRows = bloc.rows.filter((row) => hasCotationSelect(row));

  const allValidableRowsCompleted =
    validableRows.length > 0 &&
    validableRows.every((row) =>
      isFinalCotation(normalizeCotation(getRowCotation(row)))
    );

  const evEtat = allValidableRowsCompleted ? "COMPLETED" : "IN PROGRESS";

  const updatedRows = bloc.rows.map((row) => {
    const isValidable = hasCotationSelect(row);
    const cotation = normalizeCotation(getRowCotation(row));

    let rowEtat = "IN PROGRESS";

    if (allValidableRowsCompleted) {
      rowEtat = "COMPLETED";
    }

    else if (isValidable && isFinalCotation(cotation)) {
      rowEtat = "COMPLETED";
    }

    return {
      ...row,
      cells: row.cells.map((cell) => {
        if (isEtatField(cell.field)) {
          return {
            ...cell,
            value: rowEtat,
          };
        }

        return cell;
      }),
    };
  });

  const updatedEvRow = bloc.ev_row?.map((cell) => {
    if (isEtatField(cell.field)) {
      return {
        ...cell,
        value: evEtat,
      };
    }

    return cell;
  });

  return {
    ...bloc,
    rows: updatedRows,
    ev_row: updatedEvRow || bloc.ev_row,
  };
};

  useEffect(() => {
    const fetchData = async () => {
      
    const data = await gammesAPI.parse(gammeId);

    const latestValidations =
      await validationsAPI.getLatestGammeStepValidations(gammeId);

    const latestMap = new Map();

    latestValidations.forEach((item) => {
      latestMap.set(`${item.ev_code}__${item.step_code}`, item);
    });


    const updatedBlocs = data.blocs.map((bloc) => {
      const evCode = getEVCodeFromBloc(bloc);

      const updatedBloc = {
        ...bloc,
        rows: bloc.rows.map((row) => {
          const stepCodeCell = row.cells.find(
            (cell) => cell.field === "Nom (Steps)"
          );

          const stepCode = stepCodeCell?.value;

          if (!stepCode) return row;

          const latest = latestMap.get(`${evCode}__${stepCode}`);

          if (!latest) return row;

          return {
            ...row,
            cells: row.cells.map((cell) => {
              if (isCotationField(cell.field)) {
                return {
                  ...cell,
                  value: latest.cotation,
                  commentaire: latest.commentaire || "",
                };
              }

              if (COMMENT_FIELDS.includes(cell.field)) {
                return {
                  ...cell,
                  value: latest.commentaire || "",
                };
              }

              return cell;
            }),
          };
        }),
      };

      return updateBlocEtats(updatedBloc);
    });

    setBlocs(updatedBlocs);
    setColonnes(data.colonnes);
    await loadResults();

    };
    

    fetchData();
  }, [gammeId]);

  
  const handleToggleChange = (rowIndex, field) => {
    if (!canEditValidation) return;

    const newBlocs = [...blocs];
    const bloc = newBlocs[currentBlocIndex];

    bloc.rows[rowIndex].cells = bloc.rows[rowIndex].cells.map((cell) => {
      if (cell.type === "checkbox") {
        if (cell.field === field) {
          return { ...cell, value: !cell.value };
        }

        return { ...cell, value: false };
      }

      return cell;
    });

    setBlocs(newBlocs);
  };

  const validateCurrentBlocBeforeNext = () => {
  const bloc = blocs[currentBlocIndex];

  if (!bloc) return false;

  const errors = [];

  bloc.rows.forEach((row, index) => {
    const cells = row.cells || [];

    const cotationCell = cells.find(
      (cell) =>
        isCotationField(cell.field) &&
        cell.type === "select"
    );

    // On valide seulement les lignes qui ont une vraie cotation
    if (!cotationCell) return;

    const stepCodeCell = cells.find(
      (cell) => cell.field === "Nom (Steps)"
    );

    const commentCell = cells.find((cell) =>
      COMMENT_FIELDS.includes(cell.field)
    );

    const stepCode = stepCodeCell?.value || `Ligne ${index + 1}`;
    const cotation = cotationCell.value;

    const commentaire = (
      cotationCell.commentaire ||
      commentCell?.value ||
      ""
    ).trim();

    if (!cotation || cotation === "A_coter") {
      errors.push(`${stepCode} : la cotation est obligatoire.`);
      return;
    }

    if (cotation !== "OK" && commentaire === "") {
      errors.push(`${stepCode} : le commentaire est obligatoire pour ${cotation}.`);
    }
  });

  return true;
};

const normalizeCotation = (cotation) => {
  if (cotation === "NOK Mineur") return "NOK_mineur";
  return cotation;
};

const getRowStatus = (row) => {
  const cotationCell = row.cells?.find(
    (cell) => isCotationField(cell.field) && cell.type === "select"
  );

  const cotation = normalizeCotation(cotationCell?.value);

  return isFinalCotation(cotation) ? "COMPLETED" : "IN_PROGRESS";
};

const getBlocStatus = (bloc) => {
  if (!bloc?.rows || bloc.rows.length === 0) {
    return "IN_PROGRESS";
  }

  const rowsWithCotation = bloc.rows.filter((row) => hasCotationSelect(row));

  if (rowsWithCotation.length === 0) {
    return "IN_PROGRESS";
  }

  const allRowsCompleted = rowsWithCotation.every(
    (row) => getRowStatus(row) === "COMPLETED"
  );

  return allRowsCompleted ? "COMPLETED" : "IN_PROGRESS";
};


const handleFinish = () => {
  navigate(-1);
};

const handleDownloadModifiedExcel = async () => {
  if (!gamme) return;

  try {
    setDownloadingExcel(true);
    await downloadModifiedGammeExcel(gamme);
  } catch (error) {
    console.error(error);
    alert(error?.message || "Impossible de générer le fichier Excel modifié.");
  } finally {
    setDownloadingExcel(false);
  }
};

const handleNextBloc = () => {
  if (canEditValidation) {
    const isValid = validateCurrentBlocBeforeNext();

    if (!isValid) return;
  }

  setCurrentBlocIndex((prev) =>
    Math.min(prev + 1, blocs.length - 1)
  );
};

const handlePrevBloc = () => {
  setCurrentBlocIndex((prev) =>
    Math.max(prev - 1, 0)
  );
};
const getEVCodeFromBloc = (bloc) => {
  if (!bloc?.ev_row || bloc.ev_row.length === 0) return null;

  const firstValue = bloc.ev_row.find((cell) => cell.value)?.value;

  return firstValue || null;
};

const getResultBadgeClass = (result) => {
  switch (result) {
    case "OK":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "NOK":
      return "bg-red-100 text-red-700 border-red-300";
    case "NOK_mineur":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-700 border-sky-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-300";
  }
};
  const handleSelectChange = async (rowIndex, field, value, commentaire = "") => {
  if (!canEditValidation) return;

  const bloc = blocs[currentBlocIndex];
  const row = bloc.rows[rowIndex];

  const stepCodeCell = row.cells.find(
    (cell) => cell.field === "Nom (Steps)"
  );

  const stepCode = stepCodeCell?.value;

  if (!stepCode) {
    alert("Step code introuvable.");
    return;
  }

  try {
    const evCode = getEVCodeFromBloc(bloc);

    await validationsAPI.createStepValidation({
      gammeId,
      evCode,
      stepCode,
      cotation: value,
      commentaire,
    });

    const updatedBloc = {
      ...bloc,
      rows: bloc.rows.map((r, index) => {
        if (index !== rowIndex) return r;

        return {
          ...r,
          cells: r.cells.map((cell) => {
            if (cell.field === field) {
              return {
                ...cell,
                value,
                commentaire,
              };
            }

            if (COMMENT_FIELDS.includes(cell.field)) {
              return {
                ...cell,
                value: commentaire,
              };
            }

            return cell;
          }),
        };
      }),
    };

    const recalculatedBloc = updateBlocEtats(updatedBloc);

    setBlocs((prev) =>
      prev.map((b, index) =>
        index === currentBlocIndex ? recalculatedBloc : b
      )
    );

    await loadResults();
  } catch (error) {
    console.error(error);

    const backendMessage =
      error?.response?.data?.commentaire?.[0] ||
      error?.response?.data?.commentaire ||
      error?.response?.data?.non_field_errors?.[0] ||
      "Erreur lors de l'enregistrement.";

    alert(backendMessage);
  }
};

const getGammeStatus = () => {
  if (blocs.length === 0) {
    return "IN_PROGRESS";
  }

  const validableBlocs = blocs.filter((bloc) =>
    bloc.rows?.some((row) => hasCotationSelect(row))
  );

  const allCompleted =
    validableBlocs.length > 0 &&
    validableBlocs.every((bloc) => getBlocStatus(bloc) === "COMPLETED");

  return allCompleted ? "COMPLETED" : "IN_PROGRESS";
};

const getGammeStatusLabel = (status) => {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "IN_PROGRESS":
      return "In progress";
    default:
      return "In progress";
  }
};

const getGammeStatusClass = (status) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-700 border-sky-300";
    default:
      return "bg-slate-100 text-slate-600 border-slate-300";
  }
};

const currentBloc = blocs[currentBlocIndex];
const currentEVCode = getEVCodeFromBloc(currentBloc);
const currentEVResult = computeEVResultFromRows(currentBloc?.rows);

const gammeStatus = getGammeStatus();
const canDownloadModifiedExcel = Boolean(gamme) && gammeStatus === "COMPLETED";

  return (
    <DashboardLayout role={userRole}>
      <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Statut de la gamme
          </p>

          <h3 className="text-sm font-bold text-slate-800 mt-1">
            {gammeName}
          </h3>
        </div>
        

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadModifiedExcel}
            disabled={!canDownloadModifiedExcel || downloadingExcel}
            title={
              canDownloadModifiedExcel
                ? "Télécharger le fichier Excel modifié"
                : "Tous les EV doivent être validés"
            }
            className="px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold hover:bg-indigo-200 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            {downloadingExcel ? "Generation..." : "Excel modifie"}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/validation-report/${gammeId}`)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors"
          >
            Rapport temps réel
          </button>

          <span
            className={`px-3 py-1 rounded-full border text-xs font-bold ${getGammeStatusClass(
              gammeStatus
            )}`}
          >
            {getGammeStatusLabel(gammeStatus)}
          </span>
        </div>
      </div>
      {currentEVCode && (
        <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Résultat EV
            </p>

            <h3 className="text-sm font-bold text-slate-800 mt-1">
              {currentEVCode}
            </h3>
          </div>

          <span
            className={`px-3 py-1 rounded-full border text-xs font-bold ${
              getResultBadgeClass(currentEVResult)
            }`}
          >
            {currentEVResult || "IN_PROGRESS"}
          </span>
        </div>
      )}
      {blocs.length > 0 && (
        <>
          <BlocNavigation
            blocs={blocs}
            currentBlocIndex={currentBlocIndex}
            setCurrentBlocIndex={setCurrentBlocIndex}
            gammeValidee={gammeValidee}
            onNext={handleNextBloc}
            onPrev={handlePrevBloc}
            onFinish={handleFinish}
          />

          <BlocCardList
            gammeId={gammeId}
            bloc={blocs[currentBlocIndex]}
            colonnes={colonnes}
            onToggleChange={handleToggleChange}
            onSelectChange={handleSelectChange}
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default ValidationPage;
