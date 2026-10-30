import { useMemo } from "react";
import { useAppState } from "../context/AppContext";
import {
  FaCheckCircle,
  FaCopy,
  FaArrowRight,
  FaHome,
  FaFileAlt,
  FaCalendarAlt,
  FaExclamationTriangle,
} from "react-icons/fa";

export default function Submission() {
  const { applicationResult, setPage, showToast } = useAppState();

  const application = applicationResult || {};

  const status = String(application.status || "draft")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");

  const isSubmitted =
    status === "submitted" ||
    status === "under review" ||
    status === "approved";

  const isDraft = status === "draft";

  const applicationId = application.application_id || application.id || "";

  const schemeName =
    application.scheme_name ||
    application.scheme_name_official ||
    application.schemeName ||
    "Government Scholarship";

  const submittedDate = useMemo(() => {
    const rawDate =
      application.submitted_at ||
      application.updated_at ||
      application.created_at;

    if (!rawDate) return "Not available";

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
      return String(rawDate);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [
    application.submitted_at,
    application.updated_at,
    application.created_at,
  ]);

  // Short reference for display; retain the actual backend ID
  // for application tracking.
  const displayReference = applicationId
    ? `APP-${String(applicationId)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 12)
        .toUpperCase()}`
    : "Not generated";

  const copyApplicationId = async () => {
    if (!applicationId) {
      showToast?.({
        message: "No application ID is available to copy.",
        type: "warning",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(String(applicationId));

      showToast?.({
        message: "Application ID copied.",
        type: "success",
      });
    } catch {
      showToast?.({
        message: `Application ID: ${applicationId}`,
        type: "info",
      });
    }
  };

  const goToTracking = () => {
    if (!applicationId) {
      showToast?.({
        message:
          "Application ID is missing. Please submit your application first.",
        type: "warning",
      });
      return;
    }

    setPage("track");
  };

  return (
    <div className="reference-page submission-page">
      <div className="reference-page-head">
        <div>
          <span className="section-kicker">STEP 06</span>
          <h2>Application Submission</h2>
          <p>View your application status and reference details.</p>
        </div>
      </div>

      <div
        className="reference-card submission-success-card"
        style={{
          maxWidth: "760px",
          margin: "24px auto",
          padding: "36px 28px",
          textAlign: "center",
          borderRadius: "14px",
        }}
      >
        {isSubmitted ? (
          <>
            <div
              className="submission-status-icon"
              style={{ marginBottom: "18px" }}
            >
              <FaCheckCircle
                aria-hidden="true"
                style={{
                  color: "#198754",
                  fontSize: "64px",
                }}
              />
            </div>

            <h2
              style={{
                color: "#172b43",
                fontSize: "25px",
                marginBottom: "10px",
              }}
            >
              Application Submitted Successfully!
            </h2>

            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              Your application record has been submitted. Keep your application
              ID for tracking.
            </p>

            <div
              className="application-reference-box"
              style={{
                background: "#effaf5",
                borderRadius: "10px",
                padding: "20px",
                margin: "24px auto",
                maxWidth: "420px",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#64748b",
                  marginBottom: "8px",
                }}
              >
                Application ID
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <strong
                  style={{
                    fontSize: "19px",
                    color: "#172b43",
                    overflowWrap: "anywhere",
                  }}
                >
                  {displayReference}
                </strong>

                <button
                  type="button"
                  onClick={copyApplicationId}
                  title="Copy actual application ID"
                  aria-label="Copy application ID"
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#1671e8",
                    cursor: "pointer",
                    fontSize: "16px",
                  }}
                >
                  <FaCopy />
                </button>
              </div>

              <small
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#64748b",
                }}
              >
                Use the copy button to copy the actual ID for tracking.
              </small>
            </div>

            <div
              style={{
                textAlign: "left",
                maxWidth: "480px",
                margin: "0 auto 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <FaFileAlt style={{ color: "#1671e8", marginTop: "4px" }} />
                <div>
                  <small style={{ color: "#64748b" }}>Scheme</small>
                  <div style={{ fontWeight: 600, marginTop: "4px" }}>
                    {schemeName}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <FaCalendarAlt style={{ color: "#1671e8", marginTop: "4px" }} />
                <div>
                  <small style={{ color: "#64748b" }}>Submitted On</small>
                  <div style={{ fontWeight: 600, marginTop: "4px" }}>
                    {submittedDate}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "12px 0",
                }}
              >
                <FaCheckCircle style={{ color: "#198754", marginTop: "4px" }} />
                <div>
                  <small style={{ color: "#64748b" }}>Status</small>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#198754",
                      marginTop: "4px",
                      textTransform: "capitalize",
                    }}
                  >
                    {status}
                  </div>
                </div>
              </div>
            </div>

            <p
              style={{
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.7,
                maxWidth: "520px",
                margin: "0 auto 22px",
              }}
            >
              Note: This confirms the status of your application's local record.
              Complete any remaining document upload, authentication, and
              submission steps on the official government portal.
            </p>

            <button
              type="button"
              className="reference-primary"
              onClick={goToTracking}
              disabled={!applicationId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                minWidth: "210px",
                padding: "13px 20px",
              }}
            >
              Go to Track Application <FaArrowRight />
            </button>
          </>
        ) : (
          <>
            <FaExclamationTriangle
              style={{
                color: "#d97706",
                fontSize: "52px",
                marginBottom: "16px",
              }}
            />

            <h2 style={{ color: "#172b43" }}>
              {isDraft
                ? "Application Saved as Draft"
                : "Application Not Submitted"}
            </h2>

            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              {application.message ||
                "The application has not been confirmed as submitted. Please return to the application form and retry."}
            </p>

            {applicationId && (
              <p style={{ color: "#64748b" }}>
                Draft ID: <strong>{applicationId}</strong>
              </p>
            )}

            {Array.isArray(application.validation_errors) &&
              application.validation_errors.length > 0 && (
                <div style={{ textAlign: "left", margin: "20px 0" }}>
                  <strong>Items requiring attention</strong>
                  <ul>
                    {application.validation_errors.map((error, index) => (
                      <li key={index}>{String(error)}</li>
                    ))}
                  </ul>
                </div>
              )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                className="reference-primary"
                onClick={() => setPage("application")}
              >
                Return to Application
              </button>

              <button
                type="button"
                className="reference-outline"
                onClick={() => setPage("home")}
              >
                <FaHome /> Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
