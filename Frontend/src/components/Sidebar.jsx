import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";

import logo from "../assets/logo_bleu.png";
import { clearAuthSession } from "../utils/authStorage";
import { normalizeRole as normalizeAccessRole } from "../utils/roles";

const roleConfig = {
  admin: {
    title: "Administration",
    description: "Pilotage global",
    items: [
      { icon: LayoutDashboard, label: "Accueil", path: "/AdminDash" },
      { icon: UsersRound, label: "Utilisateurs", path: "/listeUser" },
      { icon: FolderKanban, label: "Projets", path: "/listeprojet" },
      { icon: FileSpreadsheet, label: "Gammes", path: "/listegammes" },
      { icon: Settings, label: "Paramétrages", path: "/configurations" },
      { icon: History, label: "Audit logs", path: "/audit-logs" },
    ],
  },

  ppl: {
    title: "PPL",
    description: "Préparation des gammes",
    items: [
      { icon: LayoutDashboard, label: "Accueil", path: "/ppldash" },
      { icon: FileSpreadsheet, label: "Gammes", path: "/listegammes" },
    ],
  },

  valideur: {
    title: "Valideur",
    description: "Exécution et cotation",
    items: [
      { icon: LayoutDashboard, label: "Accueil", path: "/valideurdash" },
    ],
  },

  visiteur: {
    title: "Visiteur",
    description: "Lecture seule",
    items: [{ icon: UserRound, label: "Accueil", path: "/EspaceUser" }],
  },
};

const normalizeSidebarRole = (role) => {
  const normalizedRole = normalizeAccessRole(
    role ||
      localStorage.getItem("activeRole") ||
      localStorage.getItem("access_level") ||
      localStorage.getItem("role") ||
      "visiteur"
  ).toLowerCase();

  return roleConfig[normalizedRole] ? normalizedRole : "visiteur";
};

const Sidebar = ({ role = null, activePath, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = activePath || location.pathname;
  const normalizedRole = normalizeSidebarRole(role);
  const config = roleConfig[normalizedRole];

  const handleLogout = () => {
    clearAuthSession();

    navigate("/login");
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  if (!config) return null;

  const isActive = (path) =>
    currentPath === path ||
    (path !== "/" && currentPath.toLowerCase().startsWith(path.toLowerCase()));

  return (
    <aside className="flex h-screen w-[292px] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-[8px_0_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <img
          src={logo}
          alt="Stellantis"
          className="h-12 w-auto shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-slate-950">
            Validation App
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-blue-950 px-4 py-3 text-white">
        <p className="text-sm font-bold">{config.title}</p>
        <p className="mt-1 text-xs text-blue-100">{config.description}</p>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Navigation
        </p>

        {config.items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={`${item.path}-${item.label}`}
              type="button"
              onClick={() => handleNavigation(item.path)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white"
                }`}
              >
                <Icon size={17} />
              </span>
              <span className="truncate text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600">
            <LogOut size={17} />
          </span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
