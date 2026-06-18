import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const LEFT_COLUMNS_COUNT = 6;
const TIMELINE_START_COLUMN = LEFT_COLUMNS_COUNT + 1;

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
    label: "Non coter",
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

  STATUS_ROWS.forEach((status, index) => {
    const row = ws.addRow([
      index === 0 ? `${gamme.name}\n(${totalSteps})` : null,
      status.label,
      null,
      Number(gamme[status.countField] || 0),
      totalSteps,
      null,
      ...units.map(() => ""),
    ]);

    row.height = 22;
    applyRowBorders(row, totalColumns);

    const statusCell = row.getCell(2);
    fillCell(statusCell, status.fill);
    statusCell.font = { bold: true, color: { argb: status.fontColor } };
    statusCell.alignment = { vertical: "middle", horizontal: "left" };

    stylePercentCell(row.getCell(3), gamme[status.percentField]);
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
  });

  const endRow = startRow + STATUS_ROWS.length - 1;

  ws.mergeCells(startRow, 1, endRow, 1);
  ws.mergeCells(startRow, 6, endRow, 6);

  const gammeCell = ws.getCell(startRow, 1);
  styleMergedBlockCell(gammeCell, { fill: COLORS.white });

  const progressCell = ws.getCell(startRow, 6);
  styleMergedBlockCell(progressCell, { fill: COLORS.white });
  stylePercentCell(progressCell, progress, "0.0%");
  progressCell.font = { bold: true, size: 11, color: { argb: COLORS.text } };

  addTimelineBar({
    row: ws.getRow(startRow),
    units,
    start: normalizeDate(gamme.startDate),
    end: normalizeDate(gamme.endDate),
  });
};

const addProjectKpiSheet = (workbook, projectName, kpiData) => {
  const ws = workbook.addWorksheet("KPI Projet");
  const {
    start: projectStart,
    end: projectEnd,
    hasRealBounds,
  } = getTimelineBounds(kpiData);
  const units = buildTimelineUnits(projectStart, projectEnd);
  const totalColumns = LEFT_COLUMNS_COUNT + units.length;
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

  const sectionHeader = ws.addRow(
    hasRealBounds
      ? [
          "KPI par gamme",
          "",
          "",
          "",
          "",
          "",
          "Calendrier par semaine",
          ...units.slice(1).map(() => ""),
        ]
      : ["KPI par gamme", "", "", "", "", ""]
  );
  applySectionHeaderStyle(sectionHeader, totalColumns);

  if (hasRealBounds) {
    ws.mergeCells(3, 1, 3, LEFT_COLUMNS_COUNT);
    ws.mergeCells(3, TIMELINE_START_COLUMN, 3, totalColumns);
  } else {
    ws.mergeCells(3, 1, 3, totalColumns);
  }

  const header = ws.addRow([
    "Gamme",
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

  (kpiData || []).forEach((gamme) => {
    addGammeBlock({
      ws,
      gamme,
      units,
      totalColumns,
    });
  });

  ws.columns = [
    { width: 26 },
    { width: 20 },
    { width: 12 },
    { width: 9 },
    { width: 9 },
    { width: 14 },
    ...units.map(() => ({ width: 12 })),
  ];

  for (let col = TIMELINE_START_COLUMN; col <= totalColumns; col += 1) {
    ws.getColumn(col).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  }

  ws.views = [
    {
      state: "frozen",
      xSplit: LEFT_COLUMNS_COUNT,
      ySplit: 4,
    },
  ];

  ws.autoFilter = {
    from: "A4",
    to: `${lastColumn}${Math.max(3, ws.rowCount)}`,
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

  workbook.creator = "RepProject";
  workbook.title = `KPI Projet - ${projectName}`;
  workbook.subject = projectName;
  workbook.created = new Date();

  addProjectKpiSheet(workbook, projectName, kpiData || []);

  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(new Blob([buffer]), `KPI_Projet_${safeFileName(projectName)}.xlsx`);
};
