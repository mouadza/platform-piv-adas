import { gammesAPI, validationsAPI } from "../api/index";
import { buildProjectKPI } from "./projectKPI";
import { generateProjectKPIExcel } from "./projectKPIExcel";
import { generateSyntheseGammeExcel } from "./syntheseGammeExcel";
import { listGlobalGeneralComments } from "./globalGammeComments";

const mapWithConcurrency = async (items, limit, callback) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await callback(
          items[currentIndex],
          currentIndex
        );
      }
    }
  );

  await Promise.all(workers);
  return results;
};

const RESULT_LABEL_VARIANTS = [
  "R\u00e9sultats",
  "R\u00c3\u00a9sultats",
  "R\u00c3\u0192\u00c2\u00a9sultats",
];

const COMMENT_FIELDS = RESULT_LABEL_VARIANTS.flatMap((label) => [
  `Commentaire ${label}`,
  `Commentaires ${label}`,
  `Commentaire (${label})`,
  `Commentaires (${label})`,
]);

const COTATION_FIELDS = RESULT_LABEL_VARIANTS.map(
  (label) => `Cotation (${label})`
);

const getEVCodeFromBloc = (bloc) => {
  if (!bloc?.ev_row || bloc.ev_row.length === 0) return null;

  return bloc.ev_row.find((cell) => cell.value)?.value || null;
};

const getStepCodeFromRow = (row) => {
  const stepCell = row.cells?.find((cell) => cell.field === "Nom (Steps)");

  return stepCell?.value || null;
};

const hasCotationSelect = (row) => {
  return row.cells?.some(
    (cell) => COTATION_FIELDS.includes(cell.field) && cell.type === "select"
  );
};

const buildKpiReportData = ({ parsedData, latestValidations }) => {
  const latestMap = new Map();

  (latestValidations || []).forEach((item) => {
    latestMap.set(`${item.ev_code}__${item.step_code}`, item);
  });

  return (parsedData?.blocs || []).map((bloc) => {
    const evCode = getEVCodeFromBloc(bloc) || "UNKNOWN_EV";

    const steps = (bloc.rows || [])
      .filter((row) => hasCotationSelect(row))
      .map((row) => {
        const stepCode = getStepCodeFromRow(row) || "-";
        const latest = latestMap.get(`${evCode}__${stepCode}`);
        const commentCell = row.cells?.find((cell) =>
          COMMENT_FIELDS.includes(cell.field)
        );

        return {
          evCode,
          stepCode,
          cotation: latest?.cotation || "A_coter",
          commentaire: latest?.commentaire || commentCell?.value || "",
          userName:
            latest?.user_name || latest?.validated_by_name || "-",
          dateValidation:
            latest?.created_at || latest?.date || latest?.updated_at || null,
        };
      });

    return {
      evCode,
      steps,
    };
  });
};

export const getProjectDisplayName = (projet) => {
  return projet?.nom_projet || projet?.nom || `Projet ${projet?.id}`;
};

export const getGammeDisplayName = (gamme) => {
  return (
    gamme?.nom_gamme ||
    gamme?.original_filename ||
    gamme?.fichier_gamme_nom ||
    gamme?.nom_original ||
    gamme?.nom ||
    `Gamme ${gamme?.id}`
  );
};

const NON_COTE_VALUES = [
  "Non_cote",
  "Non_coté",
  "Non_cotÃ©",
  "Non_cotÃƒÂ©",
  "Non_cotÃƒÆ’Ã‚Â©",
];

const normalizeCotation = (value) => {
  if (!value) return "A_coter";
  if (NON_COTE_VALUES.includes(value)) return "Non_cote";
  if (value === "NOK Mineur" || value === "NOK mineur") return "NOK_mineur";

  return value;
};

const percentage = (value, total) => {
  return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1));
};

const summarizeKpiSteps = (steps = []) => {
  const cotations = steps.map((step) => normalizeCotation(step.cotation));
  const total = cotations.length;
  const ok = cotations.filter((cotation) => cotation === "OK").length;
  const nok = cotations.filter((cotation) => cotation === "NOK").length;
  const minor = cotations.filter((cotation) => cotation === "NOK_mineur").length;
  const nonCote = cotations.filter((cotation) => cotation === "Non_cote").length;
  const aCoter = cotations.filter((cotation) => cotation === "A_coter").length;
  const validated = total - aCoter;

  return {
    total,
    validated,
    ok,
    nok,
    minor,
    nonCote,
    aCoter,
    completionPercent: percentage(validated, total),
    okPercent: percentage(ok, total),
    nokPercent: percentage(nok, total),
    minorPercent: percentage(minor, total),
    nonCotePercent: percentage(nonCote, total),
    aCoterPercent: percentage(aCoter, total),
  };
};

