
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "../context/AppContext";
import { api } from "../api/api";
import SchemeModal from "../components/SchemeModal";
import {
  FaGraduationCap,
  FaArrowRight,
  FaEye,
  FaRupeeSign,
} from "react-icons/fa";

const normalizeStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getSchemeId = (scheme) => {
  if (!scheme || typeof scheme !== "object") return "";

  const id = scheme.scheme_id ?? scheme.scheme_key ?? scheme.id;

  if (id === null || id === undefined) return "";

  const value = String(id).trim();

  if (!value || value === "[object Object]") return "";

  return value;
};

const getSchemeName = (scheme) => {
  if (!scheme || typeof scheme !== "object") return "";

  return (
    scheme.scheme_name_official ||
    scheme.scheme_name ||
    scheme.name ||
    scheme.title ||
    ""
  );
};

const extractRecommendations = (response) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.recommendations)) {
    return response.recommendations;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.data?.recommendations)) {
    return response.data.recommendations;
  }

  if (Array.isArray(response?.data?.results)) {
    return response.data.results;
  }

  return [];
};

const extractSchemes = (response) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.schemes)) return response.schemes;

  if (Array.isArray(response?.results)) return response.results;

  if (Array.isArray(response?.data?.schemes)) {
    return response.data.schemes;
  }

  if (Array.isArray(response?.data)) return response.data;

  return [];
};

// Keep eligible and potentially eligible schemes.
// Exclude only schemes explicitly marked ineligible.
const isRecommendationCandidate = (item) => {
  if (!item || typeof item !== "object") return false;

  const status = normalizeStatus(
    item.eligibility_status ?? item.status
  );

  const explicitlyIneligible =
    item.eligible === false ||
    [
      "not_eligible",
      "ineligible",
      "not_eligible_confirmed",
    ].includes(status);

  return !explicitlyIneligible;
};

const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const findBackendScheme = (recommendation, schemes) => {
  const nested = recommendation?.scheme || {};

  const ids = [
    getSchemeId(recommendation),
    getSchemeId(nested),
  ].filter(Boolean);

  let match = schemes.find((scheme) =>
    ids.includes(getSchemeId(scheme))
  );

  if (match) return match;

  const names = [
    getSchemeName(recommendation),
    getSchemeName(nested),
    recommendation?.scheme_name,
    recommendation?.name,
  ]
    .filter(Boolean)
    .map(normalizeName);

  match = schemes.find((scheme) =>
    names.includes(normalizeName(getSchemeName(scheme)))
  );

  return match || null;
};

const getErrorMessage = (error) => {
  const detail =
    error?.response?.data?.detail ??
    error?.response?.data?.message ??
    error?.message;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || JSON.stringify(item))
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || JSON.stringify(detail);
  }

  return "Something went wrong. Please try again.";
};

