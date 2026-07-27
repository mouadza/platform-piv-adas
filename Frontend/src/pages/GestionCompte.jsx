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
        setProjects(data || []);
      } catch {
        setError("Erreur chargement projets.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name !== "email") return;

    setEmailStatus("idle");
    clearTimeout(emailTimerRef.current);
    if (!value) return;

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

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

    const validAffectations = affectations
      .map((item) => ({
        role: item.role === "" || item.role === null ? "" : Number(item.role),
        projet:
          item.projet === "" || item.projet === null ? "" : Number(item.projet),
      }))
      .filter((item) => Number.isInteger(item.role));

    try {
      setSaving(true);
      const result = await usersAPI.create({
        username: formData.username,
        email: formData.email,
        affectations: validAffectations,
      });

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
                  result?.message || "Compte utilisateur cree avec succes.",
              },
      });
    } catch (err) {
      setError(
        err.data?.detail ||
          err.data?.error ||
          err.message ||
          "Erreur lors de la creation du compte."
      );
    } finally {
      setSaving(false);
    }
  };

  const EmailFeedback = () => {
    if (!formData.email || emailStatus === "idle") return null;

    const map = {
      checking: {
        color: "text-slate-500",
        msg: "Verification en cours...",
      },
      taken: {
        color: "text-red-600",
        msg: "Cet email est deja utilise.",
      },
      available: {
        color: "text-emerald-600",
        msg: "Email disponible.",
      },
    };

    const entry = map[emailStatus];
    if (!entry) return null;

    return <p className={`mt-1.5 text-xs font-semibold ${entry.color}`}>{entry.msg}</p>;
  };

  const submitBlocked =
    saving ||
    emailStatus === "taken" ||
    emailStatus === "checking" ||
    emailStatus === "invalid_domain";

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
            Creer un compte utilisateur
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Informations utilisateur et affectations projet.
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
            handleChange={handleChange}
            isEditMode={false}
            emailFeedback={<EmailFeedback />}
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
            disabled={submitBlocked}
            className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creation..." : "Creer"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GestionCompte;
