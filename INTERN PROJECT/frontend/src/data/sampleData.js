export const sampleSchemes = [
  {
    id: 'post-matric-scholarship',
    name: 'Post-Matric Scholarship for SC/ST/OBC Students',
    ministry: 'Ministry of Social Justice and Empowerment',
    description: 'Financial assistance to students belonging to Scheduled Castes, Scheduled Tribes, and Other Backward Classes for pursuing post-matriculation studies.',
    income_limit: 250000,
    education_level: 'Post-Matric',
    category: ['SC', 'ST', 'OBC'],
    disability: false,
    documents: ['Caste Certificate', 'Income Certificate', 'Mark Sheet', 'Aadhaar Card', 'Bank Passbook'],
    benefits: 'Full tuition fee + maintenance allowance up to ₹1,200/month',
  },
  {
    id: 'pre-matric-disability',
    name: 'Pre-Matric Scholarship for Students with Disabilities',
    ministry: 'Ministry of Social Justice and Empowerment',
    description: 'Scholarship for students with disabilities (40% or more) studying in Class 9 and 10.',
    income_limit: 250000,
    education_level: 'Pre-Matric',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: true,
    disability_min: 40,
    documents: ['Disability Certificate', 'Income Certificate', 'Mark Sheet', 'Aadhaar Card', 'Bank Passbook'],
    benefits: '₹800/month for 10 months + ₹500 book grant + ₹500 disability allowance',
  },
  {
    id: 'national-merit-cum-means',
    name: 'National Means-cum-Merit Scholarship (NMMS)',
    ministry: 'Ministry of Education',
    description: 'Scholarship for economically weaker students to continue their study at the secondary stage.',
    income_limit: 150000,
    education_level: 'Class 8',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: false,
    documents: ['Income Certificate', 'Mark Sheet', 'Aadhaar Card', 'Bank Passbook', 'School Certificate'],
    benefits: '₹12,000 per year for 4 years',
  },
  {
    id: 'ishan-uday',
    name: 'Ishan Uday Special Scholarship Scheme for NE',
    ministry: 'Ministry of Education',
    description: 'Scholarship for students from North Eastern Region pursuing degree/diploma courses.',
    income_limit: 450000,
    education_level: 'UG',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: false,
    documents: ['Domicile Certificate (NE State)', 'Income Certificate', 'Admission Proof', 'Aadhaar Card', 'Bank Passbook'],
    benefits: '₹5,400/month for technical courses + ₹5,400/month for others',
  },
  {
    id: 'pg-indira-gandhi',
    name: 'Indira Gandhi PG Scholarship for Single Girl Child',
    ministry: 'Ministry of Education',
    description: 'Scholarship for single girl child pursuing postgraduate studies.',
    income_limit: 0,
    education_level: 'PG',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: false,
    documents: ['Single Girl Child Certificate', 'Admission Proof', 'Aadhaar Card', 'Bank Passbook'],
    benefits: '₹3,100/month for 2 years',
  },
  {
    id: 'phd-research',
    name: 'PhD Fellowship for Research Scholars',
    ministry: 'Ministry of Education',
    description: 'Fellowship for PhD scholars in sciences, humanities, and social sciences.',
    income_limit: 600000,
    education_level: 'PhD',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: false,
    documents: ['PhD Registration Certificate', 'Research Proposal', 'Income Certificate', 'Aadhaar Card', 'Bank Passbook'],
    benefits: '₹25,000-35,000/month for 5 years + contingency grant',
  },
  {
    id: 'disability-pension',
    name: 'Indira Gandhi National Disability Pension Scheme',
    ministry: 'Ministry of Rural Development',
    description: 'Pension for persons with severe (80%+) disabilities aged 18-59 living below poverty line.',
    income_limit: 100000,
    education_level: 'Any',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: true,
    disability_min: 80,
    documents: ['Disability Certificate', 'BPL Certificate', 'Aadhaar Card', 'Bank Passbook', 'Age Proof'],
    benefits: '₹200-500/month pension',
  },
  {
    id: 'old-age-pension',
    name: 'Indira Gandhi National Old Age Pension Scheme',
    ministry: 'Ministry of Rural Development',
    description: 'Pension for BPL persons aged 60 and above.',
    income_limit: 100000,
    education_level: 'Any',
    category: ['General', 'SC', 'ST', 'OBC'],
    disability: false,
    documents: ['Age Proof', 'BPL Certificate', 'Aadhaar Card', 'Bank Passbook'],
    benefits: '₹200-500/month pension',
  },
];

export const sampleProfile = {
  name: 'Rajesh Kumar',
  age: 22,
  state: 'Uttar Pradesh',
  education: 'Bachelor of Technology (B.Tech)',
  education_level: 'UG',
  income: 180000,
  category: 'OBC',
  disability: false,
  disability_percentage: 0,
  academic_details: {
    institution: 'Indian Institute of Technology, Kanpur',
    year: '2nd Year',
    gpa: '8.2',
  },
  gender: 'Male',
};

