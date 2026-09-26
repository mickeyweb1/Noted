import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Trophy, User, CheckCircle2, Loader2 } from "lucide-react";
import api from "../utils/api";

export default function GameShowLobby() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");

  const [step, setStep] = useState("enter-name");
  const [studentName, setStudentName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!studentName.trim()) return setError("Please enter your name");
    setIsJoining(true);
    setError("");

    // In a real app, we would send the name to the server here.
    // For the presentation, we just move them to the waiting screen.
    setTimeout(() => {
      setStep("waiting");
      setIsJoining(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6">
        
        {step === "enter-name" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
              <Trophy className="h-8 w-8 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Join Game Show</h1>
              <p className="text-sm text-muted-foreground mt-2">Enter your name to join the live game.</p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button 
                type="submit" 
                disabled={isJoining}
                className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground hover:bg-brand/90 transition flex items-center justify-center gap-2"
              >
                {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : "I'm Ready!"}
              </button>
            </form>
          </>
        )}

        {step === "waiting" && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">You're in, {studentName}!</h1>
              <p className="text-muted-foreground mt-2">Look at the main screen. Waiting for the teacher to start the game...</p>
            </div>
            
            <div className="flex justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-3 w-3 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            <p className="text-xs text-muted-foreground pt-4">
              Game Code: <span className="font-mono font-bold text-foreground">{code}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
