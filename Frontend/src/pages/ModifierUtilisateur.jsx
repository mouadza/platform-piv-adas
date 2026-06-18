import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UserForm from "../components/UserForm";
import AffectationTable from "../components/AffectationTable";
import DashboardLayout from "../components/DashboardLayout";
import { usersAPI, projectsAPI } from "../api/index";

const ModifierUtilisateur = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userToEdit = location.state?.user;

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [affectations, setAffectations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userToEdit) {
      navigate("/listeUser");
      return;
    }

    setFormData({
      username: userToEdit.username,
      email: userToEdit.email || "",
      password: "",
    });

    setAffectations(
      userToEdit.affectations?.map((a) => ({
        _key: crypto.randomUUID(),
        projet: a.projet?.id ?? a.projet ?? "",
        role: a.role ?? "",
      })) || []
    );

    setLoading(false);
  }, [userToEdit, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsAPI.list();
        setProjects(data);
        setError("");
      } catch {
        setError("Erreur chargement projets");
      }
    };
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email) {
      setError("Nom d'utilisateur et email obligatoires.");
      return;
    }

    // Validate affectations
    const hasIncomplete = affectations.some(
      (a) => a.projet === "" || a.role === ""
    );
    if (hasIncomplete) {
      setError("Veuillez sélectionner un projet et un rôle avant d'ajouter une nouvelle ligne.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        username: formData.username,
        email: formData.email,
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      payload.affectations = affectations
        .map((a) => ({
          role: a.role === "" ? null : a.role,
          projet: a.projet === "" ? "" : a.projet,
        }))
        .filter((a) => a.role !== null);

      await usersAPI.update(userToEdit.id, payload);
      navigate("/listeUser");
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Erreur mise à jour");
    } finally {
      setSaving(false);
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
      <div className="mx-auto mt-20 max-w-[900px] bg-white rounded-3xl px-6 py-8 shadow-sm">
        <div className="px-6 py-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Modifier l'utilisateur {userToEdit.username}
            </h2>
            <p className="text-sm text-gray-500">
              Mettre à jour informations et affectations.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <UserForm
            formData={formData}
            handleChange={(e) =>
              setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))
            }
            isEditMode={true}
          />

          <div className="mt-6 border rounded-lg max-h-[320px] overflow-y-auto">
            <AffectationTable
              affectations={affectations}
              setAffectations={setAffectations}
              projects={projects}
            />
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>

            <button
              onClick={() => navigate("/listeUser")}
              className="bg-gray-200 hover:bg-gray-300 px-6 py-3 rounded-md"
              disabled={saving}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ModifierUtilisateur;
