const DAY_MS = 24 * 60 * 60 * 1000;

const COTATION_FIELDS = [
  "Cotation (Résultats)",
  "Cotation (RÃ©sultats)",
];

const STEP_FIELDS = ["Nom (Steps)"];

const NON_COTE_VALUES = ["Non_coté", "Non_cotÃ©", "Non_cotÃƒÂ©"];

const normalizeCotation = (value) => {
  if (!value) return "A_coter";

  if (NON_COTE_VALUES.includes(value)) return "Non_coté";

  return value;
};

const isCotationCell = (cell) => {
  return COTATION_FIELDS.includes(cell.field) && cell.type === "select";
};

const getEVCodeFromBloc = (bloc) => {
  return bloc?.ev_row?.find((cell) => cell.value)?.value || "UNKNOWN_EV";
};

const getStepCodeFromRow = (row) => {
  return (
    row.cells?.find((cell) => STEP_FIELDS.includes(cell.field))?.value || "—"
  );
};

const toValidDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getValidationDate = (validation) => {
  return toValidDate(
    validation.created_at || validation.date || validation.updated_at || null
  );
};

const getGammeExplicitStart = (gamme) => {
  return toValidDate(gamme.date_debut || gamme.start_date || null);
};

const getGammeExplicitEnd = (gamme) => {
  return toValidDate(gamme.date_fin || gamme.end_date || null);
};

const getGammeName = (gamme) => {
  return (
    gamme.nom_gamme ||
    gamme.original_filename ||
    gamme.fichier_gamme_nom ||
    gamme.nom_original ||
    gamme.nom ||
    `Gamme ${gamme.id}`
  );
};

const getDurationFromGamme = (gamme) => {
  const duration = Number(gamme.nombre_jours || gamme.durationDays || 1);

  return Number.isFinite(duration) && duration > 0 ? duration : 1;
};

const buildDateRange = ({ gamme, validations }) => {
  const validationDates = validations
    .map(getValidationDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  const hasStarted = validationDates.length > 0;
  const durationFromGamme = getDurationFromGamme(gamme);

  if (!hasStarted) {
    return {
      startDate: null,
      endDate: null,
      durationDays: 0,
    };
  }

  const explicitStart = getGammeExplicitStart(gamme);
  const explicitEnd = getGammeExplicitEnd(gamme);
  const startDate = explicitStart || validationDates[0];
  const fallbackEnd = startDate
    ? new Date(startDate.getTime() + (durationFromGamme - 1) * DAY_MS)
    : null;
  const endDate =
    explicitEnd || validationDates[validationDates.length - 1] || fallbackEnd;
  const durationDays =
    startDate && endDate
      ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1)
      : durationFromGamme;

  return {
    startDate,
    endDate,
    durationDays,
  };
};

const buildPercent = (value, total) => {
  return total === 0 ? 0 : Number(((value / total) * 100).toFixed(1));
};

const summarizeCotations = (cotations) => {
  const normalizedCotations = cotations.map(normalizeCotation);
  const total = normalizedCotations.length;
  const ok = normalizedCotations.filter((cotation) => cotation === "OK").length;
  const nok = normalizedCotations.filter((cotation) => cotation === "NOK").length;
  const minor = normalizedCotations.filter(
    (cotation) => cotation === "NOK_mineur"
  ).length;
  const nonCote = normalizedCotations.filter(
    (cotation) => cotation === "Non_coté"
  ).length;
  const aCoter = normalizedCotations.filter(
    (cotation) => !cotation || cotation === "A_coter"
  ).length;
  const validated = total - aCoter;

  return {
    total,
    validated,
    ok,
    nok,
    minor,
    nonCote,
    aCoter,
    completionPercent: buildPercent(validated, total),
    okPercent: buildPercent(ok, total),
    nokPercent: buildPercent(nok, total),
    minorPercent: buildPercent(minor, total),
    nonCotePercent: buildPercent(nonCote, total),
    aCoterPercent: buildPercent(aCoter, total),
  };
};

export const buildProjectKPI = ({ gammes, allParsedData, allValidations }) => {
  return (gammes || []).map((gamme) => {
    const parsed = allParsedData?.[gamme.id];
    const validations = allValidations?.[gamme.id] || [];
    const latestValidationMap = new Map();
    const evMap = {};
    const allCotations = [];

    validations.forEach((validation) => {
      latestValidationMap.set(
        `${validation.ev_code}__${validation.step_code}`,
        validation
      );
    });

    (parsed?.blocs || []).forEach((bloc) => {
      const evCode = getEVCodeFromBloc(bloc);

      if (!evMap[evCode]) evMap[evCode] = [];

      (bloc.rows || [])
        .filter((row) => row.cells?.some(isCotationCell))
        .forEach((row) => {
          const stepCode = getStepCodeFromRow(row);
          const validation = latestValidationMap.get(`${evCode}__${stepCode}`);
          const cotation = normalizeCotation(validation?.cotation);

          evMap[evCode].push(cotation);
          allCotations.push(cotation);
        });
    });

    const gammeSummary = summarizeCotations(allCotations);
    const { startDate, endDate, durationDays } = buildDateRange({
      gamme,
      validations,
    });

    const evStats = Object.entries(evMap).map(([evCode, cotations]) => {
      const summary = summarizeCotations(cotations);

      return {
        evCode,
        ...summary,
      };
    });

    return {
      gammeId: gamme.id,
      name: getGammeName(gamme),
      progress: gammeSummary.completionPercent,
      totalSteps: gammeSummary.total,
      validatedSteps: gammeSummary.validated,
      okSteps: gammeSummary.ok,
      nokSteps: gammeSummary.nok,
      minorSteps: gammeSummary.minor,
      nonCoteSteps: gammeSummary.nonCote,
      aCoterSteps: gammeSummary.aCoter,
      completionPercent: gammeSummary.completionPercent,
      okPercent: gammeSummary.okPercent,
      nokPercent: gammeSummary.nokPercent,
      minorPercent: gammeSummary.minorPercent,
      nonCotePercent: gammeSummary.nonCotePercent,
      aCoterPercent: gammeSummary.aCoterPercent,
      evStats,
      startDate,
      endDate,
      durationDays,
      status:
        gammeSummary.total > 0 && gammeSummary.validated === gammeSummary.total
          ? "Terminée"
          : gammeSummary.validated > 0
          ? "En cours"
          : "Non commencée",
    };
  });
};
