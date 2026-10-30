import { useEffect, useState } from "react";
import { useAppState } from "../context/AppContext";
import { api } from "../api/api";
import {
  FaSearch,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaArrowRight,
} from "react-icons/fa";

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const getStatus = (item) =>
  String(item?.status || "draft")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const unwrapApplication = (response) =>
  response?.application ??
  response?.data?.application ??
  response?.data ??
  response;

const getFullApplicationId = (item) => {
  if (!item || typeof item !== "object") return "";

  const id = item.application_id || item.id || "";

  // Never use a shortened display ID such as APP-1229DB137390.
  if (typeof id !== "string") return "";

  const value = id.trim();

  return /^APP-/i.test(value) ? "" : value;
};

export default function Track() {
  const { applicationResult, setPage, showToast } = useAppState();

  const savedId = getFullApplicationId(applicationResult);

  const [applicationId, setApplicationId] = useState(savedId);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (savedId) {
      setApplicationId(savedId);
    }
  }, [savedId]);

  const trackApplication = async (event) => {
    event.preventDefault();

    const id = applicationId.trim();

    if (!id) {
      setError("Enter your complete Navigator Application ID.");
      return;
    }

    if (/^APP-/i.test(id) || !/^[0-9a-f-]{20,}$/i.test(id)) {
      setError(
        "Enter the complete application ID returned by the backend, not the shortened APP display ID.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setApplication(null);

    try {
      if (typeof api.getApplication !== "function") {
        throw new Error(
          "api.getApplication is missing in frontend/src/api/api.js.",
        );
      }

      const response = await api.getApplication(id);
      const record = unwrapApplication(response);
      const returnedId = getFullApplicationId(record);

      if (!record || typeof record !== "object" || !returnedId) {
        throw new Error(
          "The backend response does not contain a complete application ID.",
        );
      }

      setApplication(record);

      if (typeof showToast === "function") {
        showToast({
          message: "Application record retrieved successfully.",
          type: "success",
        });
      }
    } catch (err) {
      const statusCode = err?.response?.status;

      if (statusCode === 404) {
        setError(
          "Application not found. The record may not exist in the current backend process. Submit a new application if the backend was restarted, then use its complete returned ID.",
        );
      } else {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to retrieve the application. Check the backend and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const status = getStatus(application);

  const history = Array.isArray(application?.status_history)
    ? application.status_history
    : [];

  return (
    <div className="reference-page">
      <div className="reference-page-head">
        <div>
          <span className="section-kicker">STEP 07</span>
          <h2>Track Application</h2>
          <p>
            Track your saved Navigator application record and continue to the
            official government portal for authoritative status updates.
          </p>
        </div>
      </div>

      <form
        onSubmit={trackApplication}
        className="reference-card"
        style={{ padding: 20, marginBottom: 24 }}
      >
        <label
          htmlFor="application-id"
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Navigator Application ID
        </label>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <input
            id="application-id"
            type="text"
            value={applicationId}
            onChange={(event) => setApplicationId(event.target.value)}
            placeholder="Enter your complete application ID"
            autoComplete="off"
            required
            style={{
              flex: "1 1 320px",
              minWidth: 0,
              padding: 12,
              border: "1px solid #cbd5e1",
              borderRadius: 7,
            }}
          />

          <button
            type="submit"
            className="reference-primary"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 20px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            <FaSearch />
            {loading ? "Tracking..." : "Track"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          style={{
            padding: 16,
            marginBottom: 20,
            borderRadius: 8,
            color: "#991b1b",
            background: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          <FaExclamationCircle style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      {!application && !loading && !error && (
        <div
          className="reference-empty"
          style={{ textAlign: "center", padding: "70px 20px" }}
        >
          <FaSearch
            style={{
              fontSize: 44,
              color: "#75a8d8",
              marginBottom: 18,
            }}
          />
          <h3>Enter an Application ID</h3>
          <p>
            Use the complete ID returned when your application record was
            created.
          </p>
        </div>
      )}

      {loading && (
        <div className="reference-empty" style={{ textAlign: "center" }}>
          <p>Retrieving your application record...</p>
        </div>
      )}

      {application && (
        <div className="reference-card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <FaFileAlt style={{ fontSize: 28, color: "#1473e6" }} />

            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ margin: 0 }}>
                {application.scheme_name || "Government Scholarship"}
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  overflowWrap: "anywhere",
                }}
              >
                Application ID:{" "}
                <strong>{application.application_id || application.id}</strong>
              </p>
            </div>

            <span
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                background:
                  status.toLowerCase() === "approved"
                    ? "#dcfce7"
                    : status.toLowerCase() === "rejected"
                      ? "#fee2e2"
                      : "#dbeafe",
                color:
                  status.toLowerCase() === "approved"
                    ? "#166534"
                    : status.toLowerCase() === "rejected"
                      ? "#991b1b"
                      : "#1d4ed8",
                fontWeight: 700,
              }}
            >
              {status}
            </span>
          </div>

          <hr />

          <div
            style={{
              display: "grid",
              gap: 18,
              marginTop: 22,
            }}
          >
            <div>
              <small>Applicant</small>
              <div style={{ fontWeight: 600 }}>
                {application.applicant_name ||
                  application.profile?.name ||
                  application.profile?.full_name ||
                  "Not available"}
              </div>
            </div>

            <div>
              <small>Created on</small>
              <div style={{ fontWeight: 600 }}>
                {formatDate(
                  application.created_at || application.submission_date,
                )}
              </div>
            </div>

            <div>
              <small>Submitted on</small>
              <div style={{ fontWeight: 600 }}>
                {formatDate(application.submitted_at)}
              </div>
            </div>

            <div>
              <small>Last updated</small>
              <div style={{ fontWeight: 600 }}>
                {formatDate(application.updated_at)}
              </div>
            </div>

            {application.remarks && (
              <div>
                <small>Remarks</small>
                <div>{application.remarks}</div>
              </div>
            )}
          </div>

          <hr style={{ margin: "24px 0" }} />

          <h3>
            <FaClock style={{ marginRight: 9 }} />
            Application Status History
          </h3>

          {history.length > 0 ? (
            <div
              style={{
                display: "grid",
                gap: 16,
                marginTop: 20,
              }}
            >
              {history.map((item, index) => (
                <div
                  key={`${item.timestamp || index}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <FaCheckCircle
                    style={{
                      color: "#168454",
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />

                  <div>
                    <strong>{getStatus(item)}</strong>

                    <div
                      style={{
                        color: "#64748b",
                        marginTop: 4,
                      }}
                    >
                      {formatDate(item.timestamp)}
                    </div>

                    {item.remarks && <p>{item.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>
              Current recorded status: <strong>{status}</strong>
            </p>
          )}

          <div
            style={{
              background: "#eff6ff",
              padding: 16,
              borderRadius: 8,
              marginTop: 24,
            }}
          >
            <strong>Important:</strong> This displays the status recorded by
            your Navigator backend. It does not independently verify approval or
            status on a government portal.
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button
              type="button"
              className="reference-primary"
              onClick={() => setPage("submission")}
            >
              View Submission <FaArrowRight style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