const computeEvResultFromSteps = (steps = []) => {
  if (steps.length === 0) return "IN_PROGRESS";

  const cotations = steps.map((step) => normalizeCotation(step.cotation));

  if (cotations.some((cotation) => cotation === "A_coter")) {
    return "IN_PROGRESS";
  }

  if (cotations.includes("NOK")) return "NOK";
  if (cotations.includes("NOK_mineur")) return "NOK_mineur";

  if (cotations.every((cotation) => ["OK", "Non_cote"].includes(cotation))) {
    return "OK";
  }

  return "IN_PROGRESS";
};

const summarizeEvResults = (evStats = []) => {
  const total = evStats.length;
  const counts = evStats.reduce(
    (acc, ev) => ({
      ...acc,
      [ev.result]: (acc[ev.result] || 0) + 1,
    }),
    {
      OK: 0,
      NOK: 0,
      NOK_mineur: 0,
      IN_PROGRESS: 0,
    }
  );

  return {
    total,
    OK: counts.OK || 0,
    NOK: counts.NOK || 0,
    NOK_mineur: counts.NOK_mineur || 0,
    IN_PROGRESS: counts.IN_PROGRESS || 0,
    okPercent: percentage(counts.OK || 0, total),
    nokPercent: percentage(counts.NOK || 0, total),
    minorPercent: percentage(counts.NOK_mineur || 0, total),
    inProgressPercent: percentage(counts.IN_PROGRESS || 0, total),
  };
};

const buildGammeKpiPayload = ({ gamme, gammeData, latestValidations, parsedData }) => {
  const reportData = buildKpiReportData({
    parsedData,
    latestValidations: latestValidations || [],
  });
  const gammeTitle =
    getGammeDisplayName(gammeData) || getGammeDisplayName(gamme);
  const allSteps = reportData.flatMap((ev) => ev.steps || []);
  const summary = summarizeKpiSteps(allSteps);
  const evStats = reportData.map((ev) => {
    const steps = ev.steps || [];

    return {
      evCode: ev.evCode,
      result: computeEvResultFromSteps(steps),
      ...summarizeKpiSteps(steps),
    };
  });
  const evResultSummary = summarizeEvResults(evStats);

  return {
    gammeTitle,
    summary,
    evResultSummary,
    evStats,
    reportData,
  };
};

const buildProjectKpiData = async (projet) => {
  const projetId = projet?.id || projet;
  const projectName =
    typeof projet === "object"
      ? getProjectDisplayName(projet)
      : `Projet ${projetId}`;
  const gammes = await gammesAPI.listByProjet(projetId);
  const allParsedData = {};
  const allValidations = {};

  await mapWithConcurrency(gammes || [], 2, async (gamme) => {
    const [parsed, validations] = await Promise.all([
      gammesAPI.parse(gamme.id),
      validationsAPI.getLatestGammeStepValidations(gamme.id),
    ]);

    allParsedData[gamme.id] = parsed;
    allValidations[gamme.id] = validations;
  });

  const kpiData = buildProjectKPI({
    gammes,
    allParsedData,
    allValidations,
  });

  return {
    projet,
    projectName,
    gammes,
    kpiData,
  };
};

const summarizeProjectCotations = (kpiData = []) => {
  const totals = kpiData.reduce(
    (acc, gamme) => ({
      total: acc.total + Number(gamme.totalSteps || 0),
      ok: acc.ok + Number(gamme.okSteps || 0),
      nok: acc.nok + Number(gamme.nokSteps || 0),
      minor: acc.minor + Number(gamme.minorSteps || 0),
      nonCote: acc.nonCote + Number(gamme.nonCoteSteps || 0),
      aCoter: acc.aCoter + Number(gamme.aCoterSteps || 0),
    }),
    {
      total: 0,
      ok: 0,
      nok: 0,
      minor: 0,
      nonCote: 0,
      aCoter: 0,
    }
  );

  return {
    ...totals,
    okPercent: percentage(totals.ok, totals.total),
    nokPercent: percentage(totals.nok, totals.total),
    minorPercent: percentage(totals.minor, totals.total),
    nonCotePercent: percentage(totals.nonCote, totals.total),
    aCoterPercent: percentage(totals.aCoter, totals.total),
  };
};

const getEvResultFromSummary = (ev = {}) => {
  if (!Number(ev.total || 0)) return "IN_PROGRESS";
  if (Number(ev.aCoter || 0) > 0) return "IN_PROGRESS";
  if (Number(ev.nok || 0) > 0) return "NOK";
  if (Number(ev.minor || 0) > 0) return "NOK_mineur";

  return "OK";
};

