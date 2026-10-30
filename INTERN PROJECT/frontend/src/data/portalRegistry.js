const normalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Official portal routes for schemes.
// Unmapped schemes safely fall back to a "verify official provider" notification.
const VERIFIED = {
  "pre matric scholarship for students with disabilities": {
    provider: "National Scholarship Portal (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://scholarships.gov.in/All-Scholarships",
    statusUrl: "https://scholarships.gov.in/",
    note: "Use the official NSP portal for authentication, OTP verification, and final submission.",
  },
  "post matric scholarship for students with disabilities": {
    provider: "National Scholarship Portal (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://scholarships.gov.in/All-Scholarships",
    statusUrl: "https://scholarships.gov.in/",
    note: "Apply on the National Scholarship Portal under the Department of Empowerment of Persons with Disabilities.",
  },
  "top class education scheme for students with disabilities": {
    provider: "National Scholarship Portal (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://scholarships.gov.in/All-Scholarships",
    statusUrl: "https://scholarships.gov.in/",
    note: "This dataset name corresponds to the disability top-class scholarship listing on NSP.",
  },
  "post matric scholarship for sc st obc students": {
    provider: "National Scholarship Portal (NSP) / State Social Welfare",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://scholarships.gov.in/All-Scholarships",
    statusUrl: "https://scholarships.gov.in/",
    note: "Apply online through NSP or your respective State Scholarship Portal.",
  },
  "central sector scholarship of excellence": {
    provider: "Department of Higher Education (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://scholarships.gov.in/",
    statusUrl: "https://scholarships.gov.in/",
    note: "Apply through National Scholarship Portal under Ministry of Education schemes.",
  },
  "national means cum merit scholarship nmms": {
    provider: "National Scholarship Portal (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://scholarships.gov.in/All-Scholarships",
    statusUrl: "https://scholarships.gov.in/",
    note: "Available on NSP for eligible Class 8 students who cleared the NMMS examination.",
  },
  "ishan uday special scholarship scheme for north eastern region": {
    provider: "UGC / National Scholarship Portal (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://www.ugc.gov.in/",
    statusUrl: "https://scholarships.gov.in/",
    note: "Apply on the National Scholarship Portal under UGC University schemes.",
  },
  "indira gandhi post graduate scholarship for single girl child": {
    provider: "UGC / National Scholarship Portal (NSP)",
    applicationUrl: "https://scholarships.gov.in/",
    sourceUrl: "https://www.ugc.gov.in/",
    statusUrl: "https://scholarships.gov.in/",
    note: "Administered by UGC via NSP for female single girl child students.",
  },
  "phd fellowship for higher education and research scholars": {
    provider: "UGC / CSIR / Ministry of Education Portal",
    applicationUrl: "https://ugcnet.nta.ac.in/",
    sourceUrl: "https://www.ugc.gov.in/",
    statusUrl: "https://ugcnet.nta.ac.in/",
    note: "Fellowship awards are confirmed through national qualification or institutional research registration.",
  },
  "pudhumai penn higher education assurance scheme": {
    provider: "Tamil Nadu Social Welfare and Women Empowerment Department",
    applicationUrl: "https://pudhumaipenn.tn.gov.in/",
    sourceUrl: "https://pudhumaipenn.tn.gov.in/",
    statusUrl: "https://pudhumaipenn.tn.gov.in/",
    note: "Verification and enrollment are carried out via the Tamil Nadu Pudhumai Penn portal through the college nodal officer.",
  },
  "tamil pudhalvan higher education assurance scheme": {
    provider: "Tamil Nadu Higher Education Department",
    applicationUrl: "https://tamilpudhalvan.tn.gov.in/",
    sourceUrl: "https://tamilpudhalvan.tn.gov.in/",
    statusUrl: "https://tamilpudhalvan.tn.gov.in/",
    note: "Official Tamil Nadu scheme for government school boys pursuing college degrees.",
  },
};

export function getPortalForScheme(name = "") {
  const key = normalize(name);
  if (VERIFIED[key]) return VERIFIED[key];

  // Fuzzy check for partial scheme name matches
  for (const [vKey, val] of Object.entries(VERIFIED)) {
    if (key.includes(vKey) || vKey.includes(key)) {
      return val;
    }
  }

  return null;
}
