import React from "react";

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

const MeasuredResultCommentsModal = ({
  modal,
  setModal,
  readOnly,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  if (!modal.isOpen) return null;

  const comments = modal.comments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[560px] max-h-[85vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Commentaires résultat mesuré
            </h3>

            <p className="text-xs text-slate-500 font-mono">
              {modal.stepCode}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModal(emptyMeasuredModal)}
            className="text-slate-500 hover:text-slate-900 font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {modal.loading && (
            <p className="text-sm text-slate-500">Chargement...</p>
          )}

          {!modal.loading && comments.length === 0 && (
            <p className="text-sm text-slate-400">
              Aucun commentaire pour ce résultat mesuré.
            </p>
          )}

          {!modal.loading &&
            comments.map((item) => (
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

                {modal.editingId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={modal.editingText}
                      onChange={(e) =>
                        setModal((prev) => ({
                          ...prev,
                          editingText: e.target.value,
                        }))
                      }
                      className="w-full min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            editingId: null,
                            editingText: "",
                          }))
                        }
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-md"
                      >
                        Annuler
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdate(item.id)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {item.commentaire}
                    </p>

                    {!readOnly && item.can_edit && (
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setModal((prev) => ({
                              ...prev,
                              editingId: item.id,
                              editingText: item.commentaire,
                            }))
                          }
                          className="px-3 py-1.5 text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100"
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-red-50 border border-red-200 text-red-700 rounded-md hover:bg-red-100"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
        </div>

        {!readOnly && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50">
            <textarea
              value={modal.newComment}
              onChange={(e) =>
                setModal((prev) => ({
                  ...prev,
                  newComment: e.target.value,
                }))
              }
              placeholder="Ajouter un commentaire lié au résultat mesuré..."
              className="w-full min-h-[90px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={onCreate}
                disabled={modal.saving}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60"
              >
                {modal.saving ? "Enregistrement..." : "Ajouter commentaire"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasuredResultCommentsModal;