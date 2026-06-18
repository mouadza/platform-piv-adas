import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, UserCircle, X } from "lucide-react";

import Sidebar from "./Sidebar";
import {
  ROLE_ROUTES,
  getAccessRoles,
  getStoredActiveRole,
  getTokenPayload,
  normalizeRole,
  setActiveRole,
} from "../utils/roles";

const ROLE_STYLES = {
  ADMIN: "bg-blue-50 text-blue-700 ring-blue-100",
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
    title: "Gammes",
    subtitle: "Import, organisation, consultation et export des gammes.",
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

const getPageMeta = (pathname) =>
  PAGE_META.find((item) => item.match(pathname)) || {
    title: "Validation App",
    subtitle: "Plateforme de suivi et validation des gammes.",
  };

const DashboardLayout = ({ role = "VISITEUR", activePath, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const popoverRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const pageMeta = getPageMeta(location.pathname);

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

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/45 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed md:relative z-40 h-full transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          role={sidebarRole}
          activePath={activePath}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <header className="h-[72px] shrink-0 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 md:hidden"
                aria-label="Ouvrir le menu"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                  {pageMeta.title}
                </h1>
                <p className="hidden truncate text-sm text-slate-500 sm:block">
                  {pageMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:flex">
                <UserCircle size={18} className="text-slate-400" />
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
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                    >
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-bold ring-1 ${roleClass}`}
                      >
                        {selectedRole}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform ${
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
                                    : "text-slate-700 hover:bg-blue-50"
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

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
