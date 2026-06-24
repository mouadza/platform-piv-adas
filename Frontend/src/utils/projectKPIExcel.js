import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const KPI_LEFT_COLUMNS_COUNT = 10;
const EV_RESULT_START_COLUMN = 2;
const EV_RESULT_COLUMNS_COUNT = 4;
const GAMME_KPI_START_COLUMN = 6;
const TIMELINE_START_COLUMN = KPI_LEFT_COLUMNS_COUNT + 1;

const COLORS = {
  darkBlue: "FF1F4E79",
  headerBlue: "FF244061",
  grid: "FFD9E2F3",
  white: "FFFFFFFF",
  lightGrey: "FFF8FAFC",
  text: "FF111827",
  mutedText: "FF475569",
  ok: "FF00B050",
  nokMinor: "FFF79646",
  nok: "FFFF0000",
  nonCote: "FFBFBFBF",
  aCoter: "FF000000",
};

const STATUS_ROWS = [
  {
    label: "OK",
    countField: "okSteps",
    percentField: "okPercent",
    fill: COLORS.ok,
    fontColor: COLORS.text,
  },
  {
    label: "NOK Mineur",
    countField: "minorSteps",
    percentField: "minorPercent",
    fill: COLORS.nokMinor,
    fontColor: COLORS.text,
  },
  {
    label: "NOK",
    countField: "nokSteps",
    percentField: "nokPercent",
    fill: COLORS.nok,
    fontColor: COLORS.text,
  },
  {
    label: "Non cote",
    countField: "nonCoteSteps",
    percentField: "nonCotePercent",
    fill: COLORS.nonCote,
    fontColor: COLORS.text,
  },
  {
    label: "A coter",
    countField: "aCoterSteps",
    percentField: "aCoterPercent",
    fill: COLORS.aCoter,
    fontColor: COLORS.white,
  },
];

const EV_RESULT_ROWS = [
  {
    label: "OK",
    result: "OK",
    fill: COLORS.ok,
    fontColor: COLORS.text,
  },
  {
    label: "NOK Mineur",
    result: "NOK_mineur",
    fill: COLORS.nokMinor,
    fontColor: COLORS.text,
  },
  {
    label: "NOK",
    result: "NOK",
    fill: COLORS.nok,
    fontColor: COLORS.text,
  },
  {
    label: "En cours",
    result: "IN_PROGRESS",
    fill: COLORS.grid,
    fontColor: COLORS.text,
  },
];

const toDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeDate = (value) => {
  const date = toDate(value);

  if (!date) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date) => {
  const normalized = normalizeDate(date);
  if (!normalized) return null;

  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(normalized, diff);
};

const endOfWeek = (date) => {
  const start = startOfWeek(date);

  return start ? addDays(start, 6) : null;
};

const percentValue = (value) => Number(value || 0) / 100;

const safeFileName = (name) => {
  return String(name || "Projet").replace(/[\\/:*?"<>|]/g, "_");
};

const getExcelColumnName = (columnNumber) => {
  let dividend = columnNumber;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
};

const getTimelineBounds = (kpiData) => {
  const starts = kpiData.map((g) => normalizeDate(g.startDate)).filter(Boolean);
  const ends = kpiData.map((g) => normalizeDate(g.endDate)).filter(Boolean);

  if (starts.length === 0 || ends.length === 0) {
    return {
      start: null,
      end: null,
      hasRealBounds: false,
    };
  }

  return {
    start: startOfWeek(new Date(Math.min(...starts.map((date) => date.getTime())))),
    end: endOfWeek(new Date(Math.max(...ends.map((date) => date.getTime())))),
    hasRealBounds: true,
  };
};

const buildTimelineUnits = (start, end) => {
  const units = [];

  if (!start || !end) {
    return units;
  }

  for (let current = start; current <= end; current = addDays(current, 7)) {
    units.push({
      start: current,
      end: addDays(current, 6) > end ? end : addDays(current, 6),
    });
  }

  return units;
};

const datesOverlap = (aStart, aEnd, bStart, bEnd) => {
  return aStart <= bEnd && aEnd >= bStart;
};

const getDisplayProgress = (gamme) => {
  const progress =
    Number(gamme.okPercent || 0) +
    Number(gamme.nokPercent || 0) +
    Number(gamme.minorPercent || 0);

  if (!Number.isFinite(progress)) {
    return Number(gamme.completionPercent || gamme.progress || 0);
  }

  return Math.max(0, Math.min(progress, 100));
};

const applyCellBorder = (cell, color = COLORS.grid) => {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
};

const applyRowBorders = (row, totalColumns) => {
  for (let col = 1; col <= totalColumns; col += 1) {
    const cell = row.getCell(col);
    applyCellBorder(cell);
    cell.alignment = { vertical: "middle", wrapText: true };
  }
};

const fillCell = (cell, color) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color },
  };
};

