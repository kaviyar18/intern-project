import {
  FaTimes,
  FaUniversity,
  FaFileAlt,
  FaMoneyBillWave,
  FaWheelchair,
  FaCheckCircle,
  FaGraduationCap,
  FaExternalLinkAlt,
  FaInfoCircle,
} from "react-icons/fa";

const firstValue = (scheme, keys, fallback = "") => {
  for (const key of keys) {
    const value = scheme?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return fallback;
};

const displayValue = (value, fallback = "Not specified") => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const text = String(value).trim();

  const unknown = /^(unknown|not specified|not available|n\/a|na|null|none)$/i;

  return unknown.test(text) ? fallback : text;
};

const splitItems = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (value === undefined || value === null || String(value).trim() === "") {
    return [];
  }

  return String(value)
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const isUnknown = (value) =>
  /^(unknown|not specified|not available|n\/a|na|null|none)$/i.test(
    String(value ?? "").trim(),
  );

const Field = ({ label, value }) => (
  <div className="scheme-detail-field">
    <div className="scheme-detail-label">{label}</div>
    <div className="scheme-detail-value">{displayValue(value)}</div>
  </div>
);

const DetailSection = ({ title, value }) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    isUnknown(value)
  ) {
    return null;
  }

  return (
    <section className="scheme-detail-section">
      <h6>{title}</h6>
      <p>{String(value)}</p>
    </section>
  );
};

