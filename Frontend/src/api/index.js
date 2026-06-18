// src/api/index.js - Clean API layer
import axios from "axios";
import { clearAuthSession, getAccessToken } from "../utils/authStorage";

const configuredApiUrl =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const normalizeApiBaseUrl = (value) => {
  const url = String(value || "").trim();
  let end = url.length;

  while (end > 0 && url[end - 1] === "/") {
    end -= 1;
  }

  return url.slice(0, end);
};

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiUrl);

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

const responseData = (request) => request.then((response) => response.data);
const getData = (url, config) => responseData(api.get(url, config));
const postData = (url, data, config) => responseData(api.post(url, data, config));
const putData = (url, data) => responseData(api.put(url, data));
const patchData = (url, data, config) =>
  responseData(api.patch(url, data, config));
const deleteData = (url, config) => responseData(api.delete(url, config));
const publicPostData = (url, data) => responseData(publicApi.post(url, data));

const createConfigAPI = (basePath) => ({
  list: () => getData(basePath),
  create: (data) => postData(basePath, data),
  update: (id, data) => putData(`${basePath}${id}/`, data),
  delete: (id) => deleteData(`${basePath}${id}/`),
});

/* =========================
   REQUEST INTERCEPTOR
========================= */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.href = "/login";
      return Promise.reject(new ApiError("Session expirée", 401));
    }

    const message =
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.message ||
      "Erreur serveur";

    return Promise.reject(
      new ApiError(message, error.response?.status, error.response?.data)
    );
  }
);

/* =========================
   PROJECTS
========================= */
export const projectsAPI = {
  list: () => getData("/admin_config/listprojet/"),
  create: (data) => postData("/admin_config/createproject/", data),
  detail: (id) => getData(`/admin_config/detail/${id}/`),
  update: (id, data) => putData(`/admin_config/modifprojet/${id}/`, data),
  delete: (id) => deleteData(`/admin_config/deleteprojet/${id}/`),
};

export const usersAPI = {
  list: () => getData("/admin_config/listuser/"),
  create: (data) => postData("/admin_config/create-user/", data),
  update: (id, data) => putData(`/admin_config/modifuser/${id}/`, data),
  delete: (id) => deleteData(`/admin_config/deleteuser/${id}/`),
};