const stylePercentCell = (cell, value, format = "0.00%") => {
  cell.value = percentValue(value);
  cell.numFmt = format;
  cell.alignment = { horizontal: "center", vertical: "middle" };
};

const percentFromCount = (count, total) => {
  const normalizedTotal = Number(total || 0);

  if (normalizedTotal === 0) return 0;

  return Number(((Number(count || 0) / normalizedTotal) * 100).toFixed(1));
};

const withPercentages = (summary) => {
  const totalSteps = Number(summary.totalSteps || 0);
  const okSteps = Number(summary.okSteps || 0);
  const nokSteps = Number(summary.nokSteps || 0);
  const minorSteps = Number(summary.minorSteps || 0);
  const nonCoteSteps = Number(summary.nonCoteSteps || 0);
  const aCoterSteps = Number(summary.aCoterSteps || 0);
  const validatedSteps = totalSteps - aCoterSteps;

  return {
    ...summary,
    totalSteps,
    validatedSteps,
    okSteps,
    nokSteps,
    minorSteps,
    nonCoteSteps,
    aCoterSteps,
    completionPercent: percentFromCount(validatedSteps, totalSteps),
    okPercent: percentFromCount(okSteps, totalSteps),
    nokPercent: percentFromCount(nokSteps, totalSteps),
    minorPercent: percentFromCount(minorSteps, totalSteps),
    nonCotePercent: percentFromCount(nonCoteSteps, totalSteps),
    aCoterPercent: percentFromCount(aCoterSteps, totalSteps),
  };
};

const createEmptySummary = () => ({
  totalSteps: 0,
  okSteps: 0,
  nokSteps: 0,
  minorSteps: 0,
  nonCoteSteps: 0,
  aCoterSteps: 0,
});

const addSummaryCounts = (target, source) => {
  target.totalSteps += Number(source.totalSteps || source.total || 0);
  target.okSteps += Number(source.okSteps || source.ok || 0);
  target.nokSteps += Number(source.nokSteps || source.nok || 0);
  target.minorSteps += Number(source.minorSteps || source.minor || 0);
  target.nonCoteSteps += Number(source.nonCoteSteps || source.nonCote || 0);
  target.aCoterSteps += Number(source.aCoterSteps || source.aCoter || 0);

  return target;
};

const summarizeProject = (kpiData) => {
  const summary = createEmptySummary();

  (kpiData || []).forEach((gamme) => addSummaryCounts(summary, gamme));

  return withPercentages(summary);
};

const normalizeEvSummary = (ev) =>
  withPercentages({
    totalSteps: ev.total,
    okSteps: ev.ok,
    nokSteps: ev.nok,
    minorSteps: ev.minor,
    nonCoteSteps: ev.nonCote,
    aCoterSteps: ev.aCoter,
  });

const getEvGlobalResult = (summary) => {
  if (Number(summary.totalSteps || 0) === 0) return "IN_PROGRESS";
  if (Number(summary.aCoterSteps || 0) > 0) return "IN_PROGRESS";
  if (Number(summary.nokSteps || 0) > 0) return "NOK";
  if (Number(summary.minorSteps || 0) > 0) return "NOK_mineur";

  return "OK";
};

