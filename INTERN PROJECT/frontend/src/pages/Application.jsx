import { useEffect, useRef, useState } from "react";
import { useAppState } from "../context/AppContext";
import { api, apiClient } from "../api/api";
import {
  FaFileAlt,
  FaRobot,
  FaCheckCircle,
  FaQuestionCircle,
  FaQuoteLeft,
  FaSpinner,
  FaArrowRight,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaClipboardCheck,
} from "react-icons/fa";
import { getPortalForScheme } from "../data/portalRegistry";

const REQUIRED_DOCUMENTS = ["Aadhaar Proof", "Educational Proof"];

const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";

export default function Application() {
  const {
    profile,
    selectedScheme,
    setApplicationResult,
    setPage,
    showToast,
    language,
  } = useAppState();

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    state: "",
    category: "General",
    education: "",
    education_level: "",
    income: "",
    phone: "",
    email: "",
    address: "",
    disability: false,
    disability_percentage: "",
  });

  const [docs, setDocs] = useState({});
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  // -------------------------------------------------------
  // LOAD PROFILE DATA
  // -------------------------------------------------------

  useEffect(() => {
    if (!profile) return;

    setForm((current) => ({
      ...current,
      ...profile,
      name:
        profile.name ??
        profile.full_name ??
        profile.applicant_name ??
        current.name,
      age: profile.age ?? current.age,
      gender: profile.gender ?? current.gender,
      state: profile.state ?? profile.state_or_ut ?? current.state,
      category: profile.category ?? profile.social_category ?? current.category,
      education: profile.education ?? profile.course ?? current.education,
      education_level: profile.education_level ?? current.education_level,
      income: profile.income ?? profile.annual_income ?? current.income,
      phone: profile.phone ?? profile.phone_number ?? current.phone,
      email: profile.email ?? current.email,
      address: profile.address ?? current.address,
      disability: Boolean(
        profile.disability ?? profile.person_with_disability ?? false,
      ),
      disability_percentage:
        profile.disability_percentage ?? current.disability_percentage,
    }));
  }, [profile]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // -------------------------------------------------------
  // SCHEME DETAILS
  // -------------------------------------------------------

  const scheme = selectedScheme?.scheme || selectedScheme;

  const schemeId = scheme
    ? (selectedScheme?.scheme_id ??
      scheme.scheme_id ??
      scheme.scheme_key ??
      scheme.id)
    : null;

  const schemeName =
    scheme?.scheme_name_official ||
    scheme?.scheme_name ||
    scheme?.name ||
    scheme?.title ||
    "Government Scholarship";

  const portal = scheme ? getPortalForScheme(schemeName) : null;

  // -------------------------------------------------------
  // ERROR HANDLING
  // -------------------------------------------------------

  const getErrorMessage = (error) => {
    const detail =
      error?.response?.data?.detail ?? error?.response?.data?.message;

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
      return detail.message || detail.msg || JSON.stringify(detail);
    }

    return error?.message || "Unable to complete the request.";
  };

  // -------------------------------------------------------
  // FORM HANDLERS
  // -------------------------------------------------------

  const change = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleDocumentChange = (documentName, file) => {
    if (!file) {
      setDocs((current) => ({
        ...current,
        [documentName]: null,
      }));
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

    if (file.type && !allowedTypes.includes(file.type)) {
      showToast({
        message: "Upload a PDF, JPG, JPEG, or PNG file.",
        type: "warning",
      });
      return;
    }

    // Prevent unexpectedly large files in the frontend.
    if (file.size > 10 * 1024 * 1024) {
      showToast({
        message: "Each document must be 10 MB or smaller.",
        type: "warning",
      });
      return;
    }

    setDocs((current) => ({
      ...current,
      [documentName]: file,
    }));
  };

  // -------------------------------------------------------
  // RAG APPLICATION ASSISTANT
  // -------------------------------------------------------

  const ask = async (query = question.trim()) => {
    if (!query || !schemeId) return;

    const messageId = `${Date.now()}-${Math.random()}`;

    setQuestion("");
    setMessages((current) => [
      ...current,
      {
        id: messageId,
        q: query,
        loading: true,
        answer: null,
      },
    ]);

    try {
      const result = await api.getRagAnswer(
        query,
        String(schemeId),
        language || "en",
      );

      const data = result?.data ?? result;

      const answer =
        typeof data === "string"
          ? data
          : data?.answer ||
            data?.response ||
            data?.message ||
            "No answer was returned.";

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                loading: false,
                answer,
                sources: Array.isArray(data?.sources) ? data.sources : [],
              }
            : item,
        ),
      );
    } catch (error) {
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                loading: false,
                answer: getErrorMessage(error),
                sources: [],
              }
            : item,
        ),
      );
    }
  };

  // -------------------------------------------------------
  // VALIDATE FORM
  // -------------------------------------------------------

  const validateForm = () => {
    if (!schemeId) {
      return "The selected scheme does not have a valid scheme ID.";
    }

    const requiredFields = [
      ["name", "Full Name"],
      ["age", "Age"],
      ["state", "State"],
      ["category", "Category"],
      ["education", "Education"],
      ["income", "Annual Income"],
      ["phone", "Phone Number"],
    ];

    for (const [key, label] of requiredFields) {
      if (String(form[key] ?? "").trim() === "") {
        return `Please enter ${label}.`;
      }
    }

    if (!Number.isFinite(Number(form.age)) || Number(form.age) <= 0) {
      return "Please enter a valid age.";
    }

    if (!Number.isFinite(Number(form.income)) || Number(form.income) < 0) {
      return "Please enter a valid annual income.";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return "Please enter a valid email address.";
    }

    if (form.disability && String(form.disability_percentage).trim() === "") {
      return "Please enter the disability percentage.";
    }

    if (
      form.disability &&
      (Number(form.disability_percentage) < 0 ||
        Number(form.disability_percentage) > 100)
    ) {
      return "Disability percentage must be between 0 and 100.";
    }

    const missingDocuments = REQUIRED_DOCUMENTS.filter((name) => !docs[name]);

    if (missingDocuments.length > 0) {
      return `Please upload both required documents. Missing: ${missingDocuments.join(", ")}.`;
    }

    return null;
  };

  // -------------------------------------------------------
  // CREATE AND SUBMIT APPLICATION
  // Uses only the backend routes available in applications.py:
  // POST  /api/applications
  // PATCH /api/applications/{application_id}
  // -------------------------------------------------------

  const submit = async () => {
    if (loading) return;

    const validationError = validateForm();

    if (validationError) {
      showToast({
        message: validationError,
        type: "warning",
      });
      return;
    }

    setLoading(true);

    let createdApplicationId = null;
    let createdApplication = null;

    try {
      const applicantProfile = {
        ...(profile || {}),
        name: form.name.trim(),
        full_name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender || null,
        state: form.state.trim(),
        state_or_ut: form.state.trim(),
        category: form.category.trim(),
        social_category: form.category.trim(),
        education: form.education.trim(),
        education_level: form.education_level || null,
        income: Number(form.income),
        annual_income: Number(form.income),
        disability: Boolean(form.disability),
        disability_percentage: form.disability
          ? Number(form.disability_percentage)
          : null,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      };

      // The existing backend stores document metadata only.
      // It does not provide a file-upload endpoint.
      const documentMetadata = REQUIRED_DOCUMENTS.map((documentName) => {
        const file = docs[documentName];

        return {
          document_type: documentName,
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          selected_in_frontend: true,
        };
      });

      const payload = {
        scheme_id: String(schemeId),
        scheme_name: schemeName,
        applicant_name: form.name.trim(),
        profile: applicantProfile,
        application_data: {
          ...form,
          age: Number(form.age),
          income: Number(form.income),
          disability: Boolean(form.disability),
          disability_percentage: form.disability
            ? Number(form.disability_percentage)
            : null,
        },
        documents: documentMetadata,
        status: "draft",
      };

      // STEP 1: Create the draft using POST /api/applications.
      const draftResponse = await api.createApplication(payload);

      createdApplication =
        draftResponse?.application ?? draftResponse?.data ?? draftResponse;

      createdApplicationId =
        draftResponse?.application_id ??
        createdApplication?.application_id ??
        createdApplication?.id;

      if (!createdApplicationId) {
        throw new Error(
          "The backend created no identifiable application record. Check its response.",
        );
      }

      // STEP 2: Mark the record as submitted using the existing
      // PATCH /api/applications/{application_id} route.
      const updateResponse = await apiClient.patch(
        `/applications/${encodeURIComponent(String(createdApplicationId))}`,
        {
          status: "submitted",
          remarks:
            "Applicant completed the frontend form and selected Aadhaar Proof and Educational Proof. File contents have not been uploaded to the backend.",
        },
      );

      const updatedApplication =
        updateResponse?.data?.application ??
        updateResponse?.data?.data ??
        updateResponse?.data ??
        {};

      const finalResult = {
        ...createdApplication,
        ...updatedApplication,
        application_id: String(createdApplicationId),
        id: String(createdApplicationId),
        scheme_id: String(schemeId),
        scheme_name: schemeName,
        applicant_name: form.name.trim(),
        status: updatedApplication?.status || "submitted",
        documents: documentMetadata,
        message:
          "Application record submitted locally. Documents have not been uploaded to the backend or submitted to a government portal.",
      };

      setApplicationResult(finalResult);

      showToast({
        message:
          "Application record submitted successfully. Continue to the official portal to upload documents and complete the official application.",
        type: "success",
      });

      setPage("submission");
    } catch (error) {
      console.error("Application submission error:", error);

      // If the draft was created but the status update failed,
      // preserve its ID so the applicant can identify the draft.
      if (createdApplicationId) {
        setApplicationResult({
          ...(createdApplication || {}),
          application_id: String(createdApplicationId),
          id: String(createdApplicationId),
          scheme_id: String(schemeId),
          scheme_name: schemeName,
          applicant_name: form.name.trim(),
          status: "draft",
          message:
            "The application draft was created, but its status could not be updated. Please retry or check application tracking.",
        });
      }

      showToast({
        message: createdApplicationId
          ? `Draft ${createdApplicationId} was created, but submission failed: ${getErrorMessage(error)}`
          : `Application creation failed: ${getErrorMessage(error)}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // EMPTY STATES
  // -------------------------------------------------------

  if (!profile) {
    return (
      <div className="reference-empty">
        <FaFileAlt />
        <h3>No candidate profile</h3>
        <p>Complete your profile before applying for a scholarship.</p>
        <button className="reference-primary" onClick={() => setPage("input")}>
          Go to Profile Input
        </button>
      </div>
    );
  }

  if (!selectedScheme) {
    return (
      <div className="reference-empty">
        <FaFileAlt />
        <h3>No scheme selected</h3>
        <p>Select a scheme before completing the application.</p>
        <button
          className="reference-primary"
          onClick={() => setPage("recommendations")}
        >
          View Recommendations
        </button>
      </div>
    );
  }

  // -------------------------------------------------------
  // PAGE
  // -------------------------------------------------------

  return (
    <div className="reference-page">
      <div className="reference-page-head">
        <div>
          <span className="section-kicker">STEP 05</span>
          <h2>Scheme Application</h2>
          <p>
            Complete your details and select the two required documents before
            submitting the application record.
          </p>
        </div>
      </div>

      <div className="application-reference-grid">
        <div>
          <div className="reference-card application-card">
            {/* Selected scheme */}
            <div className="selected-scheme-banner">
              <div className="scheme-icon scheme-icon-0">
                <FaFileAlt />
              </div>
              <div>
                <span>Selected Scheme</span>
                <h4>{schemeName}</h4>
                <small>
                  Complete your details and select Aadhaar Proof and Educational
                  Proof.
                </small>
              </div>
            </div>

            {/* Personal information */}
            <div className="form-section">
              <h4>Personal Information</h4>

              <div className="form-grid">
                {[
                  ["name", "Full Name"],
                  ["age", "Age"],
                  ["state", "State"],
                  ["category", "Category"],
                  ["education", "Education"],
                  ["education_level", "Education Level"],
                  ["income", "Annual Income (₹)"],
                  ["phone", "Phone Number"],
                  ["email", "Email"],
                  ["address", "Address"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      className="reference-input"
                      type={
                        key === "age" || key === "income" ? "number" : "text"
                      }
                      min={key === "age" || key === "income" ? 0 : undefined}
                      value={form[key] ?? ""}
                      onChange={(event) => change(key, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={Boolean(form.disability)}
                  onChange={(event) =>
                    change("disability", event.target.checked)
                  }
                />
                Person with disability
              </label>

              {form.disability && (
                <label className="disability-field">
                  Disability Percentage
                  <input
                    className="reference-input"
                    type="number"
                    min="0"
                    max="100"
                    value={form.disability_percentage}
                    onChange={(event) =>
                      change("disability_percentage", event.target.value)
                    }
                  />
                </label>
              )}
            </div>

            {/* Exactly two required documents */}
            <div className="form-section">
              <h4>Upload Required Documents</h4>
              <p className="helper-text">
                Both documents are required. Accepted formats: PDF, JPG, JPEG
                and PNG. Maximum size: 10 MB per file.
              </p>

              <div className="doc-grid">
                {REQUIRED_DOCUMENTS.map((documentName) => (
                  <label className="document-input" key={documentName}>
                    <span>
                      {documentName}
                      <span aria-hidden="true" style={{ color: "#dc2626" }}>
                        {" "}
                        *
                      </span>
                    </span>

                    <input
                      type="file"
                      accept={DOCUMENT_ACCEPT}
                      required
                      onChange={(event) =>
                        handleDocumentChange(
                          documentName,
                          event.target.files?.[0] || null,
                        )
                      }
                    />

                    {docs[documentName] && (
                      <small className="selected-document">
                        <FaCheckCircle />
                        {docs[documentName].name}
                      </small>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Submission notice */}
            <div className="application-safety-note">
              <FaShieldAlt />
              <div>
                <b>Document and submission information</b>
                <span>
                  Selecting a file here does not upload its contents to the
                  backend. The current backend stores the application record and
                  document metadata only. Complete the official government
                  portal process separately. Never enter OTPs, passwords,
                  Aadhaar PINs or CAPTCHA values here.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="application-action-row">
              <button
                className="reference-primary wide submit-button"
                type="button"
                onClick={submit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="fa-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaClipboardCheck />
                    Validate and Submit
                  </>
                )}
              </button>

              {portal?.applicationUrl && (
                <a
                  className="reference-outline wide submit-button"
                  href={portal.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaExternalLinkAlt />
                  Open Official Portal
                </a>
              )}
            </div>
          </div>
        </div>

        {/* RAG assistant */}
        <aside className="rag-reference">
          <div className="portal-mini-card">
            {portal ? (
              <>
                <span className="section-kicker">VERIFIED ROUTE</span>
                <h4>{portal.provider}</h4>
                <p>{portal.note}</p>

                <div className="portal-mini-actions">
                  {portal.applicationUrl && (
                    <a
                      href={portal.applicationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open portal <FaExternalLinkAlt />
                    </a>
                  )}

                  {portal.sourceUrl && (
                    <a href={portal.sourceUrl} target="_blank" rel="noreferrer">
                      View scheme source
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="section-kicker">PORTAL ROUTE</span>
                <h4>Official provider not mapped</h4>
                <p>
                  Check the scheme's official department or scholarship portal
                  before applying.
                </p>
              </>
            )}
          </div>

          <div className="rag-header">
            <FaRobot />
            <div>
              <h4>RAG Application Assistant</h4>
              <span>Ask about this selected scheme.</span>
            </div>
          </div>

          <div className="rag-messages" ref={messagesRef}>
            {messages.length === 0 && (
              <div className="rag-empty">
                <FaQuestionCircle />
                <p>Ask about documents or eligibility.</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="rag-thread">
                <div className="rag-question">{message.q}</div>

                {message.loading && (
                  <div className="rag-answer">
                    <FaSpinner className="fa-spin" /> Finding an answer...
                  </div>
                )}

                {!message.loading && message.answer && (
                  <div className="rag-answer">
                    {message.answer}

                    {message.sources?.length > 0 && (
                      <div className="rag-sources">
                        {message.sources.map((source, index) => (
                          <span key={index}>
                            <FaQuoteLeft />{" "}
                            {typeof source === "string"
                              ? source
                              : source.title ||
                                source.source ||
                                JSON.stringify(source)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rag-chips">
            {[
              "What documents are required?",
              "What is the income limit?",
              "What is the eligibility requirement?",
            ].map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => ask(query)}
                disabled={!schemeId}
              >
                {query}
              </button>
            ))}
          </div>

          <div className="rag-input">
            <input
              value={question}
              placeholder="Ask about this scheme..."
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  ask();
                }
              }}
            />

            <button
              type="button"
              onClick={() => ask()}
              disabled={!question.trim() || !schemeId}
              aria-label="Ask about this scheme"
            >
              <FaArrowRight />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