export default function Recommendations() {
  const {
    recommendations,
    setRecommendations,
    profile,
    setSelectedScheme,
    setEligibility,
    setPage,
    showToast,
  } = useAppState();

  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile)
    ) {
      setRecommendations([]);

      showToast({
        message: "Please enter your profile details first.",
        type: "warning",
      });

      setPage("input");
      return;
    }

    setLoading(true);

    try {
      const response = await api.getRecommendations(profile);

      const allItems = extractRecommendations(response);

      const matchingItems = allItems.filter(
        isRecommendationCandidate
      );

      console.log("Profile:", profile);
      console.log("Recommendation API response:", response);
      console.log("Total recommendations:", allItems.length);
      console.log("Matching candidates:", matchingItems.length);

      setRecommendations(matchingItems);
    } catch (error) {
      console.error("Recommendation loading failed:", error);

      showToast({
        message: getErrorMessage(error),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    profile,
    setPage,
    setRecommendations,
    showToast,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const select = async (rec) => {
    if (checkingId !== null) return;

    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile)
    ) {
      showToast({
        message:
          "Your profile is missing. Please enter your details first.",
        type: "warning",
      });

      setPage("input");
      return;
    }

    const displayName =
      getSchemeName(rec?.scheme) ||
      getSchemeName(rec) ||
      "Selected scheme";

    const buttonKey =
      getSchemeId(rec) || normalizeName(displayName);

    setCheckingId(buttonKey);

    try {
      const response = await api.getAllSchemes();

      const schemes = extractSchemes(response);

      const matchedScheme = findBackendScheme(rec, schemes);

      if (!matchedScheme) {
        throw new Error(
          `Could not find "${displayName}" in the backend scheme dataset. Refresh recommendations and try again.`
        );
      }

      const schemeId = getSchemeId(matchedScheme);

      if (!schemeId) {
        throw new Error(
          `The scheme "${displayName}" has no valid scheme ID.`
        );
      }

      const result = await api.getEligibility(
        profile,
        schemeId
      );

      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result)
      ) {
        throw new Error(
          "The eligibility API returned an invalid response."
        );
      }

      setSelectedScheme({
        ...rec,
        scheme_id: schemeId,
        scheme_name:
          getSchemeName(matchedScheme) || displayName,
        scheme: matchedScheme,
      });

      setEligibility(result);
      setPage("eligibility");
    } catch (error) {
      console.error("Eligibility request failed:", error);

      showToast({
        message: getErrorMessage(error),
        type: "error",
      });
    } finally {
      setCheckingId(null);
    }
  };

  if (!profile) {
    return (
      <div className="reference-empty">
        <FaGraduationCap />

        <h3>No profile available</h3>

        <p>
          Enter your details or use voice input to receive
          personalized government scheme recommendations.
        </p>

        <button
          type="button"
          className="reference-primary"
          onClick={() => setPage("input")}
        >
          Go to Profile Input <FaArrowRight />
        </button>
      </div>
    );
  }

  return (
    <div className="reference-page recommendations-page">
      <div className="reference-page-head">
        <div>
          <span className="section-kicker">STEP 03</span>

          <h2>Recommended Schemes</h2>

          <p>
            Government schemes matched to your profile,
            including potential matches that need additional
            information or official verification.
          </p>
        </div>

        <button
          type="button"
          className="reference-outline compact"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Checking Profile..." : "Refresh Matches"}
        </button>
      </div>

      {loading ? (
        <div className="loading-reference">
          {[1, 2, 3].map((item) => (
            <div
              className="skeleton-card"
              key={item}
            />
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="scheme-reference-list">
          {recommendations.map((rec, index) => {
            const scheme = rec?.scheme || rec || {};

            const name =
              getSchemeName(scheme) ||
              getSchemeName(rec) ||
              "Government Scheme";

            const category =
              scheme.eligible_categories ||
              scheme.category ||
              scheme.education_levels ||
              scheme.education ||
              "Scholarship";

            const description =
              rec?.description ||
              rec?.summary ||
              rec?.explanation ||
              scheme.description ||
              "This scheme matches the available eligibility information.";

            const rawIncome =
              scheme.income_limit_amount ??
              scheme.income_limit;

            const numericIncome =
              typeof rawIncome === "number"
                ? rawIncome
                : Number(
                    String(rawIncome ?? "").replace(
                      /[^0-9.]/g,
                      ""
                    )
                  );

            const cardKey =
              getSchemeId(rec) ||
              getSchemeId(scheme) ||
              `${normalizeName(name)}-${index}`;

            const buttonKey =
              getSchemeId(rec) || normalizeName(name);

            const isChecking = checkingId === buttonKey;

            const isEligible = rec?.eligible === true;

            return (
              <article
                className="scheme-reference-card compact-scheme-card"
                key={cardKey}
              >
                <div
                  className={`scheme-icon scheme-icon-${index % 4}`}
                >
                  <FaGraduationCap />
                </div>

                <div className="scheme-main">
                  <h4 className="compact-scheme-title">
                    {name}
                  </h4>

                  <div className="scheme-meta compact-scheme-meta">
                    <span>Government Scheme</span>

                    <span>
                      {typeof category === "string"
                        ? category
                        : "Scholarship"}
                    </span>

                    <span>
                      {isEligible
                        ? "Eligible match"
                        : "Potential match — verify details"}
                    </span>

                    {Number.isFinite(numericIncome) &&
                      numericIncome > 0 && (
                        <span>
                          <FaRupeeSign />
                          {numericIncome.toLocaleString("en-IN")}
                          {" income limit"}
                        </span>
                      )}
                  </div>

                  <p className="compact-scheme-description">
                    {description}
                  </p>

                  <div className="compact-scheme-actions">
                    <button
                      type="button"
                      className="reference-outline small"
                      onClick={() => setModal(scheme)}
                    >
                      <FaEye /> View Details
                    </button>

                    <button
                      type="button"
                      className="reference-primary small"
                      onClick={() => select(rec)}
                      disabled={checkingId !== null}
                    >
                      {isChecking
                        ? "Checking..."
                        : "Check Eligibility"}

                      {!isChecking && <FaArrowRight />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="reference-empty">
          <FaGraduationCap />

          <h3>No scheme recommendations available</h3>

          <p>
            The recommendation API did not return any
            matching schemes. Complete your profile details
            and refresh. If the problem continues, check
            the backend terminal and confirm that the
            government scheme CSV dataset is loaded.
          </p>

          <button
            type="button"
            className="reference-outline"
            onClick={() => setPage("profile")}
          >
            Review My Profile
          </button>

          <button
            type="button"
            className="reference-primary"
            onClick={load}
            disabled={loading}
          >
            Recheck Eligibility
          </button>
        </div>
      )}

      {modal && (
        <SchemeModal
          scheme={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}