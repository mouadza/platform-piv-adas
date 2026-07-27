import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import { usersAPI } from "../api/index";

const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const UsersSkeleton = () => (
  <div className="space-y-3 p-4">
    {[0, 1, 2, 3].map((item) => (
      <div
        key={item}
        className="h-16 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
      />
    ))}
  </div>
);

const ListeUtilisateurs = () => {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    userId: null,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const filteredUtilisateurs = useMemo(() => {
    const term = normalizeSearchText(search.trim());
    if (!term) return utilisateurs;

    return utilisateurs.filter((user) => {
      const affectations = (user.affectations || []).flatMap((affectation) => [
        affectation.role?.label,
        affectation.role_label,
        affectation.role,
        affectation.projet?.nom_projet,
        affectation.projet_nom,
      ]);

      return [user.username, user.email, ...affectations].some((value) =>
        normalizeSearchText(value).includes(term)
      );
    });
  }, [search, utilisateurs]);

  useEffect(() => {
    if (location.state?.warning) {
      setNotice({ type: "warning", message: location.state.warning });
      window.history.replaceState({}, document.title);
    } else if (location.state?.success) {
      setNotice({ type: "success", message: location.state.success });
      window.history.replaceState({}, document.title);
    }

    const fetchUtilisateurs = async () => {
      try {
        setLoading(true);
        const data = await usersAPI.list();
        setUtilisateurs(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUtilisateurs();
  }, [location.state]);

  const groupAffectations = (affectations = []) => {
    const grouped = {};

    affectations.forEach((affectation) => {
      const role =
        affectation.role?.label ||
        affectation.role_label ||
        affectation.role ||
        "Inconnu";
      const projet =
        affectation.projet?.nom_projet || affectation.projet_nom || "-";

      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(projet);
    });

    return grouped;
  };

  const formatAffectations = (user) => {
    if (!user.affectations || user.affectations.length === 0) {
      return <span className="text-xs italic text-slate-400">Aucune</span>;
    }

    const grouped = groupAffectations(user.affectations);

    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(grouped).map(([role, projets]) => (
          <span
            key={role}
            className="inline-flex max-w-full rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"
            title={projets.join(", ")}
          >
            {role}: {projets.length}
          </span>
        ))}
      </div>
    );
  };

  const confirmDelete = async () => {
    try {
      await usersAPI.delete(confirmModal.userId);
      setUtilisateurs((prev) =>
        prev.filter((user) => user.id !== confirmModal.userId)
      );
    } catch {
      alert("Erreur lors de la suppression");
    } finally {
      setConfirmModal({ open: false, userId: null });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-5">
        <section className="app-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Utilisateurs
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                Liste des utilisateurs
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Comptes, emails et affectations par projet.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/GestionCompte")}
              className="btn-primary min-h-10"
            >
              <Plus size={16} />
              Ajouter un utilisateur
            </button>
          </div>
        </section>

        {notice && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
              notice.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {notice.message}
          </div>
        )}

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
                placeholder="Rechercher un utilisateur..."
                aria-label="Rechercher un utilisateur"
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
                {filteredUtilisateurs.length} résultat(s)
              </p>
            )}
          </div>

          {loading ? (
            <UsersSkeleton />
          ) : utilisateurs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <UsersRound size={42} className="text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Aucun utilisateur
              </p>
            </div>
          ) : filteredUtilisateurs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Search size={42} className="text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Aucun utilisateur ne correspond à « {search.trim()} »
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
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead className="bg-[#00133B] text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-5 py-3 font-bold">Username</th>
                    <th className="px-5 py-3 font-bold">Email</th>
                    <th className="px-5 py-3 font-bold">Affectations</th>
                    <th className="px-5 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUtilisateurs.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {user.username}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {user.email || "-"}
                      </td>
                      <td className="px-5 py-4">{formatAffectations(user)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/ModifUser", { state: { user } })
                            }
                            className="btn-secondary h-9 px-3"
                          >
                            <Pencil size={15} />
                            Editer
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                open: true,
                                userId: user.id,
                              })
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100"
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

        {confirmModal.open && (
          <div className="modal-backdrop">
            <div className="modal-sheet p-6 sm:max-w-md">
              <h3 className="text-lg font-extrabold text-slate-950">
                Supprimer l'utilisateur ?
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                Cette action est irreversible.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: false, userId: null })}
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
      </div>
    </DashboardLayout>
  );
};

export default ListeUtilisateurs;

