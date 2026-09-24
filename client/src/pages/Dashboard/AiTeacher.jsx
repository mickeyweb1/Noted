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

const STORAGE_KEY = "noted_ai_tutor_messages";

const matchesCorrect = (q, opt) => {
  const o = typeof opt === "string" ? opt.trim().toLowerCase() : "";
  const optionIndex = q.options.findIndex((x) => typeof x === "string" && x.trim().toLowerCase() === o);
  const answer = q.correctAnswer;

  if (typeof answer === "number") return optionIndex === answer;
  if (typeof answer !== "string" || !answer.trim()) return true;

  const correct = answer.trim().toLowerCase();
  if (o === correct) return true;
  if (/^[a-d]$/.test(correct)) {
    return optionIndex === correct.charCodeAt(0) - 97 || o.startsWith(correct + ".") || o.startsWith(correct + ")");
  }
  return correct.length > 3 && o.length > 0 && (o.includes(correct) || correct.includes(o));
};

const ChatQuizCard = ({ msg, onUpdateMessage }) => {
  const quizState = msg.quizState || { currentQ: 0, selected: null, showExplanation: false, completed: false, score: 0 };
  const q = msg.quizData.questions[quizState.currentQ];

  const handleSelect = (opt) => {
    if (quizState.selected) return;
    const isCorrect = matchesCorrect(q, opt);
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
          const answered = !!quizState.selected;
          const isPicked = quizState.selected === safeOpt;
          const isRight = matchesCorrect(q, safeOpt);

          let style = "border-border bg-background hover:bg-accent/50";
          if (answered) {
            if (isRight) style = "border-green-500 bg-green-500/10";
            else if (isPicked) style = "border-red-500 bg-red-500/10";
            else style = "border-border bg-background opacity-60";
          }
          
          return (
            <button key={index} onClick={() => handleSelect(safeOpt)} disabled={answered} className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${style}`}>
              <span>{safeOpt}</span>
              {answered && isRight && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {answered && isPicked && !isRight && <XCircle className="w-5 h-5 text-red-600" />}
            </button>
          );
        })}
      </div>
      {quizState.showExplanation && q.explanation && (
        <p className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Why: </span>{q.explanation}
        </p>
      )}
      {quizState.selected && <button onClick={handleNext} className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-semibold">Next Question</button>}
    </div>
  );
};

const INITIAL_MESSAGES = [{ id: 1, role: "ai", text: "Hello! I'm your **Noted AI Tutor**. What subject or topic would you like to explore today?" }];
const LOADING_MESSAGES = ["Thinking...", "Consulting archives...", "Drafting response..."];

export default function AiTeacher() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || INITIAL_MESSAGES; } catch { return INITIAL_MESSAGES; }
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [loadingAudioId, setLoadingAudioId] = useState(null);
  const [generatingQuizId, setGeneratingQuizId] = useState(null); // ✅ RESTORED
  
  const activeAudioRef = useRef(null);
  const ttsRequestRef = useRef(0);
  const updateActiveAudio = (audio) => { activeAudioRef.current = audio; };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }, [messages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      ttsRequestRef.current += 1;
      if (activeAudioRef.current) activeAudioRef.current.pause();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMessage = { id: Date.now(), role: "user", text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 1 && (m.role === "user" || m.role === "ai") && typeof m.text === "string" && !m.text.startsWith("⚠️ Error"))
        .slice(-20)
        .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const response = await api.post('/ai/generate', { messages: [...history, { role: "user", content: inputValue }], mode: 'tutor' });
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: response.data.data.generatedText }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "ai", text: `⚠️ Error: ${error.response?.data?.message || "Failed to connect."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakWithBrowser = (messageId, cleanText, requestId) => {
    const chunks = (cleanText.match(/[^.!?\n]+[.!?]*/g) || [cleanText]).map((s) => s.trim()).filter(Boolean);
    if (chunks.length === 0) { setActiveAudioId(null); return; }
    setActiveAudioId(messageId);
    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      if (i === chunks.length - 1) {
        utterance.onend = () => { if (requestId === ttsRequestRef.current) setActiveAudioId(null); };
      }
      window.speechSynthesis.speak(utterance);
    });
  };

  const toggleAudioPlayback = async (messageId, text) => {
    const cleanText = text.replace(/```[\s\S]*?```/g, "").replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^\s*>\s?/gm, "").replace(/[*#]/g, "").trim();
    const requestId = ++ttsRequestRef.current;

    if (activeAudioId === messageId || loadingAudioId === messageId) {
      if (activeAudioRef.current) { activeAudioRef.current.pause(); updateActiveAudio(null); }
      window.speechSynthesis.cancel();
      setActiveAudioId(null);
      setLoadingAudioId(null);
      return;
    }

    if (activeAudioRef.current) { activeAudioRef.current.pause(); updateActiveAudio(null); }
    window.speechSynthesis.cancel();
    setLoadingAudioId(null);
    if (!cleanText) return;

    setActiveAudioId(messageId);
    setLoadingAudioId(messageId);
    try {
      const response = await api.post('/ai/text-to-speech', { text: cleanText, style: 'tutor', voiceId: "pNInz6obpgDQGcFmaJgB" }, { responseType: 'blob' });
      if (requestId !== ttsRequestRef.current) return;

      setLoadingAudioId(null);
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      updateActiveAudio(audio);
      
      audio.onended = () => { setActiveAudioId(null); updateActiveAudio(null); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        updateActiveAudio(null);
        if (requestId === ttsRequestRef.current) speakWithBrowser(messageId, cleanText, requestId);
      };
      await audio.play();
    } catch (error) {
      if (requestId !== ttsRequestRef.current) return;
      setLoadingAudioId(null);
      updateActiveAudio(null);
      speakWithBrowser(messageId, cleanText, requestId);
    }
  };

  // ✅ RESTORED: Turn into Quiz functionality
  const handleGenerateQuizFromChat = async (messageText, messageId) => {
    setGeneratingQuizId(messageId);
    try {
      const response = await api.post('/ai/generate', {
        text: messageText,
        mode: 'quiz',
        title: 'Chat Concept Quiz',
        subject: 'General',
        numQuestions: 3,
        difficulty: 'Medium'
      });

      let quizData = null;
      try {
        const rawText = response.data.data.generatedText;
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) quizData = JSON.parse(jsonMatch[0]);
      } catch (e) { console.error("Frontend JSON parse error:", e); }

      if (quizData && quizData.questions) {
        const quizMessage = {
          id: Date.now(),
          role: 'quiz',
          quizData: quizData,
          quizState: { currentQ: 0, selected: null, showExplanation: false, completed: false, score: 0 }
        };
        setMessages((prev) => [...prev, quizMessage]);
      } else {
        setMessages((prev) => [...prev, { id: Date.now(), role: "ai", text: "⚠️ **Error:** Failed to generate quiz data. Please try again." }]);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to generate quiz.";
      setMessages((prev) => [...prev, { id: Date.now(), role: "ai", text: `⚠️ **Error:** ${errorMsg}` }]);
    } finally {
      setGeneratingQuizId(null);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat history?")) {
      ttsRequestRef.current += 1;
      if (activeAudioRef.current) activeAudioRef.current.pause();
      updateActiveAudio(null);
      window.speechSynthesis.cancel();
      setActiveAudioId(null);
      setLoadingAudioId(null);
      setMessages(INITIAL_MESSAGES);
      localStorage.removeItem(STORAGE_KEY);
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
        <button onClick={handleClearChat} aria-label="Clear chat" className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
                <div className="flex flex-wrap gap-2 mt-1">
                  <button onClick={() => toggleAudioPlayback(msg.id, msg.text)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${activeAudioId === msg.id ? "bg-brand/10 text-brand border-brand/20" : "bg-card text-muted-foreground border-border"}`}>
                    {loadingAudioId === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : activeAudioId === msg.id ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {loadingAudioId === msg.id ? "Loading..." : activeAudioId === msg.id ? "Stop" : "Listen"}
                  </button>
                  {/* ✅ RESTORED: Turn into Quiz Button */}
                  <button onClick={() => handleGenerateQuizFromChat(msg.text, msg.id)} disabled={generatingQuizId === msg.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-electric/10 text-electric border border-electric/20 hover:bg-electric/20 transition-all disabled:opacity-50">
                    {generatingQuizId === msg.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Target className="w-3.5 h-3.5" /> Turn into Quiz</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand"><Bot className="w-4 h-4" /></div>
            <div className="bg-card border border-border p-4 rounded-2xl"><p className="text-xs text-muted-foreground italic animate-pulse">Thinking...</p></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative bg-card border border-border rounded-2xl shadow-lg p-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSendMessage(); } }}
          placeholder="Ask a question..."
          rows={1}
          className="w-full bg-transparent border-0 resize-none px-4 py-3 text-sm focus:outline-none max-h-32"
        />
        <div className="flex justify-end px-2 pb-1">
          <button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} aria-label="Send message" className={`p-2.5 rounded-xl ${inputValue.trim() && !isLoading ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
