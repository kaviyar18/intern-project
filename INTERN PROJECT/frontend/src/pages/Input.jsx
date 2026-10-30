import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppState } from "../context/AppContext";
import { api } from "../api/api";
import ProcessingOverlay from "../components/ProcessingOverlay";
import { languages } from "../data/sampleData";

import {
  FaMicrophoneAlt,
  FaStop,
  FaArrowRight,
  FaGlobe,
  FaUser,
  FaCalendarAlt,
  FaVenusMars,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaRupeeSign,
  FaGraduationCap,
  FaCheckCircle,
  FaFileUpload,
  FaFilePdf,
  FaFileAlt,
  FaSpinner,
  FaInfoCircle,
} from "react-icons/fa";

const locales = {
  en: "en-IN",
  as: "as-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  hi: "hi-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  ne: "ne-NP",
  or: "or-IN",
  pa: "pa-IN",
  ta: "ta-IN",
  te: "te-IN",
  ur: "ur-IN",
};

const initialForm = {
  name: "",
  date_of_birth: "",
  gender: "",
  category: "",
  state: "",
  annual_income: "",
  education_level: "",
  disability: false,
};

// Converts spoken numeric dates such as "18 8 2005" to YYYY-MM-DD.
function parseSpokenDate(value) {
  if (!value) return "";

  const match = value.match(/\b(\d{1,2})[\/\s.-]+(\d{1,2})[\/\s.-]+(\d{4})\b/);

  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

// Extracts form values from an English voice transcript.
function extractSpokenFields(transcript) {
  const spoken = transcript.toLowerCase().replace(/[.,!?]/g, " ");
  const extracted = {};

  // Name: "my name is Kavya" or "Kavya, I am 21 years old".
  const namedMatch = transcript.match(
    /\b(?:my name is|name is)\s+([a-zA-Z][a-zA-Z\s'-]*?)(?=\s+(?:i am|i'm|my|date of birth|dob|gender|state|education|income|category)|$)/i,
  );

  const openingNameMatch = transcript.match(
    /^\s*([a-zA-Z][a-zA-Z\s'-]*?)\s+(?=i am\s+\d+\s+years?\s+old)/i,
  );

  const name = namedMatch?.[1] || openingNameMatch?.[1];

  if (name) {
    extracted.name = name.trim().replace(/\s+/g, " ");
  }

  // Gender
  if (/\b(female|woman|girl)\b/i.test(spoken)) {
    extracted.gender = "Female";
  } else if (/\b(male|man|boy)\b/i.test(spoken)) {
    extracted.gender = "Male";
  } else if (/\b(other|non binary|non-binary)\b/i.test(spoken)) {
    extracted.gender = "Other";
  }

  // Category
  if (/\b(general)\b/i.test(spoken)) {
    extracted.category = "General";
  } else if (/\b(obc|o b c)\b/i.test(spoken)) {
    extracted.category = "OBC";
  } else if (/\b(sc|s c|scheduled caste)\b/i.test(spoken)) {
    extracted.category = "SC";
  } else if (/\b(st|s t|scheduled tribe)\b/i.test(spoken)) {
    extracted.category = "ST";
  } else if (/\b(ews)\b/i.test(spoken)) {
    extracted.category = "EWS";
  }

  // State: "my state is Tamil Nadu".
  const stateMatch = transcript.match(
    /\b(?:my\s+)?state\s+(?:is|:)\s*(.+?)(?=\s+(?:my\s+)?(?:education|gender|category|income|date of birth|dob)|$)/i,
  );

  if (stateMatch) {
    extracted.state = stateMatch[1].trim().replace(/[.,!?]+$/, "");
  }

  // Income: "family income is 2 lakhs" -> 200000.
  const incomeMatch = spoken.match(
    /\b(?:family\s+)?income\s+(?:is|of|:)?\s*(?:rs\.?|rupees|₹)?\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?)?\b/i,
  );

  if (incomeMatch) {
    let income = Number(incomeMatch[1].replace(/,/g, ""));
    const unit = incomeMatch[2] || "";

    if (/lakhs?|lacs?/i.test(unit)) {
      income *= 100000;
    }

    if (/crores?/i.test(unit)) {
      income *= 10000000;
    }

    if (Number.isFinite(income)) {
      extracted.annual_income = String(Math.round(income));
    }
  }

  // Date of birth: "date of birth is 18 8 2005".
  const dobMatch = transcript.match(
    /\b(?:date of birth|dob)\s+(?:is|:)?\s*(\d{1,2}[\/\s.-]+\d{1,2}[\/\s.-]+\d{4})/i,
  );

  if (dobMatch) {
    const date = parseSpokenDate(dobMatch[1]);

    if (date) {
      extracted.date_of_birth = date;
    }
  }

  // Education level
  if (/\b(undergraduate|under graduate|ug|degree)\b/i.test(spoken)) {
    extracted.education_level = "Undergraduate";
  } else if (/\b(postgraduate|post graduate|pg)\b/i.test(spoken)) {
    extracted.education_level = "Postgraduate";
  } else if (/\b(class 12|12th|higher secondary)\b/i.test(spoken)) {
    extracted.education_level = "Class 12";
  } else if (/\b(class 10|10th|sslc)\b/i.test(spoken)) {
    extracted.education_level = "Class 10";
  } else if (/\b(diploma)\b/i.test(spoken)) {
    extracted.education_level = "Diploma";
  } else if (/\b(phd|doctorate)\b/i.test(spoken)) {
    extracted.education_level = "PhD";
  } else if (/\b(school)\b/i.test(spoken)) {
    extracted.education_level = "School";
  }

  // Disability
  if (
    /\b(no disability|do not have a disability|don't have a disability)\b/i.test(
      spoken,
    )
  ) {
    extracted.disability = false;
  } else if (
    /\b(have a disability|disabled|person with disability)\b/i.test(spoken)
  ) {
    extracted.disability = true;
  }

  return extracted;
}

export default function Input() {
  const { t } = useTranslation();

  const {
    setPage,
    setProfile,
    setRecommendations,
    language,
    setLanguage,
    inputMethod,
    setInputMethod,
    showToast,
  } = useAppState();

  const steps = [
    t("stepReceiving") || "Receiving input",
    t("stepDetecting") || "Detecting language",
    t("stepExtracting") || "Extracting candidate information",
    t("stepFinding") || "Finding matching schemes",
  ];

  const [activeTab, setActiveTab] = useState(
    inputMethod === "document" ? "document" : "voice",
  );
  const [form, setForm] = useState(initialForm);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(0);

  // Document upload state
  const [docLoading, setDocLoading] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState("");
  const [docExtractDetails, setDocExtractDetails] = useState(null);

  const recognition = useRef(null);
  const timer = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (inputMethod === "document") {
      setActiveTab("document");
    }
  }, [inputMethod]);

  useEffect(() => {
    return () => {
      clearInterval(timer.current);
      recognition.current?.stop?.();
    };
  }, []);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Automatically update form fields from the transcript.
  const applyTranscriptToForm = (transcript) => {
    const extractedFields = extractSpokenFields(transcript);

    if (Object.keys(extractedFields).length > 0) {
      setForm((previous) => ({
        ...previous,
        ...extractedFields,
      }));
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast({
        message:
          t("speechNotSupported") ||
          "Speech recognition is not supported. Use Chrome or Edge.",
        type: "warning",
      });
      return;
    }

    setInputMethod?.("voice");

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = locales[language] || "en-IN";
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;

    let finalText = text ? `${text} ` : "";

    recognitionInstance.onresult = (event) => {
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += transcript;
        }
      }

      const updatedText = `${finalText}${interimText}`.trim();

      setText(updatedText);

      // Fill fields as speech is recognized.
      applyTranscriptToForm(updatedText);
    };

    recognitionInstance.onerror = () => {
      setRecording(false);
      clearInterval(timer.current);

      showToast({
        message: t("voiceCaptureError") || "Could not capture voice. Try again.",
        type: "error",
      });
    };

    recognitionInstance.onend = () => {
      setRecording(false);
      clearInterval(timer.current);
    };

    recognition.current = recognitionInstance;

    try {
      recognitionInstance.start();
      setRecording(true);
      setSeconds(0);

      clearInterval(timer.current);

      timer.current = setInterval(() => {
        setSeconds((previous) => previous + 1);
      }, 1000);
    } catch {
      setRecording(false);

      showToast({
        message: t("voiceStartError") || "Unable to start voice recording.",
        type: "error",
      });
    }
  };

  const stopVoice = () => {
    recognition.current?.stop?.();
    setRecording(false);
    clearInterval(timer.current);
  };

  // Handle Document Upload & OCR Profile Extraction
  const handleDocumentSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDocLoading(true);
    setUploadedDocName(file.name);
    setDocExtractDetails(null);

    try {
      const response = await api.processDocument(file);
      const extracted = response?.profile || response?.data?.profile || {};

      // Fill form values with high confidence extracted fields
      setForm((prev) => ({
        ...prev,
        name: extracted.name || prev.name,
        gender: extracted.gender || prev.gender,
        category: extracted.category || prev.category,
        state: extracted.state || prev.state,
        annual_income:
          extracted.income !== null && extracted.income !== undefined
            ? String(extracted.income)
            : prev.annual_income,
        education_level: extracted.education_level || prev.education_level,
        disability:
          extracted.disability !== undefined
            ? Boolean(extracted.disability)
            : prev.disability,
      }));

      if (response.language && response.language !== "en") {
        setLanguage(response.language);
      }

      setDocExtractDetails({
        method: response.extraction_method || "Text/OCR extraction",
        language: response.language_name || response.language || "English",
        llmUsed: response.llm_used,
        extractedCount: Object.values(extracted).filter(
          (v) => v !== null && v !== undefined && v !== "",
        ).length,
      });

      showToast({
        message: `Successfully processed ${file.name}. Profile details filled automatically!`,
        type: "success",
      });
    } catch (err) {
      console.error("Document extraction error:", err);
      showToast({
        message:
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to extract information from the uploaded document.",
        type: "error",
      });
    } finally {
      setDocLoading(false);
    }
  };

  const processInput = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast({
        message: t("enterFullNameError") || "Please enter your full name.",
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
        message:
          t("requiredFieldsError") || "Please complete all required profile fields.",
        type: "warning",
      });
      return;
    }

    setProcessing(true);
    setStep(0);

    const timerId = setInterval(() => {
      setStep((previous) => Math.min(previous + 1, steps.length - 1));
    }, 700);

    try {
      let extractedProfile = {};

      if (text.trim()) {
        const result = await api.processVoice({ text: text.trim(), language });
        extractedProfile = result.profile || result.extracted_information || {};
      }

      // Manually entered or voice-filled form values take priority.
      const profile = {
        ...extractedProfile,
        ...form,
        name: form.name.trim(),
        annual_income:
          form.annual_income === "" ? 0 : Number(form.annual_income),
        income:
          form.annual_income === "" ? 0 : Number(form.annual_income),
        disability: Boolean(form.disability),
        preferred_language: language,
      };

      // Save profile to database/storage before updating app state.
      await api.saveProfile(profile);

      setProfile(profile);

      const recommendationResult = await api.getRecommendations(profile);

      setRecommendations(recommendationResult.recommendations || []);

      clearInterval(timerId);
      setStep(steps.length - 1);

      setTimeout(() => {
        setProcessing(false);

        showToast({
          message:
            t("profileSaved") || "Profile saved and recommendations generated.",
          type: "success",
        });

        setPage("profile");
      }, 450);
    } catch (error) {
      clearInterval(timerId);
      setProcessing(false);

      showToast({
        message:
          error?.response?.data?.detail ||
          t("processingError") ||
          "Processing failed.",
        type: "error",
      });
    }
  };

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0",
  )}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="reference-page">
      {processing && <ProcessingOverlay steps={steps} currentStep={step} />}

      <div className="reference-page-head">
        <div>
          <span className="section-kicker">STEP 01</span>
          <h2>{t("profileInput") || "Profile Input"}</h2>
          <p>
            {t("profileDescription") ||
              "Enter your basic details, speak in your language, or upload an eligibility document to receive personalized scheme recommendations."}
          </p>
        </div>

        {/* Input Mode Switcher */}
        <div
          style={{
            display: "inline-flex",
            background: "#f3f4f6",
            borderRadius: "10px",
            padding: "4px",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "voice" ? "#ffffff" : "transparent",
              color: activeTab === "voice" ? "#1d4ed8" : "#4b5563",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow:
                activeTab === "voice" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaMicrophoneAlt /> Voice &amp; Form
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("document")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "document" ? "#ffffff" : "transparent",
              color: activeTab === "document" ? "#1d4ed8" : "#4b5563",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow:
                activeTab === "document"
                  ? "0 2px 4px rgba(0,0,0,0.06)"
                  : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaFileUpload /> Document OCR
          </button>
        </div>
      </div>

      <form onSubmit={processInput}>
        <div className="profile-input-layout">
          {/* Card 1: Personal Information Form */}
          <div className="reference-card profile-form-card">
            <div className="card-heading">
              <span className="number-icon">01</span>
              <div>
                <h4>{t("personalInformation") || "Personal Information"}</h4>
                <p>
                  {t("personalInformationDescription") ||
                    "Provide your details to find relevant government schemes."}
                </p>
              </div>
            </div>

            <div className="profile-form-grid">
              <label className="profile-field">
                <span>
                  <FaUser /> {t("fullName") || "Full Name"}
                </span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder={t("enterFullName") || "Enter your full name"}
                  required
                />
              </label>

              <label className="profile-field">
                <span>
                  <FaCalendarAlt /> {t("dateOfBirth") || "Date of Birth"}
                </span>
                <input
                  type="date"
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={updateField}
                />
              </label>

              <label className="profile-field">
                <span>
                  <FaVenusMars /> {t("gender") || "Gender"}
                </span>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                  required
                >
                  <option value="">{t("selectGender") || "Select gender"}</option>
                  <option value="Male">{t("male") || "Male"}</option>
                  <option value="Female">{t("female") || "Female"}</option>
                  <option value="Other">{t("other") || "Other"}</option>
                  <option value="Prefer not to say">
                    {t("preferNotToSay") || "Prefer not to say"}
                  </option>
                </select>
              </label>

              <label className="profile-field">
                <span>
                  <FaLayerGroup /> {t("category") || "Category"}
                </span>
                <select
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  required
                >
                  <option value="">{t("selectCategory") || "Select category"}</option>
                  <option value="General">{t("general") || "General"}</option>
                  <option value="OBC">{t("obc") || "OBC"}</option>
                  <option value="SC">{t("sc") || "SC"}</option>
                  <option value="ST">{t("st") || "ST"}</option>
                  <option value="EWS">{t("ews") || "EWS"}</option>
                </select>
              </label>

              <label className="profile-field">
                <span>
                  <FaMapMarkerAlt /> {t("state") || "State"}
                </span>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  placeholder={t("enterState") || "Enter your state"}
                  required
                />
              </label>

              <label className="profile-field">
                <span>
                  <FaRupeeSign /> {t("annualIncome") || "Annual Income (₹)"}
                </span>
                <input
                  type="number"
                  name="annual_income"
                  value={form.annual_income}
                  onChange={updateField}
                  placeholder={
                    t("enterAnnualIncome") || "Enter annual family income"
                  }
                  min="0"
                />
              </label>

              <label className="profile-field profile-field-full">
                <span>
                  <FaGraduationCap />{" "}
                  {t("educationLevel") || "Education Level"}
                </span>
                <select
                  name="education_level"
                  value={form.education_level}
                  onChange={updateField}
                  required
                >
                  <option value="">
                    {t("selectEducation") || "Select education level"}
                  </option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 10">{t("class10") || "Class 10"}</option>
                  <option value="Class 12">{t("class12") || "Class 12"}</option>
                  <option value="Diploma">{t("diploma") || "Diploma"}</option>
                  <option value="Undergraduate">
                    {t("undergraduate") || "Undergraduate (UG)"}
                  </option>
                  <option value="Postgraduate">
                    {t("postgraduate") || "Postgraduate (PG)"}
                  </option>
                  <option value="PhD">{t("phd") || "PhD"}</option>
                  <option value="Other">{t("other") || "Other"}</option>
                </select>
              </label>

              <div className="disability-option profile-field-full">
                <label htmlFor="disability">
                  <input
                    id="disability"
                    type="checkbox"
                    name="disability"
                    checked={form.disability}
                    onChange={updateField}
                  />
                  <span>
                    {t("disabilityQuestion") || "Do you have a disability?"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 2: Voice Input OR Document Upload */}
          {activeTab === "voice" ? (
            <div className="reference-card profile-voice-card">
              <div className="card-heading">
                <span className="number-icon orange">02</span>
                <div>
                  <h4>{t("voiceInput") || "Voice Input"}</h4>
                  <p>
                    {t("voiceDescription") ||
                      "Tell us about yourself in your preferred Indian language."}
                  </p>
                </div>
              </div>

              <div className={`voice-reference ${recording ? "recording" : ""}`}>
                <button
                  type="button"
                  className="voice-main-button"
                  onClick={recording ? stopVoice : startVoice}
                  aria-label={
                    recording
                      ? t("stopRecording") || "Stop Recording"
                      : t("startRecording") || "Start Recording"
                  }
                >
                  {recording ? <FaStop /> : <FaMicrophoneAlt />}
                </button>

                <strong>
                  {recording
                    ? `${t("recording") || "Recording..."} ${formattedTime}`
                    : t("startRecording") || "Tap to start recording"}
                </strong>

                <span>
                  {t("speechRecognition") || "Chrome / Edge speech recognition"}
                </span>
              </div>

              {text && (
                <div className="transcript-box">
                  <b>{t("voiceTranscript") || "Voice Transcript"}</b>
                  <span>{text}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      setForm(initialForm);
                    }}
                  >
                    {t("clearTranscript") || "Clear transcript"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="reference-card profile-voice-card">
              <div className="card-heading">
                <span className="number-icon orange">
                  <FaFileUpload />
                </span>
                <div>
                  <h4>Document Upload &amp; OCR</h4>
                  <p>
                    Upload an Aadhaar, Mark Sheet, or Income Certificate to extract
                    details.
                  </p>
                </div>
              </div>

              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "#f8fafc",
                  marginTop: "16px",
                  cursor: "pointer",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.tif,.tiff"
                  onChange={handleDocumentSelected}
                />

                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background: "#e0e7ff",
                    color: "#3730a3",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    fontSize: "1.4rem",
                  }}
                >
                  {docLoading ? (
                    <FaSpinner className="fa-spin" />
                  ) : (
                    <FaFileUpload />
                  )}
                </div>

                <b style={{ color: "#1e293b", display: "block" }}>
                  {docLoading
                    ? "Extracting details with OCR/LLM..."
                    : uploadedDocName
                      ? uploadedDocName
                      : "Choose or drag document"}
                </b>

                <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                  Supports PDF, Scanned Images (PNG, JPG), or TXT
                </small>
              </div>

              {docExtractDetails && (
                <div
                  style={{
                    marginTop: "14px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.82rem",
                    color: "#166534",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontWeight: 600,
                    }}
                  >
                    <FaCheckCircle /> Extraction Completed
                  </div>
                  <div style={{ marginTop: "4px", color: "#15803d" }}>
                    Method: {docExtractDetails.method} • Language:{" "}
                    {docExtractDetails.language}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 3: Language & Save */}
          <div className="reference-card profile-language-card">
            <div className="card-heading">
              <span className="number-icon blue">
                <FaGlobe />
              </span>
              <div>
                <h4>{t("language") || "Language"}</h4>
                <p>
                  {t("languageDescription") ||
                    "Choose the language used for voice and navigation."}
                </p>
              </div>
            </div>

            <select
              className="reference-input"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.native} ({item.name})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="reference-primary wide"
              disabled={processing || docLoading}
            >
              {t("saveContinue") || "Save & Continue"} <FaArrowRight />
            </button>

            <div className="secure-note">
              <FaCheckCircle />{" "}
              {t("profileSecureNote") ||
                "Your profile is safely stored for personalized matching."}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
