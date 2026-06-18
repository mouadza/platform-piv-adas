import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { clearAuthSession, getAccessToken } from "../utils/authStorage";
import {
  getAccessRoles,
  getStoredActiveRole,
  normalizeRole,
  setActiveRole,
} from "../utils/roles";

/**
 * ProtectedRoute
 *
 * Props:
 *  - children       ReactNode
 *  - allowedRoles   string[]  (optional — if omitted, any authenticated user passes)
 *
 * Logic:
 *  1. No token            → /login
 *  2. Token expired       → /login  (clears localStorage)
 *  3. No allowedRoles     → passes (just checks authentication)
 *  4. Role match          → passes
 *  5. No role match       → /choix-espace  (user is logged in but wrong role for this page)
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = getAccessToken();

  // 1. No token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  // 2. Token expired
  const now = Date.now() / 1000;
  if (decoded.exp && decoded.exp < now) {
    clearAuthSession();
    return <Navigate to="/login" replace />;
  }

  // 3. No role restriction — just needs to be authenticated
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // 4 & 5. Check role
  const userRoles = getAccessRoles();
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  const matchingRole = normalizedAllowedRoles.find((role) =>
    userRoles.includes(role)
  );

  if (!matchingRole) {
    // Authenticated but wrong role → send back to space selector
    return <Navigate to="/choix-espace" replace />;
  }

  const activeRole = getStoredActiveRole(matchingRole);

  if (!normalizedAllowedRoles.includes(activeRole)) {
    setActiveRole(matchingRole);
  }

  return children;
};

export default ProtectedRoute;
