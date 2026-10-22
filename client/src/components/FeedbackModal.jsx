import { useState } from "react";
import { X, Star, Send, MessageSquare, Bug, Lightbulb, Heart } from "lucide-react";
import api from "../utils/api";

export default function FeedbackModal({ isOpen, onClose }) {
  const [type, setType] = useState("General Praise");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/feedback", { type, rating, message });
      setSuccess(true);
      setMessage("");
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      alert("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { id: "General Praise", icon: Heart, color: "text-pink-500" },
    { id: "Feature Request", icon: Lightbulb, color: "text-yellow-500" },
    { id: "Bug Report", icon: Bug, color: "text-red-500" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand" /> Give Feedback
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Send className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Thank you!</h3>
            <p className="text-muted-foreground">Your feedback has been sent to the admin.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">What is this about?</label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      type === opt.id ? "border-brand bg-brand/5" : "border-border hover:bg-muted"
                    }`}
                  >
                    <opt.icon className={`w-5 h-5 ${opt.color}`} />
                    <span className="text-[10px] font-medium text-foreground text-center">{opt.id.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">How would you rate your experience?</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tell us more...</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="I love the app because... / I found a bug where..."
                className="flex w-full rounded-xl border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-brand text-brand-foreground font-semibold text-sm hover:bg-brand/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : <><Send className="w-4 h-4" /> Send Feedback</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}