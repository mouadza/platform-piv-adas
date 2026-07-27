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
      { icon: FileSpreadsheet, label: "Gammes de validation", path: "/listegammes" },
      { icon: Settings, label: "Parametrages", path: "/configurations" },
      { icon: History, label: "Audit logs", path: "/audit-logs" },
    ],
  },

  ppl: {
    title: "PPL",
    description: "Preparation des gammes",
    items: [
      { icon: LayoutDashboard, label: "Accueil", path: "/ppldash" },
      { icon: FileSpreadsheet, label: "Gammes de validation", path: "/listegammes" },
    ],
  },

  valideur: {
    title: "Valideur",
    description: "Execution et cotation",
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

const Sidebar = ({ role = null, activePath, onClose, variant = "desktop" }) => {
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

  if (variant === "mobile") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#243782]/70 bg-[linear-gradient(90deg,#00133B_0%,#071C58_58%,#243782_100%)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(0,19,59,0.24)] md:hidden">
        <div className="grid grid-flow-col auto-cols-fr gap-1">
          {config.items.slice(0, 5).map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={`${item.path}-${item.label}-mobile`}
                type="button"
                onClick={() => handleNavigation(item.path)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-white text-[#00133B]"
                    : "text-blue-100/75 hover:bg-[#243782] hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <aside className="flex h-screen w-[240px] flex-col bg-[linear-gradient(180deg,#00133B_0%,#071C58_58%,#243782_100%)] px-4 py-5 text-white shadow-[10px_0_30px_rgba(0,19,59,0.26)]">
      <div className="rounded-lg border items-center justify-center border-white/10 bg-white/10 px-3 py-3 shadow-sm">
        <img
          src={logo}
          alt="Stellantis"
          className="h-12 w-auto shrink-0 object-contain brightness-0 invert"
        />
        <div className="mt-3 min-w-0">
          <p className="truncate text-lg font-extrabold tracking-tight text-white">
            Validation App
          </p>
          <p className="mt-1 text-xs font-medium text-blue-100/80">
            Automotive test gammes
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/10 px-4 py-3 ring-1 ring-[#243782]/45">
        <p className="text-sm font-bold">{config.title}</p>
        <p className="mt-1 text-xs text-blue-100/75">{config.description}</p>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-blue-100/50">
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
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-white text-[#00133B] shadow-sm ring-1 ring-white/80"
                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                  active
                    ? "bg-[#243782] text-white"
                    : "bg-white/10 text-blue-100 group-hover:bg-white/15"
                }`}
              >
                <Icon size={17} />
              </span>
              <span className="truncate text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/15 text-red-100">
            <LogOut size={17} />
          </span>
          Deconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
