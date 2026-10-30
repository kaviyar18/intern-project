import { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import i18n from "../i18n";

const AppStateContext = createContext(null);

const initialState = {
  currentPage: 'home',
  profile: null,
  recommendations: [],
  selectedScheme: null,
  eligibility: null,
  applicationResult: null,
  language: 'en',
  inputMethod: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPage: action.page };
    case 'SET_PROFILE':
      return { ...state, profile: action.profile };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.recommendations };
    case 'SET_SELECTED_SCHEME':
      return { ...state, selectedScheme: action.scheme };
    case 'SET_ELIGIBILITY':
      return { ...state, eligibility: action.eligibility };
    case 'SET_APPLICATION_RESULT':
      return { ...state, applicationResult: action.result };
    case 'SET_LANGUAGE':
      return { ...state, language: action.language };
    case 'SET_INPUT_METHOD':
      return { ...state, inputMethod: action.method };
    case 'RESET':
      return { ...initialState, language: state.language };
    default:
      return state;
  }
}

let toastId = 0;

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [toasts, setToasts] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('swn-app-state') || 'null');
      if (!saved) { setHydrated(true); return; }
      if (saved.profile) dispatch({ type: 'SET_PROFILE', profile: saved.profile });
      if (Array.isArray(saved.recommendations)) dispatch({ type: 'SET_RECOMMENDATIONS', recommendations: saved.recommendations });
      if (saved.selectedScheme) dispatch({ type: 'SET_SELECTED_SCHEME', scheme: saved.selectedScheme });
      if (saved.eligibility) dispatch({ type: 'SET_ELIGIBILITY', eligibility: saved.eligibility });
      if (saved.applicationResult) dispatch({ type: 'SET_APPLICATION_RESULT', result: saved.applicationResult });
if (saved.language) {
  dispatch({ type: "SET_LANGUAGE", language: saved.language });
  i18n.changeLanguage(saved.language);
}
    } catch { /* ignore invalid local state */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('swn-app-state', JSON.stringify({
        profile: state.profile, recommendations: state.recommendations, selectedScheme: state.selectedScheme,
        eligibility: state.eligibility, applicationResult: state.applicationResult, language: state.language
      }));
    } catch { /* storage can be unavailable in private browsing */ }
  }, [hydrated, state.profile, state.recommendations, state.selectedScheme, state.eligibility, state.applicationResult, state.language]);

  const setPage = useCallback((page) => dispatch({ type: 'SET_PAGE', page }), []);
  const setProfile = useCallback((profile) => dispatch({ type: 'SET_PROFILE', profile }), []);
  const setRecommendations = useCallback((recommendations) => dispatch({ type: 'SET_RECOMMENDATIONS', recommendations }), []);
  const setSelectedScheme = useCallback((scheme) => dispatch({ type: 'SET_SELECTED_SCHEME', scheme }), []);
  const setEligibility = useCallback((eligibility) => dispatch({ type: 'SET_ELIGIBILITY', eligibility }), []);
  const setApplicationResult = useCallback((result) => dispatch({ type: 'SET_APPLICATION_RESULT', result }), []);
  const setLanguage = useCallback((language) => {
    dispatch({ type: "SET_LANGUAGE", language });
    i18n.changeLanguage(language);
  }, []);
  const setInputMethod = useCallback((method) => dispatch({ type: 'SET_INPUT_METHOD', method }), []);

  const showToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = {
    ...state,
    toasts,
    setPage,
    setProfile,
    setRecommendations,
    setSelectedScheme,
    setEligibility,
    setApplicationResult,
    setLanguage,
    setInputMethod,
    showToast,
    removeToast,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
