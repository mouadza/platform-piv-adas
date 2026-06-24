import React, { useEffect, useState } from "react";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import { usersAPI } from "../api/index";

const ListeUtilisateurs = () => {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    userId: null,
  });

  const navigate = useNavigate();
  const location = useLocation();

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
        const data = await usersAPI.list();
        setUtilisateurs(data);
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

      if (!grouped[role]) {
        grouped[role] = [];
      }

      grouped[role].push(projet);
    });

    return grouped;
  };

  const formatAffectations = (user) => {
    if (!user.affectations || user.affectations.length === 0) {
      return <span className="text-slate-400 italic text-xs">Aucune</span>;
    }

    const grouped = groupAffectations(user.affectations);

    return (
      <div className="flex flex-col gap-2">
        {Object.entries(grouped).map(([role, projets]) => (
          <div key={role} className="text-xs">
            <div className="font-bold text-slate-700 mb-1 uppercase">
              {role}
            </div>

            <ul className="pl-4 list-disc text-slate-600">
              {projets.map((projet, index) => (
                <li key={`${role}-${index}`}>{projet}</li>
              ))}
            </ul>
          </div>
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

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex justify-center items-center h-full text-slate-500 italic">
          Chargement des utilisateurs...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto mt-10 max-w-[1200px] bg-white px-6 py-8 rounded-3xl shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            Liste des utilisateurs
          </h2>

          <button
            type="button"
            onClick={() => navigate("/GestionCompte")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center shadow-md"
          >
            <FaPlus className="mr-2" />
            Ajouter un utilisateur
          </button>
        </div>

        {notice && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              notice.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {notice.message}
          </div>
        )}

        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">
                  Username
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">
                  Affectations
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {utilisateurs.map((user) => (
                <tr key={user.id} className="border-t hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {user.username}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {user.email || "-"}
                  </td>

                  <td className="px-6 py-4 w-[350px]">
                    {formatAffectations(user)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/ModifUser", { state: { user } })
                        }
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            userId: user.id,
                          })
                        }
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {confirmModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-[350px] shadow-xl">
              <h3 className="text-lg font-bold text-slate-800 mb-3">
                Supprimer l'utilisateur ?
              </h3>

              <p className="text-sm text-slate-500 mb-6">
                Cette action est irreversible.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmModal({ open: false, userId: null })
                  }
                  className="px-4 py-2 text-sm font-semibold text-slate-500"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
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
