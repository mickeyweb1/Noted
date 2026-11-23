
import axios from "axios";

// Create an Axios instance.
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  timeout: 60000,
});

// Generate a unique session version.
const newSessionVersion = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Get the initial token safely.
const initialToken =
  typeof window !== "undefined"
    ? localStorage.getItem("userToken") ||
      localStorage.getItem("token")
    : null;

// Attach the initial token immediately.
if (initialToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}

// Create a session version when a token exists.
if (
  typeof window !== "undefined" &&
  initialToken &&
  !localStorage.getItem("userSessionVersion")
) {
  localStorage.setItem(
    "userSessionVersion",
    newSessionVersion()
  );
}

/* ------------------------------------------------------------------ */
/* Request interceptor                                                 */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("userToken") ||
      localStorage.getItem("token");

    // Ensure headers exist.
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      config.headers["X-Auth-Session"] =
        localStorage.getItem("userSessionVersion") || "";
    } else {
      delete config.headers.Authorization;
      delete config.headers["X-Auth-Session"];
    }

    /*
     * For FormData, allow the browser to set Content-Type
     * so the multipart boundary is included correctly.
     *
     * For normal requests, use JSON.
     */
    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    if (isFormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------------------------------------------------------ */
/* Response interceptor                                                */
/* ------------------------------------------------------------------ */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const responseMessage = error.response?.data?.message;

    // Handle subscription and plan-limit errors globally.
    const isPlanLimit =
      typeof responseMessage === "string" &&
      /upgrade|not enough ai credits|plan allows|maximum of .*access codes|teachers need the school owner plan/i.test(
        responseMessage
      );

    if (
      error.response?.status === 403 &&
      isPlanLimit &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(
        new CustomEvent("noted:plan-limit", {
          detail: {
            message: responseMessage,
          },
        })
      );
    }

    const requestPath =
      error.config?.url?.split("?")[0] || "";

    const isAuthEntryRequest =
      /\/auth\/(login|register|claim|validate-code)$/.test(
        requestPath
      );

    const authorization =
      error.config?.headers?.Authorization ||
      error.config?.headers?.get?.("Authorization");

    const requestToken =
      typeof authorization === "string"
        ? authorization.replace(/^Bearer\s+/i, "")
        : "";

    const requestSession =
      error.config?.headers?.["X-Auth-Session"] ||
      error.config?.headers?.get?.("X-Auth-Session");

    const currentToken =
      localStorage.getItem("userToken") ||
      localStorage.getItem("token");

    const currentSession =
      localStorage.getItem("userSessionVersion");

    /*
     * Only expire the exact session that made this request.
     *
     * This prevents a delayed 401 from an older request
     * from deleting a newer login session.
     */
    const isCurrentSession =
      requestToken &&
      requestToken === currentToken &&
      requestSession === currentSession;

    if (
      error.response?.status === 401 &&
      !isAuthEntryRequest &&
      isCurrentSession
    ) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("user");
      localStorage.removeItem("userSessionVersion");

      delete api.defaults.headers.common.Authorization;

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("noted:auth-expired", {
            detail: {
              token: requestToken,
              session: requestSession,
            },
          })
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
