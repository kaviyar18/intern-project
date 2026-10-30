import axios from "axios";

// ---------------------------------------------------------
// API CONFIGURATION
// ---------------------------------------------------------

const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const API_ORIGIN = BASE_URL.replace(/\/api\/?$/i, "");

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    Accept: "application/json",
  },
});

// ---------------------------------------------------------
// RESPONSE AND ERROR HELPERS
// ---------------------------------------------------------

function unwrap(response) {
  return response?.data ?? response;
}

function getApiErrorMessage(error) {
  const detail =
    error?.response?.data?.detail ??
    error?.response?.data?.message ??
    error?.message;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "string" ? item : item?.msg || JSON.stringify(item),
      )
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return "Something went wrong. Please try again.";
}

function normalizeRecommendationList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.recommendations)) {
    return data.recommendations;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.eligible_schemes)) {
    return data.eligible_schemes;
  }

  if (Array.isArray(data?.needs_information)) {
    return data.needs_information;
  }

  if (Array.isArray(data?.data?.recommendations)) {
    return data.data.recommendations;
  }

  if (Array.isArray(data?.data?.results)) {
    return data.data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

// ---------------------------------------------------------
// PROFILE API — UNCHANGED
// ---------------------------------------------------------

const profileApi = {
  getProfile: async (_id = "default") =>
    unwrap(await apiClient.get("/profile")),

  saveProfile: async (profile, _id = "default") =>
    unwrap(await apiClient.put("/profile", { profile })),

  createProfile: async (profile) =>
    unwrap(await apiClient.post("/profile", { profile })),

  updateProfile: async (profile) =>
    unwrap(await apiClient.patch("/profile", { profile })),
};

// ---------------------------------------------------------
// INPUT PROCESSING API — UNCHANGED
// ---------------------------------------------------------

const inputApi = {
  processText: async (payload) =>
    unwrap(await apiClient.post("/process-text", payload)),

  processVoice: async (textOrPayload, language) => {
    const payload =
      typeof textOrPayload === "string"
        ? { text: textOrPayload, language: language || "en" }
        : textOrPayload;

    return unwrap(await apiClient.post("/voice", payload));
  },

  processDocument: async (payload) =>
    unwrap(await apiClient.post("/process-document", payload)),
};

// ---------------------------------------------------------
// RECOMMENDATIONS API — UNCHANGED
// ---------------------------------------------------------

const recommendationApi = {
  getRecommendations: async (profile) => {
    const data = unwrap(await apiClient.post("/recommendations", { profile }));

    const recommendations = normalizeRecommendationList(data);

    return {
      ...(data && !Array.isArray(data) ? data : {}),
      recommendations,
      results: recommendations,
    };
  },
};

// ---------------------------------------------------------
// ELIGIBILITY API — UNCHANGED
// ---------------------------------------------------------

const eligibilityApi = {
  getEligibility: async (profile, schemeId) =>
    unwrap(
      await apiClient.post("/eligibility", {
        profile,
        scheme_id: schemeId,
      }),
    ),

  checkEligibility: async (profile, schemeId) =>
    unwrap(
      await apiClient.post("/eligibility", {
        profile,
        scheme_id: schemeId,
      }),
    ),
};

// ---------------------------------------------------------
// CHATBOT AND RAG API — UNCHANGED
// ---------------------------------------------------------

const assistantApi = {
  chat: async (payload) => unwrap(await apiClient.post("/chat", payload)),

  askAssistant: async (payload) =>
    unwrap(await apiClient.post("/chat", payload)),

  askRag: async (payload) => unwrap(await apiClient.post("/rag", payload)),

  queryRag: async (payload) => unwrap(await apiClient.post("/rag", payload)),

  getRagAnswer: async (query, schemeId, language = "en") =>
    unwrap(
      await apiClient.post("/rag", {
        query,
        question: query,
        scheme_id: schemeId,
        language,
      }),
    ),
};

// ---------------------------------------------------------
// APPLICATION API — TRACKING CORRECTED
// Uses the existing /api/applications endpoints.
// ---------------------------------------------------------

function requireApplicationId(id) {
  if (
    id === null ||
    id === undefined ||
    typeof id === "object" ||
    typeof id === "boolean" ||
    String(id).trim() === ""
  ) {
    throw new Error(
      "A valid application ID is required. Pass the complete application ID, not the application object.",
    );
  }

  const value = String(id).trim();

  // Do not allow the shortened display format, e.g. APP-1229DB137390.
  if (/^APP-/i.test(value)) {
    throw new Error(
      "This is a shortened display ID. Enter the complete application ID shown by the backend.",
    );
  }

  // The screenshot's ID is a UUID. Require a complete UUID rather than
  // sending a shortened prefix that will always return 404.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    throw new Error(
      "Enter the complete application UUID, for example: 1229db13-7390-4467-a43f-21588453de49",
    );
  }

  return encodeURIComponent(value);
}

const applicationApi = {
  // Create an application record.
  createApplication: async (payload) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Application details must be provided as an object.");
    }

    return unwrap(await apiClient.post("/applications", payload));
  },

  // Compatibility: object = create record; string ID = retrieve record.
  // Do not call a nonexistent /submit endpoint.
  submitApplication: async (payloadOrId) => {
    if (
      payloadOrId !== null &&
      typeof payloadOrId === "object" &&
      !Array.isArray(payloadOrId)
    ) {
      return unwrap(await apiClient.post("/applications", payloadOrId));
    }

    return unwrap(
      await apiClient.get(`/applications/${requireApplicationId(payloadOrId)}`),
    );
  },

  // Retrieve a saved application by its COMPLETE backend-generated ID.
  getApplication: async (id) =>
    unwrap(await apiClient.get(`/applications/${requireApplicationId(id)}`)),

  // The backend currently has no document-upload route in the supplied
  // application router. Do not call a nonexistent endpoint.
  uploadApplicationDocument: async () => {
    throw new Error(
      "Document upload is not available through the current application API.",
    );
  },

  // Record a submitted status using the backend's existing PATCH route.
  // This changes the local record only; it does not submit to a government portal.
  finalizeApplication: async (id) =>
    unwrap(
      await apiClient.patch(`/applications/${requireApplicationId(id)}`, {
        status: "submitted",
      }),
    ),

  // Tracking uses the same existing GET endpoint.
  trackApplication: async (id) =>
    unwrap(await apiClient.get(`/applications/${requireApplicationId(id)}`)),
};

// ---------------------------------------------------------
// GOVERNMENT SCHEMES API — UNCHANGED
// ---------------------------------------------------------

const schemeApi = {
  getAllSchemes: async (params = {}) =>
    unwrap(await apiClient.get("/schemes", { params })),

  getScheme: async (schemeId) =>
    unwrap(await apiClient.get(`/schemes/${encodeURIComponent(schemeId)}`)),

  getSchemeFilters: async () => unwrap(await apiClient.get("/schemes/filters")),
};

// ---------------------------------------------------------
// HEALTH CHECK — UNCHANGED
// ---------------------------------------------------------

const healthApi = {
  checkHealth: async () =>
    unwrap(
      await axios.get(`${API_ORIGIN}/health`, {
        timeout: 10000,
      }),
    ),
};

// ---------------------------------------------------------
// COMBINED API EXPORT
// ---------------------------------------------------------

export const api = {
  ...profileApi,
  ...inputApi,
  ...recommendationApi,
  ...eligibilityApi,
  ...assistantApi,
  ...applicationApi,
  ...schemeApi,
  ...healthApi,
};

export { apiClient, getApiErrorMessage, normalizeRecommendationList, unwrap };

export default api;