/* =========================
   GAMMES
========================= */
export const gammesAPI = {
  import: (formData) => {
    return api.post("/admin_config/gammes/import/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  parse: (gammeId) =>
    getData(`/admin_config/newgamme/${gammeId}/`),

  updateStatus: (id, data) =>
    api.patch(`/admin_config/gammes/${id}/status/`, data),

  reorder: (data) =>
    api.post(`/admin_config/gammes/reorder/`, { ordre: data }),

  getTemplate: (typeId, fonctionId) =>
    api.get(
      `/admin_config/gammes/template/?type_procedure=${typeId}&fonction_gamme=${fonctionId}`
    ),

  create: (projetId, formData) =>
    postData(`/admin_config/projets/${projetId}/gammes/creer/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  listByProjet: (projetId) =>
    getData(`/admin_config/projets/${projetId}/gammes/list/`),

  listByPro: (projetId) =>
    getData(`/admin_config/gammes/${projetId}/valideur/`),

  detail: (gammeId) =>
    getData(`/admin_config/gammes/${gammeId}/`),

  update: (gammeId, formData) =>
    patchData(`/admin_config/gammes/${gammeId}/modifier/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateDates: (gammeId, data) =>
    patchData(`/admin_config/gammes/${gammeId}/dates/`, data),

  exportModifiedExcel: (gammeId) =>
    api
      .get(`/admin_config/gammes/${gammeId}/excel-modifie/`, {
        responseType: "blob",
      })
      .then((r) => ({
        blob: r.data,
        filename: r.headers?.["content-disposition"] || "",
      })),

  delete: (gammeId) =>
    deleteData(`/admin_config/gammes/${gammeId}/supprimer/`),

  validationState: (gammeId) =>
    getData(`/admin_config/gammes/${gammeId}/validation-state/`),
};

/* =========================
   COMMENTS
========================= */

export const commentsAPI = {
  listEV: ({ evCode, gammeId }) =>
    getData("/admin_config/global-ev-comments/", {
      params: {
        ev_code: evCode,
        gamme_id: gammeId,
      },
    }),

  createEV: ({ evCode, commentaire, gammeId }) =>
    postData("/admin_config/global-ev-comments/create/", {
      ev_code: evCode,
      commentaire,
      gamme_id: gammeId,
    }),

  updateEV: (commentaireId, data) =>
    patchData(`/admin_config/global-ev-comments/${commentaireId}/update/`, {
      commentaire: data.commentaire,
      gamme_id: data.gammeId,
    }),

  deleteEV: (commentaireId, data = {}) =>
    deleteData(`/admin_config/global-ev-comments/${commentaireId}/delete/`, {
      params: {
        gamme_id: data.gammeId,
      },
    }),
};

/* =========================
   CONFIGURATIONS
========================= */
export const configAPI = {
  roles: createConfigAPI("/admin_config/config/roles/"),
  architectures: createConfigAPI("/admin_config/config/architectures/"),
  motorisations: createConfigAPI("/admin_config/config/motorisations/"),
  fonctionsGamme: createConfigAPI("/admin_config/config/fonctions-gamme/"),
  typesProcedure: createConfigAPI("/admin_config/config/types-procedure/"),
};

export const authAPI = {
  adminPasswordLogin: ({ email, password }) =>
    publicPostData("/api/token/", { email, password }),

  requestOtp: (email) =>
    publicPostData("/api/otp/request/", { email }),

  verifyOtp: ({ email, code }) =>
    publicPostData("/api/otp/verify/", { email, code }),

};

/* =========================
   DASHBOARDS
========================= */
export const dashboardsAPI = {
  admin: () => getData("/admin_config/admindash/"),
  ppl: () => getData("/admin_config/ppldash/"),
  valideur: () => getData("/admin_config/valideurdash/"),
};

export const auditAPI = {
  list: (params = {}) => getData("/admin_config/audit-logs/", { params }),
};

/* =========================
   Vehicules
========================= */
export const vehiculesAPI = {
  check: (params) => api.get("/admin_config/vehicules/check/", { params }),
};

/* =========================
   Validations gammes
========================= */
export const validationsAPI = {
  createStepValidation: async ({
    gammeId,
    evCode,
    stepCode,
    cotation,
    commentaire,
  }) => {
    return postData("/admin_config/step-validations/", {
      gamme: gammeId,
      ev_code: evCode,
      step_code: stepCode,
      cotation,
      commentaire,
    });
  },

  getStepHistory: async (stepCode) => {
    return getData(
      `/admin_config/steps/${encodeURIComponent(stepCode)}/history/`
    );
  },

  getLatestGammeStepValidations: async (gammeId) => {
    return getData(
      `/admin_config/gammes/${gammeId}/step-validations/latest/`
    );
  },

  getGammeResults: async (gammeId) => {
    return getData(`/admin_config/gammes/${gammeId}/results/`);
  },

};
/* =========================
   GENERAL GAMME COMMENTS
   Types: BESOINS / PISTES
========================= */
export const generalCommentsAPI = {
  list: ({ gammeId, type }) =>
    getData(`/admin_config/gammes/${gammeId}/general-comments/${type}/`),

  create: ({ gammeId, type, commentaire }) =>
    postData("/admin_config/gammes/general-comments/ajouter/", {
      gamme: gammeId,
      type_commentaire: type,
      commentaire,
    }),

  update: (commentaireId, data) =>
    patchData(
      `/admin_config/gammes/general-comments/commentaire/${commentaireId}/modifier/`,
      data
    ),

  delete: (commentaireId) =>
    deleteData(
      `/admin_config/gammes/general-comments/commentaire/${commentaireId}/supprimer/`
    ),
};

export const measuredResultCommentsAPI = {
  list: ({ gammeId, evCode, stepCode }) =>
    getData(`/admin_config/gammes/${gammeId}/measured-result-comments/`, {
      params: {
        ev_code: evCode,
        step_code: stepCode,
      },
    }),

  create: ({ gammeId, evCode, stepCode, commentaire }) =>
    postData(`/admin_config/gammes/${gammeId}/measured-result-comments/create/`, {
      ev_code: evCode,
      step_code: stepCode,
      commentaire,
    }),

  update: ({ commentId, commentaire }) =>
    patchData(`/admin_config/measured-result-comments/${commentId}/update/`, {
      commentaire,
    }),

  delete: (commentId) =>
    deleteData(`/admin_config/measured-result-comments/${commentId}/delete/`),
};
/* =========================
   UTILS
========================= */
export const logout = () => {
  clearAuthSession();
  window.location.href = "/login";
};

export { api, ApiError };
export default api;
