import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUserContext } from "../../context/userContext";
import {
  Clock,
  BookOpen,
  Trophy,
  Zap,
  ArrowRight,
  Sparkles,
  Brain,
  Medal,
  Award,
  Swords,
  Loader2,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import api from "../../utils/api";

export default function StudentHome() {
  const { user } = useUserContext();
  const navigate = useNavigate();

  const storedUserInfo = (() => {
    try {
      const item = localStorage.getItem("userInfo");
      return item && item !== "undefined" ? JSON.parse(item) : {};
    } catch (e) {
      return {};
    }
  })();

  const currentUser =
    storedUserInfo.xp !== undefined ? storedUserInfo : user || {};
  const userName = currentUser?.firstName || currentUser?.fullName || "Student";

  // ✅ Detect if user is a personal user
  const isPersonalUser = currentUser?.role === "personal_user";

  const [libraryData, setLibraryData] = useState([]);
  const [stats, setStats] = useState({
    streak: 0,
    totalNotes: 0,
    totalQuizzes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [topStudents, setTopStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [focusData, setFocusData] = useState({
    dailyMinutes: 0,
    totalHours: 0,
  });

  // Battle Arena States
  const [classmates, setClassmates] = useState([]);
  const [pendingBattles, setPendingBattles] = useState([]);
  // ✅ Default to "link" if personal user, otherwise "classmate"
  const [battleTab, setBattleTab] = useState(
    isPersonalUser ? "link" : "classmate",
  );
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [battleTopic, setBattleTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const date = new Date();
  const dateInfo = `${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`;
  const hours = date.getHours();
  let period =
    hours >= 5 && hours < 12
      ? "Good morning"
      : hours >= 12 && hours < 17
        ? "Good afternoon"
        : hours >= 17 && hours < 21
          ? "Good evening"
          : "Late night Study";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/ai/library");
        if (response.data.success) {
          const allItems = response.data.data;
          setLibraryData(allItems);
          let streak = 0;
          if (allItems.length > 0) {
            const uniqueDates = [
              ...new Set(
                allItems.map((item) => new Date(item.createdAt).toDateString()),
              ),
            ].sort((a, b) => new Date(b) - new Date(a));
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
              streak = 1;
              let currentDate = new Date(uniqueDates[0]);
              for (let i = 1; i < uniqueDates.length; i++) {
                const expectedDate = new Date(currentDate);
                expectedDate.setDate(expectedDate.getDate() - 1);
                if (uniqueDates[i] === expectedDate.toDateString()) {
                  streak++;
                  currentDate = expectedDate;
                } else {
                  break;
                }
              }
            }
          }
          setStats({
            streak,
            totalNotes: allItems.filter((item) => item.type !== "quiz").length,
            totalQuizzes: allItems.filter((item) => item.type === "quiz")
              .length,
          });
        }

        const focusRes = await api.get("/auth/me");
        if (focusRes.data.success) {
          const userData = focusRes.data.data;
          setFocusData({
            dailyMinutes: userData.dailyFocusLog?.[selectedDate] || 0,
            totalHours: userData.totalFocusHours || 0,
          });
        }

        const lbRes = await api.get("/auth/leaderboard?scope=class");
        if (lbRes.data.success)
          setTopStudents(lbRes.data.data.topUsers.slice(0, 3));

        const classmatesRes = await api.get("/ai/battle/classmates");
        if (classmatesRes.data.success) setClassmates(classmatesRes.data.data);

        const battlesRes = await api.get("/ai/battle/pending");
        if (battlesRes.data.success) {
          const incomingBattles = battlesRes.data.data.filter(
            (b) =>
              b.status === "pending" &&
              b.challengerId !== user?._id &&
              b.challengerId !== currentUser._id,
          );
          setPendingBattles(incomingBattles);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedDate, user?._id, currentUser._id]);

  const handleSendChallenge = async () => {
    if (!selectedOpponent) return alert("Please select an opponent!");
    setIsActionLoading(true);
    try {
      const res = await api.post("/ai/battle/challenge", {
        opponentId: selectedOpponent,
        topic: battleTopic || "General Knowledge",
        numQuestions,
      });
      if (res.data.success) {
        alert(res.data.message);
        setSelectedOpponent("");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send challenge.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsActionLoading(true);
    try {
      const res = await api.post("/ai/battle/generate-link", { topic: battleTopic || "General Knowledge", numQuestions });
      if (res.data.success) {
        setGeneratedLink(res.data.data.battleLink);
        setCopied(false);
        // ✅ REMOVED: navigate(...) 
        // Now the user stays on the dashboard to see the link and the new button.
      }
    } catch (error) { alert(error.response?.data?.message || "Failed to generate link."); }
    finally { setIsActionLoading(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const message = `Hey! I challenge you to a ${numQuestions}-question study battle on Noted about "${battleTopic || "General Knowledge"}". Click here to accept: ${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleAcceptBattle = (battle) => {
    navigate(`/battle-arena?battleId=${battle._id}`);
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (index === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    return <Award className="w-4 h-4 text-amber-700" />;
  };

  return (
    <section className="w-full max-w-7xl mx-auto space-y-5 px-3 py-4 sm:px-5 sm:py-6 lg:space-y-6 lg:px-6">
      {/* TOP SECTION: Greeting & Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft via-accent/40 to-electric-soft border border-border p-5 shadow-soft sm:p-6 lg:rounded-3xl lg:p-8">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-electric/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />{" "}
              {dateInfo}
            </p>
            <h2 className="max-w-2xl text-2xl font-display font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
              {period}, {userName}! <br />
              <span className="text-muted-foreground">
                Ready to learn something new?
              </span>
            </h2>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <NavLink
              to="/aiGenerator"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:scale-105 hover:bg-brand/90 active:scale-95 sm:w-auto sm:px-6"
            >
              <Sparkles className="w-4 h-4" /> Generate AI Summary
            </NavLink>
            <NavLink
              to="/focusTime"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition-all hover:scale-105 hover:bg-accent hover:text-accent-foreground active:scale-95 sm:w-auto sm:px-6"
            >
              <Clock className="w-4 h-4" /> Start Focus
            </NavLink>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Stats & Recent Activity */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        {/* Left Column: Stats & Recent Notes */}
        <div className="min-w-0 space-y-5 lg:col-span-2 lg:space-y-6">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Trophy className="w-4 h-4 text-flame" /> Study Streak
              </div>
              <span className="text-2xl font-display font-bold text-foreground">
                {isLoading ? "..." : `${stats.streak} Days`}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <BookOpen className="w-4 h-4 text-brand" /> Total Notes
              </div>
              <span className="text-2xl font-display font-bold text-foreground">
                {isLoading ? "..." : stats.totalNotes}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Brain className="w-4 h-4 text-electric" /> Quizzes Taken
              </div>
              <span className="text-2xl font-display font-bold text-foreground">
                {isLoading ? "..." : stats.totalQuizzes}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-brand/20 bg-gradient-to-br from-brand/10 to-electric/10 p-4 shadow-sm sm:p-5">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-brand">
                  <Zap className="w-4 h-4" /> Level {currentUser?.level || 1}
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-7 w-28 max-w-[45%] rounded-md border border-brand/20 bg-white/50 px-1.5 text-[0.7rem] text-foreground focus:outline-none focus:ring-1 focus:ring-brand sm:w-32 sm:px-2 sm:text-xs"
                />
              </div>
              <div className="mt-1 min-w-0">
                <span className="text-xs text-muted-foreground mb-1 block">
                  {currentUser?.xp || 0} XP Total
                </span>
                <span className="text-2xl font-display font-bold text-foreground">
                  {isLoading ? "..." : formatTime(focusData.dailyMinutes)}
                </span>
                <p className="text-xs text-muted-foreground">
                  Studied on this day
                </p>
              </div>
              <div className="pt-2 border-t border-brand/10 mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Lifetime Total:
                </span>
                <span className="text-sm font-bold text-brand">
                  {isLoading
                    ? "..."
                    : formatTime(Math.round(focusData.totalHours * 60))}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
              <h3 className="font-display font-semibold text-foreground">
                Recent Notes
              </h3>
              <NavLink
                to="/myLibrary"
                className="text-xs font-medium text-brand hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </NavLink>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading...
              </div>
            ) : libraryData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notes generated yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {libraryData.slice(0, 3).map((item) => (
                  <NavLink
                    key={item._id}
                    to="/myLibrary"
                    className="group flex min-w-0 items-center justify-between gap-3 p-4 transition-colors hover:bg-accent/50 sm:p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === "quiz" ? "bg-electric/10 text-electric" : "bg-brand/10 text-brand"}`}
                      >
                        {item.type === "quiz" ? (
                          <Brain className="w-5 h-5" />
                        ) : (
                          <BookOpen className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[calc(100vw-9rem)] truncate text-sm font-medium text-foreground transition-colors group-hover:text-brand sm:max-w-[22rem]">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.type} •{" "}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="min-w-0 space-y-5 lg:space-y-6">
          {/* Active Battle Widget */}
          {pendingBattles.length > 0 && (
            <div className="rounded-xl border-2 border-electric/30 bg-gradient-to-br from-electric/5 to-brand/5 p-4 shadow-sm sm:p-5 relative overflow-hidden animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Swords className="w-5 h-5 text-electric" /> Battle Waiting!
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                You have a battle ready to start or join.
              </p>
              <button
                onClick={() => handleAcceptBattle(pendingBattles[0])}
                className="w-full py-2 rounded-lg bg-electric text-electric-foreground text-sm font-bold hover:bg-electric/90 transition-colors"
              >
                Enter Arena Now
              </button>
            </div>
          )}

          {/* Battle Arena Card */}
          <div className="rounded-xl border-2 border-brand/30 bg-gradient-to-br from-brand/5 to-electric/5 p-4 shadow-sm sm:p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <Swords className="w-5 h-5 text-brand" /> Battle Arena
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 px-2 py-1 rounded-full">
                Live
              </span>
            </div>

            {pendingBattles.length > 0 ? (
              <div className="space-y-3 relative z-10">
                <p className="text-sm text-muted-foreground font-medium">
                  🔥 You have been challenged!
                </p>
                {pendingBattles.slice(0, 1).map((battle) => (
                  <div
                    key={battle._id}
                    className="p-3 rounded-lg bg-card border border-brand/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        {battle.challengerName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        vs You
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Topic: {battle.topic} ({battle.questions?.length || 3} Qs)
                    </p>
                    <button
                      onClick={() => handleAcceptBattle(battle)}
                      className="w-full py-2 rounded-lg bg-brand text-brand-foreground text-sm font-bold hover:bg-brand/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Swords className="w-4 h-4" /> Accept Challenge
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative z-10">
                {/* Tabs: Hide "Classmate" for Personal Users */}
                <div className="flex bg-background/50 rounded-lg p-1 mb-4 border border-border">
                  {!isPersonalUser && (
                    <button
                      onClick={() => setBattleTab("classmate")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${battleTab === "classmate" ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Classmate
                    </button>
                  )}
                  <button
                    onClick={() => setBattleTab("link")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${battleTab === "link" ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Invite Link
                  </button>
                </div>

                {battleTab === "classmate" && !isPersonalUser && (
                  <div className="space-y-3">
                    <select
                      value={selectedOpponent}
                      onChange={(e) => setSelectedOpponent(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Select a classmate...</option>
                      {classmates.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.fullName} (Lvl {c.level})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Enter topic (e.g., Biology, World War II)"
                      value={battleTopic}
                      onChange={(e) => setBattleTopic(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <select
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value={3}>3 Questions (Quick)</option>
                      <option value={5}>5 Questions (Standard)</option>
                      <option value={10}>10 Questions (Marathon)</option>
                    </select>
                    <button
                      onClick={handleSendChallenge}
                      disabled={isActionLoading || !selectedOpponent}
                      className="w-full py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-bold hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Swords className="w-4 h-4" />
                      )}
                      {isActionLoading ? "Generating..." : "Send Challenge"}
                    </button>
                  </div>
                )}

                {battleTab === "link" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Generate a secure link and share it via WhatsApp. The
                      receiver will get the exact quiz you set up!
                    </p>
                    <input
                      type="text"
                      placeholder="Enter topic (e.g., Physics, History)"
                      value={battleTopic}
                      onChange={(e) => setBattleTopic(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <select
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value={3}>3 Questions (Quick)</option>
                      <option value={5}>5 Questions (Standard)</option>
                      <option value={10}>10 Questions (Marathon)</option>
                    </select>

                    {!generatedLink ? (
                      <button onClick={handleGenerateLink} disabled={isActionLoading} className="w-full py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-bold hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                        {isActionLoading ? "Creating Link..." : "Generate Challenge Link"}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                          <input readOnly value={generatedLink} className="flex-1 bg-transparent text-xs text-foreground focus:outline-none truncate" />
                          <button onClick={copyLink} className="p-1.5 rounded-md hover:bg-muted text-brand transition-colors" title="Copy to clipboard">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {/* ✅ NEW: Enter Arena Button */}
                        <button 
                          onClick={() => {
                            const inviteCode = generatedLink.split('invite=')[1];
                            navigate(`/battle-arena?host=true&invite=${inviteCode}`);
                          }}
                          className="w-full py-2.5 rounded-lg bg-electric text-electric-foreground text-sm font-bold hover:bg-electric/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-electric/20"
                        >
                          <Swords className="w-4 h-4" /> Enter Arena & Wait
                        </button>

                        <button onClick={shareToWhatsApp} className="w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                          <Share2 className="w-4 h-4" /> Share to WhatsApp
                        </button>
                        
                        <button onClick={() => { setGeneratedLink(""); setBattleTopic(""); }} className="w-full text-xs text-muted-foreground hover:text-foreground underline">
                          Generate New Link
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top 3 This Week Widget */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-brand" /> Top 3 This Week
              </h3>
              <NavLink
                to="/leaderboard"
                className="text-xs font-medium text-brand hover:underline"
              >
                View All
              </NavLink>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Loading...
                </div>
              ) : topStudents.length > 0 ? (
                topStudents.map((student, index) => (
                  <div
                    key={student._id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-6 flex justify-center shrink-0">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Level {student.level}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-brand shrink-0">
                      {student.xp} XP
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No class data yet. Be the first!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