export const sampleRecommendations = [
  {
    scheme_id: 'post-matric-scholarship',
    scheme: sampleSchemes[0],
    eligibility_percentage: 92,
    status: 'eligible',
    income_condition: 'Income ₹1,80,000 ≤ ₹2,50,000 limit',
    education_condition: 'Post-Matric education matches',
    disability_condition: 'Not required',
    matched_criteria: 4,
    total_criteria: 5,
  },
  {
    scheme_id: 'ishan-uday',
    scheme: sampleSchemes[3],
    eligibility_percentage: 45,
    status: 'not_eligible',
    income_condition: 'Income ₹1,80,000 ≤ ₹4,50,000 limit',
    education_condition: 'UG education matches',
    disability_condition: 'Not required',
    matched_criteria: 2,
    total_criteria: 4,
    reason: 'State (Uttar Pradesh) is not in the North Eastern Region',
  },
  {
    scheme_id: 'national-merit-cum-means',
    scheme: sampleSchemes[2],
    eligibility_percentage: 30,
    status: 'not_eligible',
    income_condition: 'Income ₹1,80,000 ≤ ₹1,50,000 limit',
    education_condition: 'Education level does not match (requires Class 8)',
    disability_condition: 'Not required',
    matched_criteria: 1,
    total_criteria: 4,
  },
  {
    scheme_id: 'pg-indira-gandhi',
    scheme: sampleSchemes[4],
    eligibility_percentage: 25,
    status: 'not_eligible',
    income_condition: 'No income limit',
    education_condition: 'Education level does not match (requires PG)',
    disability_condition: 'Not required',
    matched_criteria: 1,
    total_criteria: 4,
  },
];

export function sampleEligibility(schemeId) {
  const rec = sampleRecommendations.find((r) => r.scheme_id === schemeId) || sampleRecommendations[0];
  const scheme = rec.scheme;
  return {
    scheme_id: schemeId,
    scheme_name: scheme.name,
    eligibility_status: rec.status,
    eligibility_score: rec.eligibility_percentage,
    passed_criteria: [
      { criterion: 'Income Level', detail: rec.income_condition },
      { criterion: 'Education Level', detail: rec.education_condition },
      { criterion: 'Category', detail: 'OBC category is eligible for this scheme' },
    ],
    failed_criteria: rec.status === 'eligible' ? [] : [
      { criterion: 'State/Region', detail: rec.reason || 'State does not match scheme requirements' },
    ],
    xai_explanation_eligible: rec.status === 'eligible'
      ? 'You are eligible because your income (₹1,80,000) is below the scheme limit of ₹2,50,000, your education level (UG) matches the requirement, and your category (OBC) is included in this scheme. All 5 core criteria have been satisfied.'
      : 'You partially meet the criteria. Your income and education level match, but the scheme has additional requirements that are not met.',
    xai_explanation_not_eligible: rec.status === 'eligible'
      ? ''
      : 'You are not fully eligible because: ' + (rec.reason || 'some criteria are not met') + '. The AI model evaluated 5 criteria and you passed 3 out of 5. Consider applying for schemes that match your profile better, or check if you can fulfill the missing criteria.',
    feature_importance: [
      { feature: 'Income', importance: 28, contribution: 'positive' },
      { feature: 'Education Level', importance: 25, contribution: 'positive' },
      { feature: 'Category', importance: 20, contribution: 'positive' },
      { feature: 'State/Region', importance: 15, contribution: 'negative' },
      { feature: 'Age', importance: 12, contribution: 'positive' },
    ],
  };
}

export function sampleChatResponse(message) {
  const responses = {
    income: 'Based on your profile, your annual family income is ₹1,80,000. This makes you eligible for schemes with income limits above ₹2,50,000 such as the Post-Matric Scholarship and NMMS. You will need an Income Certificate issued by a competent authority (Tehsildar/SDM) to apply.',
    document: 'The commonly required documents for most scholarship applications are: 1) Aadhaar Card, 2) Income Certificate, 3) Caste Certificate (if applicable), 4) Disability Certificate (if applicable), 5) Previous Mark Sheet, 6) Bank Passbook (first page with account details), 7) Recent Passport Photo. Some schemes may require additional documents like domicile certificates.',
    eligibility: 'Your eligibility is determined by multiple factors: income level, education level, category (SC/ST/OBC/General), age, disability status, and state of residence. The AI evaluates each criterion against scheme requirements and provides an eligibility score with explanations.',
    scheme: 'Based on your profile as an OBC student from Uttar Pradesh with UG education and income of ₹1,80,000, I recommend: 1) Post-Matric Scholarship for SC/ST/OBC (92% match), 2) National Merit-cum-Means Scholarship (if you meet the Class 8 criteria), 3) Ishan Uday (if you are from NE region). Would you like detailed information about any of these?',
  };
  const key = Object.keys(responses).find((k) => message.toLowerCase().includes(k));
  return {
    response: key ? responses[key] : `I understand you are asking about: "${message}". Based on your profile and the available schemes, I can help you with information about eligibility criteria, required documents, income requirements, and scheme details. Could you please be more specific about what you would like to know? You can ask about scholarships, eligibility, documents, or income requirements.`,
    sources: ['National Scholarship Portal', 'Ministry of Social Justice', 'Ministry of Education'],
  };
}

