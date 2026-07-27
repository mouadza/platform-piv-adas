import React, { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import { projectsAPI } from "../api/index";

const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const groupByRole = (affectations = [], role) =>
  affectations
    .filter((item) => item.role?.toUpperCase() === role.toUpperCase())
    .map((item) => item.user)
    .filter(Boolean)
    .join(", ") || "-";

const ProjectSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2, 3].map((item) => (
      <div
        key={item}
        className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
      />
    ))}
  </div>
);

const ListeProjets = () => {
  const [projets, setProjets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [projetToDelete, setProjetToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const navigate = useNavigate();
  const location = useLocation();

  const filteredProjets = useMemo(() => {
    const term = normalizeSearchText(search.trim());
    if (!term) return projets;

    return projets.filter((projet) => {
      const affectations = (projet.affectations || []).flatMap(
        (affectation) => [affectation.role, affectation.user]
      );

      return [
        projet.nom_projet,
        projet.nombre_vehicules,
        ...(projet.architectures || []),
        ...(projet.motorisations || []),
        ...affectations,
      ].some((value) => normalizeSearchText(value).includes(term));
    });
  }, [projets, search]);

  useEffect(() => {
    const fetchProjets = async () => {
      try {
        setLoading(true);
        const data = await projectsAPI.list();
        setProjets(data || []);
        setError("");
      } catch (err) {
        console.error("Fetch projets error:", err);
        setError(err.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchProjets();
  }, [location]);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const confirmDelete = async () => {
    if (!projetToDelete) return;

    try {
      await projectsAPI.delete(projetToDelete.id);
      setProjets((prev) => prev.filter((item) => item.id !== projetToDelete.id));
      showToast("Projet supprime avec succes", "success");
    } catch (err) {
      console.error("Erreur de suppression :", err);
      showToast(err.message || "Echec de la suppression", "error");
    } finally {
      setProjetToDelete(null);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-5">
        <section className="app-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Projets
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                Liste des projets
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Structure vehicules, architectures, affectations et actions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/CreerProjet")}
              className="btn-primary min-h-10"
            >
              <Plus size={16} />
              Ajouter un projet
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="app-card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un projet..."
                aria-label="Rechercher un projet"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#243782] focus:ring-2 focus:ring-[#243782]/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {!loading && (
              <p className="text-xs font-semibold text-slate-500">
                {filteredProjets.length} résultat(s)
              </p>
            )}
          </div>

          {loading ? (
            <div className="p-4">
              <ProjectSkeleton />
            </div>
          ) : projets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm font-bold text-slate-700">Aucun projet</p>
            </div>
          ) : filteredProjets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Search size={42} className="text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Aucun projet ne correspond à « {search.trim()} »
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 text-sm font-bold text-[#243782] hover:underline"
              >
                Effacer la recherche
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead className="bg-[#00133B] text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3 font-bold">Projet</th>
                    <th className="px-4 py-3 font-bold">Vehicules</th>
                    <th className="px-4 py-3 font-bold">Architectures</th>
                    <th className="px-4 py-3 font-bold">Motorisations</th>
                    <th className="px-4 py-3 font-bold">PPL</th>
                    <th className="px-4 py-3 font-bold">Valideurs</th>
                    <th className="px-4 py-3 font-bold">Visiteurs</th>
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProjets.map((projet) => (
                    <tr key={projet.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 font-bold text-slate-900">
                        {projet.nom_projet}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {projet.nombre_vehicules}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {(projet.architectures || []).join(", ") || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {(projet.motorisations || []).join(", ") || "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {groupByRole(projet.affectations, "PPL")}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {groupByRole(projet.affectations, "VALIDEUR")}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {groupByRole(projet.affectations, "VISITEUR")}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/ViewProjet/${projet.id}`, {
                                state: { projet },
                              })
                            }
                            className="btn-secondary h-9 px-3"
                            title="Details"
                          >
                            <Eye size={15} />
                            Voir
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/Modifprojet/${projet.id}`, {
                                state: { projet },
                              })
                            }
                            className="btn-secondary h-9 px-3"
                            title="Modifier"
                          >
                            <Pencil size={15} />
                            Editer
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjetToDelete(projet)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {projetToDelete && (
          <div className="modal-backdrop">
            <div className="modal-sheet p-6 sm:max-w-md">
              <h3 className="text-lg font-extrabold text-slate-950">
                Confirmer la suppression
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Supprimer le projet{" "}
                <span className="font-bold">{projetToDelete.nom_projet}</span> ?
                Cette action est irreversible.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setProjetToDelete(null)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div
            className={`fixed bottom-24 right-6 z-50 rounded-lg px-5 py-3 text-sm font-bold text-white shadow-lg md:bottom-8 ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ListeProjets;