export default function SchemeModal({ scheme, onClose }) {
  if (!scheme) return null;

  // Support both canonical dataset columns and older frontend aliases.
  const name = firstValue(
    scheme,
    ["scheme_name_official", "scheme_name", "name", "title"],
    "Government Scheme",
  );

  const ministry = firstValue(
    scheme,
    [
      "scheme_owner_ministry",
      "implementing_department",
      "ministry",
      "government_level",
    ],
    "Government details not specified",
  );

  const description = firstValue(scheme, [
    "description",
    "scheme_description",
    "objective",
    "other_eligibility_criteria",
    "course_or_research_stage",
  ]);

  const categories = splitItems(
    firstValue(scheme, [
      "eligible_categories",
      "eligible_category",
      "category_criteria",
      "category",
      "categories",
    ]),
  );

  const documents = splitItems(
    firstValue(scheme, [
      "required_documents",
      "documents_required",
      "documents",
    ]),
  );

  const incomeLimit = firstValue(scheme, [
    "income_limit_amount",
    "income_limit",
    "annual_income_limit",
    "maximum_family_income",
  ]);

  const education = firstValue(scheme, [
    "education_levels",
    "education_level",
    "education",
    "course_or_research_stage",
  ]);

  const disability = firstValue(scheme, [
    "disability_criteria",
    "eligible_disability",
    "disability_requirement",
    "disability_required",
  ]);

  const benefit = firstValue(scheme, [
    "benefit_amount",
    "benefits",
    "benefit_type",
  ]);

  const sourceUrl = firstValue(scheme, [
    "official_source_url",
    "official_url",
    "scheme_url",
  ]);

  const applicationUrl = firstValue(scheme, [
    "official_application_url",
    "application_url",
    "url",
  ]);

  const status = firstValue(scheme, ["scheme_status", "status"]);

  const verification = firstValue(scheme, ["verification_status"]);

  const reviewFields = firstValue(scheme, ["fields_requiring_review"]);

  return (
    <div
      className="modal show d-block"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      style={{
        background: "rgba(15, 23, 42, 0.62)",
        backdropFilter: "blur(4px)",
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} scheme details`}
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "auto",
        }}
      >
        <div
          className="modal-content"
          style={{
            borderRadius: 16,
            border: 0,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,.25)",
            background: "#fff",
          }}
        >
          <header
            className="modal-header"
            style={{
              background: "linear-gradient(135deg, #0b2545, #134074)",
              color: "#fff",
              padding: "1.25rem 1.5rem",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <h5
              className="modal-title fw-bold mb-0"
              style={{
                fontSize: "1.15rem",
                lineHeight: 1.45,
              }}
            >
              <FaGraduationCap style={{ marginRight: 10 }} />
              {name}
            </h5>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close scheme details"
              style={{
                background: "transparent",
                border: 0,
                color: "#fff",
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
            >
              <FaTimes />
            </button>
          </header>

          <div
            className="modal-body"
            style={{
              padding: "1.5rem",
              maxHeight: "75vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "#1d4ed8",
                fontWeight: 650,
                marginBottom: 12,
              }}
            >
              <FaUniversity />
              <span>{ministry}</span>
            </div>

            {description && !isUnknown(description) ? (
              <p
                style={{
                  color: "#4b5563",
                  lineHeight: 1.65,
                  marginBottom: 20,
                }}
              >
                {description}
              </p>
            ) : (
              <p
                style={{
                  color: "#64748b",
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                A detailed description is not present in the scheme dataset. Use
                the official source below to confirm the scheme conditions.
              </p>
            )}

            <div
              className="scheme-detail-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <Field
                label="Income Limit (Annual)"
                value={
                  incomeLimit
                    ? `${incomeLimit} ${firstValue(
                        scheme,
                        ["income_limit_currency"],
                        "INR",
                      )}`
                    : ""
                }
              />

              <Field label="Education Level" value={education} />

              <Field label="Disability Criteria" value={disability} />

              <Field
                label="Government Level"
                value={firstValue(scheme, ["government_level"])}
              />

              <Field
                label="State / UT"
                value={firstValue(scheme, ["state_or_ut", "state"])}
              />

              <Field
                label="Academic Year"
                value={firstValue(scheme, ["academic_year"])}
              />

              <Field label="Scheme Status" value={status} />

              <Field
                label="Application Deadline"
                value={firstValue(scheme, ["application_deadline"])}
              />
            </div>

            <DetailSection
              title="Benefit / Financial Assistance"
              value={benefit}
            />

            <DetailSection
              title="Benefit Frequency"
              value={firstValue(scheme, ["benefit_frequency"])}
            />

            <DetailSection
              title="Tuition Coverage"
              value={firstValue(scheme, ["tuition_coverage"])}
            />

            <DetailSection
              title="Maintenance Allowance"
              value={firstValue(scheme, ["maintenance_allowance"])}
            />

            <DetailSection
              title="Travel / Other Support"
              value={firstValue(scheme, ["travel_or_other_support"])}
            />

            <DetailSection
              title="Course / Research Stage"
              value={firstValue(scheme, ["course_or_research_stage"])}
            />

            <DetailSection
              title="Other Eligibility Conditions"
              value={firstValue(scheme, ["other_eligibility_criteria"])}
            />

            <DetailSection
              title="Academic Merit Criteria"
              value={firstValue(scheme, ["academic_merit_criteria"])}
            />

            <DetailSection
              title="Gender Criteria"
              value={firstValue(scheme, ["gender_criteria"])}
            />

            <DetailSection
              title="Domicile Criteria"
              value={firstValue(scheme, ["domicile_criteria"])}
            />

            <DetailSection
              title="Application Process"
              value={firstValue(scheme, ["application_process"])}
            />

            <DetailSection
              title="Renewal Rules"
              value={firstValue(scheme, ["renewal_rules"])}
            />

            {categories.length > 0 && (
              <section className="scheme-detail-section">
                <h6>Eligible Categories / Communities</h6>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {categories.map((category, index) => (
                    <span
                      key={`${category}-${index}`}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        padding: "5px 10px",
                        fontSize: ".84rem",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>

                {firstValue(scheme, ["eligible_community_groups"]) && (
                  <p
                    style={{
                      marginTop: 10,
                      color: "#475569",
                    }}
                  >
                    {firstValue(scheme, ["eligible_community_groups"])}
                  </p>
                )}
              </section>
            )}

            {documents.length > 0 && (
              <section className="scheme-detail-section">
                <h6>
                  <FaFileAlt
                    style={{
                      marginRight: 8,
                      color: "#2563eb",
                    }}
                  />
                  Required Documents
                </h6>

                <ul
                  style={{
                    marginBottom: 0,
                    paddingLeft: 22,
                  }}
                >
                  {documents.map((doc, index) => (
                    <li key={`${doc}-${index}`} style={{ marginBottom: 5 }}>
                      {doc}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(verification || reviewFields) && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 16,
                }}
              >
                <FaInfoCircle
                  style={{
                    marginTop: 3,
                    flexShrink: 0,
                  }}
                />

                <div>
                  <strong>Verification note</strong>

                  {verification && (
                    <p style={{ margin: "5px 0" }}>{verification}</p>
                  )}

                  {reviewFields && (
                    <p style={{ margin: "5px 0" }}>
                      Fields requiring review: {reviewFields}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(sourceUrl || applicationUrl) && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-primary"
                  >
                    <FaExternalLinkAlt style={{ marginRight: 8 }} />
                    Official Scheme Source
                  </a>
                )}

                {applicationUrl && (
                  <a
                    href={applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                  >
                    Apply / Open Portal
                    <FaExternalLinkAlt style={{ marginLeft: 8 }} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .scheme-detail-field {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          min-width: 0;
        }

        .scheme-detail-label {
          color: #64748b;
          font-size: .74rem;
          text-transform: uppercase;
          font-weight: 750;
          letter-spacing: .025em;
          margin-bottom: 5px;
        }

        .scheme-detail-value {
          color: #0f172a;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .scheme-detail-section {
          margin-top: 18px;
        }

        .scheme-detail-section h6 {
          color: #1e293b;
          font-size: .95rem;
          font-weight: 750;
          margin-bottom: 8px;
        }

        .scheme-detail-section p {
          color: #475569;
          line-height: 1.6;
          margin-bottom: 0;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}