export function sampleRagResponse(question, schemeId) {
  const scheme = sampleSchemes.find((s) => s.id === schemeId) || sampleSchemes[0];
  const responses = {
    income: `Yes, an Income Certificate is compulsory for the ${scheme.name}. The income certificate must be issued by a competent authority (Tehsildar, SDM, or BDO) and should reflect the current financial year. The income limit for this scheme is ₹${scheme.income_limit.toLocaleString('en-IN')} per annum.`,
    document: `The required documents for ${scheme.name} are: ${scheme.documents.join(', ')}. All documents must be self-attested. The Disability Certificate is ${scheme.disability ? 'required with minimum ' + scheme.disability_min + '% disability' : 'not required for this scheme'}.`,
    caste: `A Caste Certificate is ${scheme.category.includes('General') ? 'not mandatory for General category applicants but is required if you belong to SC/ST/OBC' : 'mandatory for this scheme'}. The certificate must be issued by a competent authority in the prescribed format.`,
    disability: `Disability requirement: ${scheme.disability ? 'This scheme requires a minimum of ' + scheme.disability_min + '% disability certified by a medical board.' : 'This scheme does not have disability-related requirements.'} A valid Disability Certificate is ${scheme.disability ? 'mandatory' : 'not required'}.`,
  };
  const key = Object.keys(responses).find((k) => question.toLowerCase().includes(k));
  return {
    answer: key ? responses[key] : `Regarding your question: "${question}" - Based on the scheme information for ${scheme.name}, the key requirements are: Income limit of ₹${scheme.income_limit.toLocaleString('en-IN')}, Education level: ${scheme.education_level}, and the required documents include ${scheme.documents.slice(0, 3).join(', ')}, among others. Please ensure all documents are ready before applying.`,
    sources: [scheme.name, scheme.ministry, 'Scheme Guidelines Document'],
  };
}

export function sampleApplicationResult(applicationData) {
  const num = Math.floor(100000 + Math.random() * 900000);
  return {
    success: true,
    application_id: `SWN-2026-${num}`,
    scheme_name: applicationData.scheme_name || 'Post-Matric Scholarship for SC/ST/OBC Students',
    submission_date: new Date().toISOString(),
    status: 'UNDER REVIEW',
    message: 'Your application has been submitted successfully and is now under review.',
  };
}

export function sampleTrackResult(applicationId) {
  const isRejected = applicationId.includes('REJ');
  const isAccepted = applicationId.includes('ACC');
  return {
    application_id: applicationId,
    scheme_name: 'Post-Matric Scholarship for SC/ST/OBC Students',
    applicant_name: 'Rajesh Kumar',
    submission_date: '2026-09-15',
    status: isRejected ? 'REJECTED' : isAccepted ? 'ACCEPTED' : 'UNDER REVIEW',
    timeline: [
      { stage: 'Application Submitted', date: '2026-09-15', status: 'done', description: 'Application received and acknowledgment sent.' },
      { stage: 'Document Verification', date: '2026-09-17', status: 'done', description: 'All documents verified successfully.' },
      { stage: 'Under Review', date: '2026-09-18', status: isRejected || isAccepted ? 'done' : 'active', description: 'Application is being reviewed by the scholarship committee.' },
      { stage: 'Final Decision', date: isRejected || isAccepted ? '2026-09-20' : null, status: isRejected ? 'rejected' : isAccepted ? 'done' : 'pending', description: isRejected ? 'Application has been rejected.' : isAccepted ? 'Application has been accepted!' : 'Awaiting decision.' },
    ],
    rejection_reason: isRejected ? 'Income certificate submitted has expired. Please submit a valid income certificate issued within the last 6 months.' : null,
    alternative_suggestion: isRejected ? 'Based on your profile, we suggest applying for: National Means-cum-Merit Scholarship (NMMS) which has similar eligibility criteria and accepts income certificates with longer validity.' : null,
  };
}

export const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'brx', name: 'Bodo', native: 'बड़ो' },
  { code: 'doi', name: 'Dogri', native: 'डोगरी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ks', name: 'Kashmiri', native: 'कॉशुर / کٲشُر' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
];
