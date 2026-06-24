import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const COTATION_LABELS = {
  A_coter: "À coter",
  OK: "OK",
  NOK: "NOK",
  NOK_mineur: "NOK Mineur",
  Non_coté: "Non coté",
  IN_PROGRESS: "En cours",
};

const STATUS_COLORS = {
  OK: "D9EAD3",
  NOK: "F4CCCC",
  NOK_mineur: "FCE5CD",
  Non_coté: "E7E6E6",
  A_coter: "FFF2CC",
  IN_PROGRESS: "D9EAF7",
  COMPLETED: "D9EAD3",
};

const BORDER_STYLE = {
  top: { style: "thin", color: { argb: "D9E2F3" } },
  left: { style: "thin", color: { argb: "D9E2F3" } },
  bottom: { style: "thin", color: { argb: "D9E2F3" } },
  right: { style: "thin", color: { argb: "D9E2F3" } },
};

const sanitizeFileName = (name) => {
  return String(name || "rapport_kpi")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
};

const toDate = (value) => {
  if (!value) return null;

  const normalizedValue =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value;

  const d = new Date(normalizedValue);

  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (date) => {
  if (!date) return "—";

  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const percentage = (value, total) => {
  if (!total || total === 0) return "0%";

  return `${((value / total) * 100).toFixed(1)}%`;
};

const FINAL_COTATIONS = ["OK", "NOK", "NOK_mineur", "Non_coté"];

const isFinalCotation = (cotation) => {
  return FINAL_COTATIONS.includes(cotation);
};

/**
 * Calcule les dates de début et de fin de validation.
 * - dateDebut : première date de validation parmi tous les steps
 * - dateFin   : première date à laquelle un EV entier a été validé
 *               (tous ses steps ont une cotation finale),
 *               ou "IN_PROGRESS" si aucun EV n'est encore complet.
 */
const getDateDebutFin = (allSteps, groupedByEV, evCodes) => {
  // Date de début = la plus ancienne date de validation parmi tous les steps
  const allDates = allSteps
    .map((step) => toDate(step.dateValidation))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  const dateDebut = allDates[0] || null;

  const allCompleted =
    evCodes.length > 0 &&
    evCodes.every((evCode) => {
      const steps = groupedByEV[evCode] || [];
      return (
        steps.length > 0 &&
        steps.every((step) => isFinalCotation(step.cotation))
      );
    });

  // dateFin = seulement si TOUS les EV sont complètement validés.
  //
  // On cherche le "dernier EV complété" : parmi tous les EV terminés,
  // celui dont la PREMIÈRE validation est la plus tardive
  // (= l'EV qu'on a commencé à valider en dernier).
  // dateFin = la première date de validation de cet EV.
  //
  // Exemple : EV1 validé le 01/06, EV2 validé le 05/06
  //   → le dernier EV commencé = EV2 → dateFin = 05/06
  //
  // Si la validation n'est pas encore terminée → "IN_PROGRESS".
  let dateFin = "IN_PROGRESS";

  if (allCompleted) {
    // Pour chaque EV, on récupère la PREMIÈRE date de validation (date min)
    const evFirstValidationDates = evCodes
      .map((evCode) => {
        const steps = groupedByEV[evCode] || [];

        const dates = steps
          .map((step) => toDate(step.dateValidation))
          .filter(Boolean)
          .sort((a, b) => a.getTime() - b.getTime());

        // Première validation de cet EV
        return dates[0] || null;
      })
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());

    // Le dernier EV commencé = celui avec la première validation la plus tardive
    dateFin = evFirstValidationDates[evFirstValidationDates.length - 1] || null;
  }

  return { dateDebut, dateFin, allCompleted };
};

const computeEVResultFromSteps = (steps) => {
  if (!steps || steps.length === 0) return "IN_PROGRESS";

  const cotations = steps.map((step) => step.cotation || "A_coter");

  if (cotations.some((c) => c === "A_coter")) {
    return "IN_PROGRESS";
  }

  if (cotations.includes("NOK")) {
    return "NOK";
  }

  if (cotations.includes("NOK_mineur")) {
    return "NOK_mineur";
  }

  if (cotations.every((c) => ["OK", "Non_coté"].includes(c))) {
    return "OK";
  }

  return "IN_PROGRESS";
};

const flattenReportSteps = (reportData = []) => {
  return reportData.flatMap((ev) =>
    (ev.steps || []).map((step) => ({
      ...step,
      evCode: ev.evCode,
    }))
  );
};

const groupValidationsByEV = (validations) => {
  return validations.reduce((acc, item) => {
    const evCode = item.ev_code || "UNKNOWN_EV";

    if (!acc[evCode]) {
      acc[evCode] = [];
    }

    acc[evCode].push(item);

    return acc;
  }, {});
};

const styleTitle = (cell) => {
  cell.font = {
    bold: true,
    size: 18,
    color: { argb: "FFFFFF" },
  };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "1F4E78" },
  };
};

