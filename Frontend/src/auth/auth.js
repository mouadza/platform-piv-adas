import { jwtDecode } from "jwt-decode";
import { getAccessToken } from "../utils/authStorage";

export function getAuthInfo() {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    return {
      token,
      username: decoded.username,
      isAdmin: decoded.is_superuser === true,
      isPPL: decoded.roles?.includes("PPL") ?? false,
      isValideur: decoded.roles?.includes("VALIDEUR") ?? false,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}
