import { useEffect, useState } from "react";
import { useAppState } from "../context/AppContext";
import { api } from "../api/api";
import {
  FaUserCircle,
  FaEdit,
  FaArrowRight,
  FaSave,
  FaCheckCircle,
} from "react-icons/fa";

const emptyForm = {
  name: "",
  date_of_birth: "",
  age: "",
  gender: "",
  state: "",
  category: "",
  education: "",
  education_level: "",
  income: "",
  annual_income: "",
  disability: false,
  disability_percentage: "",
};

const states = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const categories = ["General", "OBC", "SC", "ST", "EWS"];

const levels = [
  "Class 8",
  "Class 10",
  "Class 12",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
  "PhD",
  "Other",
];

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return null;
  }

  const normalized = {
    ...emptyForm,
    ...profile,
    name: String(profile.name ?? "").trim(),
    state: profile.state ?? profile.state_or_ut ?? "",
    category: profile.category ?? profile.eligible_category ?? "",
    education: profile.education ?? profile.course ?? "",
    education_level: profile.education_level ?? profile.education ?? "",
    income: profile.income ?? profile.annual_income ?? "",
    annual_income: profile.annual_income ?? profile.income ?? "",
    disability: profile.disability ?? profile.disability_status ?? false,
    disability_percentage: profile.disability_percentage ?? "",
  };

  const meaningfulFields = [
    normalized.name,
    normalized.date_of_birth,
    normalized.age,
    normalized.gender,
    normalized.state,
    normalized.category,
    normalized.education_level,
    normalized.income,
    normalized.annual_income,
  ];

  const hasData = meaningfulFields.some(
    (value) =>
      value !== null && value !== undefined && String(value).trim() !== "",
  );

  return hasData ? normalized : null;
}

/**
 * Supports common API response structures:
 * { profile: {...} }
 * { data: { profile: {...} } }
 * { data: {...} }
 * {...profile fields}
 */
