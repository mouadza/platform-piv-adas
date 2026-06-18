import React from "react";
import { COTATION } from "./validationConstants";

const HistoryModal = ({ historyModal, onClose }) => {
  if (!historyModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[560px] max-h-[80vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Historique des commentaires
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              {historyModal.stepCode}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
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
                className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
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