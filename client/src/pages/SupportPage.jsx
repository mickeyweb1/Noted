import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, AlertCircle, Mail, Phone } from "lucide-react";
import api from "../utils/api";
import { useUserContext } from "../context/userContext";

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useUserContext();
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Please provide both a subject and a message.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/support/ticket", {
        subject,
        message,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
      });
      setSuccess(true);
      setSubject("");
      setMessage("");
      setContactPhone("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600">
            <Send className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Ticket Submitted!</h2>
          <p className="text-muted-foreground">Thank you for reaching out. Our team will review your message and get back to you shortly.</p>
          <button onClick={() => navigate(-1)} className="w-full rounded-xl bg-brand py-3 font-bold text-brand-foreground hover:bg-brand/90 transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-brand" /> Report an Issue or Feedback
            </h1>
            <p className="text-muted-foreground mt-1">Found a bug or have a suggestion? Let us know and we'll look into it.</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Quiz timer is not working"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Please describe the issue or your feedback in detail..."
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Contact Email (Optional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4 text-muted-foreground" /> Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-brand-foreground hover:bg-brand/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : <><Send className="w-5 h-5" /> Submit Ticket</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
