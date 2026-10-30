import { useEffect,useRef,useState } from 'react';
import { useAppState } from '../context/AppContext';
import { api } from '../api/api';
import { FaRobot,FaPaperPlane,FaMicrophoneAlt,FaUserCircle,FaGlobe } from 'react-icons/fa';
import { languages } from '../data/sampleData';

const speechLocales={en:'en-IN',hi:'hi-IN',ta:'ta-IN',te:'te-IN',ml:'ml-IN',kn:'kn-IN',bn:'bn-IN',mr:'mr-IN',gu:'gu-IN',pa:'pa-IN'};

export default function Chatbot(){
 const {language,setLanguage,profile,showToast}=useAppState();const [messages,setMessages]=useState([{role:'ai',text:'Namaste! I am your AI Scholarship Assistant. Ask me about scholarships, eligibility, documents or applications.'}]),[input,setInput]=useState(''),[loading,setLoading]=useState(false);const end=useRef();const recognition=useRef();
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'});return()=>recognition.current?.stop?.()},[messages,loading]);
 const send=async(t=input.trim())=>{if(!t||loading)return;setMessages(m=>[...m,{role:'user',text:t}]);setInput('');setLoading(true);try{const r=await api.sendChat(t,language,profile);setMessages(m=>[...m,{role:'ai',text:r.response,sources:r.sources}]);}catch(e){setMessages(m=>[...m,{role:'ai',text:e?.response?.data?.detail||'Unable to connect to the AI service.'}]);}finally{setLoading(false)}};
 const voice=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){showToast({message:'Speech recognition is not supported in this browser.',type:'warning'});return;}const r=new SR();r.lang=speechLocales[language]||'en-IN';r.onresult=e=>setInput(e.results[0][0].transcript);r.start();recognition.current=r;};
 return <div className="reference-page">
   <div className="reference-page-head"><div><span className="section-kicker">AI ASSISTANT</span><h2>AI Scholarship Chatbot</h2><p>Ask questions about government schemes using your selected language.</p></div><div className="chat-language"><FaGlobe/><select value={language} onChange={e=>setLanguage(e.target.value)}>{languages.map(l=><option key={l.code} value={l.code}>{l.native}</option>)}</select></div></div>
   <div className="chat-reference"><div className="chat-messages">{messages.map((m,i)=><div key={i} className={`chat-row ${m.role}`}><div className="chat-avatar">{m.role==='ai'?<FaRobot/>:<FaUserCircle/>}</div><div className="chat-bubble-reference">{m.text}{m.sources?.length>0&&<div className="chat-sources">{m.sources.map(s=><span key={s}>{s}</span>)}</div>}</div></div>)}{loading&&<div className="chat-row ai"><div className="chat-avatar"><FaRobot/></div><div className="chat-bubble-reference typing">Thinking...</div></div>}<div ref={end}/></div><div className="chat-suggestions">{['What scholarships am I eligible for?','What documents do I need?','What is the income limit?','How is eligibility calculated?'].map(q=><button key={q} onClick={()=>send(q)}>{q}</button>)}</div><div className="chat-composer"><button onClick={voice}><FaMicrophoneAlt/></button><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask your question..."/><button onClick={()=>send()}><FaPaperPlane/></button></div></div>
 </div>;
}
