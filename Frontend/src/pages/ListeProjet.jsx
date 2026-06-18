import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaEye } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { projectsAPI } from "../api/index";

const groupByRole = (affectations = [], role) => {
  return affectations
    .filter(
      (a) =>
        a.role &&
        a.role.toUpperCase() === role.toUpperCase()
    )
    .map((a) => a.user)
    .join(", ") || "-";
};

const ListeProjets = () => {
  const [projets, setProjets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Nouveaux states pour la modale et les notifications
  const [projetToDelete, setProjetToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProjets = async () => {
      try {
        setLoading(true);
        const data = await projectsAPI.list();
        setProjets(data);
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

  // Fonction pour afficher le toast temporairement
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  };

  // Ouvre la modale de confirmation
  const handleSupprimerClick = (projet) => {
    setProjetToDelete(projet);
    setIsModalOpen(true);
  };

  // Exécute la suppression après confirmation
  const confirmDelete = async () => {
    if (!projetToDelete) return;

    try {
      await projectsAPI.delete(projetToDelete.id);
      setProjets((prev) => prev.filter((p) => p.id !== projetToDelete.id));
      showToast("Projet supprimé avec succès", "success");
    } catch (error) {
      console.error("Erreur de suppression :", error);
      showToast(error.message || "Échec de la suppression", "error");
    } finally {
      setIsModalOpen(false);
      setProjetToDelete(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="py-6 px-16 relative">
        <div className="bg-white py-6 px-8 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Liste des projets</h2>
            <button
              onClick={() => navigate("/CreerProjet")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <FaPlus className="mr-2" />
              Ajouter un projet
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded-lg">
            <table className="min-w-full text-sm text-center border">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 border">Projet</th>
                  <th className="px-4 py-3 border">Véhicules</th>
                  <th className="px-4 py-3 border">Architectures</th>
                  <th className="px-4 py-3 border">Motorisations</th>
                  <th className="px-4 py-3 border">PPL</th>
                  <th className="px-4 py-3 border">Valideurs</th>
                  <th className="px-4 py-3 border">Visiteurs</th>
                  <th className="px-4 py-3 border">Action</th>
                </tr>
              </thead>

              <tbody>
                {projets.map((projet) => (
                  <tr key={projet.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-3">{projet.nom_projet}</td>
                    <td className="border px-4 py-3">{projet.nombre_vehicules}</td>
                    <td className="border px-4 py-3">
                      {projet.architectures && projet.architectures.length > 0 ? (
                        projet.architectures.map((archi, i) => (
                          <span key={i} className="block">{archi}</span>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="border px-4 py-3">
                      {projet.motorisations && projet.motorisations.length > 0 ? (
                        projet.motorisations.map((motor, i) => (
                          <span key={i} className="block">{motor}</span>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="border px-4 py-3">{groupByRole(projet.affectations, "PPL")}</td>
                    <td className="border px-4 py-3">{groupByRole(projet.affectations, "VALIDEUR")}</td>
                    <td className="border px-4 py-3">{groupByRole(projet.affectations, "VISITEUR")}</td>
                    <td className="border px-4 py-3">
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={() => navigate(`/ViewProjet/${projet.id}`, { state: { projet } })}
                          className="text-green-600 hover:text-green-800"
                          title="Détails"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => navigate(`/Modifprojet/${projet.id}`, { state: { projet } })}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleSupprimerClick(projet)}
                          className="text-red-600 hover:text-red-800"
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
        </div>

        {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmer la suppression</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer le projet <span className="font-semibold">"{projetToDelete?.nom_projet}"</span> ? Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION TOAST (Succès / Erreur) */}
        {toast.show && (
          <div 
            className={`fixed bottom-10 right-10 px-6 py-3 rounded-lg shadow-lg text-white transition-opacity duration-300 z-50 ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
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