import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { AlertTriangle, X } from "lucide-react";

import AuthFooter from "../components/AuthFooter";
import BackgroundImage from "../components/BackgroundImage";
import LoginForm from "../components/LoginForm";
import { clearAuthSession, clearRoleSelection } from "../utils/authStorage";
import { ROLE_ROUTES, normalizeRole, setActiveRole } from "../utils/roles";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = location.state?.sessionExpired;

  const [noAffectationModal, setNoAffectationModal] = useState(false);

  const handleLoginSuccess = (accessToken) => {
    try {
      const decoded = jwtDecode(accessToken);

      if (
        decoded.is_superuser ||
        normalizeRole(decoded.access_level) === "ADMIN"
      ) {
        setActiveRole("ADMIN");
        navigate("/AdminDash");
        return;
      }

      const affectations = decoded.affectations || [];

      if (affectations.length === 0) {
        clearAuthSession();

        setNoAffectationModal(true);
        return;
      }

      if (affectations.length > 1) {
        clearRoleSelection();

        navigate("/choix-espace", {
          state: {
            user: decoded.username,
            affectations,
          },
        });
        return;
      }

      const singleAffectation = affectations[0];
      const accessLevel = normalizeRole(
        singleAffectation.role || decoded.access_level
      );

      if (!accessLevel) {
        setNoAffectationModal(true);
        return;
      }

      setActiveRole(accessLevel);
      localStorage.setItem("selected_project_id", singleAffectation.projet_id);
      localStorage.setItem(
        "selected_project_name",
        singleAffectation.projet_nom
      );

      const targetRoute = ROLE_ROUTES[accessLevel] || "/EspaceUser";
      navigate(targetRoute);
    } catch (err) {
      console.error("Erreur JWT :", err);
      clearAuthSession();
      navigate("/login");
    }
  };

  const closeNoAffectationModal = () => {
    setNoAffectationModal(false);
  };

  return (
    <BackgroundImage>
      <div className="relative z-10 w-full max-w-[520px] px-3">
        <div className="relative z-10 w-full rounded-xl bg-black/10 p-10 shadow-lg backdrop-blur-md">
          <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Connexion
          </h1>

          {isExpired && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Votre session a expire apres 15 minutes d'inactivite. Veuillez
              vous reconnecter.
            </div>
          )}

          <LoginForm onLoginSuccess={handleLoginSuccess} />

          <AuthFooter />
        </div>
      </div>

      {noAffectationModal && (
        <div className="modal-backdrop">
          <div className="modal-sheet sm:max-w-md">
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle size={20} />
                </div>

                <h2 className="text-lg font-extrabold text-amber-800">
                  Acces non autorise
                </h2>
              </div>

              <button
                type="button"
                onClick={closeNoAffectationModal}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Fermer la fenetre"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-700">
                Vous n'avez aucune affectation configuree pour acceder a
                l'application.
              </p>

              <p className="mt-3 text-sm text-slate-500">
                Veuillez contacter votre administrateur pour demander une
                affectation a un projet avec un role valide.
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeNoAffectationModal}
                className="rounded-lg bg-[#243782] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#00133B]"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </BackgroundImage>
  );
};

export default LoginPage;



