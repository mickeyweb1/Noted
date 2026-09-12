import { useState, useEffect } from "react";
import { 
    Brain, Trophy, Target, Clock, ChevronRight, 
    CheckCircle2, XCircle, Sparkles, RotateCcw,
    FileText, Zap, Award, X, Volume2, Square 
} from "lucide-react";
import api from "../../utils/api"; 

// ✅ NEW: Premium Skeleton Loader
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-muted rounded-md ${className}`} />
);

export default function StudentQuiz() {
    const [quizState, setQuizState] = useState('idle'); 
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [userAnswers, setUserAnswers] = useState([]);
    
    const [userLibrary, setUserLibrary] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState('');
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    
    const [realRecentQuizzes, setRealRecentQuizzes] = useState([]);
    const [viewModalData, setViewModalData] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLibraryData = async () => {
        try {
            const response = await api.get('/ai/library');
            if (response.data.success) {
                const allItems = response.data.data;
                
                const formattedLibrary = allItems.map(item => ({
                    id: item._id,
                    title: item.title,
                    rawText: item.rawText,
                    generatedText: item.generatedText,
                    subject: item.subject,
                    type: item.type
                }));
                setUserLibrary(formattedLibrary);

                const quizzesOnly = allItems
                    .filter(item => item.type === 'quiz' || (item.title && item.title.startsWith('{')))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 5)
                    .map((item, index) => {
                        let cleanTitle = item.title;
                        if (cleanTitle && cleanTitle.startsWith('{')) {
                            try { cleanTitle = JSON.parse(cleanTitle).title || "Quiz"; } catch(e) {}
                        }
                        return {
                            id: item._id,
                            title: cleanTitle,
                            subject: item.subject,
                            date: new Date(item.createdAt).toLocaleDateString(),
                            icon: Brain,
                            color: index % 2 === 0 ? "brand" : "electric"
                        };
                    });
                setRealRecentQuizzes(quizzesOnly);
            }
        } catch (error) {
            console.error("Failed to fetch library:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchLibraryData(); }, []);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        };
    }, [currentQuestionIndex]);

    const mockGeneratedQuiz = {
        title: "Biology: Cell Structure",
        questions: [
            { id: 1, question: "Powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi"], correctAnswer: "Mitochondria", explanation: "Mitochondria generate ATP." }
        ]
    };

    const handleGenerateQuiz = async () => {
        if (!selectedNoteId) return alert("Select a note first!");
        setQuizState('generating');
        
        try {
            const selectedNote = userLibrary.find(note => note.id === selectedNoteId);
            const response = await api.post('/ai/generate', {
                text: selectedNote.rawText || selectedNote.generatedText,
                mode: 'quiz',
                title: `${selectedNote.title} Quiz`,
                subject: selectedNote.subject || 'General',
                numQuestions: numQuestions,
                difficulty: difficulty
            });

            let aiData = null;
            try {
                const rawText = response.data.data.generatedText;
                const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                if (jsonMatch) aiData = JSON.parse(jsonMatch[0]);
            } catch (e) { console.error("Frontend JSON parse error:", e); }

            if (!aiData || !Array.isArray(aiData.questions) || aiData.questions.length === 0) {
                aiData = mockGeneratedQuiz;
            }

            setGeneratedQuiz(aiData);
            setQuizState('active');
            setCurrentQuestionIndex(0); 
            setScore(0); 
            setUserAnswers([]);
            setSelectedOption(null); 
            setShowExplanation(false);
        } catch (error) {
            console.error("Generate quiz error:", error);
            alert("Failed to generate quiz. Please try again."); 
            setQuizState('idle');
        }
    };

    const handleOptionClick = (option) => {
        if (selectedOption) return; 
        setSelectedOption(option); 
        setShowExplanation(true);
        window.speechSynthesis.cancel();
        setIsPlaying(false);

        const currentQ = activeQuizData.questions[currentQuestionIndex];
        const isCorrect = option === currentQ.correctAnswer;
        if (isCorrect) setScore(prev => prev + 1);
        setUserAnswers(prev => [...prev, { question: currentQ.question, selected: option, correct: currentQ.correctAnswer, isCorrect }]);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < activeQuizData.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1); 
            setSelectedOption(null); 
            setShowExplanation(false);
        } else {
            setQuizState('completed');
        }
    };

    const handleFinishAndSave = async () => {
        try {
            await api.post('/ai/attempt', {
                contentId: generatedQuiz?.id || userLibrary.find(n => n.title.includes(activeQuizData.title))?.id,
                title: activeQuizData.title,
                score: score,
                totalQuestions: activeQuizData.questions.length,
                percentage: Math.round((score / activeQuizData.questions.length) * 100),
                answers: userAnswers
            });
            await fetchLibraryData(); 
        } catch (e) { console.error("Failed to save attempt", e); }
    };

    const handleViewPastQuiz = async (quizId) => {
        try {
            const pastQuiz = userLibrary.find(item => item.id === quizId);
            if (!pastQuiz) { alert("Quiz not found in library."); return; }

            const textToParse = pastQuiz.generatedText || pastQuiz.title;
            let quizData = null;
            try {
                const cleanText = textToParse.replace(/```json/g, '').replace(/```/g, '').trim();
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                if (jsonMatch) quizData = JSON.parse(jsonMatch[0]);
                else quizData = JSON.parse(cleanText);
            } catch (e) { console.error("Parse error", e); }
            
            if (quizData && quizData.questions) {
                setViewModalData({ title: quizData.title || pastQuiz.subject || "Past Quiz", isPastQuiz: true, questions: quizData.questions });
            } else {
                alert("Could not load this quiz data. The format might be corrupted.");
            }
        } catch (error) {
            console.error("Failed to load past quiz", error);
        }
    };

    const handleRestart = () => { setQuizState('idle'); setGeneratedQuiz(null); setSelectedNoteId(''); };

    const activeQuizData = generatedQuiz || mockGeneratedQuiz;
    const currentQ = activeQuizData.questions[currentQuestionIndex];
    const totalQuestions = activeQuizData.questions.length;
    const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    const toggleQuestionAudio = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }
        window.speechSynthesis.cancel();
        const textToRead = `Question: ${currentQ.question}. Options are: ${currentQ.options.join(', ')}.`;
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 0.9;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="min-h-screen w-full bg-[#F4F5F7] dark:bg-background transition-colors duration-300">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                            <Brain className="w-8 h-8 text-electric" /> Quiz Mode
                        </h1>
                        <p className="text-muted-foreground mt-1">Test your knowledge and lock in what you've learned.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {quizState === 'generating' && (
                            <div className="p-12 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-electric/20 border-t-electric rounded-full animate-spin"></div>
                                    <Sparkles className="w-6 h-6 text-electric absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                </div>
                                <h3 className="text-xl font-display font-semibold text-foreground">AI is crafting your {difficulty} quiz...</h3>
                                <p className="text-sm text-muted-foreground">This usually takes 5-10 seconds.</p>
                            </div>
                        )}

                        {quizState === 'active' && currentQ && (
                            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                                        <span>{Math.round(progressPercentage)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-brand rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
                                    </div>
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground flex-1 leading-snug">
                                        {currentQ.question}
                                    </h2>
                                    <button 
                                        onClick={toggleQuestionAudio}
                                        className={`flex-shrink-0 p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${
                                            isPlaying ? "bg-brand/10 text-brand border border-brand/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                        title="Read question aloud"
                                    >
                                        {isPlaying ? <Square className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {currentQ.options.map((option) => {
                                        let style = "border-border bg-background hover:bg-accent/50";
                                        if (selectedOption) {
                                            if (option === currentQ.correctAnswer) style = "border-green-500 bg-green-500/10 text-green-600";
                                            else if (option === selectedOption) style = "border-red-500 bg-red-500/10 text-red-600";
                                            else style = "border-border bg-background opacity-50";
                                        }
                                        return (
                                            <button 
                                                key={option} 
                                                onClick={() => handleOptionClick(option)} 
                                                disabled={!!selectedOption} 
                                                className={`flex items-center justify-between p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ${style} ${!selectedOption ? 'hover:scale-[1.01] active:scale-[0.99]' : ''}`}
                                            >
                                                <span>{option}</span>
                                                {selectedOption && option === currentQ.correctAnswer && <CheckCircle2 className="w-5 h-5" />}
                                                {selectedOption && option === selectedOption && option !== currentQ.correctAnswer && <XCircle className="w-5 h-5" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {showExplanation && (
                                    <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${selectedOption === currentQ.correctAnswer ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                        <p className="text-sm font-semibold mb-1">{selectedOption === currentQ.correctAnswer ? "Correct! 🎉" : "Not quite."}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{currentQ.explanation}</p>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t border-border">
                                    <button 
                                        onClick={handleNextQuestion} 
                                        disabled={!selectedOption} 
                                        className="px-6 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium shadow-md hover:bg-brand/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 transition-all duration-300"
                                    >
                                        {currentQuestionIndex === totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'} <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {quizState === 'completed' && (
                            <div className="p-8 rounded-2xl bg-card border border-border shadow-sm space-y-6 text-center animate-in zoom-in-95 duration-300">
                                <Award className="w-16 h-16 text-brand mx-auto" />
                                <h2 className="text-3xl font-display font-bold text-foreground">Quiz Completed!</h2>
                                <p className="text-muted-foreground">You scored <span className="font-bold text-foreground text-lg">{Math.round((score / totalQuestions) * 100)}%</span> on {activeQuizData.title}</p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                    <button onClick={handleRestart} className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-border bg-background text-foreground font-medium hover:bg-accent hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">Back to Dashboard</button>
                                    <button onClick={() => { handleFinishAndSave(); setViewModalData({ title: activeQuizData.title, score, totalQuestions, percentage: Math.round((score / totalQuestions) * 100), answers: userAnswers }); }} className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium shadow-md hover:bg-brand/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                                        View Results
                                    </button>
                                </div>
                            </div>
                        )}

                        {quizState !== 'generating' && (
                            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                                <h2 className="text-lg font-display font-semibold text-foreground">Recent Quizzes</h2>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                                    </div>
                                ) : realRecentQuizzes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No quizzes generated yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {realRecentQuizzes.map((quiz) => (
                                            <div key={quiz.id} className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border hover:border-brand/30 hover:shadow-sm transition-all duration-300">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-lg bg-${quiz.color}/10 text-${quiz.color}`}><quiz.icon className="w-5 h-5" /></div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-foreground">{quiz.title}</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{quiz.date} • {quiz.subject}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleViewPastQuiz(quiz.id)} className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-brand hover:text-brand-foreground hover:border-brand transition-all duration-300">Review</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-electric/10 to-electric/5 border border-electric/20 shadow-sm space-y-5">
                            <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2"><Sparkles className="w-5 h-5 text-electric" /> Generate New Quiz</h3>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-foreground">Select a Note</label>
                                    <select value={selectedNoteId} onChange={(e) => setSelectedNoteId(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/20 transition-all">
                                        <option value="">Choose a topic...</option>
                                        {userLibrary.map((note) => (<option key={note.id} value={note.id}>{note.title}</option>))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-foreground">Difficulty Level</label>
                                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/20 transition-all">
                                        <option value="Basic">Basic (Easy recall)</option>
                                        <option value="Medium">Medium (Standard)</option>
                                        <option value="Hard">Hard (Deep thinking)</option>
                                        <option value="Harder">Harder (Expert level)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-foreground">Number of Questions</label>
                                    <select value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/20 transition-all">
                                        <option value={3}>3 Questions</option>
                                        <option value={5}>5 Questions</option>
                                        <option value={10}>10 Questions</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={handleGenerateQuiz} 
                                    disabled={quizState === 'generating' || quizState === 'active' || !selectedNoteId} 
                                    className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-electric text-electric-foreground font-semibold text-sm shadow-lg shadow-electric/20 hover:bg-electric/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
                                >
                                    {quizState === 'generating' ? 'Generating...' : <><Target className="w-4 h-4" /> Generate Quiz</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ POLISHED MODAL */}
            {viewModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewModalData(null)}>
                    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-border animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">{viewModalData.title}</h2>
                                {viewModalData.isPastQuiz ? (
                                    <p className="text-sm text-muted-foreground mt-1">Review Mode: Check the correct answers below.</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground mt-1">Score: <span className="font-bold text-brand">{viewModalData.percentage}%</span> ({viewModalData.score}/{viewModalData.totalQuestions})</p>
                                )}
                            </div>
                            <button onClick={() => setViewModalData(null)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                            {viewModalData.isPastQuiz ? (
                                <div className="space-y-4">
                                    {viewModalData.questions.map((q, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                            <p className="font-semibold text-foreground mb-3">{idx + 1}. {q.question}</p>
                                            <div className="space-y-2 ml-4">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className={`flex items-center gap-2 text-sm ${opt === q.correctAnswer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{String.fromCharCode(65 + optIdx)}</span>
                                                        {opt} {opt === q.correctAnswer && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-border/50">
                                                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {q.explanation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                                            <p className="text-2xl font-bold text-green-600">{viewModalData.answers.filter(a => a.isCorrect).length}</p>
                                            <p className="text-xs text-green-600 font-medium">Correct</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                                            <p className="text-2xl font-bold text-red-600">{viewModalData.answers.filter(a => !a.isCorrect).length}</p>
                                            <p className="text-xs text-red-600 font-medium">Wrong</p>
                                        </div>
                                    </div>
                                    {viewModalData.answers.map((ans, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border ${ans.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                            <p className="font-semibold text-foreground mb-2">{idx + 1}. {ans.question}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-4 h-4" /> Correct: {ans.correct}</div>
                                                {!ans.isCorrect && <div className="flex items-center gap-2 text-red-600"><XCircle className="w-4 h-4" /> You chose: {ans.selected}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}