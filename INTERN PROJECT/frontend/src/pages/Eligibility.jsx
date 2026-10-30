import { useCallback, useEffect, useState } from "react";
import { useAppState } from "../context/AppContext";
import { api } from "../api/api";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaArrowRight,
  FaQuestionCircle,
  FaGraduationCap,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function Eligibility() {
  const {
    selectedScheme,
    profile,
    eligibility,
    recommendations,
    setSelectedScheme,
    setEligibility,
    setPage,
    showToast,
  } = useAppState();

  const [loading, setLoading] = useState(false);

  const unwrapScheme = (item) => item?.scheme || item || {};

  const schemeId = (item) => {
    const scheme = unwrapScheme(item);
    return (
      scheme.scheme_id ??
      scheme.scheme_key ??
      scheme.id ??
      item?.scheme_id ??
      item?.id ??
      ""
    );
  };

  const schemeName = (item) => {
    const scheme = unwrapScheme(item);
    return (
      scheme.scheme_name_official ||
      scheme.scheme_name ||
      scheme.name ||
      scheme.title ||
      "Government Scholarship"
    );
  };

  const currentId = schemeId(selectedScheme);

  const checkEligibility = useCallback(
    async (item = selectedScheme) => {
      if (!profile || typeof profile !== "object") {
        showToast({
          message: "Please complete your profile first.",
          type: "warning",
        });
        setPage("input");
        return;
      }

      const id = schemeId(item);

      if (!id) {
        showToast({
          message: "Please select a scheme.",
          type: "warning",
        });
        return;
      }

      setLoading(true);

      try {
        const response = await api.getEligibility(profile, id);
        const data =
          response?.data && typeof response.data === "object"
            ? response.data
            : response;

        if (!data || typeof data !== "object") {
          throw new Error("Invalid response from the eligibility service.");
        }

        setEligibility(data);
      } catch (error) {
        console.error("Eligibility API error:", error);
        showToast({
          message:
            error?.response?.data?.detail ||
            error?.message ||
            "Unable to check eligibility. Please try again.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [profile, selectedScheme, setEligibility, setPage, showToast],
  );

  useEffect(() => {
    if (selectedScheme && profile && !eligibility) {
      checkEligibility(selectedScheme);
    }
  }, [currentId, profile, eligibility, selectedScheme, checkEligibility]);

  const handleSchemeChange = (event) => {
    const id = event.target.value;

    const next = (recommendations || []).find(
      (item) => String(schemeId(item)) === String(id),
    );

    if (next) {
      setSelectedScheme(next);
      setEligibility(null);
    }
  };

  if (!selectedScheme) {
    return (
      <div className="eligibility-reference-page">
        <style>{styles}</style>
        <div className="er-empty">
          <FaGraduationCap />
          <h2>Eligibility Check</h2>
          <p>Select a recommended scholarship to check your eligibility.</p>
          <button
            className="er-button"
            onClick={() => setPage("recommendations")}
          >
            View Recommendations <FaArrowRight />
          </button>
        </div>
      </div>
    );
  }

  // FRONTEND PREVIEW ONLY: backend data and eligibility logic are unchanged.
  const eligible = true;
  const notEligible = false;
  const verificationPending = eligibility?.verification_pending === true;

  const status = "Eligible";

  const message =
    "Demo preview: showing an 80% eligibility match for the UI. This is not an official or verified eligibility decision.";

  const rawCriteria = Array.isArray(eligibility?.criteria)
    ? eligibility.criteria
    : Array.isArray(eligibility?.checks)
      ? eligibility.checks
      : [];

  const criteria = rawCriteria.map((item, index) => {
    const label = String(
      item?.criterion || item?.name || item?.field || "Eligibility criterion",
    )
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    const raw = String(item?.status || "")
      .toLowerCase()
      .trim();

    let passed = typeof item?.result === "boolean" ? item.result : null;

    if (passed === null) {
      if (["met", "pass", "passed", "satisfied"].includes(raw)) {
        passed = true;
      } else if (["not met", "failed", "fail", "not satisfied"].includes(raw)) {
        passed = false;
      }
    }

    let shortValue = item?.candidate_value;

    if (shortValue === null || shortValue === undefined || shortValue === "") {
      shortValue =
        passed === true
          ? "Applicable"
          : passed === false
            ? "Does not match"
            : "Needs verification";
    }

    return {
      key: `${item?.field || item?.criterion || "criterion"}-${index}`,
      label,
      passed,
      value: String(shortValue),
      detail: item?.detail || item?.reason || item?.explanation || "",
    };
  });

  // Fixed frontend-only preview score.
  const scoreValue = 80;
  const showScore = true;

  const recheck = () => {
    setEligibility(null);
    checkEligibility(selectedScheme);
  };

  return (
    <div className="eligibility-reference-page">
      <style>{styles}</style>

      <header className="er-header">
        <span className="er-step">STEP 04</span>
        <h1>Eligibility Check</h1>
        <p>Check whether you meet the requirements for a government scheme.</p>
      </header>

      <section className="er-card">
        <div className="er-select-heading">
          <span className="er-number">01</span>
          <div>
            <h2>Select Scheme</h2>
            <p>Choose a recommended scheme to check your eligibility.</p>
          </div>
        </div>

        <div className="er-select-row">
          <select
            value={currentId}
            onChange={handleSchemeChange}
            disabled={loading}
            aria-label="Select government scholarship"
          >
            {(recommendations || []).some(
              (item) => String(schemeId(item)) === String(currentId),
            ) ? null : (
              <option value={currentId}>{schemeName(selectedScheme)}</option>
            )}

            {(recommendations || []).map((item, index) => (
              <option key={schemeId(item) || index} value={schemeId(item)}>
                {schemeName(item)}
              </option>
            ))}
          </select>

          <button className="er-button" onClick={recheck} disabled={loading}>
            {loading ? "Checking..." : "Check Eligibility"}
            {!loading && <FaArrowRight />}
          </button>
        </div>

        <div className="er-divider" />

        {loading ? (
          <div className="er-loading">
            <span className="er-spinner" />
            <p>Checking your profile against the scheme requirements...</p>
          </div>
        ) : eligibility ? (
          <>
            <div className="er-scheme">
              <span className="er-scheme-icon">
                <FaGraduationCap />
              </span>
              <div>
                <span>Selected Scheme</span>
                <strong>{schemeName(selectedScheme)}</strong>
              </div>
            </div>

            <div className="er-result er-result-success">
              <span className="er-result-icon">
                <FaCheckCircle />
              </span>
              <div>
                <h3>{status}</h3>
                <p>{message}</p>
              </div>
            </div>

            {showScore && (
              <div className="er-score">
                <div className="er-score-heading">
                  <strong>Eligibility Match Preview</strong>
                  <b>{scoreValue}%</b>
                </div>
                <div className="er-score-track">
                  <span style={{ width: `${scoreValue}%` }} />
                </div>
                <small>
                  Demo-only display score. It does not confirm actual
                  eligibility or the probability of receiving a scholarship.
                </small>
              </div>
            )}

            <div className="er-criteria">
              <h3>Eligibility Criteria</h3>

              {criteria.length > 0 ? (
                criteria.map((item) => (
                  <div className="er-criterion" key={item.key}>
                    <span
                      className={`er-criterion-icon ${
                        item.passed === true
                          ? "er-pass"
                          : item.passed === false
                            ? "er-fail"
                            : "er-pending-icon"
                      }`}
                    >
                      {item.passed === true ? (
                        <FaCheckCircle />
                      ) : item.passed === false ? (
                        <FaTimesCircle />
                      ) : (
                        <FaQuestionCircle />
                      )}
                    </span>

                    <div className="er-criterion-content">
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                      {item.detail && <small>{item.detail}</small>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="er-no-criteria">
                  {eligibility?.explanation ||
                    "Detailed criteria are not available in the response."}
                </p>
              )}

              {verificationPending && (
                <div className="er-notice">
                  <FaExclamationTriangle />
                  <p>
                    Some scheme information requires official verification.
                    Please review the current government notification before
                    relying on this result.
                  </p>
                </div>
              )}
            </div>

            <div className="er-footer">
              <div>
                <strong>Next Step</strong>
                <p>
                  Review the official scheme requirements before continuing with
                  your application.
                </p>
              </div>

              <button
                className="er-button er-next-button"
                onClick={() => setPage("application")}
              >
                Continue to Application <FaArrowRight />
              </button>
            </div>
          </>
        ) : (
          <div className="er-empty-result">
            <FaQuestionCircle />
            <p>Click Check Eligibility to evaluate the selected scheme.</p>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = `
.eligibility-reference-page {
  width: 100%;
  min-width: 0;
  padding: 22px 26px 32px;
  color: #172b49;
  box-sizing: border-box;
  font-family: Inter, Arial, sans-serif;
}

.eligibility-reference-page * {
  box-sizing: border-box;
}

.er-header {
  margin-bottom: 25px;
}

.er-step {
  display: block;
  margin-bottom: 7px;
  color: #2168c9;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.3px;
}

.er-header h1 {
  margin: 0 0 7px;
  color: #142a47;
  font-size: clamp(23px, 2.2vw, 30px);
  font-weight: 750;
  letter-spacing: -0.6px;
}

.er-header > p {
  margin: 0;
  color: #72829a;
  font-size: 14px;
  line-height: 1.6;
}

.er-card {
  width: min(100%, 820px);
  margin: 0 auto;
  padding: 23px 24px;
  background: #fff;
  border: 1px solid #dce5f1;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(29, 60, 100, 0.04);
}

.er-select-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.er-number {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eaf2ff;
  color: #0868e8;
  font-size: 12px;
  font-weight: 800;
}

.er-select-heading h2 {
  margin: 0 0 4px;
  color: #172b49;
  font-size: 18px;
  font-weight: 750;
}

.er-select-heading p {
  margin: 0;
  color: #77869c;
  font-size: 13px;
  line-height: 1.5;
}

.er-select-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.er-select-row select {
  min-width: 0;
  flex: 1;
  height: 43px;
  padding: 0 12px;
  border: 1px solid #ccd9e9;
  border-radius: 6px;
  background: #fff;
  color: #1b304c;
  font-size: 13px;
  outline: none;
}

.er-select-row select:focus {
  border-color: #126bea;
  box-shadow: 0 0 0 3px rgba(18, 107, 234, 0.1);
}

.er-button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 17px;
  border: 0;
  border-radius: 6px;
  background: #0869e9;
  color: #fff;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease;
}

.er-button:hover {
  background: #0757c5;
}

.er-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.er-divider {
  height: 1px;
  margin: 22px 0;
  background: #dce5f0;
}

.er-scheme {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-bottom: 22px;
  padding: 13px;
  border: 1px solid #d6e5ff;
  border-radius: 9px;
  background: #f2f6ff;
}

.er-scheme-icon {
  width: 39px;
  height: 39px;
  flex: 0 0 39px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: #e5efff;
  color: #0869e9;
  font-size: 17px;
}

.er-scheme > div {
  min-width: 0;
}

.er-scheme > div > span {
  display: block;
  margin-bottom: 3px;
  color: #74839b;
  font-size: 12px;
}

.er-scheme strong {
  display: block;
  color: #19304e;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.er-result {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-bottom: 23px;
  padding: 15px;
  border-radius: 8px;
}

.er-result-success {
  border: 1px solid #d2eadb;
  background: #effaf3;
}

.er-result-fail {
  border: 1px solid #f1d7d7;
  background: #fff5f5;
}

.er-result-pending {
  border: 1px solid #e4e9f0;
  background: #f6f8fb;
}

.er-result-icon {
  padding-top: 2px;
  font-size: 20px;
}

.er-result-success .er-result-icon,
.er-result-success h3 {
  color: #168448;
}

.er-result-fail .er-result-icon,
.er-result-fail h3 {
  color: #c63f43;
}

.er-result-pending .er-result-icon,
.er-result-pending h3 {
  color: #52647b;
}

.er-result h3 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
}

.er-result p {
  margin: 0;
  color: #53667c;
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.er-score {
  margin: 0 0 22px;
}

.er-score-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
  font-size: 13px;
}

.er-score-heading b {
  color: #0869e9;
}

.er-score-track {
  height: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: #e8edf5;
}

.er-score-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #0869e9;
}

.er-score > small {
  display: block;
  margin-top: 8px;
  color: #78879c;
  font-size: 11px;
  line-height: 1.6;
}

.er-criteria {
  border-top: 1px solid #dce5f0;
  padding-top: 19px;
}

.er-criteria > h3 {
  margin: 0 0 14px;
  color: #172b49;
  font-size: 17px;
  font-weight: 750;
}

.er-criterion {
  display: grid;
  grid-template-columns: 19px minmax(0, 1fr);
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f6;
}

.er-criterion:last-of-type {
  border-bottom: 0;
}

.er-criterion-icon {
  padding-top: 2px;
  font-size: 15px;
}

.er-pass {
  color: #21a05b;
}

.er-fail {
  color: #d84c4c;
}

.er-pending-icon {
  color: #d49a25;
}

.er-criterion-content {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1.2fr);
  align-items: start;
  gap: 5px 12px;
}

.er-criterion-content > strong {
  color: #2a405c;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
}

.er-criterion-content > span {
  color: #596d83;
  font-size: 12px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.er-criterion-content > small {
  grid-column: 1 / -1;
  color: #718199;
  font-size: 11px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.er-notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 13px;
  padding: 12px;
  border-radius: 6px;
  background: #f4f7fb;
  color: #718199;
}

.er-notice > svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #c48b1e;
}

.er-notice p,
.er-no-criteria {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.er-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 20px;
  padding-top: 17px;
  border-top: 1px solid #dce5f0;
}

.er-footer > div {
  min-width: 0;
}

.er-footer strong {
  display: block;
  margin-bottom: 5px;
  color: #203753;
  font-size: 12px;
}

.er-footer p {
  margin: 0;
  color: #718199;
  font-size: 11px;
  line-height: 1.6;
}

.er-next-button {
  flex-shrink: 0;
}

.er-loading,
.er-empty-result,
.er-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 12px;
  text-align: center;
  color: #718199;
}

.er-loading p,
.er-empty-result p,
.er-empty p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.er-empty > svg,
.er-empty-result > svg {
  color: #176be0;
  font-size: 26px;
}

.er-empty h2 {
  margin: 0;
  color: #172b49;
}

.er-spinner {
  width: 25px;
  height: 25px;
  border: 3px solid #dce7f7;
  border-top-color: #0869e9;
  border-radius: 50%;
  animation: er-spin 0.8s linear infinite;
}

@keyframes er-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .eligibility-reference-page {
    padding: 17px 12px 24px;
  }

  .er-card {
    padding: 17px 14px;
  }

  .er-select-row {
    flex-direction: column;
  }

  .er-select-row select,
  .er-select-row .er-button {
    width: 100%;
  }

  .er-criterion-content {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .er-criterion-content > small {
    grid-column: auto;
  }

  .er-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .er-next-button {
    width: 100%;
  }
}
`;
