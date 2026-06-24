import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import UserForm from "../components/UserForm";
import AffectationTable from "../components/AffectationTable";
import { usersAPI, projectsAPI } from "../api/index";


const GestionCompte = () => {
  const navigate = useNavigate();
  const emailTimerRef = useRef(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
  });

  const [affectations, setAffectations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [emailStatus, setEmailStatus] = useState("idle");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsAPI.list();
        setProjects(data);
      } catch {
        setError("Erreur chargement projets.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    if (name !== "email") return;

    // Reset
    setEmailStatus("idle");
    clearTimeout(emailTimerRef.current);

    if (!value) return;

    // Existence check (debounced 600ms)
    setEmailStatus("checking");
    emailTimerRef.current = setTimeout(async () => {
      try {
        const res = await usersAPI.checkEmail(value);
        setEmailStatus(res.exists ? "taken" : "available");
      } catch {
        setEmailStatus("idle");
      }
    }, 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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

    const validAffectations = affectations
      .map((a) => ({
        role: a.role === "" || a.role === null ? "" : Number(a.role),
        projet: a.projet === "" || a.projet === null ? "" : Number(a.projet),
      }))
      .filter((a) => Number.isInteger(a.role));


    const payload = {
      username: formData.username,
      email: formData.email,
      affectations: validAffectations,
    };

    try {
      setSaving(true);
      const result = await usersAPI.create(payload);
      navigate("/listeUser", {
        state:
          result?.email_sent === false
            ? {
                warning:
                  result.message ||
                  "Compte cree, mais l'email d'autorisation n'a pas pu etre envoye.",
              }
            : {
                success:
                  result?.message ||
                  "Compte utilisateur cree avec succes.",
              },
      });
    } catch (err) {
        setError(
          err.data?.detail ||
          err.data?.error ||
          err.message ||
          "Erreur lors de la création du compte."
        );
    } finally {
      setSaving(false);
    }
  };

  const EmailFeedback = () => {
    if (!formData.email || emailStatus === "idle") return null;
    const map = {
      invalid_domain: { color: "text-red-500", icon: "⚠️", msg: `Email doit être @` },
      checking:       { color: "text-slate-400", icon: "⏳", msg: "Vérification en cours…" },
      taken:          { color: "text-red-500",  icon: "✕",  msg: "Cet email est déjà utilisé." },
      available:      { color: "text-green-600", icon: "✓", msg: "Email disponible." },
    };
    const entry = map[emailStatus];
    if (!entry) return null;
    return (
      <p className={`text-xs mt-1.5 flex items-center gap-1 ${entry.color}`}>
        <span>{entry.icon}</span> {entry.msg}
      </p>
    );
  };

  const submitBlocked = saving || emailStatus === "taken" || emailStatus === "checking" || emailStatus === "invalid_domain";

  // ── Render ─────────────────────────────────────────────────────────────────
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
            <h2 className="text-2xl font-bold">Créer un compte utilisateur</h2>
            <p className="text-sm text-gray-500">
              Informations utilisateur et affectations projet.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Pass emailFeedback as a slot so UserForm can render it under the email field */}
          <UserForm
            formData={formData}
            handleChange={handleChange}
            isEditMode={false}
            emailFeedback={<EmailFeedback />}
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
              disabled={submitBlocked}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {saving ? "Création..." : "Créer"}
            </button>

            <button
              onClick={() => navigate("/listeUser")}
              disabled={saving}
              className="bg-gray-200 hover:bg-gray-300 px-6 py-3 rounded-md"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GestionCompte;
