import React from "react";
import { COTATION } from "./validationConstants";

const HistoryModal = ({ historyModal, onClose }) => {
  if (!historyModal.isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-sheet sm:max-w-[560px]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Historique des commentaires
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {historyModal.stepCode}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5">
          {historyModal.loading && (
            <p className="text-sm text-slate-500">Chargement...</p>
          )}

          {!historyModal.loading && historyModal.items.length === 0 && (
            <p className="text-sm text-slate-500">
              Aucun commentaire trouvé pour ce step.
            </p>
          )}

          {!historyModal.loading &&
            historyModal.items.map((item) => (
              <div
                key={item.id}
                className="mb-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    {item.user_name}
                  </span>

                  <span className="text-[10px] text-slate-500">
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{
                      backgroundColor: COTATION[item.cotation]?.square || "#999",
                    }}
                  />
                  <span className="text-xs font-bold">
                    {COTATION[item.cotation]?.label || item.cotation}
                  </span>
                </div>

                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {item.commentaire || "Aucun commentaire."}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
