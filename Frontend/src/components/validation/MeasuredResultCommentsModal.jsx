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
    <div className="modal-backdrop">
      <div className="modal-sheet sm:max-w-[560px]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Commentaires résultat mesuré
            </h3>

            <p className="text-xs text-slate-500 font-mono">
              {modal.stepCode}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModal(emptyMeasuredModal)}
            className="rounded-lg px-2 py-1 font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-5">
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
                      className="w-full min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-[#243782]/15"
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
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold"
                      >
                        Annuler
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdate(item.id)}
                        className="rounded-lg bg-[#243782] px-3 py-1.5 text-xs font-bold text-white"
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
                          className="rounded-lg border border-[#243782]/25 bg-[#243782]/10 px-3 py-1.5 text-xs font-bold text-[#243782] hover:bg-[#243782]/15"
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
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
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <textarea
              value={modal.newComment}
              onChange={(e) =>
                setModal((prev) => ({
                  ...prev,
                  newComment: e.target.value,
                }))
              }
              placeholder="Ajouter un commentaire lié au résultat mesuré..."
              className="w-full min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-[#243782]/15"
            />

            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={onCreate}
                disabled={modal.saving}
                className="rounded-lg bg-[#243782] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#00133B] disabled:opacity-60"
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