const buildGlobalEvResultSummary = (evStats) => {
  const total = evStats.length;
  const counts = EV_RESULT_ROWS.reduce(
    (acc, row) => ({
      ...acc,
      [row.result]: 0,
    }),
    {}
  );

  evStats.forEach((ev) => {
    counts[ev.result] = (counts[ev.result] || 0) + 1;
  });

  return EV_RESULT_ROWS.map((row) => ({
    ...row,
    count: counts[row.result] || 0,
    percent: percentFromCount(counts[row.result] || 0, total),
  }));
};

const buildProjectEvOccurrences = (kpiData) => {
  return (kpiData || []).flatMap((gamme) =>
    (gamme.evStats || []).map((ev) => {
      const summary = normalizeEvSummary(ev);

      return {
        gammeName: gamme.name,
        evCode: ev.evCode,
        result: getEvGlobalResult(summary),
        ...summary,
      };
    })
  );
};

const buildGammeEvOccurrences = (gamme) => {
  return (gamme?.evStats || []).map((ev) => {
    const summary = normalizeEvSummary(ev);

    return {
      gammeName: gamme.name,
      evCode: ev.evCode,
      result: getEvGlobalResult(summary),
      ...summary,
    };
  });
};

const applyTitleRow = (ws, rowNumber, totalColumns, value) => {
  ws.mergeCells(rowNumber, 1, rowNumber, totalColumns);

  const row = ws.getRow(rowNumber);
  row.height = 28;

  for (let col = 1; col <= totalColumns; col += 1) {
    const cell = row.getCell(col);
    fillCell(cell, COLORS.darkBlue);
  }

  const cell = row.getCell(1);
  cell.value = value;
  cell.font = { bold: true, size: 16, color: { argb: COLORS.white } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
};

const applyInfoRow = (ws, rowNumber, totalColumns, value) => {
  ws.mergeCells(rowNumber, 1, rowNumber, totalColumns);

  const row = ws.getRow(rowNumber);
  row.height = 22;

  for (let col = 1; col <= totalColumns; col += 1) {
    const cell = row.getCell(col);
    fillCell(cell, COLORS.lightGrey);
    applyCellBorder(cell);
  }

  const cell = row.getCell(1);
  cell.value = value;
  cell.font = { bold: true, color: { argb: COLORS.mutedText } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
};

const applyHeaderStyle = (row, totalColumns) => {
  row.height = 24;

  for (let col = 1; col <= totalColumns; col += 1) {
    const cell = row.getCell(col);
    fillCell(cell, COLORS.headerBlue);
    applyCellBorder(cell, COLORS.white);
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  }
};

const applySectionHeaderStyle = (row, totalColumns) => {
  row.height = 22;

  for (let col = 1; col <= totalColumns; col += 1) {
    const cell = row.getCell(col);
    fillCell(cell, COLORS.darkBlue);
    applyCellBorder(cell, COLORS.white);
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  }
};

const styleMergedBlockCell = (cell, { fill = COLORS.white, fontColor = COLORS.text } = {}) => {
  fillCell(cell, fill);
  applyCellBorder(cell);
  cell.font = { bold: true, color: { argb: fontColor } };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
};

const addTimelineBar = ({ row, units, start, end }) => {
  if (!start || !end) return;

  units.forEach((unit, index) => {
    if (!datesOverlap(start, end, unit.start, unit.end)) return;

    const cell = row.getCell(TIMELINE_START_COLUMN + index);
    cell.value = "";
    fillCell(cell, COLORS.darkBlue);
    applyCellBorder(cell, COLORS.white);
  });
};

const addGammeBlock = ({ ws, gamme, units, totalColumns }) => {
  const startRow = ws.rowCount + 1;
  const totalSteps = Number(gamme.totalSteps || 0);
  const progress = getDisplayProgress(gamme);
  const gammeEvOccurrences = buildGammeEvOccurrences(gamme);
  const gammeEvRows = buildGlobalEvResultSummary(gammeEvOccurrences);
  const gammeEvTotal = gammeEvOccurrences.length;

  STATUS_ROWS.forEach((status, index) => {
    const evRow = gammeEvRows[index];
    const row = ws.addRow([]);

    row.height = 22;
    applyRowBorders(row, totalColumns);

    if (index < gammeEvRows.length) {
      const resultCell = row.getCell(EV_RESULT_START_COLUMN);
      resultCell.value = evRow.label;
      fillCell(resultCell, evRow.fill);
      resultCell.font = { bold: true, color: { argb: evRow.fontColor } };
      resultCell.alignment = { horizontal: "center", vertical: "middle" };

      stylePercentCell(row.getCell(EV_RESULT_START_COLUMN + 1), evRow.percent);
      row.getCell(EV_RESULT_START_COLUMN + 2).value = evRow.count;
      row.getCell(EV_RESULT_START_COLUMN + 2).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    }

    const statusCell = row.getCell(GAMME_KPI_START_COLUMN);
    statusCell.value = status.label;
    fillCell(statusCell, status.fill);
    statusCell.font = { bold: true, color: { argb: status.fontColor } };
    statusCell.alignment = { vertical: "middle", horizontal: "left" };

    stylePercentCell(row.getCell(GAMME_KPI_START_COLUMN + 1), gamme[status.percentField]);
    row.getCell(GAMME_KPI_START_COLUMN + 2).value = Number(gamme[status.countField] || 0);
    row.getCell(GAMME_KPI_START_COLUMN + 2).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  });

  const endRow = startRow + STATUS_ROWS.length - 1;

  ws.mergeCells(startRow, 1, endRow, 1);
  const evResultEndRow = startRow + Math.max(gammeEvRows.length, 1) - 1;
  ws.mergeCells(startRow, EV_RESULT_START_COLUMN + 3, evResultEndRow, EV_RESULT_START_COLUMN + 3);
  ws.mergeCells(startRow, GAMME_KPI_START_COLUMN + 3, endRow, GAMME_KPI_START_COLUMN + 3);
  ws.mergeCells(startRow, GAMME_KPI_START_COLUMN + 4, endRow, GAMME_KPI_START_COLUMN + 4);

  const gammeCell = ws.getCell(startRow, 1);
  styleMergedBlockCell(gammeCell, { fill: COLORS.white });
  gammeCell.value = `${gamme.name}\n(${totalSteps})`;

  const evTotalCell = ws.getCell(startRow, EV_RESULT_START_COLUMN + 3);
  styleMergedBlockCell(evTotalCell, { fill: COLORS.white });
  evTotalCell.value = gammeEvTotal;
  evTotalCell.font = { bold: true, size: 11, color: { argb: COLORS.text } };

  const gammeTotalCell = ws.getCell(startRow, GAMME_KPI_START_COLUMN + 3);
  styleMergedBlockCell(gammeTotalCell, { fill: COLORS.white });
  gammeTotalCell.value = totalSteps;
  gammeTotalCell.font = { bold: true, size: 11, color: { argb: COLORS.text } };

  const progressCell = ws.getCell(startRow, GAMME_KPI_START_COLUMN + 4);
  styleMergedBlockCell(progressCell, { fill: COLORS.white });
  stylePercentCell(progressCell, progress, "0.0%");
  progressCell.font = { bold: true, size: 11, color: { argb: COLORS.text } };

  addTimelineBar({
    row: ws.getRow(startRow),
    units,
    start: normalizeDate(gamme.startDate),
    end: normalizeDate(gamme.endDate),
  });

  return startRow;
};

const addKpiSectionHeader = ({
  ws,
  totalColumns,
  units,
  hasRealBounds,
}) => {
  const sectionHeaderRowNumber = ws.rowCount + 1;
  const sectionHeader = ws.addRow([
    "KPI par EV",
    "",
    "",
    "",
    "",
    "KPI par gamme",
    "",
    "",
    "",
    "",
    ...(hasRealBounds ? ["Calendrier par semaine", ...units.slice(1).map(() => "")] : []),
  ]);

  applySectionHeaderStyle(sectionHeader, totalColumns);

  ws.mergeCells(sectionHeaderRowNumber, 1, sectionHeaderRowNumber, EV_RESULT_START_COLUMN + EV_RESULT_COLUMNS_COUNT - 1);
  ws.mergeCells(sectionHeaderRowNumber, GAMME_KPI_START_COLUMN, sectionHeaderRowNumber, KPI_LEFT_COLUMNS_COUNT);

  if (hasRealBounds) {
    ws.mergeCells(sectionHeaderRowNumber, TIMELINE_START_COLUMN, sectionHeaderRowNumber, totalColumns);
  }

  const header = ws.addRow([
    "Gamme",
    "Resultat EV",
    "%",
    "Nb",
    "Total",
    "Cotation",
    "%",
    "Nb",
    "Total",
    "% Avancement",
    ...units.map((unit) => unit.start),
  ]);

  applyHeaderStyle(header, totalColumns);

  units.forEach((_, index) => {
    const cell = header.getCell(TIMELINE_START_COLUMN + index);
    cell.numFmt = "dd/mm/yyyy";
  });

  return header;
};

const addSpacerRow = (ws) => {
  const row = ws.addRow([]);
  row.height = 10;
};

const styleSummaryBand = (ws, rowNumber, startCol, endCol, title) => {
  ws.mergeCells(rowNumber, startCol, rowNumber, endCol);
  const row = ws.getRow(rowNumber);
  row.height = 24;

  for (let col = startCol; col <= endCol; col += 1) {
    const cell = row.getCell(col);
    fillCell(cell, COLORS.darkBlue);
    applyCellBorder(cell, COLORS.white);
  }

  const cell = row.getCell(startCol);
  cell.value = title;
  cell.font = { bold: true, color: { argb: COLORS.white } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
};

const styleSummaryHeader = (ws, rowNumber, startCol, endCol, labels) => {
  const row = ws.getRow(rowNumber);
  row.height = 24;

  for (let col = startCol; col <= endCol; col += 1) {
    const cell = row.getCell(col);
    cell.value = labels[col - startCol] || "";
    fillCell(cell, COLORS.headerBlue);
    applyCellBorder(cell, COLORS.white);
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  }
};

const addSummaryRows = (ws, startRow, startCol, endCol, rows, total) => {
  rows.forEach((item, index) => {
    const row = ws.getRow(startRow + index);

    for (let col = startCol; col <= endCol; col += 1) {
      const cell = row.getCell(col);
      applyCellBorder(cell);
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }

    const labelCell = row.getCell(startCol);
    labelCell.value = item.label;
    fillCell(labelCell, item.fill);
    labelCell.font = { bold: true, color: { argb: item.fontColor } };

    row.getCell(startCol + 1).value = item.count;
    stylePercentCell(row.getCell(startCol + 2), item.percent);

  });

  if (total !== undefined && rows.length > 0) {
    const totalCol = startCol + 3;
    const totalStartRow = startRow;
    const totalEndRow = startRow + rows.length - 1;

    if (totalEndRow > totalStartRow) {
      ws.mergeCells(totalStartRow, totalCol, totalEndRow, totalCol);
    }

    const totalCell = ws.getCell(totalStartRow, totalCol);
    totalCell.value = total;
    styleMergedBlockCell(totalCell, { fill: COLORS.white });
    totalCell.font = { bold: true, size: 11, color: { argb: COLORS.text } };
  }
};

const buildGlobalCotationRows = (kpiData) => {
  const summary = summarizeProject(kpiData);

  return STATUS_ROWS.map((status) => ({
    label: status.label,
    count: Number(summary[status.countField] || 0),
    percent: summary[status.percentField],
    fill: status.fill,
    fontColor: status.fontColor,
  }));
};

const buildGlobalCotationTotal = (kpiData) => summarizeProject(kpiData).totalSteps;

const buildGlobalEvResultRows = (kpiData) => {
  const evStats = buildProjectEvOccurrences(kpiData);

  return buildGlobalEvResultSummary(evStats);
};

const buildGlobalEvTotal = (kpiData) => buildProjectEvOccurrences(kpiData).length;

const addTopProjectSummaries = (ws, totalColumns, projectName, kpiData) => {
  const startRow = ws.rowCount + 1;
  const leftStart = 1;
  const leftEnd = Math.min(8, totalColumns);
  const middleStart = Math.min(10, totalColumns);
  const middleEnd = totalColumns;
  const evRows = buildGlobalEvResultRows(kpiData);
  const cotationRows = buildGlobalCotationRows(kpiData);

  styleSummaryBand(
    ws,
    startRow,
    leftStart,
    leftEnd,
    `Resultat EV global du projet - ${projectName}`
  );
  styleSummaryHeader(ws, startRow + 1, leftStart, leftEnd, [
    "Resultat EV",
    "Nombre",
    "Pourcentage",
    "Total",
  ]);
  addSummaryRows(ws, startRow + 2, leftStart, leftEnd, evRows, buildGlobalEvTotal(kpiData));

  styleSummaryBand(
    ws,
    startRow,
    middleStart,
    middleEnd,
    `Cotations globales du projet - ${projectName}`
  );
  styleSummaryHeader(ws, startRow + 1, middleStart, middleEnd, [
    "Cotation",
    "Nombre",
    "Pourcentage",
    "Total",
  ]);
  addSummaryRows(
    ws,
    startRow + 2,
    middleStart,
    middleEnd,
    cotationRows,
    buildGlobalCotationTotal(kpiData)
  );

  const maxRows = Math.max(evRows.length, cotationRows.length);

  for (let rowNumber = startRow; rowNumber <= startRow + maxRows + 1; rowNumber += 1) {
    ws.getRow(rowNumber).commit();
  }
};

const addProjectKpiSheet = (workbook, projectName, kpiData) => {
  const ws = workbook.addWorksheet("KPI Projet");
  const {
    start: projectStart,
    end: projectEnd,
    hasRealBounds,
  } = getTimelineBounds(kpiData);
  const units = buildTimelineUnits(projectStart, projectEnd);
  const timelineColumns = TIMELINE_START_COLUMN + units.length - 1;
  const totalColumns = Math.max(timelineColumns, 17);
  const lastColumn = getExcelColumnName(totalColumns);

  applyTitleRow(ws, 1, totalColumns, `KPI Projet - ${projectName}`);
  applyInfoRow(
    ws,
    2,
    totalColumns,
    hasRealBounds
      ? `Planning par gamme : ${projectStart.toLocaleDateString("fr-FR")} - ${projectEnd.toLocaleDateString("fr-FR")}`
      : "Planning par gamme : aucune gamme commencee"
  );
  addSpacerRow(ws);
  addTopProjectSummaries(ws, totalColumns, projectName, kpiData || []);
  addSpacerRow(ws);

  const header = addKpiSectionHeader({
    ws,
    totalColumns,
    units,
    hasRealBounds,
  });

  (kpiData || []).forEach((gamme) => {
    addGammeBlock({
      ws,
      gamme,
      units,
      totalColumns,
    });
  });

  const mainKpiEndRow = ws.rowCount;

  const columnWidths = [
    22,
    18,
    12,
    14,
    10,
    18,
    10,
    10,
    10,
    14,
    12,
    12,
    12,
    12,
    12,
    12,
    10,
  ];

  ws.columns = Array.from({ length: totalColumns }, (_, index) => ({
    width: columnWidths[index] || 12,
  }));

  for (let col = TIMELINE_START_COLUMN; col <= totalColumns; col += 1) {
    ws.getColumn(col).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  }

  ws.views = [
    {
      state: "frozen",
      xSplit: KPI_LEFT_COLUMNS_COUNT,
      ySplit: header.number,
    },
  ];

  ws.autoFilter = {
    from: `A${header.number}`,
    to: `${lastColumn}${Math.max(4, mainKpiEndRow)}`,
  };

  ws.properties.defaultRowHeight = 22;
  ws.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
};

export const generateProjectKPIExcel = async ({ projectName, kpiData }) => {
  const workbook = new ExcelJS.Workbook();
  const fileName = `KPI_Projet_${safeFileName(projectName)}.xlsx`;

  workbook.creator = "RepProject";
  workbook.title = `KPI Projet - ${projectName}`;
  workbook.subject = projectName;
  workbook.created = new Date();

  addProjectKpiSheet(workbook, projectName, kpiData || []);

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(new Blob([buffer]), fileName);

  return { fileName };
};
