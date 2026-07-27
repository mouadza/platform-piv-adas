import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
      userToEdit.affectations?.map((item) => ({
        _key: crypto.randomUUID(),
        projet: item.projet?.id ?? item.projet ?? "",
        role: item.role ?? "",
      })) || []
    );

    setLoading(false);
  }, [userToEdit, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsAPI.list();
        setProjects(data || []);
        setError("");
      } catch {
        setError("Erreur chargement projets");
      }
    };

    fetchProjects();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.username || !formData.email) {
      setError("Nom d'utilisateur et email obligatoires.");
      return;
    }

    const hasIncomplete = affectations.some(
      (item) => item.projet === "" || item.role === ""
    );

    if (hasIncomplete) {
      setError("Veuillez selectionner un projet et un role avant d'ajouter une nouvelle ligne.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        username: formData.username,
        email: formData.email,
        affectations: affectations
          .map((item) => ({
            role: item.role === "" ? null : item.role,
            projet: item.projet === "" ? "" : item.projet,
          }))
          .filter((item) => item.role !== null),
      };

      if (formData.password.trim()) {
        payload.password = formData.password;
      }

      await usersAPI.update(userToEdit.id, payload);
      navigate("/listeUser");
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Erreur mise a jour");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
          <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto max-w-[980px] space-y-5">
        <section className="app-panel">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Utilisateurs
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Modifier {userToEdit.username}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Mettre a jour les informations et affectations.
          </p>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="app-panel">
          <UserForm
            formData={formData}
            handleChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                [event.target.name]: event.target.value,
              }))
            }
            isEditMode
          />
        </section>

        <section className="app-panel max-h-[420px] overflow-y-auto">
          <AffectationTable
            affectations={affectations}
            setAffectations={setAffectations}
            projects={projects}
          />
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/listeUser")}
            disabled={saving}
            className="btn-secondary px-6 py-3"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary px-6 py-3 disabled:opacity-50"
          >
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ModifierUtilisateur;
