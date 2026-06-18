import React, { useEffect, useState } from "react";
import CommentairesSection from "../components/CommentairesSection";
import { validationsAPI, measuredResultCommentsAPI } from "../api/index";

import {
  ROW_BG,
  ROW_BORDER,
  COMMENT_FIELDS,
  isEtatField,
  isResultCommentField,
} from "./validation/validationConstants";

import StatusBadge from "./validation/StatusBadge";
import CotationSelect from "./validation/CotationSelect";
import ConfirmCotationModal from "./validation/ConfirmCotationModal";
import HistoryModal from "./validation/HistoryModal";
import MeasuredResultCommentsModal from "./validation/MeasuredResultCommentsModal";

const emptyMeasuredModal = {
  isOpen: false,
  rowIndex: null,
  stepCode: null,
  comments: [],
  newComment: "",
  editingId: null,
  editingText: "",
  loading: false,
  saving: false,
};

const BlocCardList = ({
  gammeId,
  bloc,
  colonnes,
  onSelectChange,
  disabled,
  readOnly = false,
}) => {
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    rowIndex: null,
    field: null,
    newValue: null,
    oldValue: null,
    commentaire: "",
    stepCode: null,
    mode: "cotation",
  });

  const [measuredCommentModal, setMeasuredCommentModal] =
    useState(emptyMeasuredModal);

  // commentsByStep stores measured-result comments keyed by "evCode__stepCode"
  const [commentsByStep, setCommentsByStep] = useState({});

  // historyCommentsByStep stores the latest validation comment per step
  // keyed by "evCode__stepCode" → { commentaire, date, user }
  const [historyCommentsByStep, setHistoryCommentsByStep] = useState({});

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    stepCode: null,
    loading: false,
    items: [],
  });

  const getEVCode = () => {
    if (!bloc?.ev_row || bloc.ev_row.length === 0) return null;
    const firstValue = bloc.ev_row.find((cell) => cell.value)?.value;
    return firstValue || null;
  };

  const getStepCodeFromRow = (rowIndex) => {
    const row = bloc?.rows?.[rowIndex];
    const stepCodeCell = row?.cells?.find((cell) => cell.field === "Nom (Steps)");
    return stepCodeCell?.value;
  };

  const getCotationCellFromRow = (rowIndex) => {
    const row = bloc?.rows?.[rowIndex];
    return row?.cells?.find(
      (cell) => cell.field === "Cotation (Résultats)" && cell.type === "select"
    );
  };

  const hasCotationForRow = (rowIndex) => {
    return Boolean(getCotationCellFromRow(rowIndex));
  };

  const isGreenRow = (rowIndex) => {
    return bloc?.rows?.[rowIndex]?.color === "green";
  };

  const canShowMeasuredCommentButton = (rowIndex) => {
    return isGreenRow(rowIndex) && hasCotationForRow(rowIndex);
  };

  const getStepKey = (stepCode) => {
    const evCode = getEVCode();
    return `${evCode}__${stepCode}`;
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handlePendingChange = (rowIndex, field, newValue, oldValue) => {
    if (newValue === oldValue) return;
    const stepCode = getStepCodeFromRow(rowIndex);
    setConfirmModal({
      isOpen: true,
      rowIndex,
      field,
      newValue,
      oldValue: oldValue || "A_coter",
      commentaire: "",
      stepCode,
      mode: "cotation",
    });
  };

  const handleConfirmCotation = async (commentaire) => {
    await onSelectChange(
      confirmModal.rowIndex,
      confirmModal.field,
      confirmModal.newValue,
      commentaire
    );
  };

  // ─── History (COMMENT_FIELDS) ────────────────────────────────────────────

  const openHistory = async (rowIndex) => {
    const stepCode = getStepCodeFromRow(rowIndex);
    if (!stepCode) {
      alert("Step code introuvable.");
      return;
    }

    setHistoryModal({ isOpen: true, stepCode, loading: true, items: [] });

    try {
      const data = await validationsAPI.getStepHistory(stepCode);
      setHistoryModal({ isOpen: true, stepCode, loading: false, items: data });
    } catch (error) {
      console.error(error);
      setHistoryModal({ isOpen: true, stepCode, loading: false, items: [] });
      alert("Erreur lors du chargement de l'historique.");
    }
  };

  // When history modal closes, extract the most recent comment from its items
  // and persist it into historyCommentsByStep so the row shows it immediately.
  const closeHistory = () => {
    const { stepCode, items } = historyModal;

    if (stepCode && items && items.length > 0) {
      // items are ordered by -created_at (most recent first) by the API
      const latest = items[0];
      const key = getStepKey(stepCode);

      setHistoryCommentsByStep((prev) => ({
        ...prev,
        [key]: {
          commentaire: latest.commentaire || latest.comment || "",
          user: latest.validated_by_name || latest.user_name || "",
          date: latest.date_validation || latest.created_at || "",
        },
      }));
    }

    setHistoryModal({ isOpen: false, stepCode: null, loading: false, items: [] });
  };

  // ─── Pre-load latest history comment for COMMENT_FIELDS rows ────────────
  // Fetches the most recent validation comment for every row that has a
  // cotation, so the comment text is visible immediately without clicking.
  useEffect(() => {
    const loadHistoryComments = async () => {
      if (!bloc?.rows?.length) return;

      const rowsWithCotation = bloc.rows
        .map((row, rowIndex) => ({
          rowIndex,
          stepCode: getStepCodeFromRow(rowIndex),
        }))
        .filter((item) => item.stepCode && hasCotationForRow(item.rowIndex));

      if (rowsWithCotation.length === 0) return;

      try {
        const entries = await Promise.all(
          rowsWithCotation.map(async ({ stepCode }) => {
            const data = await validationsAPI.getStepHistory(stepCode);
            const items = Array.isArray(data) ? data : [];
            if (items.length === 0) return null;
            const latest = items[0];
            return [
              getStepKey(stepCode),
              {
                commentaire: latest.commentaire || latest.comment || "",
                user: latest.validated_by_name || latest.user_name || "",
                date: latest.date_validation || latest.created_at || "",
              },
            ];
          })
        );

        const validEntries = entries.filter(Boolean);
        if (validEntries.length > 0) {
          setHistoryCommentsByStep(Object.fromEntries(validEntries));
        }
      } catch (err) {
        console.error("Erreur chargement historique commentaires:", err);
      }
    };

    loadHistoryComments();
  }, [bloc, gammeId]);

  // ─── Pre-load measured result comments on mount ──────────────────────────
  useEffect(() => {
    const loadMeasuredComments = async () => {
      const evCode = getEVCode();
      if (!evCode || !bloc?.rows?.length) return;

      const greenRowsWithCotation = bloc.rows
        .map((row, rowIndex) => ({
          rowIndex,
          stepCode: getStepCodeFromRow(rowIndex),
          color: row.color,
        }))
        .filter(
          (item) =>
            item.color === "green" &&
            item.stepCode &&
            hasCotationForRow(item.rowIndex)
        );

      if (greenRowsWithCotation.length === 0) return;

      try {
        const entries = await Promise.all(
          greenRowsWithCotation.map(async ({ stepCode }) => {
            const data = await measuredResultCommentsAPI.list({
              gammeId,
              evCode,
              stepCode,
            });
            return [getStepKey(stepCode), Array.isArray(data) ? data : []];
          })
        );

        const validEntries = entries.filter(([, comments]) => comments.length > 0);
        if (validEntries.length > 0) {
          setCommentsByStep((prev) => ({
            ...prev,
            ...Object.fromEntries(validEntries),
          }));
        }
      } catch (err) {
        console.error("Erreur chargement commentaires résultat mesuré:", err);
      }
    };

    loadMeasuredComments();
  }, [bloc, gammeId]);

  // ─── Measured result comments (isResultCommentField) ─────────────────────

  const openMeasuredResultComment = async (rowIndex) => {
    const stepCode = getStepCodeFromRow(rowIndex);
    const evCode = getEVCode();

    if (!stepCode || !evCode) {
      alert("EV ou Step introuvable.");
      return;
    }

    setMeasuredCommentModal({
      ...emptyMeasuredModal,
      isOpen: true,
      rowIndex,
      stepCode,
      loading: true,
    });

    try {
      const data = await measuredResultCommentsAPI.list({
        gammeId,
        evCode,
        stepCode,
      });
      const comments = Array.isArray(data) ? data : [];
      const key = getStepKey(stepCode);

      // ✅ Use the correct step key
      setCommentsByStep((prev) => ({ ...prev, [key]: comments }));
      setMeasuredCommentModal((prev) => ({ ...prev, comments, loading: false }));
    } catch (err) {
      console.error(err);
      setMeasuredCommentModal((prev) => ({ ...prev, comments: [], loading: false }));
    }
  };

  const createMeasuredComment = async () => {
    const evCode = getEVCode();
    const stepCode = measuredCommentModal.stepCode;
    const commentaire = measuredCommentModal.newComment.trim();

    if (!commentaire) {
      alert("Le commentaire est obligatoire.");
      return;
    }

    try {
      setMeasuredCommentModal((prev) => ({ ...prev, saving: true }));

      const data = await measuredResultCommentsAPI.create({
        gammeId,
        evCode,
        stepCode,
        commentaire,
      });

      const newComment = Array.isArray(data) ? data[0] : data;
      const updatedComments = [...measuredCommentModal.comments, newComment];
      const key = getStepKey(stepCode);

      // ✅ Update both modal state and the row preview simultaneously
      setCommentsByStep((prev) => ({ ...prev, [key]: updatedComments }));
      setMeasuredCommentModal((prev) => ({
        ...prev,
        comments: updatedComments,
        newComment: "",
        saving: false,
      }));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Erreur lors de l'ajout du commentaire.");
      setMeasuredCommentModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const updateMeasuredComment = async (commentId) => {
    const commentaire = measuredCommentModal.editingText.trim();
    if (!commentaire) {
      alert("Le commentaire est obligatoire.");
      return;
    }

    try {
      await measuredResultCommentsAPI.update({ commentId, commentaire });

      const updatedComments = measuredCommentModal.comments.map((c) =>
        c.id === commentId ? { ...c, commentaire } : c
      );
      const key = getStepKey(measuredCommentModal.stepCode);

      // ✅ Sync row preview
      setCommentsByStep((prev) => ({ ...prev, [key]: updatedComments }));
      setMeasuredCommentModal((prev) => ({
        ...prev,
        comments: updatedComments,
        editingId: null,
        editingText: "",
      }));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Erreur lors de la modification du commentaire.");
    }
  };

  const deleteMeasuredComment = async (commentId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce commentaire ?")) return;

    try {
      await measuredResultCommentsAPI.delete(commentId);

      const updatedComments = measuredCommentModal.comments.filter(
        (c) => c.id !== commentId
      );
      const key = getStepKey(measuredCommentModal.stepCode);

      // ✅ Sync row preview
      setCommentsByStep((prev) => ({ ...prev, [key]: updatedComments }));
      setMeasuredCommentModal((prev) => ({ ...prev, comments: updatedComments }));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.detail || "Erreur lors de la suppression du commentaire.");
    }
  };

  // ─── Cell renderer ────────────────────────────────────────────────────────

  const renderCell = (cell, colIndex, rowIndex) => {
    const borderCls = "border-r border-black/10 last:border-r-0";

    if (cell.field === "Cotation (Résultats)") {
      return (
        <td key={colIndex} className={`px-2 py-1.5 ${borderCls}`}>
          {cell.type === "select" ? (
            <CotationSelect
              cell={cell}
              rowIndex={rowIndex}
              disabled={disabled}
              onPendingChange={handlePendingChange}
            />
          ) : (
            <span className="text-slate-300 text-xs select-none">—</span>
          )}
        </td>
      );
    }

    // ── Measured result comment column ────────────────────────────────────
    if (isResultCommentField(cell.field)) {
      const canShowButton = canShowMeasuredCommentButton(rowIndex);
      const stepCode = getStepCodeFromRow(rowIndex);
      const stepKey = getStepKey(stepCode);

      const rowComments = commentsByStep[stepKey] || [];
      const hasComments = rowComments.length > 0;
      // API orders by -created_at so index 0 is the most recent
      const lastComment = hasComments ? rowComments[0] : null;

      return (
        <td key={colIndex} className={`px-2 py-2 ${borderCls}`}>
          <div className="flex flex-col gap-1.5">
            <span className="line-clamp-2 leading-relaxed text-xs text-slate-800 font-semibold">
              {cell.value || ""}
            </span>

            {canShowButton && (
              <div className="flex items-start gap-2">
                {hasComments && (
                  <div className="flex-1 rounded-md p-1.5 text-xs">
                    <p className="text-slate-700 line-clamp-2 leading-tight">
                      {lastComment.commentaire || lastComment.texte}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openMeasuredResultComment(rowIndex)}
                  title={
                    readOnly
                      ? "Voir tous les commentaires"
                      : "Ajouter ou consulter les commentaires"
                  }
                  className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors hover:bg-slate-200"
                  style={{
                    backgroundColor: readOnly ? "#f1f5f9" : "#eef2ff",
                    color: readOnly ? "#64748b" : "#4f46e5",
                  }}
                >
                  {readOnly ? "👁️" : "💬"}
                </button>
              </div>
            )}
          </div>
        </td>
      );
    }

    if (isEtatField(cell.field)) {
      return (
        <td key={colIndex} className={`px-2 py-2 ${borderCls} whitespace-nowrap`}>
          <StatusBadge value={cell.value} />
        </td>
      );
    }

    if (cell.field === "Nom (Steps)") {
      return (
        <td
          key={colIndex}
          className={`px-2 py-2 ${borderCls} font-mono text-[11px] text-slate-700 whitespace-nowrap`}
        >
          {cell.value}
        </td>
      );
    }

    // ── History comment column (COMMENT_FIELDS) ───────────────────────────
    if (COMMENT_FIELDS.includes(cell.field)) {
      const hasCotation = hasCotationForRow(rowIndex);
      const stepCode = getStepCodeFromRow(rowIndex);
      const stepKey = getStepKey(stepCode);
      const historyComment = historyCommentsByStep[stepKey];

      return (
        <td key={colIndex} className={`px-2 py-2 ${borderCls}`}>
          <div className="flex items-center gap-2">
            {hasCotation ? (
              <>
                {/* ✅ Show latest comment text in real time */}
                {historyComment?.commentaire && (
                  <span className="flex-1 text-xs text-slate-700 line-clamp-2 leading-tight">
                    {historyComment.commentaire}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => openHistory(rowIndex)}
                  className="flex-shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors whitespace-nowrap"
                >
                  💬
                </button>
              </>
            ) : (
              <span className="text-slate-300 text-xs select-none">—</span>
            )}
          </div>
        </td>
      );
    }

    return (
      <td
        key={colIndex}
        className={`px-2 py-2 text-slate-800 ${borderCls} max-w-[220px]`}
      >
        <span className="line-clamp-3 leading-relaxed text-xs">
          {cell.value || ""}
        </span>
      </td>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!bloc) return null;

  return (
    <div className="relative">
      <div className="mt-4">
        <CommentairesSection
          gammeId={gammeId}
          evCode={getEVCode()}
          mode="ev"
          title="Commentaire général EV"
          readOnly={readOnly}
        />
      </div>

      <div className="w-full overflow-x-auto rounded-xl shadow border border-slate-300 bg-white mt-4">
        <table
          className="w-full text-xs border-collapse"
          style={{ minWidth: "900px" }}
        >
          <thead>
            <tr className="bg-slate-700 text-white sticky top-0 z-20">
              {colonnes?.map((col, i) => (
                <th
                  key={i}
                  className="px-2 py-2.5 text-left font-bold uppercase tracking-wide text-[10px] whitespace-nowrap border-r border-slate-600 last:border-r-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {bloc.ev_row && (
              <tr
                style={{
                  backgroundColor: ROW_BG.ev,
                  borderBottom: `1px solid ${ROW_BORDER.ev}`,
                }}
              >
                {bloc.ev_row.map((cell, i) => (
                  <td
                    key={i}
                    className="px-2 py-2.5 border-r last:border-r-0 font-bold text-sm"
                    style={{ borderColor: ROW_BORDER.ev }}
                  >
                    {isEtatField(cell.field) ? (
                      <StatusBadge value={cell.value} />
                    ) : (
                      cell.value || ""
                    )}
                  </td>
                ))}
              </tr>
            )}

            {bloc.rows.map((row, rowIndex) => {
              const { cells, color } = row;
              const bg = ROW_BG[color] || ROW_BG.beige;
              const border = ROW_BORDER[color] || ROW_BORDER.beige;

              return (
                <tr
                  key={rowIndex}
                  style={{
                    backgroundColor: bg,
                    borderBottom: `1px solid ${border}`,
                  }}
                  className="transition-colors duration-100"
                >
                  {cells.map((cell, colIndex) =>
                    renderCell(cell, colIndex, rowIndex)
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmCotationModal
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        onConfirm={handleConfirmCotation}
      />

      <HistoryModal
        historyModal={historyModal}
        onClose={closeHistory}
      />

      <MeasuredResultCommentsModal
        modal={measuredCommentModal}
        setModal={setMeasuredCommentModal}
        readOnly={readOnly}
        onCreate={createMeasuredComment}
        onUpdate={updateMeasuredComment}
        onDelete={deleteMeasuredComment}
      />
    </div>
  );
};

export default BlocCardList;
