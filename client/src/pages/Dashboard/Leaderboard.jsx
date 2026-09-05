import { useState, useEffect } from "react";
import { Trophy, Medal, Award, User, ArrowLeft, Building2, Users, Globe } from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../../utils/api";
 
export default function Leaderboard() {
    const [scope, setScope] = useState("global"); // Default to global so you can see everyone
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
 
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await api.get(`/auth/leaderboard?scope=${scope}`); 
                if (response.data.success) {
                    setLeaderboardData(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, [scope]);
 
    const getRankIcon = (rank) => {
        if (rank === 1) return (
            <>
                <Trophy className="w-6 h-6 text-yellow-500" aria-hidden="true" />
                <span className="sr-only">1st place</span>
            </>
        );
        if (rank === 2) return (
            <>
                <Medal className="w-6 h-6 text-gray-400" aria-hidden="true" />
                <span className="sr-only">2nd place</span>
            </>
        );
        if (rank === 3) return (
            <>
                <Award className="w-6 h-6 text-amber-600" aria-hidden="true" />
                <span className="sr-only">3rd place</span>
            </>
        );
        return <span className="text-sm font-bold text-muted-foreground w-6 text-center">{rank}</span>;
    };
 
    const getRankStyle = (rank) => {
        if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
        if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
        if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
        return "bg-card border-border";
    };
 
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <div className="w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
            </div>
        );
    }
 
    const isClass = leaderboardData?.activeScope === 'class';
    const isSchool = leaderboardData?.activeScope === 'school';
 
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Header & Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <NavLink
                        to="/dashboard"
                        aria-label="Back to dashboard"
                        className="p-2 rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                    </NavLink>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-brand-soft text-brand shrink-0">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                                {isClass ? "Class Leaderboard" : isSchool ? "School Leaderboard" : "Global Leaderboard"}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm md:text-base">
                                {isClass ? `Top students in ${leaderboardData?.userClass}` : isSchool ? `Top students at ${leaderboardData?.userSchool}` : "Top students and personal users across the entire platform."}
                            </p>
                        </div>
                    </div>
                </div>
 
                {/* ✅ The 3 Tabs: Global, School, Class */}
                <div className="flex bg-card border border-border rounded-lg p-1 overflow-x-auto">
                    <button type="button" onClick={() => setScope('global')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${!isClass && !isSchool ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Globe className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">Global</span>
                    </button>
                    <button type="button" onClick={() => setScope('school')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${isSchool ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Building2 className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">My School</span>
                    </button>
                    <button type="button" onClick={() => setScope('class')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap ${isClass ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                        <Users className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">My Class</span>
                    </button>
                </div>
            </div>
 
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end mb-6">
                {leaderboardData?.topUsers.slice(0, 3).map((user, index) => {
                    const rank = index + 1;
                    return (
                        <div
                            key={user._id}
                            className={`p-6 rounded-2xl border-2 text-center space-y-2 transition-transform ${getRankStyle(rank)} ${
                                rank === 1
                                    ? "md:order-2 md:-translate-y-3 md:scale-[1.03] shadow-lg"
                                    : rank === 2
                                        ? "md:order-1 shadow-sm"
                                        : "md:order-3 shadow-sm"
                            }`}
                        >
                            <div className="flex justify-center">{getRankIcon(rank)}</div>
                            <h3 className="font-display font-bold text-lg text-foreground truncate">{user.fullName}</h3>
                            <p className="text-sm text-muted-foreground">Level {user.level} • {user.className || user.schoolName || 'Personal'}</p>
                            <p className="text-xl font-bold text-brand">{user.xp} XP</p>
                        </div>
                    );
                })}
            </div>
 
            {/* Full Top 30 List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <h2 className="font-display font-semibold text-foreground">Top 30 Users</h2>
                </div>
                <div className="divide-y divide-border">
                    {leaderboardData?.topUsers.length > 0 ? leaderboardData.topUsers.map((user, index) => (
                        <div key={user._id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-8 flex justify-center">{getRankIcon(index + 1)}</div>
                                <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-brand shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{user.fullName}</p>
                                    <p className="text-xs text-muted-foreground">Level {user.level} • {user.className || user.schoolName || 'Personal User'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-brand">{user.xp} XP</p>
                            </div>
                        </div>
                    )) : (
                        <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <p>No users found in this category yet.</p>
                        </div>
                    )}
                </div>
            </div>
 
            {/* User's Personal Rank */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-brand/10 to-electric/10 border border-brand/20 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-brand-foreground font-bold text-lg shrink-0">
                            {leaderboardData?.currentUserRank}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Your Current Rank ({isClass ? 'Class' : isSchool ? 'School' : 'Global'})</p>
                            <p className="text-xl font-display font-bold text-foreground">Keep pushing! You are doing great.</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                        <p className="text-2xl font-bold text-brand">{leaderboardData?.currentXp || 0} XP</p>
                        <p className="text-sm text-muted-foreground">Level {leaderboardData?.currentLevel || 1}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}