const summarizeProjectEvResults = (kpiData = []) => {
  const evOccurrences = kpiData.flatMap((gamme) =>
    (gamme.evStats || []).map((ev) => ({
      result: getEvResultFromSummary(ev),
    }))
  );

  return summarizeEvResults(evOccurrences);
};

export const getProjectKPIPreview = async (projet) => {
  const payload = await buildProjectKpiData(projet);

  return {
    ok: true,
    ...payload,
    summary: summarizeProjectCotations(payload.kpiData),
    evResultSummary: summarizeProjectEvResults(payload.kpiData),
  };
};

export const getGammeKPIPreview = async (gamme) => {
  const state = await gammesAPI.validationState(gamme.id);

  if (!state?.started) {
    return {
      ok: false,
      message:
        "Le rapport KPI n'est pas disponible car la validation de cette gamme n'a pas encore commence.",
    };
  }

  const [gammeData, latestValidations, parsedData] = await Promise.all([
    gammesAPI.detail(gamme.id),
    validationsAPI.getLatestGammeStepValidations(gamme.id),
    gammesAPI.parse(gamme.id),
  ]);

  return {
    ok: true,
    gamme,
    ...buildGammeKpiPayload({
      gamme,
      gammeData,
      latestValidations,
      parsedData,
    }),
  };
};

export const downloadProjectKPI = async (projet) => {
  const { projectName, kpiData } = await buildProjectKpiData(projet);

  const exportResult = await generateProjectKPIExcel({
    projectName,
    kpiData,
  });

  return {
    ok: true,
    fileName: exportResult?.fileName,
    message:
      "Le KPI projet a ete genere avec les cotations globales, les cotations globales par EV et le detail EV par gamme.",
  };
};

export const downloadGammeKPI = async (gamme) => {
  const state = await gammesAPI.validationState(gamme.id);

  if (!state?.started) {
    return {
      ok: false,
      message:
        "Le rapport KPI n'est pas disponible car la validation de cette gamme n'a pas encore commence.",
    };
  }

  const [gammeData, resultsData, latestValidations, parsedData] =
    await Promise.all([
      gammesAPI.detail(gamme.id),
      validationsAPI.getGammeResults(gamme.id),
      validationsAPI.getLatestGammeStepValidations(gamme.id),
      gammesAPI.parse(gamme.id),
    ]);

  const reportData = buildKpiReportData({
    parsedData,
    latestValidations: latestValidations || [],
  });

  const gammeTitle =
    getGammeDisplayName(gammeData) || getGammeDisplayName(gamme);

  const [besoinsData, pistesData] = await Promise.all([
    listGlobalGeneralComments({
      gammeId: gamme.id,
      gammeName: gammeData?.nom_gamme,
      type: "BESOINS",
    }),
    listGlobalGeneralComments({
      gammeId: gamme.id,
      gammeName: gammeData?.nom_gamme,
      type: "PISTES",
    }),
  ]);

  const gammeInfo = {
    "Nom gamme": gammeData?.nom_gamme || gammeTitle,
    "ID Gamme": gamme.id,
    Projet: gammeData?.projet_nom || gammeData?.projet || "-",
    "Type procedure":
      gammeData?.type_procedure_nom || gammeData?.type_procedure || "-",
    "Fonction gamme":
      gammeData?.fonction_gamme_nom || gammeData?.fonction || "-",
    Vehicule:
      gammeData?.vehicule_nom ||
      gammeData?.vehicule?.cmq ||
      gammeData?.vehicule?.vin ||
      "-",
    Boitiers: gammeData?.boitiers || "-",
    Pistes: gammeData?.pistes || "-",
    "Nombre de jours": gammeData?.nombre_jours || "-",
    "Date debut": gammeData?.date_debut || "-",
    "Date fin": gammeData?.date_fin || "-",
    "Fichier gamme":
      gammeData?.original_filename ||
      gammeData?.fichier_gamme_nom ||
      gammeData?.fichier_gamme ||
      "-",
    "Fichier associe":
      gammeData?.original_associe_filename ||
      gammeData?.fichier_associe_nom ||
      gammeData?.fichier_associe ||
      "-",
    "Date generation": new Date().toLocaleString("fr-FR"),
  };

  const exportResult = await generateSyntheseGammeExcel({
    gammeId: gamme.id,
    gammeTitle,
    gammeInfo,
    results: resultsData,
    validations: latestValidations || [],
    besoinsComments: besoinsData || [],
    pistesComments: pistesData || [],
    reportData,
  });

  return {
    ok: true,
    fileName: exportResult?.fileName,
    message: "Le rapport KPI de la gamme a ete genere avec succes.",
  };
};
