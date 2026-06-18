import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaGripVertical, 
  FaSave, 
  FaExclamationTriangle 
} from "react-icons/fa";
import DashboardLayout from "../components/DashboardLayout";
import { projectsAPI, gammesAPI } from "../api/index";

// Imports DND-Kit
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableTableRow = ({ gamme, index, changeStatus, setGammeToDelete, requestNavigation, projetId }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gamme.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "CONFIG":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200";
      case "NOT_CONFIG":
        return "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
      case "CANCEL":
        return "bg-red-100 text-red-700 border-red-200 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t transition-colors ${
        isDragging ? "bg-blue-50 shadow-lg z-10 relative opacity-80" : "hover:bg-slate-50 bg-white"
      }`}
    >
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-blue-500 cursor-grab active:cursor-grabbing p-1 transition-colors"
            title="Glisser pour réorganiser"
          >
            <FaGripVertical size={16} />
          </button>
          <span className="font-semibold text-slate-400 w-4 text-left">{index + 1}</span>
        </div>
      </td>

      <td className="px-4 py-3 text-center">{gamme.nom_gamme || "-"}</td>
      <td className="px-4 py-3 font-semibold text-slate-700">{gamme.nom || "-"}</td>
      <td className="px-4 py-3 text-center">{gamme.vehicule?.cmq || "-"}</td>
      <td className="px-4 py-3 text-center text-slate-600">{gamme.type_procedure || "-"}</td>
      <td className="px-4 py-3 text-center text-slate-600">{gamme.fonction || "-"}</td>
      <td className="px-4 py-3 text-center">{gamme.pistes || "-"}</td>
      <td className="px-4 py-3 text-center">{gamme.boitiers || "-"}</td>

      <td className="px-4 py-3 text-center">
        <div className="relative inline-block w-full max-w-[130px]">
          <select
            value={gamme.status || "NOT_CONFIG"}
            onChange={(e) => changeStatus(gamme.id, e.target.value)}
            className={`appearance-none w-full text-xs font-bold rounded-full px-3 py-1.5 border cursor-pointer outline-none transition-all duration-200 text-center ${getStatusStyle(gamme.status)}`}
          >
            <option value="CONFIG">Configurer</option>
            <option value="NOT_CONFIG">Non configuré</option>
            <option value="CANCEL">Annuler</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-current opacity-50">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-center">
        {gamme.fichier_gamme ? (
          <a
            href={gamme.fichier_gamme}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 hover:underline transition-colors"
          >
            {gamme.original_filename || gamme.nom || `Fichier ${gamme.id}`}
          </a>
        ) : (
          <span className="text-slate-400 italic text-xs">Aucun</span>
        )}
      </td>

      <td className="px-4 py-3 text-center">
        <div className="flex justify-center gap-3">
          <button
            onClick={() => requestNavigation(`/gamme/${projetId}/${gamme.id}`)}
            className="p-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            title="Voir"
          >
            <FaEye size={15} />
          </button>
          <button
            onClick={() => requestNavigation(`/gamme/${projetId}/${gamme.id}/edit`)}
            className="p-1.5 text-amber-500 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            title="Modifier"
          >
            <FaEdit size={15} />
          </button>
          <button
            onClick={() => setGammeToDelete(gamme)}
            className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            title="Supprimer"
          >
            <FaTrash size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
const ViewProjet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("role");
  
  const [projet, setProjet] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [originalGammes, setOriginalGammes] = useState([]); 
  const [gammes, setGammes] = useState([]); 
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const [gammeToDelete, setGammeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null); 

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const fetchProjet = async () => {
      try {
        const data = await projectsAPI.detail(id);
        setProjet(data);
      } catch (e) {
        console.error("Erreur chargement projet", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjet();
  }, [id]);

  useEffect(() => {
    const fetchGammes = async () => {
      try {
        const data = await gammesAPI.listByProjet(id);
        const safeData = Array.isArray(data) ? data : [];

        setGammes(safeData);
        setOriginalGammes(JSON.parse(JSON.stringify(safeData)));
      } catch (e) {
        console.error("Erreur chargement gammes", e);
      }
    };
    fetchGammes();
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const changeStatus = (gammeId, status) => {
    setGammes((prev) => prev.map((g) => (g.id === gammeId ? { ...g, status } : g)));
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = gammes.findIndex((g) => g.id === active.id);
    const newIndex = gammes.findIndex((g) => g.id === over.id);
    const newOrder = arrayMove(gammes, oldIndex, newIndex);

    setGammes(newOrder);
    setHasUnsavedChanges(true);
  };

  const saveChanges = async (redirectPath = null) => {
    setSaving(true);
    try {
      const statusPromises = gammes.map((g) => {
        const original = originalGammes.find((og) => og.id === g.id);
        if (original && original.status !== g.status) {
          return gammesAPI.updateStatus(g.id, { status: g.status });
        }
        return null;
      }).filter(Boolean); // Retire les 'null' du tableau
      
      await Promise.all(statusPromises);

      const orderHasChanged = gammes.some((g, i) => {
        const originalIndex = originalGammes.findIndex(og => og.id === g.id);
        return originalIndex !== i;
      });

      if (orderHasChanged) {
        const orderPayload = gammes.map((g, i) => ({ id: g.id, ordre: i + 1 }));

        await gammesAPI.reorder(orderPayload);
      }

      setOriginalGammes(JSON.parse(JSON.stringify(gammes)));
      setHasUnsavedChanges(false);

      if (redirectPath) {
        navigate(redirectPath === -1 ? -1 : redirectPath);
      }
    } catch (e) {
      console.error("Erreur de sauvegarde", e);
      alert("Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setSaving(false);
      setPendingNavigation(null);
    }
  };

  const requestNavigation = (path) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
    } else {
      navigate(path === -1 ? -1 : path);
    }
  };

  const discardAndNavigate = () => {
    setHasUnsavedChanges(false);
    setGammes(JSON.parse(JSON.stringify(originalGammes))); 
    navigate(pendingNavigation === -1 ? -1 : pendingNavigation);
  };

  if (loading) {
    return (
      <DashboardLayout role={userRole}>
        <div className="flex h-64 items-center justify-center text-slate-400 italic">
          <div className="animate-pulse flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             Chargement du projet...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!projet) return null;

  const groupByRole = (role) => {
    if (!projet.affectations || !Array.isArray(projet.affectations)) return "-";
    const filtered = projet.affectations.filter((a) => a.role === role);
    return filtered.length > 0 ? filtered.map((a) => a.user).join(", ") : "-";
  };

  return (
    <DashboardLayout role={userRole}>
        <div className="px-4">
          <button
            onClick={() => requestNavigation(-1)}
            className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-2"
          >
            ← Retour
          </button>
          </div>
      <div className="mx-auto px-4 sm:px-8 md:px-16 lg:px-24 py-6">

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
          
          <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {projet.nom_projet}
            </h1>
            <span className="bg-blue-600/10 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold shrink-0">
              ID: {projet.id}
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-800 text-center mb-8 relative">
            <span className="bg-white px-4 relative z-10">À propos du projet</span>
            <div className="absolute top-1/2 left-0 w-full h-px bg-slate-100 -z-0"></div>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Membres affectés</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">PPLs</div>
                  <div className="text-sm font-semibold text-slate-700">{groupByRole("PPL")}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Valideurs</div>
                  <div className="text-sm font-semibold text-slate-700">{groupByRole("VALIDEUR")}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Visiteurs</div>
                  <div className="text-sm font-semibold text-slate-700">{groupByRole("VISITEUR")}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Détails techniques</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Motorisations</div>
                  <div className="text-sm font-semibold text-slate-700">{projet.motorisations?.join(", ") || "-"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Architectures</div>
                  <div className="text-sm font-semibold text-slate-700">{projet.architectures?.join(", ") || "-"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nb véhicules</div>
                  <div className="text-sm font-semibold text-slate-700">{projet.nombre_vehicules || "-"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-xl font-bold text-slate-800">
                Gammes du projet <span className="text-slate-400 font-medium text-lg ml-1">({gammes.length})</span>
              </h3>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {hasUnsavedChanges && (
                <button
                onClick={() => saveChanges()}
                disabled={saving}
                className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <FaSave size={16} />
                )}
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
            )}
              <button
                onClick={() => requestNavigation(`/CreerGamme/${id}`)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
              >
                + Créer une gamme
              </button>
              </div>
            </div>

            {gammes.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-2xl py-16 flex flex-col items-center justify-center bg-slate-50">
                <span className="text-4xl mb-3">📁</span>
                <span className="text-slate-500 font-medium">Aucune gamme créée pour ce projet</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                {/* CORRECTION DE STRUCTURE : DndContext enveloppe la table */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-4 text-center">Ordre d'exécution</th>
                        <th className="px-4 py-4 text-center">Code</th>
                        <th className="px-4 py-4">Config</th>                        
                        <th className="px-4 py-4 text-center">Véhicule</th>
                        <th className="px-4 py-4 text-center">Procédure</th>
                        <th className="px-4 py-4 text-center">Fonction</th>
                        <th className="px-4 py-4 text-center">Pistes</th>
                        <th className="px-4 py-4 text-center">Boitiers</th>
                        <th className="px-4 py-4 text-center">Statut</th>
                        <th className="px-4 py-4 text-center">Fichier</th>
                        <th className="px-4 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <SortableContext items={gammes.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                      <tbody className="divide-y divide-slate-100">
                        {gammes.map((g, index) => (
                          <SortableTableRow
                            key={g.id}
                            gamme={g}
                            index={index}
                            projetId={projet.id}
                            changeStatus={changeStatus}
                            setGammeToDelete={setGammeToDelete}
                            requestNavigation={requestNavigation}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </table>
                </DndContext>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL : Changements non sauvegardés */}
      {pendingNavigation !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mb-5 mx-auto">
              <FaExclamationTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Modifications non enregistrées</h3>
            <p className="text-slate-600 mb-8 text-center text-sm leading-relaxed">
              Vous avez modifié l'ordre ou le statut des gammes. Voulez-vous sauvegarder avant de quitter ?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => saveChanges(pendingNavigation)}
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                Sauvegarder et continuer
              </button>
              <button
                onClick={discardAndNavigate}
                disabled={saving}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Ignorer les modifications
              </button>
              <button
                onClick={() => setPendingNavigation(null)}
                disabled={saving}
                className="w-full px-4 py-2.5 mt-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : Supprimer une gamme */}
      {gammeToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <FaTrash size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Supprimer la gamme</h3>
            <p className="text-slate-600 mb-6 text-center text-sm">
              Êtes-vous sûr de vouloir supprimer "{gammeToDelete.nom_gamme}" ?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setGammeToDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await gammesAPI.delete(gammeToDelete.id);
                    setGammes((prev) => prev.filter((g) => g.id !== gammeToDelete.id));
                    setOriginalGammes((prev) => prev.filter((g) => g.id !== gammeToDelete.id)); 
                    setGammeToDelete(null);
                  } catch {
                    alert("Erreur lors de la suppression");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Suppression..." : "Supprimer"}

              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ViewProjet;
