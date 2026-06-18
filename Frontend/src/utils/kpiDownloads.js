import { gammesAPI, validationsAPI } from "../api/index";
import { buildProjectKPI } from "./projectKPI";
import { generateProjectKPIExcel } from "./projectKPIExcel";
import { generateSyntheseGammeExcel } from "./syntheseGammeExcel";
import { listGlobalGeneralComments } from "./globalGammeComments";

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

export const downloadProjectKPI = async (projet) => {
  const projetId = projet?.id || projet;
  const projectName =
    typeof projet === "object"
      ? getProjectDisplayName(projet)
      : `Projet ${projetId}`;

  const gammes = await gammesAPI.listByProjet(projetId);
  const allParsedData = {};
  const allValidations = {};

  await Promise.all(
    (gammes || []).map(async (gamme) => {
      const [parsed, validations] = await Promise.all([
        gammesAPI.parse(gamme.id),
        validationsAPI.getLatestGammeStepValidations(gamme.id),
      ]);

      allParsedData[gamme.id] = parsed;
      allValidations[gamme.id] = validations;
    })
  );

  const kpiData = buildProjectKPI({
    gammes,
    allParsedData,
    allValidations,
  });

  await generateProjectKPIExcel({
    projectName,
    kpiData,
  });
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

  await generateSyntheseGammeExcel({
    gammeId: gamme.id,
    gammeTitle,
    gammeInfo,
    results: resultsData,
    validations: latestValidations || [],
    besoinsComments: besoinsData || [],
    pistesComments: pistesData || [],
    reportData,
  });

  return { ok: true };
};
