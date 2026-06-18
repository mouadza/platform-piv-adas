import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Send,
  User,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { commentsAPI, generalCommentsAPI } from "../api/index";
import { listGlobalGeneralComments } from "../utils/globalGammeComments";

const CommentairesSection = ({
  gammeId,
  gammeName = "",
  evCode = null,
  mode = "gamme",
  type = null,
  title,
  readOnly = false,
}) => {
  const [commentaires, setCommentaires] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const isEVMode = mode === "ev" && Boolean(evCode);
  const isGeneralMode = mode === "general" && Boolean(type);

  const getTitle = () => {
    if (title) return title;
    if (isEVMode) return "Commentaire général EV";
    if (isGeneralMode && type === "BESOINS") {
      return "Commentaires besoins techniques";
    }
    if (isGeneralMode && type === "PISTES") {
      return "Commentaires pistes";
    }
    return "Commentaires";
  };

  const getCommentText = (commentaire) => {
    return (
      commentaire.texte ||
      commentaire.commentaire ||
      commentaire.contenu ||
      commentaire.text ||
      ""
    );
  };

  const getCommentDate = (commentaire) => {
    return commentaire.date || commentaire.created_at || commentaire.updated_at;
  };

  const load = async () => {
    if (!gammeId) return;
    if (mode === "ev" && !evCode) return;
    if (mode === "general" && !type) return;

    try {
      let data;

      if (isEVMode) {
        data = await commentsAPI.listEV({
          evCode,
          gammeId,
        });
      } else if (isGeneralMode) {
        data = await listGlobalGeneralComments({
          gammeId,
          gammeName,
          type,
        });
      } else {
        data = [];
      }

      setCommentaires(data);
    } catch (error) {
      console.error("Erreur chargement commentaires:", error);
    }
  };

  useEffect(() => {
    load();
    setEditingId(null);
    setEditingText("");
    setText("");
  }, [gammeId, gammeName, evCode, mode, type]);

  const add = async () => {
    
    if (readOnly) return;
    if (!text.trim()) return;

    setLoading(true);

    try {
      if (isEVMode) {
        await commentsAPI.createEV({
          evCode,
          gammeId,
          commentaire: text.trim(),
        });
      } else if (isGeneralMode) {
        await generalCommentsAPI.create({
          gammeId,
          type,
          commentaire: text.trim(),
        });
      } else {
        return;
      }

      setText("");
      await load();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Erreur lors de l'ajout du commentaire.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (commentaire) => {
    setEditingId(commentaire.id);
    setEditingText(getCommentText(commentaire));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async (commentaireId) => {
    if (!editingText.trim()) {
      alert("Le commentaire ne peut pas être vide.");
      return;
    }

    try {
      if (isEVMode) {
        await commentsAPI.updateEV(commentaireId, {
          gammeId,
          commentaire: editingText.trim(),
        });
      } else if (isGeneralMode) {
        await generalCommentsAPI.update(commentaireId, {
          commentaire: editingText.trim(),
        });
      } else {
        return;
      }

      setEditingId(null);
      setEditingText("");
      await load();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Erreur lors de la modification.");
    }
  };

  const deleteComment = async (commentaireId) => {
    const ok = window.confirm("Voulez-vous vraiment supprimer ce commentaire ?");
    if (!ok) return;

    try {
      if (isEVMode) {
        await commentsAPI.deleteEV(commentaireId, { gammeId });
      } else if (isGeneralMode) {
        await generalCommentsAPI.delete(commentaireId);
      } else {
        return;
      }

      await load();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Erreur lors de la suppression.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      add();
    }
  };

  const canShowActions = (commentaire) => {
    if (readOnly) return false;

    const userRole = localStorage.getItem("role");
    const isAdmin = userRole === "admin";

    if (isAdmin) return true;

    return commentaire.can_edit === true || commentaire.can_edit === "true";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <MessageSquare size={16} className="text-sky-500" />

        <h3 className="font-bold text-slate-700 text-sm">
          {getTitle()}

          {isEVMode && evCode && (
            <span className="ml-2 text-[11px] font-mono text-slate-400">
              {evCode}
            </span>
          )}

          {isGeneralMode && type && (
            <span className="ml-2 text-[11px] font-mono text-slate-400">
              {type}
            </span>
          )}

          {commentaires.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-sky-100 text-sky-600 rounded-full">
              {commentaires.length}
            </span>
          )}
        </h3>
      </div>

      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {commentaires.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Aucun commentaire
          </p>
        ) : (
          commentaires.map((c) => (
            <div
              key={c.id}
              className="flex gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center mt-0.5">
                <User size={14} className="text-sky-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {c.auteur && (
                      <p className="text-xs font-bold text-slate-500 mb-0.5">
                        {c.auteur}
                      </p>
                    )}

                    {editingId === c.id ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                        {getCommentText(c)}
                      </p>
                    )}

                    {getCommentDate(c) && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(getCommentDate(c)).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {canShowActions(c) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingId === c.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(c.id)}
                            className=" h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            title="Enregistrer"
                          >
                            <Check size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={cancelEdit}
                            className=" h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                            title="Annuler"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"
                            title="Modifier"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteComment(c.id)}
                            className=" h-7 w-7 flex items-center justify-center rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!readOnly && (
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Ajouter un commentaire… (Ctrl+Entrée pour envoyer)"
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition-all"
          />

          <button
            type="button"
            onClick={add}
            disabled={loading || !text.trim()}
            className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm shadow-sky-200"
            title="Envoyer"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    )}
    </div>
  );
};

export default CommentairesSection;
