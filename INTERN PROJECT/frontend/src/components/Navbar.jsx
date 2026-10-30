import { useEffect, useState } from 'react';
import { useAppState } from '../context/AppContext';
import { api } from '../api/api';

export default function Navbar() {
  const { language } = useAppState();
  const [system, setSystem] = useState({ online: false, llm: false });

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const h = await api.health();
        if (active) setSystem({ online: h.status === 'healthy', llm: Boolean(h.llm_configured) });
      } catch {
        if (active) setSystem({ online: false, llm: false });
      }
    };
    check();
    const timer = setInterval(check, 20000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  return (
    <div className="reference-system-status" aria-label="System status">
      <span className={`system-dot ${system.online ? 'online' : 'offline'}`} />
      <span>{system.online ? (system.llm ? 'AI Online' : 'API Online') : 'Offline'}</span>
      <span className="status-language">{language?.toUpperCase()}</span>
    </div>
  );
}
