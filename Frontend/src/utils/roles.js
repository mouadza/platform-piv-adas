import { jwtDecode } from "jwt-decode";

import { getAccessToken } from "./authStorage";

export const ROLE_ROUTES = {
  ADMIN: "/AdminDash",
  PPL: "/ppldash",
  VALIDEUR: "/valideurdash",
  VISITEUR: "/EspaceUser",
};

export const normalizeRole = (role) => {
  const value = String(role || "VISITEUR").trim().toUpperCase();

  if (value === "USER" || value === "VISITOR") return "VISITEUR";
  if (value === "ADMINISTRATEUR" || value === "SUPERUSER") return "ADMIN";
  if (value === "PPL") return "PPL";
  if (value === "VALIDEUR") return "VALIDEUR";
  if (value === "VISITEUR") return "VISITEUR";

  return value;
};

export const getTokenPayload = () => {
  const token = getAccessToken();

  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Erreur decodage JWT:", error);
    return null;
  }
};

export const getAccessRoles = () => {
  const decoded = getTokenPayload();

  if (!decoded) return [];

  if (decoded.is_superuser || normalizeRole(decoded.access_level) === "ADMIN") {
    return ["ADMIN"];
  }

  const roles = [];

  if (Array.isArray(decoded.roles)) {
    roles.push(...decoded.roles);
  }

  if (decoded.role) {
    roles.push(decoded.role);
  }

  if (decoded.access_level) {
    roles.push(decoded.access_level);
  }

  if (Array.isArray(decoded.affectations)) {
    roles.push(...decoded.affectations.map((aff) => aff.role).filter(Boolean));
  }

  return [...new Set(roles.map(normalizeRole).filter(Boolean))];
};

export const hasAnyRole = (allowedRoles = []) => {
  const userRoles = getAccessRoles();

  return allowedRoles.some((role) => userRoles.includes(normalizeRole(role)));
};

export const getStoredActiveRole = (fallbackRole = "VISITEUR") => {
  const roles = getAccessRoles();
  const candidates = [
    localStorage.getItem("activeRole"),
    localStorage.getItem("access_level"),
    localStorage.getItem("role"),
    fallbackRole,
  ];

  const selected = candidates
    .map(normalizeRole)
    .find((role) => roles.length === 0 || roles.includes(role));

  return selected || roles[0] || normalizeRole(fallbackRole);
};

export const setActiveRole = (role) => {
  const normalizedRole = normalizeRole(role);

  localStorage.setItem("activeRole", normalizedRole);
  localStorage.setItem("access_level", normalizedRole);
  localStorage.setItem("role", normalizedRole.toLowerCase());

  return normalizedRole;
};

export const getAssignedProjectsForRole = (role) => {
  const decoded = getTokenPayload();
  const normalizedRole = normalizeRole(role);

  if (!decoded?.affectations || normalizedRole === "ADMIN") {
    return [];
  }

  const projects = new Map();

  decoded.affectations
    .filter((aff) => normalizeRole(aff.role) === normalizedRole)
    .forEach((aff) => {
      if (!aff.projet_id) return;

      if (!projects.has(aff.projet_id)) {
        projects.set(aff.projet_id, {
          id: aff.projet_id,
          nom_projet: aff.projet_nom || `Projet ${aff.projet_id}`,
          roles: [normalizeRole(aff.role)],
        });

        return;
      }

      const project = projects.get(aff.projet_id);
      const affRole = normalizeRole(aff.role);

      if (!project.roles.includes(affRole)) {
        project.roles.push(affRole);
      }
    });

  return Array.from(projects.values());
};
