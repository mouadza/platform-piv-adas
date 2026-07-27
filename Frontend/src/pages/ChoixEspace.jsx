import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";

import BackgroundImage from "../components/BackgroundImage";
import { clearAuthSession, getAccessToken } from "../utils/authStorage";
import { ROLE_ROUTES, normalizeRole, setActiveRole } from "../utils/roles";

const ROLE_LABELS = {
  ADMIN: "Administration",
  PPL: "PPL",
  VALIDEUR: "Valideur",
  VISITEUR: "Visiteur",
};

const ROLE_HINTS = {
  ADMIN: "Gestion globale des projets, comptes et parametrages.",
  PPL: "Preparation et organisation des gammes.",
  VALIDEUR: "Execution des validations et cotations.",
  VISITEUR: "Consultation en lecture seule et suivi.",
};

const ChoixEspace = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState("");
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    try {
      let data = [];

      if (location.state?.affectations) {
        setUser(location.state.user);
        data = location.state.affectations;
      } else {
        const token = getAccessToken();
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const decoded = jwtDecode(token);

        if (decoded.exp && decoded.exp < Date.now() / 1000) {
          clearAuthSession();
          navigate("/login", { replace: true });
          return;
        }

        setUser(decoded.username || decoded.email || "");
        data = decoded.affectations || [];
      }

      const groupedData = data.reduce((acc, aff) => {
        const role = normalizeRole(aff.role || "AUTRE");
        if (!acc[role]) acc[role] = [];
        acc[role].push(aff);
        return acc;
      }, {});

      setGrouped(groupedData);

      const roles = Object.keys(groupedData);
      if (roles.length === 1) {
        const role = roles[0];
        setActiveRole(role);
        navigate(ROLE_ROUTES[role], { replace: true });
      }
    } catch (err) {
      console.error(err);
      navigate("/login", { replace: true });
    }
  }, [location.state, navigate]);

  const handleAccess = (role) => {
    const route = ROLE_ROUTES[role] || "/EspaceUser";
    setActiveRole(role);
    navigate(route, { replace: true });
  };

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  return (
    <BackgroundImage>
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl rounded-lg border border-white/50 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-[#243782]/10 px-3 py-1.5 text-sm font-semibold text-[#243782]">
                <ShieldCheck size={16} />
                Selection de l'espace
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
                Choisir votre espace de travail
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Compte connecte :{" "}
                <span className="font-semibold text-slate-800">{user}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              Deconnexion
            </button>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                Aucun droit d'acces n'est configure pour ce compte.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {Object.entries(grouped).map(([role, projects]) => (
                <div
                  key={role}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#243782]/25 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-base font-bold text-slate-950">
                          {ROLE_LABELS[role] || role}
                        </h2>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          {role}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {ROLE_HINTS[role] || "Acces applicatif"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {projects.map((project, index) => (
                          <span
                            key={`${role}-${project.projet_id || index}`}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                          >
                            {project.projet_nom || `Projet ${project.projet_id}`}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAccess(role)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#243782] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#00133B]"
                    >
                      Acceder
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BackgroundImage>
  );
};

export default ChoixEspace;


