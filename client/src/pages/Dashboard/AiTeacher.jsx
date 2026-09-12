import { useState, useRef, useEffect } from "react";
import { 
  Send, Volume2, Bot, User, Sparkles, Mic, BookOpen, Square, 
  Target, CheckCircle2, XCircle, Trophy, Brain, Trash2, RotateCcw, Loader2
} from "lucide-react";
import api from "../../utils/api";
import DOMPurify from 'dompurify';

// ✅ POLISHED: Quiz Card with better styling and state persistence
const ChatQuizCard = ({ msg, onUpdateMessage }) => {
  const quizState = msg.quizState || {
    currentQ: 0, selected: null, showExplanation: false, completed: false, score: 0,
  };

  const q = msg.quizData.questions[quizState.currentQ];

  const handleSelect = (opt) => {
    if (quizState.selected) return;
    const newState = {
      ...quizState,
      selected: opt,
      showExplanation: true,
      score: opt === q.correctAnswer ? quizState.score + 1 : quizState.score,
    };
    onUpdateMessage(msg.id, { ...msg, quizState: newState });
  };

  const handleNext = () => {
    if (quizState.currentQ < msg.quizData.questions.length - 1) {
      onUpdateMessage(msg.id, { 
        ...msg, 
        quizState: { ...quizState, currentQ: quizState.currentQ + 1, selected: null, showExplanation: false } 
      });
    } else {
      onUpdateMessage(msg.id, { ...msg, quizState: { ...quizState, completed: true } });
    }
  };

  const handleRetake = () => {
    onUpdateMessage(msg.id, { 
      ...msg, 
      quizState: { currentQ: 0, selected: null, showExplanation: false, completed: false, score: 0 } 
    });
  };

  if (quizState.completed) {
    return (
      <div className="p-5 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 border border-brand/20 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
          <Trophy className="w-6 h-6 text-brand" />
        </div>
        <div>
          <p className="font-bold text-foreground text-lg">Quiz Completed! 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">
            You scored <span className="font-bold text-brand">{quizState.score}</span> out of {msg.quizData.questions.length}
          </p>
        </div>
        <button 
          onClick={handleRetake}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:bg-brand/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Retake Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-brand font-semibold text-sm">
        <Brain className="w-4 h-4" /> Quick Quiz: {msg.quizData.title || "Test your knowledge"}
      </div>
      <p className="text-sm font-medium text-foreground leading-relaxed">
        <span className="text-brand font-bold mr-1">Q{quizState.currentQ + 1}.</span> {q.question}
      </p>
      <div className="space-y-2">
        {q.options.map((opt) => {
          let style = "border-border bg-background hover:bg-accent/50 hover:border-brand/30";
          if (quizState.selected) {
            if (opt === q.correctAnswer) style = "border-green-500 bg-green-500/10 text-green-700";
            else if (opt === quizState.selected) style = "border-red-500 bg-red-500/10 text-red-700";
            else style = "border-border bg-background opacity-50";
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={!!quizState.selected}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${style}`}
            >
              <span>{opt}</span>
              {quizState.selected && opt === q.correctAnswer && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {quizState.selected && opt === quizState.selected && opt !== q.correctAnswer && <XCircle className="w-5 h-5 text-red-600" />}
            </button>
          );
        })}
      </div>
      {quizState.showExplanation && (
        <div className={`p-3 rounded-xl text-sm border ${quizState.selected === q.correctAnswer ? "bg-green-500/5 border-green-500/20 text-green-700" : "bg-red-500/5 border-red-500/20 text-red-700"}`}>
          <span className="font-bold">{quizState.selected === q.correctAnswer ? "Correct! 🎉" : "Not quite."}</span>{" "}
          {q.explanation}
        </div>
      )}
      {quizState.selected && (
        <button
          onClick={handleNext}
          className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition-colors shadow-sm"
        >
          {quizState.currentQ === msg.quizData.questions.length - 1 ? "Finish Quiz" : "Next Question"}
        </button>
      )}
    </div>
  );
};

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: "ai",
    text: "Hello! I'm your **Noted AI Tutor**. 🎓 What subject or topic would you like to explore today? You can ask me to explain a concept, break down complex notes, or quiz you!",
  },
];

const SUGGESTED_QUESTIONS = [
  "Explain Newton's Third Law simply",
  "What are the main causes of World War I?",
  "Help me understand photosynthesis",
  "Give me 3 tips for better time management",
];

const LOADING_MESSAGES = [
  "Consulting the academic archives...",
  "Structuring a clear explanation for you...",
  "Your Noted AI Tutor is thinking...",
  "Connecting the concepts...",
  "Drafting a student-friendly response..."
];

export default function AiTeacher() {
  const getInitialMessages = () => {
    try {
      const saved = localStorage.getItem('noted_ai_tutor_messages');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
    } catch (e) {
      return INITIAL_MESSAGES;
    }
  };

  const [messages, setMessages] = useState(getInitialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [generatingQuizId, setGeneratingQuizId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('noted_ai_tutor_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now(), role: "user", text: inputValue };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);
    setLoadingMessageIndex(0);

    try {
      const formattedHistory = updatedMessages
        .filter(msg => msg.id !== 1) 
        .map(msg => ({ role: msg.role === "ai" ? "assistant" : "user", content: msg.text }));

      const response = await api.post('/ai/generate', {
        messages: formattedHistory, 
        mode: 'tutor',
        title: 'AI Tutor Chat',
        subject: 'General'
      });

      const aiResponse = { id: Date.now() + 1, role: "ai", text: response.data.data.generatedText };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Tutor API error:", error);
      // ✅ IMPROVED: Shows the EXACT backend error message in the chat for easy debugging
      const errorMsg = error.response?.data?.message || "I encountered a small error. Please try asking your question again!";
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "ai", text: `⚠️ **Error:** ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleAudioPlayback = (messageId, text) => {
    if (activeAudioId === messageId) {
      window.speechSynthesis.cancel();
      setActiveAudioId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '')); // Remove markdown for speech
      utterance.rate = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.lang === 'en-US');
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.onend = () => setActiveAudioId(null);
      setActiveAudioId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };

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
      console.error("Generate quiz from chat error:", error);
      const errorMsg = error.response?.data?.message || "Failed to generate quiz.";
      setMessages((prev) => [...prev, { id: Date.now(), role: "ai", text: `⚠️ **Error:** ${errorMsg}` }]);
    } finally {
      setGeneratingQuizId(null);
    }
  };

  const handleUpdateQuizMessage = (id, updatedMsg) => {
    setMessages(prev => prev.map(m => m.id === id ? updatedMsg : m));
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat history?")) {
      setMessages(INITIAL_MESSAGES);
      localStorage.removeItem('noted_ai_tutor_messages');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto p-4 md:p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand/80 flex items-center justify-center text-brand-foreground shadow-lg shadow-brand/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Noted AI Tutor</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Online and ready to help
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground border border-border">
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Subjects</span>
          </div>
          <button onClick={handleClearChat} className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Clear chat history">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
              msg.role === "ai" || msg.role === "quiz" ? "bg-brand/10 text-brand" : "bg-electric/10 text-electric"
            }`}>
              {msg.role === "quiz" ? <Target className="w-4 h-4" /> : msg.role === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            <div className={`max-w-[85%] md:max-w-[75%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              {(msg.role === "user" || msg.role === "ai") && (
                <div 
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-brand text-brand-foreground rounded-tr-sm" 
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  }`}
// ✅ CORRECT: Sanitized and secure
dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />'))
}} 
                />
              )}

              {msg.role === "quiz" && msg.quizData && (
                <ChatQuizCard msg={msg} onUpdateMessage={handleUpdateQuizMessage} />
              )}

              {msg.role === "ai" && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <button
                    onClick={() => toggleAudioPlayback(msg.id, msg.text)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      activeAudioId === msg.id 
                        ? "bg-brand/10 text-brand border-brand/20" 
                        : "bg-card text-muted-foreground hover:bg-accent border-border"
                    }`}
                  >
                    {activeAudioId === msg.id ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {activeAudioId === msg.id ? "Stop" : "Listen"}
                  </button>
                  <button
                    onClick={() => handleGenerateQuizFromChat(msg.text, msg.id)}
                    disabled={generatingQuizId === msg.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-electric/10 text-electric border border-electric/20 hover:bg-electric/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingQuizId === msg.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                    ) : (
                      <><Target className="w-3.5 h-3.5" /> Turn into Quiz</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm flex flex-col gap-2 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
              <p className="text-xs text-muted-foreground italic animate-pulse">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && !isLoading && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, index) => (
              <button 
                key={index} 
                onClick={() => setInputValue(q)} 
                className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-medium text-foreground hover:bg-brand/5 hover:text-brand hover:border-brand/30 transition-all text-left shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-brand" /> {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="relative bg-card border border-border rounded-2xl shadow-lg shadow-black/5 p-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask your Noted AI Tutor a question..."
          rows={1}
          className="w-full bg-transparent border-0 resize-none px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 max-h-32 custom-scrollbar"
        />
        <div className="flex items-center justify-between px-2 pb-1 pt-1">
          <div className="flex items-center gap-1">
            <button type="button" className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Voice input (Coming soon)">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
              inputValue.trim() && !isLoading 
                ? "bg-brand text-brand-foreground shadow-md hover:bg-brand/90 active:scale-95" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-center text-[10px] text-muted-foreground mt-3">
        Noted AI can make mistakes. Please verify important information with your teacher or textbooks.
      </p>
    </div>
  );
}