function extractSavedProfile(response) {
  const candidates = [
    response?.profile,
    response?.data?.profile,
    response?.data,
    response,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeProfile(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export default function Profile() {
  const { profile, setProfile, setRecommendations, setPage, showToast } =
    useAppState();

  const [form, setForm] = useState(emptyForm);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Load the saved profile when the page opens.
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await api.getProfile();
        const savedProfile = extractSavedProfile(response);

        if (!active) return;

        if (savedProfile) {
          setProfile(savedProfile);
          setForm({
            ...emptyForm,
            ...savedProfile,
          });
        } else {
          setProfile(null);
          setForm({ ...emptyForm });
        }
      } catch (error) {
        if (!active) return;

        console.error("Profile loading failed:", error);

        // Preserve existing context data if the request fails.
        const existingProfile = normalizeProfile(profile);

        if (existingProfile) {
          setForm({
            ...emptyForm,
            ...existingProfile,
          });
        }

        setLoadError(
          error?.response?.data?.detail ||
            error?.message ||
            "Could not load your saved profile. Check the backend connection and try again.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };

    // Load once when this page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the displayed form synchronized with saved context.
  useEffect(() => {
    if (!profile || edit) return;

    const normalized = normalizeProfile(profile);

    if (normalized) {
      setForm({
        ...emptyForm,
        ...normalized,
      });
    }
  }, [profile, edit]);

  function change(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(event) {
    event?.preventDefault();

    if (saving) return;

    if (!form.name.trim()) {
      showToast({
        message: "Please enter your full name.",
        type: "warning",
      });
      return;
    }

    if (
      !form.gender ||
      !form.category ||
      !form.state ||
      !form.education_level
    ) {
      showToast({
        message: "Please complete gender, category, state and education level.",
        type: "warning",
      });
      return;
    }

    const incomeValue = form.income !== "" ? form.income : form.annual_income;

    const clean = {
      ...form,
      name: form.name.trim(),
      age: form.age === "" || form.age == null ? null : Number(form.age),
      income:
        incomeValue === "" || incomeValue == null ? null : Number(incomeValue),
      annual_income:
        incomeValue === "" || incomeValue == null ? null : Number(incomeValue),
      disability: Boolean(form.disability),
      disability_percentage: form.disability
        ? form.disability_percentage === "" ||
          form.disability_percentage == null
          ? null
          : Number(form.disability_percentage)
        : null,
    };

    if (clean.age !== null && (!Number.isFinite(clean.age) || clean.age < 0)) {
      showToast({
        message: "Enter a valid age.",
        type: "warning",
      });
      return;
    }

    if (
      clean.income !== null &&
      (!Number.isFinite(clean.income) || clean.income < 0)
    ) {
      showToast({
        message: "Enter a valid annual income.",
        type: "warning",
      });
      return;
    }

    if (
      clean.disability_percentage !== null &&
      (!Number.isFinite(clean.disability_percentage) ||
        clean.disability_percentage < 0 ||
        clean.disability_percentage > 100)
    ) {
      showToast({
        message: "Disability percentage must be between 0 and 100.",
        type: "warning",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await api.saveProfile(clean);

      // Use the server response when available.
      const saved = extractSavedProfile(response) || normalizeProfile(clean);

      if (!saved) {
        throw new Error("The server response did not contain a valid profile.");
      }

      setProfile(saved);
      setForm({
        ...emptyForm,
        ...saved,
      });
      setLoadError("");
      setEdit(false);

      showToast({
        message: "Candidate profile saved successfully.",
        type: "success",
      });

      // Refresh recommendations without undoing a successful save
      // if the recommendation endpoint fails.
      try {
        const result = await api.getRecommendations(saved);

        const recommendationList = Array.isArray(result?.recommendations)
          ? result.recommendations
          : Array.isArray(result?.data?.recommendations)
            ? result.data.recommendations
            : Array.isArray(result?.results)
              ? result.results
              : [];

        setRecommendations(recommendationList);
      } catch (error) {
        console.error("Recommendation refresh failed:", error);

        showToast({
          message: "Profile saved, but recommendations could not be refreshed.",
          type: "warning",
        });
      }
    } catch (error) {
      console.error("Profile save failed:", error);

      showToast({
        message:
          error?.response?.data?.detail ||
          error?.message ||
          "Could not save the profile. Please check the backend connection.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    const savedProfile = normalizeProfile(profile);

    setForm(
      savedProfile ? { ...emptyForm, ...savedProfile } : { ...emptyForm },
    );

    setEdit(false);
  }

  if (loading) {
    return (
      <div className="reference-empty">
        <FaUserCircle />
        <h3>Loading candidate profile...</h3>
        <p>Checking for a previously saved profile.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="reference-empty">
        <FaUserCircle />
        <h3>No candidate profile yet</h3>

        <p>
          Enter your information through Profile Input and select Save &amp;
          Continue. Your profile will appear here after it is saved.
        </p>

        {loadError && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {loadError}
          </p>
        )}

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

  const fields = [
    ["name", "Name", "text"],
    ["age", "Age", "number"],
    ["state", "State", "select"],
    ["category", "Category", "select"],
    ["education", "Education / Course", "text"],
    ["education_level", "Education Level", "select"],
    ["income", "Annual Income (₹)", "number"],
  ];

  const income =
    form.income !== "" && form.income != null
      ? form.income
      : form.annual_income;

  return (
    <div className="reference-page">
      <div className="reference-page-head">
        <div>
          <span className="section-kicker">STEP 02</span>
          <h2>My Profile</h2>
          <p>Review and manage your saved candidate information.</p>
        </div>

        <button
          type="button"
          className="reference-primary compact"
          onClick={() => {
            if (edit) {
              cancelEdit();
            } else {
              setEdit(true);
            }
          }}
          disabled={saving}
        >
          <FaEdit /> {edit ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {loadError && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {loadError}
        </p>
      )}

      <div className="profile-reference-grid">
        <div className="reference-card profile-card">
          <div className="profile-card-title">
            <div className="profile-avatar">
              <FaUserCircle />
            </div>

            <div>
              <h3>{form.name || "Candidate"}</h3>
              <span>Saved candidate profile</span>
            </div>
          </div>

          {!edit ? (
            <div className="profile-details">
              {fields.map(([key, label]) => {
                const value = key === "income" ? income : form[key];

                return (
                  <div className="detail-row" key={key}>
                    <span>{label}</span>

                    <b>
                      {key === "income" && value !== "" && value != null
                        ? `₹ ${Number(value).toLocaleString("en-IN")}`
                        : value || "—"}
                    </b>
                  </div>
                );
              })}

              <div className="detail-row">
                <span>Date of Birth</span>
                <b>{form.date_of_birth || "—"}</b>
              </div>

              <div className="detail-row">
                <span>Gender</span>
                <b>{form.gender || "—"}</b>
              </div>

              <div className="detail-row">
                <span>Disability</span>

                <b>
                  {form.disability ? "Yes" : "No"}
                  {form.disability &&
                  form.disability_percentage !== "" &&
                  form.disability_percentage != null
                    ? ` (${form.disability_percentage}%)`
                    : ""}
                </b>
              </div>
            </div>
          ) : (
            <form className="edit-form" onSubmit={save}>
              {fields.map(([key, label, type]) => (
                <label key={key}>
                  {label}

                  {type === "select" ? (
                    <select
                      className="reference-input"
                      value={form[key] ?? ""}
                      onChange={(event) => change(key, event.target.value)}
                      required={[
                        "state",
                        "category",
                        "education_level",
                      ].includes(key)}
                    >
                      <option value="">Select {label}</option>

                      {(key === "state"
                        ? states
                        : key === "category"
                          ? categories
                          : levels
                      ).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="reference-input"
                      type={type}
                      min={type === "number" ? "0" : undefined}
                      value={
                        key === "income" ? (income ?? "") : (form[key] ?? "")
                      }
                      onChange={(event) => change(key, event.target.value)}
                      required={key === "name"}
                    />
                  )}
                </label>
              ))}

              <label>
                Date of Birth
                <input
                  className="reference-input"
                  type="date"
                  value={form.date_of_birth || ""}
                  onChange={(event) =>
                    change("date_of_birth", event.target.value)
                  }
                />
              </label>

              <label>
                Gender
                <select
                  className="reference-input"
                  value={form.gender || ""}
                  onChange={(event) => change("gender", event.target.value)}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>

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
                <label>
                  Disability Percentage
                  <input
                    className="reference-input"
                    type="number"
                    min="0"
                    max="100"
                    value={form.disability_percentage ?? ""}
                    onChange={(event) =>
                      change("disability_percentage", event.target.value)
                    }
                  />
                </label>
              )}

              <button
                type="submit"
                className="reference-primary"
                disabled={saving}
              >
                <FaSave />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          )}
        </div>

        <div className="reference-card profile-side">
          <h4>Profile Summary</h4>

          <div className="summary-stat">
            <span>Category</span>
            <b>{form.category || "—"}</b>
          </div>

          <div className="summary-stat">
            <span>Education</span>
            <b>{form.education_level || "—"}</b>
          </div>

          <div className="summary-stat">
            <span>Annual Income</span>
            <b>
              {income !== "" && income != null
                ? `₹ ${Number(income).toLocaleString("en-IN")}`
                : "—"}
            </b>
          </div>

          <div className="profile-ready">
            <FaCheckCircle />

            <div>
              <b>Profile saved</b>
              <span>Use this profile for personalized scheme matching.</span>
            </div>
          </div>

          <button
            type="button"
            className="reference-outline wide"
            onClick={() => setPage("recommendations")}
          >
            View Recommendations <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
