import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Star, Clock, Loader2, ArrowLeft } from "lucide-react";
import api from "../../utils/api";
import { useUserContext } from "../../context/userContext";

export default function SuperAdminFeedback() {
  const { user } = useUserContext();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Security Check: If not super admin, kick them out
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      navigate("/"); 
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await api.get("/feedback");
        if (res.data.success) {
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

  if (user && user.role !== "super_admin") return null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-5 sm:px-5 sm:py-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Super Admin Feedback Inbox</h1>
          <p className="text-sm text-muted-foreground">Global messages from all students across the platform.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No feedback yet</h3>
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