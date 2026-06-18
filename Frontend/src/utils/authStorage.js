import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";

const SESSION_KEYS = [
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  "role",
  "access_level",
  "activeRole",
  "selected_project_id",
  "selected_project_name",
];

export const saveAuthTokens = ({ access, refresh }) => {
  if (access) {
    sessionStorage.setItem(ACCESS_TOKEN, access);
  }

  if (refresh) {
    sessionStorage.setItem(REFRESH_TOKEN, refresh);
  }

  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
};

export const clearRoleSelection = () => {
  SESSION_KEYS.filter((key) => key !== ACCESS_TOKEN && key !== REFRESH_TOKEN)
    .forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
};

export const getAccessToken = () =>
  sessionStorage.getItem(ACCESS_TOKEN) || localStorage.getItem(ACCESS_TOKEN);

export const getRefreshToken = () =>
  sessionStorage.getItem(REFRESH_TOKEN) || localStorage.getItem(REFRESH_TOKEN);

export const clearAuthSession = () => {
  SESSION_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};
