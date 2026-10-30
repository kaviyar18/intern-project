import { useAppState } from '../context/AppContext';
import { languages } from '../data/sampleData';
import {
  FaHome, FaMicrophoneAlt, FaUserCircle, FaListAlt, FaCheckCircle,
  FaFileAlt, FaPaperPlane, FaSearch, FaRobot, FaTimes,
} from 'react-icons/fa';

const items = [
  ['home', 'Home', <FaHome />],
  ['input', 'Profile Input', <FaMicrophoneAlt />],
  ['profile', 'My Profile', <FaUserCircle />],
  ['recommendations', 'Recommendations', <FaListAlt />],
  ['eligibility', 'Eligibility Check', <FaCheckCircle />],
  ['application', 'Application', <FaFileAlt />],
  ['submission', 'Submission', <FaPaperPlane />],
  ['track', 'Track Application', <FaSearch />],
];

export default function Sidebar({ show, onNavigate }) {
  const { currentPage, setPage, language, setLanguage } = useAppState();

  const go = (page) => {
    setPage(page);
    onNavigate?.();
  };

  return (
    <>
      <div className={`sidebar-overlay ${show ? 'show' : ''}`} onClick={onNavigate} />
      <aside className={`reference-sidebar ${show ? 'show' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-emblem"><span>♜</span></div>
          <div>
            <div className="brand-title">Scholarship &amp;</div>
            <div className="brand-title">Welfare Navigator</div>
          </div>
          <button className="mobile-close" onClick={onNavigate} aria-label="Close"><FaTimes /></button>
        </div>

        <div className="sidebar-nav">
          {items.map(([id, label, icon]) => (
            <button key={id} className={`reference-nav-item ${currentPage === id ? 'active' : ''}`} onClick={() => go(id)}>
              <span className="nav-item-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className={`reference-nav-item ${currentPage === 'chatbot' ? 'active' : ''}`} onClick={() => go('chatbot')}>
            <span className="nav-item-icon"><FaRobot /></span>
            <span>AI Chatbot</span>
          </button>
          <label className="sidebar-language-label">Language</label>
          <select className="sidebar-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.native} ({l.name})</option>)}
          </select>
          <div className="sidebar-footer">
            <div>Government of India</div>
            <span>AI • LLM • RAG • XAI</span>
          </div>
        </div>
      </aside>
    </>
  );
}
