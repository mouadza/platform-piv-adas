import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, UserCircle } from "lucide-react";

import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import {
  ROLE_ROUTES,
  getAccessRoles,
  getStoredActiveRole,
  getTokenPayload,
  normalizeRole,
  setActiveRole,
} from "../utils/roles";

const ROLE_STYLES = {
  ADMIN: "bg-[#243782]/10 text-[#edf3fc] ring-[#243782]/15",
  PPL: "bg-violet-50 text-violet-700 ring-violet-100",
  VALIDEUR: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  VISITEUR: "bg-slate-100 text-slate-700 ring-slate-200",
};

const PAGE_META = [
  {
    match: (path) => path === "/AdminDash",
    title: "Tableau de bord admin",
    subtitle: "Pilotage global des utilisateurs, projets et validations.",
  },
  {
    match: (path) => path === "/ppldash",
    title: "Tableau de bord PPL",
    subtitle: "Suivi des projets affectés et préparation des gammes.",
  },
  {
    match: (path) => path === "/valideurdash",
    title: "Tableau de bord valideur",
    subtitle: "Accès rapide aux gammes à valider.",
  },
  {
    match: (path) => path === "/EspaceUser",
    title: "Espace visiteur",
    subtitle: "Consultation des projets et de l'avancement.",
  },
  {
    match: (path) => path.includes("User") || path === "/GestionCompte",
    title: "Utilisateurs",
    subtitle: "Création, modification et affectation des comptes.",
  },
  {
    match: (path) =>
      path.includes("Projet") ||
      path.includes("projet") ||
      path.includes("CreerProjet"),
    title: "Projets",
    subtitle: "Structure des projets, véhicules et affectations.",
  },
  {
    match: (path) =>
      path.includes("Gamme") ||
      path.includes("gamme") ||
      path.includes("visualiser"),
    title: "Gammes de validation",
    subtitle: "Consultation, planification et suivi des gammes par projet.",
  },
  {
    match: (path) => path.includes("validation"),
    title: "Validation",
    subtitle: "Cotation des EV, commentaires et suivi du statut.",
  },
  {
    match: (path) => path === "/configurations",
    title: "Paramétrages",
    subtitle: "Gestion des rôles, architectures, motorisations et procédures.",
  },
  {
    match: (path) => path === "/audit-logs",
    title: "Audit logs",
    subtitle: "Tracabilite des actions sensibles et connexions.",
  },
];

const DashboardLayout = ({
  role = "VISITEUR",
  activePath,
  contentClassName = "",
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const popoverRef = useRef(null);

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState(() =>
    getStoredActiveRole(role)
  );

  const roles = useMemo(() => {
    const tokenRoles = getAccessRoles();
    if (tokenRoles.length > 0) return tokenRoles;

    return [normalizeRole(role)];
  }, [role]);

  const user = useMemo(() => getTokenPayload(), []);

  useEffect(() => {
    const storedRole = getStoredActiveRole(role);
    const nextRole = roles.includes(storedRole)
      ? storedRole
      : roles[0] || normalizeRole(role);

    setSelectedRole(nextRole);
  }, [role, roles]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setRoleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleChange = (roleToSet) => {
    const normalizedRole = normalizeRole(roleToSet);

    setSelectedRole(normalizedRole);
    setActiveRole(normalizedRole);
    setRoleMenuOpen(false);

    const targetRoute = ROLE_ROUTES[normalizedRole] || "/EspaceUser";
    navigate(targetRoute, { replace: true });
  };

  const sidebarRole = selectedRole.toLowerCase();
  const roleClass =
    ROLE_STYLES[selectedRole] || "bg-slate-100 text-slate-700 ring-slate-200";
  const displayName = user?.username || user?.email || "Utilisateur";
  const pageMeta =
    PAGE_META.find((item) => item.match(location.pathname)) || {
      title: "Validation App",
      subtitle: "Plateforme de suivi et validation des gammes.",
    };

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-[#00133B] text-slate-900">
      <div className="relative z-40 hidden h-full shrink-0 md:block">
        <Sidebar
          role={sidebarRole}
          activePath={activePath}
        />
      </div>
      <Sidebar role={sidebarRole} activePath={activePath} variant="mobile" />

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-30 h-[72px] shrink-0 border-b border-[#243782]/70 bg-[linear-gradient(90deg,#00133B_0%,#071C58_58%,#243782_100%)] px-4 text-white shadow-[0_12px_28px_rgba(0,19,59,0.18)] sm:px-6 lg:px-8">
          <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                {pageMeta.title}
              </h1>
              <p className="hidden truncate text-sm text-blue-100/75 sm:block">
                {pageMeta.subtitle}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <NotificationBell />

              <div className="hidden items-center gap-2 rounded-lg border border-white/15 bg-[#243782]/60 px-3 py-2 text-sm text-white/85 lg:flex">
                <UserCircle size={18} className="text-white/60" />
                <span className="max-w-[180px] truncate font-medium">
                  {displayName}
                </span>
              </div>

              <div className="relative" ref={popoverRef}>
                {roles.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRoleMenuOpen((value) => !value)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#243782]/70 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243782]"
                    >
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold ring-1 ${roleClass}`}
                      >
                        {selectedRole}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-white/60 transition-transform ${
                          roleMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {roleMenuOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Espaces accessibles
                          </p>
                        </div>

                        <div className="p-2">
                          {roles.map((roleItem) => {
                            const normalizedRole = normalizeRole(roleItem);
                            const isActive = normalizedRole === selectedRole;
                            const itemClass =
                              ROLE_STYLES[normalizedRole] ||
                              "bg-slate-100 text-slate-700 ring-slate-200";

                            return (
                              <button
                                key={normalizedRole}
                                type="button"
                                disabled={isActive}
                                onClick={() => handleRoleChange(normalizedRole)}
                                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                                  isActive
                                    ? "cursor-default bg-slate-50 text-slate-400"
                                    : "text-slate-700 hover:bg-[#243782]/10"
                                }`}
                              >
                                <span
                                  className={`rounded-md px-2 py-1 text-xs font-bold ring-1 ${itemClass}`}
                                >
                                  {normalizedRole}
                                </span>
                                {isActive && (
                                  <span className="text-xs text-slate-400">
                                    Actuel
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <span
                    className={`inline-flex rounded-md px-2.5 py-1.5 text-xs font-bold ring-1 ${roleClass}`}
                  >
                    {selectedRole}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <div
            className={`mx-auto w-full max-w-[1600px] px-4 py-5 pb-24 sm:px-6 md:pb-7 lg:px-8 lg:py-7 ${contentClassName}`}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
