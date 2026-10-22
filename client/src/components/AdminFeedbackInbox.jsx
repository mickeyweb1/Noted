import { useState, useEffect } from "react";
import { MessageSquare, Star, User, Clock, CheckCircle, Trash2, Loader2 } from "lucide-react";
import api from "../../utils/api";

export default function AdminFeedbackInbox() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await api.get("/feedback");
        if (res.data.success) {
          // Sort by newest first
          const sorted = res.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setFeedbacks(sorted);
        }
      } catch (error) {
        console.error("Failed to load feedback:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  const getTypeColor = (type) => {
    if (type === "Bug Report") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (type === "Feature Request") return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-green-500/10 text-green-500 border-green-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Feedback Inbox</h2>
          <p className="text-sm text-muted-foreground">Messages sent directly from the app.</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-brand/10 text-brand font-bold">
          {feedbacks.length} Total Messages
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No feedback yet</h3>
          <p className="text-muted-foreground">When students send feedback, it will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((fb) => (
            <div key={fb._id} className="p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                    {fb.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{fb.studentName}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(fb.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(fb.type)}`}>
                  {fb.type}
                </span>
              </div>

              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < fb.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                ))}
              </div>

              <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border border-border">
                "{fb.message}"
              </p>
              
              <div className="mt-3 text-xs text-muted-foreground">
                Student Email: {fb.email}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}