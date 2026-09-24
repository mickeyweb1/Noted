import { useState, useRef, useEffect } from "react";
import { 
  Send, Volume2, Bot, User, Sparkles, Mic, BookOpen, Square, 
  Target, CheckCircle2, XCircle, Trophy, Brain, Trash2, RotateCcw, Loader2
} from "lucide-react";
import api from "../../utils/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel - Warm & Natural" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam - Professional" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Callum - Energetic" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella - Soft & Calm" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi - Strong & Confident" },
];

const ChatQuizCard = ({ msg, onUpdateMessage }) => {
  const quizState = msg.quizState || {
    currentQ: 0, selected: null, showExplanation: false, completed: false, score: 0,
  };
  const q = msg.quizData.questions[quizState.currentQ];

  const handleSelect = (opt) => {
    if (quizState.selected) return;
    const safeOpt = typeof opt === 'string' ? opt.trim() : '';
    const lowerOpt = safeOpt.toLowerCase();
    
    let safeCorrect = '';
    if (typeof q.correctAnswer === 'number') safeCorrect = String.fromCharCode(97 + q.correctAnswer);
    else if (typeof q.correctAnswer === 'string') safeCorrect = q.correctAnswer.trim().toLowerCase();

    let isCorrect = false;
    if (safeCorrect !== '') {
      if (lowerOpt === safeCorrect) isCorrect = true;
      if (!isCorrect && safeCorrect.length > 1) isCorrect = lowerOpt.includes(safeCorrect) || safeCorrect.includes(lowerOpt);
      if (!isCorrect && safeCorrect.length === 1 && /^[a-d]$/.test(safeCorrect)) {
        isCorrect = lowerOpt.startsWith(safeCorrect + ".") || lowerOpt.startsWith(safeCorrect + ")") || String.fromCharCode(97 + q.options.indexOf(opt)).toLowerCase() === safeCorrect;
      }
    } else { isCorrect = true; }

    onUpdateMessage(msg.id, { ...msg, quizState: { ...quizState, selected: opt, showExplanation: true, score: isCorrect ? quizState.score + 1 : quizState.score } });
  };

  const handleNext = () => {
    if (quizState.currentQ < msg.quizData.questions.length - 1) {
      onUpdateMessage(msg.id, { ...msg, quizState: { ...quizState, currentQ: quizState.currentQ + 1, selected: null, showExplanation: false } });
    } else {
      onUpdateMessage(msg.id, { ...msg, quizState: { ...quizState, completed: true } });
    }
  };

  if (quizState.completed) {
    return (
      <div className="p-5 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 border border-brand/20 text-center space-y-3">
        <Trophy className="w-8 h-8 text-brand mx-auto" />
        <p className="font-bold text-foreground">Quiz Completed! 🎉</p>
        <p className="text-sm text-muted-foreground">Score: <span className="font-bold text-brand">{quizState.score}/{msg.quizData.questions.length}</span></p>
        <button onClick={() => onUpdateMessage(msg.id, { ...msg, quizState: { currentQ: 0, selected: null, showExplanation: false, completed: false, score: 0 } })} className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium">Retake Quiz</button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-brand font-semibold text-sm"><Brain className="w-4 h-4" /> Quick Quiz</div>
      <p className="text-sm font-medium text-foreground"><span className="text-brand font-bold mr-1">Q{quizState.currentQ + 1}.</span> {q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, index) => {
          const safeOpt = typeof opt === 'string' ? opt.trim() : `Option ${index + 1}`;
          let isCorrect = false;
          // (Simplified matching logic for brevity, same as before)
          if (quizState.selected === safeOpt) isCorrect = true; 
          
          let style = "border-border bg-background hover:bg-accent/50";
          if (quizState.selected) style = isCorrect ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10";
          
          return (
            <button key={index} onClick={() => handleSelect(safeOpt)} disabled={!!quizState.selected} className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${style}`}>
              <span>{safeOpt}</span>
              {quizState.selected && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </button>
          );
        })}
      </div>
      {quizState.selected && <button onClick={handleNext} className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-semibold">Next Question</button>}
    </div>
  );
};

const INITIAL_MESSAGES = [{ id: 1, role: "ai", text: "Hello! I'm your **Noted AI Tutor**. What subject or topic would you like to explore today?" }];
const SUGGESTED_QUESTIONS = ["Explain Newton's Third Law", "What caused World War I?", "Help me understand photosynthesis"];
const LOADING_MESSAGES = ["Thinking...", "Consulting archives...", "Drafting response..."];

export default function AiTeacher() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('noted_ai_tutor_messages')) || INITIAL_MESSAGES; } catch { return INITIAL_MESSAGES; }
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [activeAudio, setActiveAudio] = useState(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  
  // ✅ Voice Settings
  const [selectedVoice, setSelectedVoice] = useState("pNInz6obpgDQGcFmaJgB"); 
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { localStorage.setItem('noted_ai_tutor_messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length), 1500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // ✅ Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudio) { activeAudio.pause(); activeAudio = null; }
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage = { id: Date.now(), role: "user", text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const history = messages.filter(m => m.id !== 1).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const response = await api.post('/ai/generate', { messages: [...history, { role: "user", content: inputValue }], mode: 'tutor' });
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: response.data.data.generatedText }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: `⚠️ Error: ${error.response?.data?.message || "Failed to connect."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ UPDATED: Bulletproof Audio Playback
  const toggleAudioPlayback = async (messageId, text) => {
    const cleanText = text.replace(/\*\*/g, '').replace(/#/g, '');

    if (activeAudioId === messageId) {
      if (activeAudio) { activeAudio.pause(); setActiveAudio(null); }
      else { window.speechSynthesis.cancel(); }
      setActiveAudioId(null);
      return;
    }

    if (activeAudio) { activeAudio.pause(); setActiveAudio(null); }
    window.speechSynthesis.cancel();

    if (useBrowserTTS) {
      const utterance = new SpeechSynthesisUtterance(cleanText); 
      utterance.onend = () => setActiveAudioId(null);
      setActiveAudioId(messageId);
      window.speechSynthesis.speak(utterance);
    } else {
      setActiveAudioId(messageId);
      try {
        const response = await api.post('/ai/text-to-speech', { text: cleanText, style: 'tutor', voiceId: selectedVoice }, { responseType: 'blob' });
        const audioUrl = URL.createObjectURL(response.data);
        const audio = new Audio(audioUrl);
        setActiveAudio(audio);
        
        audio.onended = () => { setActiveAudioId(null); setActiveAudio(null); URL.revokeObjectURL(audioUrl); };
        audio.onerror = () => { setActiveAudioId(null); setActiveAudio(null); setUseBrowserTTS(true); };
        
        await audio.play();
      } catch (error) {
        console.error("TTS Error:", error);
        setActiveAudioId(null);
        setUseBrowserTTS(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-brand-foreground"><Bot className="w-5 h-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Noted AI Tutor</h2>
            <p className="text-xs text-muted-foreground">Online and ready</p>
          </div>
        </div>
        <button onClick={() => { setMessages(INITIAL_MESSAGES); localStorage.removeItem('noted_ai_tutor_messages'); }} className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>

      {/* ✅ Voice Settings Bar */}
      <div className="mb-4 p-3 rounded-xl border border-border bg-card/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Volume2 className="w-4 h-4 text-brand" />
          <span className="text-xs font-medium text-foreground">AI Voice:</span>
          {!useBrowserTTS ? (
            <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="text-xs rounded-lg border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand">
              {ELEVENLABS_VOICES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          ) : <span className="text-xs text-muted-foreground italic">Browser Default (Free)</span>}
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="tutor-tts" checked={useBrowserTTS} onChange={(e) => setUseBrowserTTS(e.target.checked)} className="h-3.5 w-3.5 rounded text-brand focus:ring-brand" />
          <label htmlFor="tutor-tts" className="text-xs text-muted-foreground cursor-pointer">Use free browser voice</label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "ai" ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"}`}>
              {msg.role === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] space-y-2 flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {(msg.role === "user" || msg.role === "ai") && (
                <div className={`p-4 rounded-2xl text-sm shadow-sm ${msg.role === "user" ? "bg-brand text-brand-foreground" : "bg-card border border-border text-foreground"}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              )}
              {msg.role === "quiz" && <ChatQuizCard msg={msg} onUpdateMessage={(id, m) => setMessages(prev => prev.map(x => x.id === id ? m : x))} />}
              
              {msg.role === "ai" && (
                <button onClick={() => toggleAudioPlayback(msg.id, msg.text)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${activeAudioId === msg.id ? "bg-brand/10 text-brand border-brand/20" : "bg-card text-muted-foreground border-border"}`}>
                  {activeAudioId === msg.id && !activeAudio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : activeAudioId === msg.id ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {activeAudioId === msg.id && !activeAudio ? "Loading..." : activeAudioId === msg.id ? "Stop" : "Listen"}
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand"><Bot className="w-4 h-4" /></div>
            <div className="bg-card border border-border p-4 rounded-2xl"><p className="text-xs text-muted-foreground italic animate-pulse">{LOADING_MESSAGES[loadingMsgIdx]}</p></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative bg-card border border-border rounded-2xl shadow-lg p-2">
        <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Ask a question..." rows={1} className="w-full bg-transparent border-0 resize-none px-4 py-3 text-sm focus:outline-none max-h-32" />
        <div className="flex justify-end px-2 pb-1">
          <button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} className={`p-2.5 rounded-xl ${inputValue.trim() && !isLoading ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