const styleSectionHeader = (row) => {
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "5B9BD5" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    cell.border = BORDER_STYLE;
  });
};

const styleTableHeader = (row) => {
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "404040" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = BORDER_STYLE;
  });
};

const applyCellBorder = (row) => {
  row.eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
    };
  });
};

const applyStatusFill = (cell, status) => {
  const color = STATUS_COLORS[status] || "E7E6E6";

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color },
  };

  cell.font = {
    bold: true,
    color: {
      argb:
        status === "NOK"
          ? "9C0006"
          : status === "OK"
          ? "006100"
          : "7F6000",
    },
  };

  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
};

const autosizeColumns = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value ? String(cell.value) : "";
      maxLength = Math.max(maxLength, value.length + 2);
    });

    column.width = Math.min(maxLength, 45);
  });
};

export const generateSyntheseGammeExcel = async ({
  gammeId,
  gammeTitle,
  gammeInfo,
  validations,
  besoinsComments,
  pistesComments,
  reportData = [],
}) => {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Validation App";
  workbook.created = new Date();

  const safeGammeTitle = gammeTitle || `Gamme_${gammeId}`;

  const allSteps =
    reportData && reportData.length > 0
      ? flattenReportSteps(reportData)
      : (validations || []).map((item) => ({
          evCode: item.ev_code || "UNKNOWN_EV",
          stepCode:
            item.step_code || item.step_name || item.step_num || "—",
          cotation: item.cotation || "A_coter",
          commentaire: item.commentaire || "",
          userName: item.user_name || item.validated_by_name || "—",
          dateValidation:
            item.created_at || item.date || item.updated_at || null,
        }));

  const evCodes =
    reportData && reportData.length > 0
      ? reportData.map((ev) => ev.evCode)
      : Array.from(
          new Set(allSteps.map((step) => step.evCode).filter(Boolean))
        );

  const groupedByEV =
    reportData && reportData.length > 0
      ? Object.fromEntries(
          reportData.map((ev) => [ev.evCode, ev.steps || []])
        )
      : groupValidationsByEV(validations || []);

  // ✅ FIX : on passe groupedByEV et evCodes pour le calcul de dateFin
  const computedDates = getDateDebutFin(
    allSteps,
    groupedByEV,
    evCodes
  );
  const dateDebut =
    toDate(gammeInfo?.["Date debut"]) ||
    toDate(gammeInfo?.["Date début validation"]) ||
    computedDates.dateDebut;
  const dateFin =
    toDate(gammeInfo?.["Date fin"]) ||
    toDate(gammeInfo?.["Date fin validation"]) ||
    computedDates.dateFin;
  const allCompleted = computedDates.allCompleted;

  const evStats = {
    total: evCodes.length,
    OK: 0,
    NOK: 0,
    NOK_mineur: 0,
    IN_PROGRESS: 0,
  };

  evCodes.forEach((evCode) => {
    const steps = groupedByEV[evCode] || [];

    const result = computeEVResultFromSteps(steps);

    if (evStats[result] !== undefined) {
      evStats[result] += 1;
    } else {
      evStats.IN_PROGRESS += 1;
    }
  });

  const cotationStats = {
    total: allSteps.length,
    OK: 0,
    NOK: 0,
    NOK_mineur: 0,
    Non_coté: 0,
    A_coter: 0,
  };

  allSteps.forEach((step) => {
    const cotation = step.cotation || "A_coter";

    if (cotationStats[cotation] !== undefined) {
      cotationStats[cotation] += 1;
    } else {
      cotationStats.A_coter += 1;
    }
  });

  const globalStatus =
    allCompleted && evStats.IN_PROGRESS === 0
      ? "COMPLETED"
      : "IN_PROGRESS";

  /**
   * SHEET 1 — KPI SUMMARY
   */
  const ws = workbook.addWorksheet("Synthèse KPI", {
    views: [{ showGridLines: false }],
  });

  ws.mergeCells("A1:H1");
  styleTitle(ws.getCell("A1"));
  ws.getCell("A1").value = `Rapport KPI — ${safeGammeTitle}`;

  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = `Généré le ${formatDate(new Date())}`;
  ws.getCell("A2").alignment = { horizontal: "center" };
  ws.getCell("A2").font = { italic: true, color: { argb: "666666" } };

  ws.addRow([]);

  const infoHeader = ws.addRow(["Informations générales"]);
  ws.mergeCells(`A${infoHeader.number}:H${infoHeader.number}`);
  styleSectionHeader(infoHeader);

  const infoRows = [
    ["Nom gamme", gammeInfo?.["Nom gamme"] || safeGammeTitle],
    ["ID Gamme", gammeId],
    ["Projet", gammeInfo?.Projet || "—"],
    ["Véhicule", gammeInfo?.Véhicule || "—"],
    ["Type procédure", gammeInfo?.["Type procédure"] || "—"],
    ["Fonction gamme", gammeInfo?.["Fonction gamme"] || "—"],
    ["Boîtiers", gammeInfo?.Boîtiers || "—"],
    ["Pistes", gammeInfo?.Pistes || "—"],
    ["Nombre de jours", gammeInfo?.["Nombre de jours"] || "—"],
    ["Fichier gamme", gammeInfo?.["Fichier gamme"] || "—"],
    ["Date début validation", formatDate(dateDebut)],
    [
      "Date fin validation",
      dateFin === "IN_PROGRESS" ? "IN PROGRESS" : formatDate(dateFin),
    ],
    ["Statut global", globalStatus],
  ];

  infoRows.forEach(([label, value]) => {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    applyCellBorder(row);

    if (label === "Statut global") {
      applyStatusFill(row.getCell(2), value);
    }
  });

  ws.addRow([]);

  // ✅ FIX : titre avec nombre total d'EV
  const evHeader = ws.addRow([
    `Répartition des cotations de l'EV (Total : ${evStats.total} EV)`,
  ]);
  ws.mergeCells(`A${evHeader.number}:H${evHeader.number}`);
  styleSectionHeader(evHeader);

  const evTableHeader = ws.addRow(["Résultat EV", "Nombre", "Pourcentage"]);
  styleTableHeader(evTableHeader);

  ["OK", "NOK", "NOK_mineur", "IN_PROGRESS"].forEach((status) => {
    const count = evStats[status] || 0;

    const row = ws.addRow([
      COTATION_LABELS[status] || status,
      count,
      percentage(count, evStats.total),
    ]);

    applyCellBorder(row);
    applyStatusFill(row.getCell(1), status);
  });

  ws.addRow([]);

  // ✅ FIX : titre avec nombre total de cotations
  const cotHeader = ws.addRow([
    `Répartition des cotations totale (Total : ${cotationStats.total} cotations)`,
  ]);
  ws.mergeCells(`A${cotHeader.number}:H${cotHeader.number}`);
  styleSectionHeader(cotHeader);

  const cotTableHeader = ws.addRow(["Cotation", "Nombre", "Pourcentage"]);
  styleTableHeader(cotTableHeader);

  ["OK", "NOK", "NOK_mineur", "Non_coté", "A_coter"].forEach((status) => {
    const count = cotationStats[status] || 0;

    const row = ws.addRow([
      COTATION_LABELS[status] || status,
      count,
      percentage(count, cotationStats.total),
    ]);

    applyCellBorder(row);
    applyStatusFill(row.getCell(1), status);
  });

  autosizeColumns(ws);

  /**
   * SHEET 2 — DETAIL EV
   */
  const evSheet = workbook.addWorksheet("Détail EV", {
    views: [{ showGridLines: false }],
  });

  const evDetailHeader = evSheet.addRow([
    "EV",
    "Résultat EV",
    "Total steps",
    "OK",
    "NOK",
    "NOK Mineur",
    "Non coté",
    "À coter",
    "% OK",
    "% NOK",
    "% NOK Mineur",
  ]);

  styleTableHeader(evDetailHeader);

  evCodes.forEach((evCode) => {
    const evSteps = groupedByEV[evCode] || [];

    const total = evSteps.length;
    const ok = evSteps.filter((v) => v.cotation === "OK").length;
    const nok = evSteps.filter((v) => v.cotation === "NOK").length;
    const minor = evSteps.filter(
      (v) => v.cotation === "NOK_mineur"
    ).length;
    const nonCote = evSteps.filter(
      (v) => v.cotation === "Non_coté"
    ).length;
    const aCoter = evSteps.filter(
      (v) => !v.cotation || v.cotation === "A_coter"
    ).length;

    const evResult = computeEVResultFromSteps(evSteps);

    const row = evSheet.addRow([
      evCode,
      COTATION_LABELS[evResult] || evResult,
      total,
      ok,
      nok,
      minor,
      nonCote,
      aCoter,
      percentage(ok, total),
      percentage(nok, total),
      percentage(minor, total),
    ]);

    applyCellBorder(row);
    applyStatusFill(row.getCell(2), evResult);
  });

  autosizeColumns(evSheet);

  /**
   * SHEET 3 — DETAIL STEPS
   */
  const stepsSheet = workbook.addWorksheet("Détail steps", {
    views: [{ showGridLines: false }],
  });

  const stepHeader = stepsSheet.addRow([
    "EV",
    "Step",
    "Cotation",
    "Commentaire",
    "Validé par",
    "Date validation",
  ]);

  styleTableHeader(stepHeader);

  allSteps.forEach((item) => {
    const row = stepsSheet.addRow([
      item.evCode || "—",
      item.stepCode || "—",
      COTATION_LABELS[item.cotation] || item.cotation || "À coter",
      item.commentaire || "—",
      item.userName || "—",
      item.dateValidation
        ? formatDate(toDate(item.dateValidation))
        : "—",
    ]);

    applyCellBorder(row);
    applyStatusFill(row.getCell(3), item.cotation || "A_coter");
  });

  autosizeColumns(stepsSheet);

  /**
   * SHEET 4 — COMMENTAIRES BESOINS
   */
  const besoinsSheet = workbook.addWorksheet("Commentaires besoins", {
    views: [{ showGridLines: false }],
  });

  const besoinsHeader = besoinsSheet.addRow(["Auteur", "Commentaire", "Date"]);
  styleTableHeader(besoinsHeader);

  (besoinsComments || []).forEach((comment) => {
    const row = besoinsSheet.addRow([
      comment.user_name || comment.auteur || "Utilisateur",
      comment.contenu ||
        comment.text ||
        comment.texte ||
        comment.commentaire ||
        "—",
      comment.created_at
        ? formatDate(toDate(comment.created_at))
        : comment.date
        ? formatDate(toDate(comment.date))
        : "—",
    ]);

    applyCellBorder(row);
  });

  autosizeColumns(besoinsSheet);

  /**
   * SHEET 5 — COMMENTAIRES PISTES
   */
  const pistesSheet = workbook.addWorksheet("Commentaires pistes", {
    views: [{ showGridLines: false }],
  });

  const pistesHeader = pistesSheet.addRow(["Auteur", "Commentaire", "Date"]);
  styleTableHeader(pistesHeader);

  (pistesComments || []).forEach((comment) => {
    const row = pistesSheet.addRow([
      comment.user_name || comment.auteur || "Utilisateur",
      comment.contenu ||
        comment.text ||
        comment.texte ||
        comment.commentaire ||
        "—",
      comment.created_at
        ? formatDate(toDate(comment.created_at))
        : comment.date
        ? formatDate(toDate(comment.date))
        : "—",
    ]);

    applyCellBorder(row);
  });

  autosizeColumns(pistesSheet);

  const buffer = await workbook.xlsx.writeBuffer();

  const fileName = `Rapport_KPI_${sanitizeFileName(
    safeGammeTitle
  )}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );

  return { fileName };
};
