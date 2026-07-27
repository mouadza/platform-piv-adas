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
    <div className="modal-backdrop">
      <div className="modal-sheet sm:max-w-[420px]">
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="text-sm font-extrabold text-slate-900">
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

          <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
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
            className="w-full min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-[#243782]/15"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={closeModal}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Annuler
          </button>

          <button
            onClick={handleConfirm}
            className="rounded-lg bg-[#243782] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#00133B]"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCotationModal;


