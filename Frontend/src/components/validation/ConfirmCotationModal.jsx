import React from "react";
import { COTATION } from "./validationConstants";

const ConfirmCotationModal = ({
  confirmModal,
  setConfirmModal,
  onConfirm,
}) => {
  if (!confirmModal.isOpen) return null;

  const closeModal = () => {
    setConfirmModal({
      isOpen: false,
      rowIndex: null,
      field: null,
      newValue: null,
      oldValue: null,
      commentaire: "",
      stepCode: null,
      mode: "cotation",
    });
  };

  const handleConfirm = async () => {
    const commentaire = confirmModal.commentaire.trim();

    if (confirmModal.newValue !== "OK" && commentaire === "") {
      alert("Le commentaire est obligatoire pour cette cotation.");
      return;
    }

    await onConfirm(commentaire);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[420px] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">
            Confirmer la modification
          </h3>
        </div>

        <div className="px-5 py-5 text-sm text-slate-600">
          <p className="mb-3">
            Voulez-vous vraiment changer la cotation du step :
          </p>

          <p className="mb-4 font-mono text-xs bg-slate-100 border border-slate-200 px-2 py-1 rounded">
            {confirmModal.stepCode}
          </p>

          <div className="flex items-center justify-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4">
            <div className="flex items-center gap-1.5 opacity-60 line-through">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor: COTATION[confirmModal.oldValue]?.square,
                }}
              />
              <span className="font-semibold text-xs">
                {COTATION[confirmModal.oldValue]?.label}
              </span>
            </div>

            <span className="text-slate-400">→</span>

            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shadow-sm"
                style={{
                  backgroundColor: COTATION[confirmModal.newValue]?.square,
                }}
              />
              <span className="font-bold text-xs text-slate-900">
                {COTATION[confirmModal.newValue]?.label}
              </span>
            </div>
          </div>

          <label className="block text-xs font-bold text-slate-700 mb-1">
            Commentaire{" "}
            {confirmModal.newValue !== "OK" && (
              <span className="text-red-600">*</span>
            )}
          </label>

          <textarea
            value={confirmModal.commentaire}
            onChange={(e) =>
              setConfirmModal((prev) => ({
                ...prev,
                commentaire: e.target.value,
              }))
            }
            placeholder={
              confirmModal.newValue === "OK"
                ? "Commentaire facultatif..."
                : "Commentaire obligatoire..."
            }
            className="w-full min-h-[90px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="px-5 py-4 flex justify-end gap-3 bg-slate-50 border-t border-slate-100">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900"
          >
            Annuler
          </button>

          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCotationModal;