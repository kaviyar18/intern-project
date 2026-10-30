import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "Welfare Navigator",
      home: "Home",
      profileInput: "Profile Input",
      chatbot: "AI Assistant",
      recommendations: "Recommendations",
      eligibility: "Eligibility Check",
      application: "Application",
      submission: "Submission",
      track: "Track Application",

      getStarted: "Get Started",
      voiceInput: "Voice Input",
      startRecording: "Tap to start recording",
      stopRecording: "Stop Recording",
      recording: "Recording...",
      language: "Language",
      saveContinue: "Save & Continue",
      noRegistration: "No registration required",

      profileDescription:
        "Enter your basic details or use voice input to get personalized scheme recommendations.",
      personalInformation: "Personal Information",
      personalInformationDescription:
        "Provide your details to find relevant government schemes.",

      fullName: "Full Name",
      enterFullName: "Enter your full name",
      dateOfBirth: "Date of Birth",

      gender: "Gender",
      selectGender: "Select gender",
      male: "Male",
      female: "Female",
      other: "Other",
      preferNotToSay: "Prefer not to say",

      category: "Category",
      selectCategory: "Select category",
      general: "General",
      obc: "OBC",
      sc: "SC",
      st: "ST",
      ews: "EWS",

      state: "State",
      enterState: "Enter your state",
      annualIncome: "Annual Income (₹)",
      enterAnnualIncome: "Enter annual income",

      educationLevel: "Education Level",
      selectEducation: "Select education level",
      school: "School",
      class10: "Class 10",
      class12: "Class 12",
      diploma: "Diploma",
      undergraduate: "Undergraduate",
      postgraduate: "Postgraduate",
      phd: "PhD",

      disabilityQuestion: "Do you have a disability?",

      voiceDescription:
        "Tell us about yourself in your preferred Indian language.",
      speechRecognition: "Chrome / Edge speech recognition",
      voiceTranscript: "Voice Transcript",
      clearTranscript: "Clear transcript",
      languageDescription: "Choose the language used for voice processing.",
      profileSecureNote: "Your profile is used to find matching schemes.",

      stepReceiving: "Receiving input",
      stepDetecting: "Detecting language",
      stepExtracting: "Extracting candidate information",
      stepFinding: "Finding matching schemes",

      speechNotSupported:
        "Speech recognition is not supported. Use Chrome or Edge.",
      voiceCaptureError: "Could not capture voice. Please try again.",
      voiceStartError: "Unable to start voice recording. Please try again.",
      enterFullNameError: "Please enter your full name.",
      requiredFieldsError: "Please complete all required profile fields.",
      profileSaved: "Profile saved and recommendations generated.",
      processingError:
        "Processing failed. Make sure the FastAPI backend is running.",
    },
  },

  hi: {
    translation: {
      appName: "कल्याण एवं छात्रवृत्ति नेविगेटर",
      home: "होम",
      profileInput: "प्रोफ़ाइल इनपुट",
      chatbot: "एआई सहायक",
      recommendations: "योजना सिफारिशें",
      eligibility: "पात्रता जांच",
      application: "आवेदन",
      submission: "जमा करना",
      track: "आवेदन ट्रैक करें",

      getStarted: "शुरू करें",
      voiceInput: "आवाज इनपुट",
      startRecording: "रिकॉर्डिंग शुरू करने के लिए टैप करें",
      stopRecording: "रिकॉर्डिंग रोकें",
      recording: "रिकॉर्डिंग जारी है...",
      language: "भाषा",
      saveContinue: "सहेजें और आगे बढ़ें",
      noRegistration: "पंजीकरण की आवश्यकता नहीं",

      profileDescription:
        "व्यक्तिगत सरकारी योजनाओं की सिफारिशें प्राप्त करने के लिए अपना विवरण दर्ज करें या आवाज इनपुट का उपयोग करें।",
      personalInformation: "व्यक्तिगत जानकारी",
      personalInformationDescription:
        "उपयुक्त सरकारी योजनाएं खोजने के लिए अपना विवरण प्रदान करें।",

      fullName: "पूरा नाम",
      enterFullName: "अपना पूरा नाम दर्ज करें",
      dateOfBirth: "जन्म तिथि",

      gender: "लिंग",
      selectGender: "लिंग चुनें",
      male: "पुरुष",
      female: "महिला",
      other: "अन्य",
      preferNotToSay: "नहीं बताना चाहते",

      category: "श्रेणी",
      selectCategory: "श्रेणी चुनें",
      general: "सामान्य (General)",
      obc: "ओबीसी (OBC)",
      sc: "एससी (SC)",
      st: "एसटी (ST)",
      ews: "ईडब्ल्यूएस (EWS)",

      state: "राज्य",
      enterState: "अपना राज्य दर्ज करें",
      annualIncome: "वार्षिक पारिवारिक आय (₹)",
      enterAnnualIncome: "वार्षिक आय दर्ज करें",

      educationLevel: "शिक्षा का स्तर",
      selectEducation: "शिक्षा स्तर चुनें",
      school: "स्कूल",
      class10: "कक्षा 10",
      class12: "कक्षा 12",
      diploma: "डिप्लोमा",
      undergraduate: "स्नातक (UG)",
      postgraduate: "स्नातकोत्तर (PG)",
      phd: "पीएचडी (PhD)",

      disabilityQuestion: "क्या आप दिव्यांग / विशेष आवश्यकता वाले हैं?",

      voiceDescription:
        "अपनी पसंदीदा भारतीय भाषा में अपने बारे में बताएं।",
      speechRecognition: "क्रोम / एज आवाज पहचान",
      voiceTranscript: "आवाज ट्रांसक्रिप्ट",
      clearTranscript: "ट्रांसक्रिप्ट हटाएं",
      languageDescription: "आवाज और नेविगेशन के लिए भाषा चुनें।",
      profileSecureNote: "आपकी प्रोफ़ाइल का उपयोग केवल उपयुक्त योजनाएं खोजने के लिए किया जाता है।",

      stepReceiving: "इनपुट प्राप्त हो रहा है",
      stepDetecting: "भाषा की पहचान हो रही है",
      stepExtracting: "उम्मीदवार की जानकारी निकाली जा रही है",
      stepFinding: "अनुकूल सरकारी योजनाएं खोजी जा रही हैं",

      speechNotSupported:
        "इस ब्राउज़र में आवाज पहचान समर्थित नहीं है। क्रोम या एज का उपयोग करें।",
      voiceCaptureError: "आवाज रिकॉर्ड नहीं हो सकी। कृपया पुन: प्रयास करें।",
      voiceStartError: "आवाज रिकॉर्डिंग शुरू नहीं हो सकी। कृपया पुन: प्रयास करें।",
      enterFullNameError: "कृपया अपना पूरा नाम दर्ज करें।",
      requiredFieldsError: "कृपया सभी आवश्यक प्रोफ़ाइल फ़ील्ड भरें।",
      profileSaved: "प्रोफ़ाइल सहेज ली गई है और योजना सिफारिशें तैयार हैं।",
      processingError:
        "प्रक्रिया विफल रही। सुनिश्चित करें कि FastAPI बैकएंड चल रहा है।",
    },
  },

  ta: {
    translation: {
      appName: "நலத்திட்ட வழிகாட்டி",
      home: "முகப்பு",
      profileInput: "சுயவிவர உள்ளீடு",
      chatbot: "AI உதவியாளர்",
      recommendations: "பரிந்துரைகள்",
      eligibility: "தகுதி சரிபார்ப்பு",
      application: "விண்ணப்பம்",
      submission: "சமர்ப்பிப்பு",
      track: "விண்ணப்ப நிலையைக் கண்காணிக்க",

      getStarted: "தொடங்குங்கள்",
      voiceInput: "குரல் உள்ளீடு",
      startRecording: "பதிவைத் தொடங்க தட்டவும்",
      stopRecording: "பதிவை நிறுத்தவும்",
      recording: "பதிவு செய்யப்படுகிறது...",
      language: "மொழி",
      saveContinue: "சேமித்து தொடரவும்",
      noRegistration: "பதிவு தேவையில்லை",

      profileDescription:
        "தனிப்பயனாக்கப்பட்ட திட்டப் பரிந்துரைகளைப் பெற உங்கள் அடிப்படை விவரங்களை உள்ளிடவும் அல்லது குரல் உள்ளீட்டைப் பயன்படுத்தவும்.",
      personalInformation: "தனிப்பட்ட தகவல்கள்",
      personalInformationDescription:
        "பொருத்தமான அரசு திட்டங்களைக் கண்டறிய உங்கள் விவரங்களை வழங்கவும்.",

      fullName: "முழுப் பெயர்",
      enterFullName: "உங்கள் முழுப் பெயரை உள்ளிடவும்",
      dateOfBirth: "பிறந்த தேதி",

      gender: "பாலினம்",
      selectGender: "பாலினத்தைத் தேர்ந்தெடுக்கவும்",
      male: "ஆண்",
      female: "பெண்",
      other: "மற்றவை",
      preferNotToSay: "தெரிவிக்க விரும்பவில்லை",

      category: "பிரிவு",
      selectCategory: "பிரிவைத் தேர்ந்தெடுக்கவும்",
      general: "பொது",
      obc: "OBC",
      sc: "SC",
      st: "ST",
      ews: "EWS",

      state: "மாநிலம்",
      enterState: "உங்கள் மாநிலத்தை உள்ளிடவும்",
      annualIncome: "ஆண்டு வருமானம் (₹)",
      enterAnnualIncome: "ஆண்டு வருமானத்தை உள்ளிடவும்",

      educationLevel: "கல்வி நிலை",
      selectEducation: "கல்வி நிலையைத் தேர்ந்தெடுக்கவும்",
      school: "பள்ளி",
      class10: "10ஆம் வகுப்பு",
      class12: "12ஆம் வகுப்பு",
      diploma: "டிப்ளமோ",
      undergraduate: "இளங்கலை",
      postgraduate: "முதுகலை",
      phd: "முனைவர் பட்டம்",

      disabilityQuestion: "உங்களுக்கு மாற்றுத்திறன் உள்ளதா?",

      voiceDescription:
        "உங்களுக்கு விருப்பமான இந்திய மொழியில் உங்களைப் பற்றிக் கூறுங்கள்.",
      speechRecognition: "Chrome / Edge குரல் அடையாளம் காணுதல்",
      voiceTranscript: "குரல் உரை",
      clearTranscript: "உரையை நீக்கவும்",
      languageDescription:
        "குரல் செயலாக்கத்திற்குப் பயன்படுத்தப்படும் மொழியைத் தேர்ந்தெடுக்கவும்.",
      profileSecureNote:
        "பொருத்தமான திட்டங்களைக் கண்டறிய உங்கள் சுயவிவரம் பயன்படுத்தப்படும்.",

      stepReceiving: "உள்ளீடு பெறப்படுகிறது",
      stepDetecting: "மொழி கண்டறியப்படுகிறது",
      stepExtracting: "விண்ணப்பதாரர் தகவல்கள் பிரித்தெடுக்கப்படுகின்றன",
      stepFinding: "பொருத்தமான திட்டங்கள் கண்டறியப்படுகின்றன",

      speechNotSupported:
        "குரல் அடையாளம் காணுதல் ஆதரிக்கப்படவில்லை. Chrome அல்லது Edge பயன்படுத்தவும்.",
      voiceCaptureError:
        "குரலைப் பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
      voiceStartError:
        "குரல் பதிவைத் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
      enterFullNameError: "உங்கள் முழுப் பெயரை உள்ளிடவும்.",
      requiredFieldsError:
        "தேவையான அனைத்து சுயவிவர விவரங்களையும் பூர்த்தி செய்யவும்.",
      profileSaved:
        "சுயவிவரம் சேமிக்கப்பட்டது; திட்டப் பரிந்துரைகள் உருவாக்கப்பட்டன.",
      processingError:
        "செயலாக்கம் தோல்வியடைந்தது. FastAPI backend இயங்குகிறதா எனச் சரிபார்க்கவும்.",
    },
  },
};

const getSavedLanguage = () => {
  try {
    const savedState = localStorage.getItem("swn-app-state");

    if (!savedState) return "en";

    return JSON.parse(savedState).language || "en";
  } catch {
    return "en";
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
